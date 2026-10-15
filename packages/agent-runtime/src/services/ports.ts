import { createServer } from 'node:net'
import { join } from 'node:path'
import { z } from 'zod'
import type { Processes } from '../process/manager'
import { readBounded } from '../tools/paths'

export async function assertFreePort(port: number) {
  const listener = createServer()
  await new Promise<void>((resolve, reject) => {
    listener.once('error', reject)
    listener.listen({ host: '127.0.0.1', port, exclusive: true }, resolve)
  })
  await new Promise<void>((resolve, reject) =>
    listener.close((error) => (error ? reject(error) : resolve())),
  )
}
export async function assertOwnedPort(
  processes: Processes,
  profile: string,
  rootPid: number,
  port: number,
  signal: AbortSignal,
) {
  if (process.platform !== 'win32')
    throw new Error('Local port ownership is not homologated on this OS; use a container')
  z.number().int().min(1).max(65535).parse(port)
  const script =
    '$ErrorActionPreference="Stop"; $listeners=@(Get-NetTCPConnection -State Listen | Where-Object {$_.LocalPort -eq ' +
    port +
    '} | Select-Object -ExpandProperty OwningProcess -Unique); $items=@(Get-CimInstance Win32_Process | ForEach-Object { @{id=[int]$_.ProcessId;parent=[int]$_.ParentProcessId;created=$_.CreationDate.ToUniversalTime().ToString("o")} }); @{listeners=$listeners;processes=$items}|ConvertTo-Json -Compress -Depth 4'
  const result = await processes.run(
    {
      executable: 'powershell.exe',
      args: [
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(script, 'utf16le').toString('base64'),
      ],
      cwd: profile,
      timeoutMs: 15000,
      maxBytes: 2_000_000,
      logMode: 'stdout',
    },
    signal,
  )
  if (result.code !== 0 || result.reason !== 'exited')
    throw new Error(
      `Could not establish port ownership (${result.reason}, exit ${result.code}; log ${result.log})`,
    )
  const report = z
    .object({
      listeners: z.array(z.number().int()),
      processes: z
        .array(z.object({ id: z.number().int(), parent: z.number().int(), created: z.string() }))
        .max(20000),
    })
    .parse(
      JSON.parse(
        (await readBounded(join(profile, 'logs', result.log), 2_000_000)).toString('utf8'),
      ),
    )
  if (!report.listeners.length) throw new Error('Port has no listener')
  const processesById = new Map(report.processes.map((item) => [item.id, item]))
  for (const listener of report.listeners) {
    let current = processesById.get(listener)
    let owned = false
    const seen = new Set<number>()
    while (current && !seen.has(current.id)) {
      if (current.id === rootPid) {
        owned = true
        break
      }
      seen.add(current.id)
      const parent = processesById.get(current.parent)
      if (!parent || Date.parse(parent.created) > Date.parse(current.created)) break
      current = parent
    }
    if (!owned)
      throw new Error('Port belongs to another process; it cannot be accepted as this preview')
  }
}
