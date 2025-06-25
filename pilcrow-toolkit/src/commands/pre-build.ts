import { runCommand } from '../lib/action.js'
import * as core from '@actions/core'
import * as fs from 'node:fs/promises'
import { tmpdir } from 'os'
import { sep } from 'path'
import { DefaultArtifactClient } from '@actions/artifact'
import { cp } from '@actions/io'
import { context } from '@actions/github'
import { ActionInputs } from '../types.js'
import { basename } from 'node:path'

export { command as runCommand }

const command = runCommand({
  pre: async function () {},
  post: async function () {
    if (core.isDebug()) {
      const artifact = new DefaultArtifactClient()

      const bakeFiles = core
        .getState('bakeFiles')
        .split(',')
        .filter((f) => f)
      if (bakeFiles.length === 0) {
        core.debug('No bake files to upload as artifacts.')
        return
      }

      core.debug('Bake files: ' + bakeFiles)
      core.debug('Uploading bake files as artifact...')
      const tmpPath = await fs.mkdtemp(`${tmpdir()}${sep}-bake-`)
      core.debug('Created temporary directory: ' + tmpPath)

      const destFiles: string[] = []
      for (const file of bakeFiles) {
        const filename = await cp(file, tmpPath)
          .then(() => {
            core.debug('Copied bake file ' + file)
            return tmpPath + sep + basename(file)
          })
          .catch((reason) =>
            core.error(`Failed to copy bake file: ${file} (${reason})`)
          )
        if (filename) {
          destFiles.push(filename)
        }
      }

      await artifact
        .uploadArtifact(`${context.job}-bake-files`, destFiles, tmpPath)
        .then(({ size, id }) =>
          core.debug(
            `Uploaded bake files as artifact, id: ${id}, size: ${size}`
          )
        )
        .catch((reason) =>
          core.error('Failed to upload bake files as artifact: ' + reason)
        )
      core.debug('Cleaning up temporary directory: ' + tmpPath)
      await fs.rm(tmpPath, { recursive: true, force: true })
    }
  },
  main: async function ({ 'bake-files': bakeFiles }: ActionInputs) {
    core.debug('Saving bake file names to upload as artifacts...')
    core.saveState('bakeFiles', bakeFiles.join(','))
  }
})
