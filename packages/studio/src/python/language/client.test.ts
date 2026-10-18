import { expect, it } from 'bun:test'
import type { PythonLanguageCommand } from '@sistemazero/core/studio/python-language'
import type {
  PythonLanguageConnection,
  PythonLanguageProvider,
  PythonLanguageReply,
} from '@sistemazero/core/studio/python-language-results'
import { createPythonLanguageClient } from './client'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const tree = (value: string) => ({
  'main.py': { kind: 'file' as const, content: value },
  'pyrightconfig.json': { kind: 'file' as const, content: '{"extraPaths":["/private"]}' },
})
const empty = (
  command: Extract<PythonLanguageCommand, { kind: 'query' }>,
): PythonLanguageReply => ({
  version: 1,
  id: command.id,
  kind: 'result',
  method: 'symbols',
  revision: command.revision,
  path: command.path,
  documentVersion: command.documentVersion,
  result: [],
})
function transport() {
  const commands: PythonLanguageCommand[] = []
  let closed = 0,
    opened = 0
  let handler = (command: PythonLanguageCommand): Promise<PythonLanguageReply> =>
    Promise.resolve(
      command.kind === 'sync'
        ? { version: 1, id: command.id, kind: 'synced', revision: command.revision }
        : command.kind === 'query'
          ? empty(command)
          : { version: 1, id: command.id, kind: 'ack' },
    )
  const connection: PythonLanguageConnection = {
    send(command) {
      commands.push(command)
      return handler(command)
    },
    close() {
      closed++
    },
  }
  const provider: PythonLanguageProvider = {
    async open() {
      opened++
      return connection
    },
  }
  return {
    commands,
    provider,
    setHandler(value: typeof handler) {
      handler = value
    },
    counts: () => ({ closed, opened }),
  }
}

it('synchronizes entrypoint-only changes and discards an old query without reopening the native session', async () => {
  const f = transport()
  let entrypoint = 'main.py'
  const client = createPythonLanguageClient(f.provider, 'project', () => entrypoint)
  const sources = {
    'main.py': { kind: 'file' as const, content: 'x=1' },
    'game.py': { kind: 'file' as const, content: 'x=2' },
  }
  client.update(sources)
  await client.query('symbols', 'main.py')
  const held = deferred<PythonLanguageReply>()
  const sent = deferred<void>()
  f.setHandler(async (command) => {
    if (command.kind === 'query') {
      sent.resolve()
      return held.promise
    }
    if (command.kind === 'sync')
      return { version: 1, id: command.id, kind: 'synced', revision: command.revision }
    return { version: 1, id: command.id, kind: 'ack' }
  })
  const pending = client.query('symbols', 'main.py').then(
    () => false,
    () => true,
  )
  await sent.promise
  const old = f.commands.at(-1)
  if (old?.kind !== 'query') throw new Error('Expected pending query')
  entrypoint = 'game.py'
  client.update(sources)
  held.resolve(empty(old))
  expect(await pending).toBe(true)
  f.setHandler(async (command) =>
    command.kind === 'sync'
      ? { version: 1, id: command.id, kind: 'synced', revision: command.revision }
      : command.kind === 'query'
        ? empty(command)
        : { version: 1, id: command.id, kind: 'ack' },
  )
  await client.query('symbols', 'game.py')
  const syncs = f.commands.filter((command) => command.kind === 'sync')
  expect(syncs).toHaveLength(2)
  expect(syncs[1]).toMatchObject({
    entrypoint: 'game.py',
    changes: [],
    baseRevision: 1,
    revision: 2,
  })
  expect(f.counts()).toEqual({ opened: 1, closed: 0 })
  client.dispose()
})

it('sends only source files and incremental edits, preserving versions through delete/recreate', async () => {
  const remote = transport(),
    client = createPythonLanguageClient(remote.provider, 'project', 'main.py')
  try {
    client.update(tree('x=1\n'))
    await client.query('symbols', 'main.py')
    expect(remote.commands[0]).toMatchObject({
      kind: 'sync',
      baseRevision: 0,
      revision: 1,
      changes: [{ path: 'main.py', version: 1, source: 'x=1\n' }],
    })
    await client.query('symbols', 'main.py')
    expect(remote.commands.filter((c) => c.kind === 'sync')).toHaveLength(1)
    client.update(tree('x=2\n'))
    await client.query('symbols', 'main.py')
    expect(remote.commands.filter((c) => c.kind === 'sync').at(-1)).toMatchObject({
      baseRevision: 1,
      revision: 2,
      changes: [{ path: 'main.py', version: 2, source: 'x=2\n' }],
    })
    client.update({ 'other.py': { kind: 'file', content: 'x=0\n' } })
    await client.query('symbols', 'other.py')
    client.update(tree('x=3\n'))
    await client.query('symbols', 'main.py')
    expect(remote.commands.filter((c) => c.kind === 'sync').at(-1)).toMatchObject({
      revision: 4,
      changes: expect.arrayContaining([{ path: 'main.py', version: 4, source: 'x=3\n' }]),
    })
  } finally {
    client.dispose()
  }
  expect(remote.counts()).toEqual({ opened: 1, closed: 1 })
})

it('rejects a delayed A→B→A result even when its source text matches again', async () => {
  const remote = transport(),
    client = createPythonLanguageClient(remote.provider, 'project', 'main.py'),
    entered = deferred<void>(),
    reply = deferred<PythonLanguageReply>()
  let saved!: Extract<PythonLanguageCommand, { kind: 'query' }>
  remote.setHandler(async (command) => {
    if (command.kind === 'sync')
      return { version: 1, id: command.id, kind: 'synced', revision: command.revision }
    if (command.kind === 'query') {
      saved = command
      entered.resolve()
      return reply.promise
    }
    return { version: 1, id: command.id, kind: 'ack' }
  })
  try {
    client.update(tree('x=1\n'))
    const result = client.query('symbols', 'main.py').then(
      () => false,
      () => true,
    )
    await entered.promise
    client.update(tree('x=2\n'))
    client.update(tree('x=1\n'))
    reply.resolve(empty(saved))
    expect(await result).toBe(true)
    expect(remote.commands.some((c) => c.kind === 'cancel' && c.requestId === saved.id)).toBe(true)
  } finally {
    client.dispose()
  }
})

it('does not acknowledge an old connection after retry, and resends a full source snapshot', async () => {
  const remote = transport(),
    client = createPythonLanguageClient(remote.provider, 'project', 'main.py'),
    entered = deferred<void>(),
    reply = deferred<PythonLanguageReply>()
  let old!: Extract<PythonLanguageCommand, { kind: 'sync' }>,
    first = true
  remote.setHandler(async (command) => {
    if (command.kind === 'sync') {
      if (first) {
        first = false
        old = command
        entered.resolve()
        return reply.promise
      }
      return { version: 1, id: command.id, kind: 'synced', revision: command.revision }
    }
    return command.kind === 'query' ? empty(command) : { version: 1, id: command.id, kind: 'ack' }
  })
  try {
    client.update(tree('x=1\n'))
    const stale = client.query('symbols', 'main.py').then(
      () => false,
      () => true,
    )
    await entered.promise
    client.retry()
    const current = client.query('symbols', 'main.py')
    expect(await stale).toBe(true)
    // The revoked transport deliberately ignores AbortSignal and has not answered.
    // A healthy new connection must finish without depending on that old response.
    expect(await current).toEqual([])
    reply.resolve({ version: 1, id: old.id, kind: 'synced', revision: old.revision })
    const updates = remote.commands.filter((c) => c.kind === 'sync')
    expect(updates).toHaveLength(2)
    expect(updates[1]).toMatchObject({
      baseRevision: 0,
      revision: 1,
      changes: [{ path: 'main.py', version: 1, source: 'x=1\n' }],
    })
  } finally {
    client.dispose()
  }
  expect(remote.counts()).toEqual({ opened: 2, closed: 2 })
})

it('refuses over-quota sources before opening a paid analysis session', async () => {
  const remote = transport(),
    client = createPythonLanguageClient(remote.provider, 'project', 'main.py')
  try {
    client.update(tree('x'.repeat(1024 * 1024 + 1)))
    await expect(client.query('symbols', 'main.py')).rejects.toThrow('limite')
    expect(remote.counts().opened).toBe(0)
  } finally {
    client.dispose()
  }
})

it('closes a connection that arrives after its editor retires and keeps the next entrypoint independent', async () => {
  const entered = deferred<void>(),
    opened = deferred<PythonLanguageConnection>(),
    closed = deferred<void>()
  let lateClosed = 0
  const retired = createPythonLanguageClient(
    {
      async open() {
        entered.resolve()
        return opened.promise
      },
    },
    'same-project',
    'src/main.py',
  )
  retired.update({ 'src/main.py': { kind: 'file', content: 'pass\n' } })
  const late = retired.query('symbols', 'src/main.py').catch((error: unknown) => error)
  await entered.promise
  retired.dispose()
  const remote = transport()
  const current = createPythonLanguageClient(remote.provider, 'same-project', 'game/main.py')
  try {
    current.update({ 'game/main.py': { kind: 'file', content: 'pass\n' } })
    expect(await current.query('symbols', 'game/main.py')).toEqual([])
    expect(remote.commands[0]).toMatchObject({
      kind: 'sync',
      entrypoint: 'game/main.py',
      baseRevision: 0,
    })
    opened.resolve({
      async send() {
        throw new Error('A retired connection must never receive source')
      },
      close() {
        lateClosed++
        closed.resolve()
      },
    })
    expect(await late).toBeInstanceOf(Error)
    await closed.promise
    expect(lateClosed).toBe(1)
    expect(remote.counts().closed).toBe(0)
  } finally {
    current.dispose()
  }
})
