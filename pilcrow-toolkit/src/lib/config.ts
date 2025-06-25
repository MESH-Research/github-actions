import { getInput, getMultilineInput } from '@actions/core'
import { ActionInputs, Commands } from '../types.js'

export function getInputs(): ActionInputs {
  return {
    dockerMetadata: getInput('docker-metadata'),
    bakeFiles: getMultilineInput('bake-files'),
    target: getInput('target'),
    command: getInput('command', { required: true }) as Commands,
    orasBundleType: getInput('oras-bundle-type'),
    token: getInput('token'),
    orasActor: getInput('oras-actor'),
    outputCachePath: getInput('output-cache-path'),
    imageTemplate: getInput('image-template'),
    registryCachePattern: getInput('registry-cache-pattern').toLowerCase(),
    registryPublishPattern: getInput('registry-publish-pattern').toLowerCase()
  }
}
