import { context } from '@actions/github'
import * as core from '@actions/core'
import { getCommandOutput } from '../lib/tools.js'
import { runCommand } from '../lib/action.js'
import { ActionInputs } from '../types.js'

export { command as runCommand }

const command = runCommand({
  /****************************************************
   * Post stage command
   * -------------------------------------------------
   * * Nothing to do.
   */
  post: async function () {},
  /****************************************************
   * Main stage command
   * -------------------------------------------------
   * * Create version strings and URLs based on current git context.
   *   - set outputs for version, version-url, version-date, repository,
   *     docker-registry-cache, buildstamp, image-template
   */
  main: async function ({ target }: ActionInputs) {
    const version = await getCommandOutput('git', [
      'describe',
      '--tags',
      '--match',
      'v*'
    ])
    const repository =
      `${context.repo.owner}/${context.repo.repo}`.toLowerCase()
    const versionUrl = `https://github.com/${repository}/commits/${context.sha}`
    const versionDate = await getCommandOutput('git', [
      'show',
      '-s',
      '--format=%cI',
      context.sha
    ])

    const buildstamp = await getCommandOutput('date', ['--iso=ns'])
    const dockerRegistryCache = `ghcr.io/${repository}/cache/__service__`

    core.setOutput('version', version.trim())
    core.setOutput('version-url', versionUrl)
    core.setOutput('version-date', versionDate.trim())
    core.setOutput('repository', repository)
    core.setOutput('docker-registry-cache', dockerRegistryCache)
    core.setOutput('buildstamp', buildstamp.trim())

    core.setOutput(
      'image-template',
      target == 'release'
        ? `ghcr.io/${repository}/__service__`
        : dockerRegistryCache
    )
  }
})
