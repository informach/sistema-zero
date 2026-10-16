import { createServer } from 'node:net'
import { z } from 'zod'
import type { Processes } from '../process/manager'
import { verifyWindowsPort } from '../process/windows'

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
  const owner = [...processes.active.values()].find((item) => item.pid === rootPid)
  if (!owner?.jobName) throw new Error('Service process is no longer owned by this runtime')
  await verifyWindowsPort(profile, owner.jobName, port, signal)
  if (![...processes.active.values()].includes(owner))
    throw new Error('Service process exited during port verification')
}
