import { spawn } from 'node:child_process'

export function getCommandOutput(
  command: string,
  args: string[],
  timeoutMs?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    child.stdin.end()
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })
    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    let timer: ReturnType<typeof setTimeout> | undefined
    if (timeoutMs) {
      timer = setTimeout(() => {
        child.kill('SIGKILL')
        reject(
          new Error(
            `Command timed out after ${timeoutMs}ms: ${command} ${args.join(' ')}`
          )
        )
      }, timeoutMs)
    }

    child.on('close', (code) => {
      if (timer) clearTimeout(timer)
      if (code !== 0) {
        reject(
          new Error(
            `Command failed: ${command} ${args.join(' ')}, exit code: ${code}\n${stderr}`
          )
        )
      } else {
        resolve(stdout)
      }
    })

    child.on('error', (err) => {
      if (timer) clearTimeout(timer)
      reject(err)
    })
  })
}
