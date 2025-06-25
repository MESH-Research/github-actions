export type ActionStage = 'pre' | 'main' | 'post'

export type ActionCommand = (
  stage: ActionStage,
  inputs: ActionInputs
) => Promise<void>

export type ActionInputs = {
  'docker-metadata': string
  'bake-files': string[]
  target: string
  command: Commands
  token: string
  'oras-actor': string
  'output-cache-path': string
  'oras-bundle-type': string
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
