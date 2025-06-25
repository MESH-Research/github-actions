import { debug, setFailed } from '@actions/core'
import type { ActionStage, ActionInputs } from 'types.ts'
import { runCommand as setup } from './commands/setup.js'
import { runCommand as preBuild } from './commands/pre-build.js'
import { runCommand as parseBuildOutput } from './commands/parse-build-output.js'

export async function run(
  stage: ActionStage,
  inputs: ActionInputs
): Promise<void> {
  try {
    const { command } = inputs
    debug(`Running ${command} in stage: ${stage}`)
    switch (command) {
      case 'setup':
        await setup(stage, inputs)
        break
      case 'pre-build':
        await preBuild(stage, inputs)
        break
      case 'parse-build-output':
        await parseBuildOutput(stage, inputs)
        break
      default:
        throw new Error(`Unknown command: ${command}`)
    }
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message)
    }
  }
}
