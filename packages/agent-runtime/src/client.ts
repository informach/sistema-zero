import { spawn } from 'node:child_process'
import { createConnection, type Socket } from 'node:net'
import { fileURLToPath } from 'node:url'
import { responseSchema } from '@sistemazero/agent-core'
import { z } from 'zod'
import { profileDirectory } from './config'
import { Credentials } from './credentials'
import { endpoint } from './ipc/server'
import { Frames, proof, verify } from './ipc/transport'
import { processEnvironment } from './process/environment'

declare const ZERO_RUNTIME_ENTRY: string | undefined

const helloSchema = z.object({ protocol: z.literal(1), nonce: z.string(), proof: z.string() })
export class RuntimeClient {
  private pending = new Map<
    string,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
      timer: ReturnType<typeof setTimeout>
      cleanup: () => void
    }
  >()
  private frames: Frames
  private constructor(private socket: Socket) {
    this.frames = new Frames(socket)
  }
  static async connect(directory = profileDirectory()): Promise<RuntimeClient> {
    const secret = await new Credentials(directory).get('ipc')
    if (!secret) throw new Error('Runtime unavailable')
    const socket = createConnection(endpoint(directory))
    const client = new RuntimeClient(socket)
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.destroy()
        reject(new Error('Runtime handshake timed out'))
      }, 5000)
      const error = (err: Error) => {
        clearTimeout(timer)
        reject(err)
      }
      socket.once('error', error)
      client.frames.once('message', (raw: unknown) => {
        try {
          const hello = helloSchema.parse(raw)
          if (!verify(secret, `server:${hello.nonce}`, hello.proof))
            throw new Error('Runtime identity mismatch')
          client.frames.send({ auth: proof(secret, `client:${hello.nonce}`) })
          client.frames.once('message', (ready: unknown) => {
            try {
              z.object({ ready: z.literal(true) }).parse(ready)
              clearTimeout(timer)
              socket.off('error', error)
              resolve()
            } catch (err) {
              error(new Error(String(err)))
              socket.destroy()
            }
          })
        } catch (err) {
          error(new Error(String(err)))
          socket.destroy()
        }
      })
    })
    socket.on('error', (error) => client.fail(error))
    socket.on('close', () => client.fail(new Error('Runtime disconnected')))
    client.frames.on('message', (raw: unknown) => {
      const reply = responseSchema.safeParse(raw)
      if (!reply.success) {
        socket.destroy(new Error('Invalid runtime response'))
        return
      }
      const pending = client.pending.get(reply.data.id)
      if (!pending) return
      clearTimeout(pending.timer)
      pending.cleanup()
      client.pending.delete(reply.data.id)
      if (reply.data.ok) pending.resolve(reply.data.value)
      else pending.reject(new Error(reply.data.error))
    })
    return client
  }
  private fail(error: Error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.cleanup()
      pending.reject(error)
    }
    this.pending.clear()
  }
  request(method: string, params: unknown = {}, signal?: AbortSignal): Promise<unknown> {
    if (signal?.aborted) return Promise.reject(signal.reason)
    if (this.pending.size >= 16) return Promise.reject(new Error('Runtime request queue full'))
    if (this.socket.destroyed) return Promise.reject(new Error('Runtime disconnected'))
    const id = crypto.randomUUID()
    return new Promise((resolve, reject) => {
      const abort = () => {
        const pending = this.pending.get(id)
        if (!pending) return
        clearTimeout(pending.timer)
        pending.cleanup()
        this.pending.delete(id)
        try {
          this.frames.send({ cancel: id })
        } catch {
          /* Connection may already be closed. */
        }
        reject(signal?.reason ?? new Error('Request canceled'))
      }
      const cleanup = () => signal?.removeEventListener('abort', abort)
      const timer = setTimeout(() => {
        this.pending.delete(id)
        cleanup()
        try {
          this.frames.send({ cancel: id })
        } catch {
          /* Connection may already be closed. */
        }
        reject(new Error(`Request timed out: ${method}`))
      }, 30000)
      this.pending.set(id, { resolve, reject, timer, cleanup })
      signal?.addEventListener('abort', abort, { once: true })
      try {
        this.frames.send({ id, method, params })
      } catch (error) {
        clearTimeout(timer)
        cleanup()
        this.pending.delete(id)
        reject(error)
      }
    })
  }
  close() {
    this.socket.end()
    this.fail(new Error('Client closed'))
  }
}
export async function connectRuntime(directory = profileDirectory()) {
  try {
    return await RuntimeClient.connect(directory)
  } catch (error) {
    if (error instanceof Error && error.message.includes('identity')) throw error
  }
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL(
          typeof ZERO_RUNTIME_ENTRY === 'undefined' ? './main.ts' : ZERO_RUNTIME_ENTRY,
          import.meta.url,
        ),
      ),
    ],
    {
      detached: true,
      windowsHide: true,
      stdio: 'ignore',
      env: processEnvironment({ SISTEMAZERO_HOME: directory }),
    },
  )
  child.unref()
  let launchError: Error | undefined
  child.once('error', (error) => {
    launchError = error
  })
  const deadline = Date.now() + 10000
  while (Date.now() < deadline) {
    if (launchError) throw launchError
    try {
      return await RuntimeClient.connect(directory)
    } catch (error) {
      if (error instanceof Error && error.message.includes('identity')) throw error
      await Bun.sleep(100)
    }
  }
  throw new Error(
    'Supervisor did not become ready; run sistemazero doctor or supervisor in foreground',
  )
}
