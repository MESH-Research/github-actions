import * as core from '@actions/core'
import * as fs from 'node:fs/promises'
import { runCommand } from '../lib/action.js'
import { getCommandOutput } from '../lib/tools.js'
import { DefaultArtifactClient } from '@actions/artifact'
import { dirname } from 'node:path'
import type { ActionInputs } from '../types.ts'
export { command as runCommand }

const command = runCommand({
  /****************************************************
   * Post stage command
   * -------------------------------------------------
   * * Handle uploading frontend bundles if found.
   *   - Upload the bundle as a GHA artifact.
   *   - Attach the bundle to the image using ORAS (if pushed to registry).
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
  },
  /****************************************************
   * Main stage command
   * --------------------------------------------------
   * * Parse the docker buildx output metadata to get
   *   - the web target name
   *   - the name of the image the web target built
   *   - save these as state variables if found
   * * Check if a frontend-bundle path was provided.
   *   - if so, set the path as an output variable
   */
  main: async function ({ dockerMetadata, bundlePath }: ActionInputs) {
    parseDockerMeta(dockerMetadata)

    if (!bundlePath) {
      core.info('No frontend bundle path provided.')
      return
    }

    if (!(await fileExists(bundlePath))) {
      core.info('Frontend bundle not found at: ' + bundlePath)
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
