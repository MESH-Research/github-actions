import { getInput, getMultilineInput } from '@actions/core'
import { ActionInputs, Commands } from '../types.js'

export function getInputs(): ActionInputs {
  return {
    'docker-metadata': getInput('docker-metadata'),
    'bake-files': getMultilineInput('bake-files'),
    target: getInput('target'),
    command: getInput('command', { required: true }) as Commands,
    'oras-bundle-type': getInput('oras-bundle-type'),
    token: getInput('token'),
    'oras-actor': getInput('oras-actor'),
    'output-cache-path': getInput('output-cache-path')
  }
}
