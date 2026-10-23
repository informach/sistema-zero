import { expect, it } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { PYTHON_LANGUAGE_LIMITS } from '@sistemazero/core/studio/python-language'
import { PythonLanguageSession } from '../runtime/pyright'

const signal = () => AbortSignal.timeout(15_000)
it('preserves ordered syncs and queries for the new revision while cancelling obsolete queries', async () => {
  const root = resolve(
    import.meta.dirname,
    '../../../.cache/studio-language-tests',
    crypto.randomUUID(),
  )
  await mkdir(root, { recursive: true })
  const session = new PythonLanguageSession({
    providedModules: [],
    root,
    nodePath: Bun.which('node')!,
    serverPath: createRequire(import.meta.url).resolve('pyright/langserver.index.js'),
  })
  try {
    const first = session.handle(
      {
        version: 1,
        id: 'first',
        kind: 'sync',
        entrypoint: 'main.py',
        baseRevision: 0,
        revision: 1,
        changes: [{ path: 'main.py', version: 1, source: 'x=1\n' }],
      },
      signal(),
    )
    const current = session.handle(
      {
        version: 1,
        id: 'current',
        kind: 'query',
        revision: 1,
        path: 'main.py',
        documentVersion: 1,
        method: 'symbols',
      },
      signal(),
    )
    expect((await first).kind).toBe('synced')
    expect((await current).kind).toBe('result')
    const second = session.handle(
      {
        version: 1,
        id: 'second',
        kind: 'sync',
        entrypoint: 'main.py',
        baseRevision: 1,
        revision: 2,
        changes: [{ path: 'main.py', version: 2, source: 'x=2\n' }],
      },
      signal(),
    )
    const third = session.handle(
      {
        version: 1,
        id: 'third',
        kind: 'sync',
        entrypoint: 'main.py',
        baseRevision: 2,
        revision: 3,
        changes: [{ path: 'main.py', version: 3, source: 'x=3\n' }],
      },
      signal(),
    )
    const latest = session.handle(
      {
        version: 1,
        id: 'latest',
        kind: 'query',
        revision: 3,
        path: 'main.py',
        documentVersion: 3,
        method: 'symbols',
      },
      signal(),
    )
    expect(await Promise.all([second, third, latest])).toMatchObject([
      { kind: 'synced', revision: 2 },
      { kind: 'synced', revision: 3 },
      { kind: 'result', revision: 3 },
    ])
  } finally {
    session.dispose()
  }
}, 20_000)

it('releases cancelled boot and queue waiters without killing shared initialization', async () => {
  const root = resolve(
    import.meta.dirname,
    '../../../.cache/studio-language-tests',
    crypto.randomUUID(),
  )
  await mkdir(root, { recursive: true })
  const runtime = resolve(root, 'slow-lsp.cjs')
  await writeFile(
    runtime,
    String.raw`let buf=Buffer.alloc(0);process.stdin.on('data',x=>{buf=Buffer.concat([buf,x]);for(;;){const p=buf.indexOf('\r\n\r\n');if(p<0)return;const n=Number(/Content-Length: (\d+)/i.exec(buf.subarray(0,p).toString())[1]);if(buf.length<p+4+n)return;const q=JSON.parse(buf.subarray(p+4,p+4+n).toString());buf=buf.subarray(p+4+n);if(q.id!==undefined){const result=q.method==='initialize'?{capabilities:{completionProvider:{}}}:[];setTimeout(()=>{const b=JSON.stringify({jsonrpc:'2.0',id:q.id,result});process.stdout.write('Content-Length: '+Buffer.byteLength(b)+'\r\n\r\n'+b);},q.method==='initialize'?900:0)}}});`,
  )
  const session = new PythonLanguageSession({
    providedModules: [],
    root,
    nodePath: Bun.which('node')!,
    serverPath: runtime,
  })
  try {
    const controller = new AbortController(),
      began = performance.now()
    const pending = session.handle(
      {
        version: 1,
        id: 'aborted',
        kind: 'query',
        revision: 1,
        path: 'main.py',
        documentVersion: 1,
        method: 'symbols',
      },
      controller.signal,
    )
    controller.abort()
    expect(await pending).toMatchObject({ kind: 'error', code: 'cancelled' })
    expect(performance.now() - began).toBeLessThan(400)
    expect(
      await session.handle(
        {
          version: 1,
          id: 'sync',
          kind: 'sync',
          entrypoint: 'main.py',
          baseRevision: 0,
          revision: 1,
          changes: [{ path: 'main.py', version: 1, source: 'x=1\n' }],
        },
        signal(),
      ),
    ).toMatchObject({ kind: 'synced' })
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    Reflect.set(session, 'tail', gate)
    const waiting = new AbortController(),
      queuedAt = performance.now()
    const queued = session.handle(
      {
        version: 1,
        id: 'queued',
        kind: 'query',
        revision: 1,
        path: 'main.py',
        documentVersion: 1,
        method: 'symbols',
      },
      waiting.signal,
    )
    await Promise.resolve()
    waiting.abort()
    expect(await queued).toMatchObject({ kind: 'error', code: 'cancelled' })
    expect(performance.now() - queuedAt).toBeLessThan(400)
    release()
    expect(
      await session.handle(
        {
          version: 1,
          id: 'after',
          kind: 'query',
          revision: 1,
          path: 'main.py',
          documentVersion: 1,
          method: 'symbols',
        },
        signal(),
      ),
    ).toMatchObject({ kind: 'result' })
  } finally {
    session.dispose()
  }
}, 10_000)

it('does not arm a termination watchdog after the RPC has already settled', async () => {
  const controller = new AbortController()
  let disposed = 0
  const owner = {
    rpc: {
      sendRequest() {
        const result = Promise.resolve([])
        queueMicrotask(() => queueMicrotask(() => controller.abort()))
        return result
      },
    },
    dispose() {
      disposed++
    },
  }
  // Control real promise ordering at the transport seam; reproduces the settlement/abort microtask race.
  const request = Reflect.get(PythonLanguageSession.prototype, 'request') as (
    method: string,
    params: unknown,
    signal: AbortSignal,
  ) => Promise<unknown>
  try {
    await request.call(owner, 'textDocument/hover', {}, controller.signal)
  } catch {}
  await Bun.sleep(1100)
  expect(disposed).toBe(0)
})

it('counts physically queued updates until they drain even after their callers cancel', async () => {
  const root = resolve(
    import.meta.dirname,
    '../../../.cache/studio-language-tests',
    crypto.randomUUID(),
  )
  await mkdir(root, { recursive: true })
  const session = new PythonLanguageSession({
    providedModules: [],
    root,
    nodePath: Bun.which('node')!,
    serverPath: createRequire(import.meta.url).resolve('pyright/langserver.index.js'),
  })
  let release = () => {}
  try {
    await Reflect.get(session, 'ready')
    Reflect.set(
      session,
      'tail',
      new Promise<void>((resolve) => {
        release = resolve
      }),
    )
    let accepted = 0,
      refused = 0
    for (let index = 0; index < 40; index++) {
      const before = Reflect.get(session, 'tail')
      const controller = new AbortController()
      let finished = false
      const pending = session
        .handle(
          {
            version: 1,
            id: `q${index}`,
            kind: 'sync',
            entrypoint: 'main.py',
            baseRevision: 0,
            revision: 1,
            changes: [{ path: 'main.py', version: 1, source: `#${index}${'x'.repeat(100_000)}` }],
          },
          controller.signal,
        )
        .then((reply) => {
          finished = true
          return reply
        })
      while (!finished && Reflect.get(session, 'tail') === before) await Bun.sleep(0)
      if (Reflect.get(session, 'tail') !== before) accepted++
      controller.abort()
      const reply = await pending
      if (reply.kind === 'error' && reply.code === 'quota-exceeded') refused++
    }
    expect(accepted).toBe(PYTHON_LANGUAGE_LIMITS.maxQueuedSyncs)
    expect(refused).toBe(40 - PYTHON_LANGUAGE_LIMITS.maxQueuedSyncs)
    release()
    await Reflect.get(session, 'tail')
    expect(
      await session.handle(
        {
          version: 1,
          id: 'next',
          kind: 'sync',
          entrypoint: 'main.py',
          baseRevision: 0,
          revision: 1,
          changes: [{ path: 'main.py', version: 1, source: 'x=1\n' }],
        },
        signal(),
      ),
    ).toMatchObject({ kind: 'synced' })
  } finally {
    release()
    session.dispose()
  }
}, 15_000)
