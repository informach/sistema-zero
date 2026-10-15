import { createHash, randomBytes } from 'node:crypto'
import { chmod, unlink } from 'node:fs/promises'
import { createServer, type Server } from 'node:net'
import { join } from 'node:path'
import { type Command, commandSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { Credentials } from '../credentials'
import { lockProfile } from '../process/profile-lock'
import { protectWindows } from '../process/security'
import { profileIdentity } from '../profile-identity'
import { Frames, proof, verify } from './transport'

export function endpoint(directory: string) {
  const hash = createHash('sha256').update(profileIdentity(directory)).digest('hex').slice(0, 24)
  return process.platform === 'win32'
    ? `\\\\.\\pipe\\sistemazero-${hash}`
    : join(directory, 'runtime.sock')
}
const authSchema = z.object({ auth: z.string() })
export async function listen(
  directory: string,
  handle: (command: Command, signal: AbortSignal) => Promise<unknown>,
) {
  const ownership = await lockProfile(directory)
  const credentials = new Credentials(directory)
  let secret = ''
  let ready!: () => void
  const initialized = new Promise<void>((resolve) => {
    ready = resolve
  })
  const connections = new Set<import('node:net').Socket>()
  const server = createServer((socket) => {
    if (connections.size >= 32) {
      socket.destroy()
      return
    }
    connections.add(socket)
    const abort = new AbortController()
    socket.on('close', () => {
      connections.delete(socket)
      abort.abort()
    })
    socket.on('error', () => {
      abort.abort()
    })
    const frames = new Frames(socket)
    let authenticated = false
    let inflight = 0
    const requests = new Map<string, AbortController>()
    const nonce = randomBytes(32).toString('hex')
    const timer = setTimeout(() => {
      if (!authenticated) socket.destroy()
    }, 5000)
    socket.once('close', () => clearTimeout(timer))
    frames.on('message', async (raw: unknown) => {
      try {
        await initialized
        if (!authenticated) {
          const auth = authSchema.parse(raw)
          if (!verify(secret, `client:${nonce}`, auth.auth))
            throw new Error('IPC authentication rejected')
          authenticated = true
          clearTimeout(timer)
          frames.send({ ready: true })
          return
        }
        const cancel = z
          .object({ cancel: z.string().min(1).max(128) })
          .strict()
          .safeParse(raw)
        if (cancel.success) {
          requests.get(cancel.data.cancel)?.abort(new Error('Request canceled'))
          return
        }
        const command = commandSchema.parse(raw)
        if (requests.has(command.id)) throw new Error('Duplicate request identity')
        if (inflight >= 16) throw new Error('Too many concurrent requests')
        inflight++
        const request = new AbortController()
        requests.set(command.id, request)
        try {
          const value = await handle(command, AbortSignal.any([abort.signal, request.signal]))
          frames.send({ id: command.id, ok: true, value })
        } catch (error) {
          frames.send({
            id: command.id,
            ok: false,
            error: error instanceof Error ? error.message : 'Runtime error',
            code: 'REQUEST_FAILED',
          })
        } finally {
          inflight--
          requests.delete(command.id)
        }
      } catch (error) {
        socket.destroy(error instanceof Error ? error : new Error('Invalid IPC command'))
      }
    })
    void initialized
      .then(() => {
        if (!socket.destroyed)
          frames.send({ protocol: 1, nonce, proof: proof(secret, `server:${nonce}`) })
      })
      .catch((error) => socket.destroy(error))
  })
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(endpoint(directory), () => {
        server.off('error', reject)
        resolve()
      })
    })
  } catch (error) {
    await ownership.close()
    throw error
  }
  try {
    if (process.platform !== 'win32') await chmod(endpoint(directory), 0o600)
    else await protectWindows('pipe', endpoint(directory))
    secret = (await credentials.get('ipc')) ?? randomBytes(32).toString('hex')
    await credentials.set('ipc', secret)
    ready()
  } catch (error) {
    for (const connection of connections) connection.destroy()
    try {
      await closeServer(server)
    } finally {
      await ownership.close()
    }
    throw error
  }
  return {
    server,
    close: async () => {
      for (const connection of connections) connection.destroy()
      try {
        await closeServer(server)
      } finally {
        await ownership.close()
      }
      if (process.platform !== 'win32')
        await unlink(endpoint(directory)).catch((error) => {
          if (error.code !== 'ENOENT') throw error
        })
    },
  }
}
function closeServer(server: Server) {
  return new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
}
