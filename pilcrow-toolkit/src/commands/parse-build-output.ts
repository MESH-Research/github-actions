import * as core from '@actions/core'
import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { sep } from 'path'
import { runCommand } from '../lib/action.js'
import { getCommandOutput } from '/lib/tools.js'
import { DefaultArtifactClient } from '@actions/artifact'
import { dirname } from 'node:path'
import type { ActionInputs } from '../types.ts'
import { generateSummary } from '../lib/summary.js'
export { command as runCommand }

const command = runCommand({
  /****************************************************
   * Post stage command
   * -------------------------------------------------
   * * Handle uploading frontend bundles if found.
   *   - Upload the bundle as a GHA artifact.
   *   - Attach the bundle to the image using ORAS (if pushed to registry).
   * * Generate build summaries from cache output.
   * */
  post: async function ({ orasActor, token, orasBundleType }: ActionInputs) {
    const frontendBundle = core.getState('frontendBundle')
    const frontendImage = core.getState('frontendImage')
    if (frontendBundle && frontendImage) {
      core.info('📩 Uploading frontend bundle as GHA artifact...')
      await uploadGHAArtifact('frontend-bundle', frontendBundle)

      if (await imageExistsInRegistry(frontendImage)) {
        core.info('📎 Attaching frontend bundle to image: ' + frontendImage)
        await attachBundleToImage(
          frontendImage,
          frontendBundle,
          orasActor,
          orasBundleType,
          token
        )
      } else {
        core.info(
          '⏭️ Frontend image not found in registry, skipping attaching bundle.'
        )
      }
    } else {
      core.info(
        '⏭️ No frontend bundle or image found, skipping upload and attach.'
      )
    }

    core.info('📊 Generating build summaries...')
    const dirs = JSON.parse(core.getState('outputCacheDirs') || '[]')
    if (dirs.length === 0) {
      core.info(
        '⏭️ No output cache directories found, skipping summary generation.'
      )
    } else {
      await generateSummary(dirs)
    }
  },
  /****************************************************
   * Main stage command
   * --------------------------------------------------
   * * Parse the docker buildx output metadata to get
   *   - the web target name
   *   - the name of the image the web target built
   *   - save these as state variables if found
   * * Extract the output cache from the builder
   *   - copy the output cache to a known location
   *   - save the list of directories found as a state variable
   * * Check if a frontend-bundle was written to the output cache.
   *   - if so, set the path as an output variable
   */
  main: async function ({ dockerMetadata, outputCachePath }: ActionInputs) {
    parseDockerMeta(dockerMetadata)

    const dirs = await extractOutputCache(outputCachePath)
    core.saveState('outputCacheDirs', JSON.stringify(dirs))

    //Check if a frontend-bundle was written to the output cache.
    const bundlePath = `${outputCachePath}/web-build/frontend-bundle.tar.gz`
    if (!(await fileExists(bundlePath))) {
      core.info('No frontend bundle found in output cache.')
      return
    }

    core.saveState('frontendBundle', bundlePath)
    core.setOutput('frontend-bundle', bundlePath)
  }
})

function parseDockerMeta(bakeMetaOutput: string) {
  const meta = JSON.parse(bakeMetaOutput)
  if (!meta) {
    return
  }
  const webTarget = Object.keys(meta).find((key) => key.endsWith('web'))
  core.debug('Web target: ' + webTarget)
  core.saveState('webTarget', webTarget)
  if (webTarget) {
    const webImage = meta[webTarget]['image.name']
    core.debug('Web image: ' + webImage)
    core.saveState('frontendImage', webImage)
  }
}

async function extractOutputCache(cachePath: string) {
  const dockerBuildDir = await fs.mkdtemp(`${tmpdir()}${sep}output-cache-`)
  const dockerfile = `
FROM busybox:1
ARG BUILDSTAMP
RUN --mount=type=cache,target=/tmp/output \
    echo $BUILDSTAMP \
    mkdir -p /var/output-cache/ \
    && cp -p -R /tmp/output/. /var/.output-cache/ \
    && rm -rf /tmp/output/* || true

  `
  await fs.writeFile(dockerBuildDir + '/Dockerfile', dockerfile)
  //Generate a timestamp to use to prevent docker from caching
  const buildStamp = new Date().toISOString()

  core.info('Building cache extractor image...')
  await getCommandOutput('docker', [
    'buildx',
    'build',
    '--tag',
    'output:extract',
    '--build-arg',
    'BUILDSTAMP=' + buildStamp,
    '--load',
    dockerBuildDir
  ])
  core.info('🗑️ Removing existing cache extractor (if any)...')
  await getCommandOutput('docker', ['rm', '-f', 'cache-container'])
  core.info('🏗️ Creating cache extractor...')
  await getCommandOutput('docker', [
    'create',
    '-ti',
    '--name',
    'cache-container',
    'output:extract'
  ])
  core.info('📦 Copying cache from extractor...')

  await getCommandOutput('docker', [
    'cp',
    '-L',
    'cache-container:/var/.output-cache',
    cachePath
  ])
  const files = await fs
    .readdir(cachePath, { withFileTypes: true })
    .then((f) => f.filter((a) => a.isDirectory()))
    .then((f) => f.map((a) => a.name))
    .catch(() => [])
  core.info('📂 Output cache files: ' + files.join(', '))
  return files.map((dir) => cachePath + '/' + dir)
}

async function uploadGHAArtifact(name: string, frontendBundle: string) {
  const artifact = new DefaultArtifactClient()

  await artifact
    .uploadArtifact(
      'frontend-bundle',
      [frontendBundle],
      dirname(frontendBundle)
    )
    .then(({ size, id }) => {
      core.info(
        `✅ Uploaded frontend bundle as artifact, id: ${id}, size: ${size}`
      )
    })
    .catch((reason: unknown) => {
      core.error('Failed to create GHA artifact.')
      core.setFailed(
        'Failed to upload frontend bundle as GHA artifact: ' + reason
      )
    })
}

async function imageExistsInRegistry(image: string): Promise<boolean> {
  try {
    await getCommandOutput('docker', ['manifest', 'inspect', image])
    return true
  } catch {
    return false
  }
}

async function attachBundleToImage(
  image: string,
  filePath: string,
  orasActor: string,
  orasBundleType: string,
  token: string
) {
  const orasLoginOpts = [
    'login',
    'grcr.io',
    '--username',
    orasActor,
    '--password',
    token
  ]

  await getCommandOutput('oras', orasLoginOpts).catch((error: unknown) => {
    core.error('Failed to login to registry.')
    core.setFailed('ORAS Failed to login to registry')
    throw error
  })

  await getCommandOutput('oras', [
    'attach',
    image,
    '--disable-path-validation',
    '--artifact-type',
    orasBundleType,
    filePath
  ])
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path, fs.constants.R_OK)
    return true
  } catch {
    return false
  }
}
