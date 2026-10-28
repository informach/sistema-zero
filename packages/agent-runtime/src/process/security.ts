import { join, parse, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { processEnvironment } from './environment'

declare const ZERO_SECURITY_HELPER: string | undefined
export async function protectWindows(kind: 'directory' | 'pipe', target: string) {
  if (process.platform !== 'win32') return
  if (kind === 'directory' && resolve(target) === parse(resolve(target)).root)
    throw new Error('A filesystem root cannot be an agent profile')
  if (kind === 'pipe' && !/^\\\\\.\\pipe\\sistemazero-[a-f0-9]{24}$/.test(target))
    throw new Error('Invalid owned IPC endpoint')
  const source = fileURLToPath(
    new URL(
      typeof ZERO_SECURITY_HELPER === 'undefined' ? './windows-security.ps1' : ZERO_SECURITY_HELPER,
      import.meta.url,
    ),
  )
  const powershell = join(
    process.env.SystemRoot ?? 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe',
  )
  const child = Bun.spawn(
    [
      powershell,
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      source,
      '-Mode',
      kind,
      '-Target',
      target,
    ],
    { env: processEnvironment(), stdout: 'pipe', stderr: 'pipe', windowsHide: true },
  )
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    child.kill()
  }, 10000)
  try {
    const [output, errors, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    if (timedOut || code !== 0)
      throw new Error(
        `Cannot establish private ${kind} ACL (${timedOut ? 'deadline 10000ms' : `exit ${code}`}): ${errors.slice(-2000) || 'helper did not report a phase'}`,
      )
    return z
      .object({ protected: z.literal(true), kind: z.literal(kind), principals: z.literal(1) })
      .parse(JSON.parse(output))
  } finally {
    clearTimeout(timer)
  }
}
