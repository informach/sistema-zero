import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { createConnection } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RuntimeClient } from '../src/client'
import { Credentials } from '../src/credentials'
import { endpoint, listen } from '../src/ipc/server'
import { Frames } from '../src/ipc/transport'

test('mutual authentication, independent clients, invalid proof rejected', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-ipc-'))
  const host = await listen(directory, async (command) => command.params)
  try {
    const client = await RuntimeClient.connect(directory)
    expect(await client.request('echo', { hello: 'olá' })).toEqual({ hello: 'olá' })
    if (process.platform === 'win32') {
      const alias = directory.toUpperCase()
      expect(endpoint(alias)).toBe(endpoint(directory))
      const second = await RuntimeClient.connect(alias)
      try {
        expect(await second.request('echo', { alias: true })).toEqual({ alias: true })
      } finally {
        second.close()
      }
      await expect(listen(alias, async () => null)).rejects.toThrow()
    }
    client.close()
    await new Promise<void>((resolve, reject) => {
      const socket = createConnection(endpoint(directory))
      const frames = new Frames(socket)
      socket.setTimeout(3000, () => {
        socket.destroy()
        reject(new Error('Unauthorized socket remained open'))
      })
      socket.on('error', () => {})
      frames.once('message', () => frames.send({ auth: 'wrong' }))
      socket.once('close', () => resolve())
    })
  } finally {
    await host.close()
    await new Credentials(directory).delete('ipc')
  }
})

test('canceling a request reaches its handler and preserves the authenticated connection', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-ipc-cancel-'))
  let entered!: () => void, canceled!: () => void
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  const stopped = new Promise<void>((resolve) => {
    canceled = resolve
  })
  const host = await listen(directory, async (command, signal) => {
    if (command.method !== 'wait') return { alive: true }
    entered()
    await new Promise<void>((resolve) => {
      signal.addEventListener(
        'abort',
        () => {
          canceled()
          resolve()
        },
        { once: true },
      )
    })
    signal.throwIfAborted()
  })
  const client = await RuntimeClient.connect(directory)
  try {
    const controller = new AbortController()
    const pending = client.request('wait', {}, controller.signal).catch((error) => String(error))
    await started
    controller.abort(new Error('test cancellation'))
    expect(await pending).toContain('test cancellation')
    await stopped
    expect(await client.request('echo')).toEqual({ alive: true })
  } finally {
    client.close()
    await host.close()
    await new Credentials(directory).delete('ipc')
  }
})
