import * as core from '@actions/core'
import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { sep } from 'path'
import { runCommand } from '../lib/action.js'
import { getCommandOutput } from '/lib/tools.js'
import { DefaultArtifactClient } from '@actions/artifact'
import { dirname } from 'node:path'
import type { ActionInputs } from '../types.ts'
export { command as runCommand }

const command = runCommand({
  post: async function ({
    'oras-actor': orasActor,
    token,
    'oras-bundle-type': orasBundleType
  }: ActionInputs) {
    const frontendBundle = core.getState('frontendBundle')
    const frontendImage = core.getState('frontendImage')
    if (!frontendBundle || !frontendImage) {
      core.info('No frontend bundle to attach.')
      return
    }

    core.info('Uploading frontend bundle as GHA artifact...')
    const artifact = new DefaultArtifactClient()

    await artifact
      .uploadArtifact(
        'frontend-bundle',
        [frontendBundle],
        dirname(frontendBundle)
      )
      .then(({ size, id }) => {
        core.info(
          `Uploaded frontend bundle as artifact, id: ${id}, size: ${size}`
        )
      })
      .catch((reason: unknown) => {
        core.error('Failed to create GHA artifact.')
        core.setFailed(
          'Failed to upload frontend bundle as GHA artifact: ' + reason
        )
      })

    try {
      await getCommandOutput('docker', ['manifest', 'inspect', frontendImage])
    } catch {
      core.info('Frontend image not found in registry: ' + frontendImage)
      return
    }
    core.info('Attaching frontend bundle to image: ' + frontendImage)
    const orasLoginOpts: string[] = []
    orasLoginOpts
      .concat(!!orasActor ? ['--username', orasActor] : [])
      .concat(!!token ? ['--password', token] : [])

    await getCommandOutput('oras', orasLoginOpts).catch((error: unknown) => {
      core.error('Failed to login to registry.')
      core.setFailed('ORAS Failed to login to registry')
      throw error
    })

    await getCommandOutput('oras', [
      'attach',
      frontendImage,
      '--disable-path-validation',
      '--artifact-type',
      orasBundleType,
      frontendBundle
    ]).catch((error: unknown) => {
      core.error('Failed to attach bundle to image.')
      core.setFailed('ORAS Failed to attach bundle to image')
      throw error
    })
  },
  main: async function ({
    'docker-metadata': dockerMetadata,
    'output-cache-path': outputCachePath
  }: ActionInputs) {
    parseDockerMeta(dockerMetadata)

    await extractOutputCache(outputCachePath)

    //Check if a frontend-bundle was written to the output cache.
    const bundlePath = `${outputCachePath}/web-build/frontend-bundle.tar.gz`

    try {
      fs.access(bundlePath, fs.constants.R_OK)
    } catch (err) {
      core.debug('No frontend bundle found at: ' + bundlePath)
      core.info('No frontend bundle found.')
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
    core.debug('Web target meta: ' + JSON.stringify(meta[webTarget]))
    const webImage = meta[webTarget]['image.name']
    core.debug
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
  core.info('Building cache extractor image...')
  await getCommandOutput('docker', ['rm', '-f', 'cache-container'])
  core.info('Creating cache extractor...')
  await getCommandOutput('docker', [
    'create',
    '-ti',
    '--name',
    'cache-container',
    'output:extract'
  ])
  core.info('Copying cache from extractor...')
  await getCommandOutput('docker', [
    'cp',
    '-L',
    'cache-container:/var/.output-cache',
    cachePath
  ])
}
