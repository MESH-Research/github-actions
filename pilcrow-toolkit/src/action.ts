import { debug, setFailed } from '@actions/core'
import type { ActionCommand, ActionStage, ActionInputs } from 'types.ts'

function importCommand(command: string): Promise<ActionCommand> {
  return import(`../commands/${command}.ts`)
}

export async function run(
  stage: ActionStage,
  inputs: ActionInputs
): Promise<void> {
  try {
    const { command } = inputs
    debug(`Running ${command} in stage: ${stage}`)
    importCommand(command).then((mod: unknown) => {
      return (mod as ActionCommand)(stage, inputs)
    })
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message)
    }
  }
}
