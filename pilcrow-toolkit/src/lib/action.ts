import { ActionInputs } from '../types.js'
import type { ActionCommand, ActionDefinition, ActionStage } from '../types.ts'

export function runCommand(definition: ActionDefinition): ActionCommand {
  return function (stage: ActionStage, inputs: ActionInputs): Promise<void> {
    return !!definition[stage] ? definition[stage](inputs) : Promise.resolve()
  }
}
