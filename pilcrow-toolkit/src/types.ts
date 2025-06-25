export type ActionStage = 'pre' | 'main' | 'post'

export type ActionCommand = (
  stage: ActionStage,
  inputs: ActionInputs
) => Promise<void>

export type ActionInputs = {
  dockerMetadata: string
  bakeFiles: string[]
  target: string
  command: Commands
  token: string
  orasActor: string
  outputCachePath: string
  orasBundleType: string
  imageTemplate: string
  registryCachePattern: string
  registryPublishPattern: string
}

export type Commands = 'setup' | 'pre-build' | 'parse-build-output'

export interface ActionDefinition {
  pre?: (inputs: ActionInputs) => Promise<void>
  main: (inputs: ActionInputs) => Promise<void>
  post?: (inputs: ActionInputs) => Promise<void>
}

export interface ActionCommandModule {
  runCommand: ActionCommand
}
