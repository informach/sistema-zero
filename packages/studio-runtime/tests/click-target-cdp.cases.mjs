// Native V8 protocol integration, called by Bun's wrapper. Chromium qualification is separate.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import inspector from 'node:inspector'
import { after, test } from 'node:test'
import {
  createClickTargetHandle,
  createClickTargetReaderInPage,
} from '../runtime/check-click-target.mjs'

assert.equal(process.versions.bun, undefined, 'This protocol contract requires native Node')
assert.ok(Number(process.versions.node.split('.')[0]) >= 24, 'Use the repository Node24 toolchain')
const session = new inspector.Session()
session.connect()
const cdp = {
  send: (method, params = {}) =>
    new Promise((accept, reject) =>
      session.post(method, params, (error, result) => (error ? reject(error) : accept(result))),
    ),
}
const scope = '__sz0123456789abcdef01234567'
const initialized = await cdp.send('Runtime.evaluate', {
  expression: await readFile(process.argv[2], 'utf8'),
  returnByValue: false,
  awaitPromise: false,
  generatePreview: false,
  objectGroup: 'owned-cdp-fixture',
})
assert.equal(initialized.exceptionDetails, undefined)
after(async () => {
  try {
    await cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'owned-cdp-fixture' })
  } finally {
    session.disconnect()
  }
})
const effects = async () =>
  (await cdp.send('Runtime.evaluate', { expression: 'authorEffects', returnByValue: true })).result
    .value
const withHandle = async (body) => {
  const handle = await createClickTargetHandle(cdp, createClickTargetReaderInPage, {
    scope,
    maxGroupItems: 64,
  })
  try {
    return await body(handle)
  } finally {
    await handle.dispose()
  }
}
const isActualSprite = async (reference) => {
  const reply = await cdp.send('Runtime.callFunctionOn', {
    objectId: reference.objectId,
    functionDeclaration: 'function(){return this===globalThis.sprite}',
    returnByValue: true,
    awaitPromise: false,
    generatePreview: false,
  })
  return reply.result.value
}

test('ordinary creative namespaces preserve four-segment paths and real object identity', async () => {
  await withHandle(async (handle) => {
    assert.equal(await isActualSprite(await handle.resolve('sprite')), true)
    assert.equal(await isActualSprite(await handle.resolve('jogo.cena.alvos.personagem')), true)
    assert.equal(await isActualSprite(await handle.resolve('taggedNamespace.personagem')), true)
    assert.equal(await effects(), 0)
  })
})

test('Proxy intermediate is refused before author descriptor/get/ownKeys traps', async () => {
  await withHandle(async (handle) => {
    await assert.rejects(handle.resolve('namespaceProxy.personagem'), /Proxy/)
    assert.equal(await effects(), 0)
  })
})

test('final Proxy and Proxy group are refused without author traps', async () => {
  await withHandle(async (handle) => {
    await assert.rejects(handle.resolve('targetProxyNamespace.personagem'), /Proxy/)
    await assert.rejects(handle.resolve('groupProxy'), /Proxy/)
    assert.equal(await effects(), 0)
  })
})

test('accessors and revoked Proxy remain unavailable without execution', async () => {
  await withHandle(async (handle) => {
    await assert.rejects(handle.resolve('accessorNamespace.personagem'), /observável/)
    await assert.rejects(handle.resolve('revokedNamespace.personagem'), /Proxy/)
    assert.equal(await effects(), 0)
  })
})

test('a Proxy returned as the preexisting scope wrapper is refused before reading v', async () => {
  await withHandle(async (handle) => {
    await assert.rejects(handle.resolve('fakeBox'), /Proxy/)
    assert.equal(await effects(), 0)
  })
})

test('forbidden/deeper paths are rejected on host without another scope call', async () => {
  let calls = 0
  const observed = {
    send: (method, params) => {
      if (method === 'Runtime.callFunctionOn') calls++
      return cdp.send(method, params)
    },
  }
  const handle = await createClickTargetHandle(observed, createClickTargetReaderInPage, {
    scope,
    maxGroupItems: 64,
  })
  try {
    for (const path of ['jogo.__proto__.personagem', 'jogo.constructor.personagem', 'a.b.c.d.e'])
      await assert.rejects(handle.resolve(path), /Caminho/)
    assert.equal(calls, 0)
  } finally {
    await handle.dispose()
  }
})

test('factory result lost before ownership is returned still releases the real CDP object group', async () => {
  let createdId,
    released = 0
  const corrupted = {
    send: async (method, params) => {
      const reply = await cdp.send(method, params)
      if (method === 'Runtime.evaluate') {
        createdId = reply.result.objectId
        return { ...reply, result: { type: 'undefined' } }
      }
      if (method === 'Runtime.releaseObjectGroup') released++
      return reply
    },
  }
  await assert.rejects(
    createClickTargetHandle(corrupted, createClickTargetReaderInPage, { scope, maxGroupItems: 64 }),
    /observar/,
  )
  assert.ok(createdId)
  assert.equal(released, 1)
  await assert.rejects(
    cdp.send('Runtime.getProperties', { objectId: createdId, ownProperties: true }),
    /object|Object|context/,
  )
})
