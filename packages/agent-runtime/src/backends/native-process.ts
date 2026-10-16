import { realpath, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { z } from 'zod'
import type { Processes } from '../process/manager'
import { readBounded } from '../tools/paths'
export type NativeName = 'claude' | 'codex'
export const certifiedVersions = { claude: '2.1.299', codex: '0.162.1' }
export async function nativeExecutable(name: NativeName) {
  const suffix = process.platform === 'win32' ? '.exe' : ''
  const candidates = [
    Bun.which(name + suffix),
    join(homedir(), '.local', 'bin', name + suffix),
    join(homedir(), '.bun', 'bin', name + suffix),
  ]
  if (name === 'claude' && process.env.APPDATA)
    candidates.push(
      join(
        process.env.APPDATA,
        'npm',
        'node_modules',
        '@anthropic-ai',
        'claude-code',
        'bin',
        'claude.exe',
      ),
    )
  for (const candidate of candidates) {
    if (
      !candidate ||
      !isAbsolute(candidate) ||
      (process.platform === 'win32' && !candidate.endsWith('.exe'))
    )
      continue
    try {
      const actual = await realpath(candidate)
      if ((await stat(actual)).isFile()) return actual
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
    }
  }
  throw new Error(`${name} executable not found. Install the official client.`)
}
export async function nativeVersion(
  processes: Processes,
  name: NativeName,
  workspace: string,
  signal: AbortSignal,
) {
  const executable = await nativeExecutable(name)
  const result = await processes.run(
    { executable, args: ['--version'], cwd: workspace, timeoutMs: 15000, maxBytes: 8000 },
    signal,
  )
  if (result.code !== 0 || result.reason !== 'exited')
    throw new Error(`${name} version probe failed`)
  const version = /\d+\.\d+\.\d+/.exec(result.output)?.[0]
  if (!version) throw new Error(`${name} version response not recognized`)
  return { executable, version, certified: version === certifiedVersions[name] }
}
export async function claudeAccount(
  processes: Processes,
  workspace: string,
  directory: string,
  signal: AbortSignal,
) {
  const info = await nativeVersion(processes, 'claude', workspace, signal)
  const result = await processes.run(
    {
      executable: info.executable,
      args: ['auth', 'status', '--json'],
      cwd: workspace,
      timeoutMs: 15000,
      maxBytes: 32000,
    },
    signal,
  )
  // This probe contains identity data. Only the sanitized projection is exposed.
  const raw = await readBounded(join(directory, 'logs', result.log), 32000)
  const account = z
    .object({
      loggedIn: z.boolean(),
      authMethod: z.string().optional(),
      subscriptionType: z.string().nullable().optional(),
    })
    .parse(JSON.parse(raw.toString()))
  return {
    ...info,
    connected: account.loggedIn && account.authMethod === 'claude.ai',
    method: account.authMethod ?? 'none',
    subscription: account.subscriptionType ?? null,
  }
}
