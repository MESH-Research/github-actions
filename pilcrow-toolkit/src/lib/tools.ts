import * as exec from '@actions/exec'

export async function getCommandOutput(
  command: string,
  args: string[],
  timeoutMs?: number
): Promise<string> {
  const controller = timeoutMs ? new AbortController() : undefined
  const timer = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : undefined

  try {
    const output = await exec.getExecOutput(command, args, {
      silent: true,
      ...(controller && { abortSignal: controller.signal })
    })
    if (output.exitCode !== 0) {
      throw new Error(
        `Command failed: ${args?.join(' ')}, exit code: ${output.exitCode}`
      )
    }
    return output.stdout
  } finally {
    if (timer) clearTimeout(timer)
  }
}
