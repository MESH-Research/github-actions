import * as exec from '@actions/exec'

export async function getCommandOutput(
  command: string,
  args: string[]
): Promise<string> {
  const output = await exec.getExecOutput(command, args, { silent: true })
  if (output.exitCode !== 0) {
    throw new Error(
      `Command failed: ${args?.join(' ')}, exit code: ${output.exitCode}`
    )
  }
  return output.stdout
}
