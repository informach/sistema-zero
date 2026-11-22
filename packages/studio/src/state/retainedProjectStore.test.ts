import { afterAll, beforeAll, expect, test } from 'bun:test'
import { IDBFactory } from 'fake-indexeddb'
import { readValue, readValues, writeInOneTransaction } from './idbTransaction'
import { createProjectStorageScope, privateRegionalProjectScope } from './projectStorageRuntime'
import { prepareRetainedParts } from './retainedProjectParts'
import {
  commitRetainedProject,
  readRetainedManifest,
  readRetainedParts,
  retainedProjectKey,
} from './retainedProjectStore'

const original = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
beforeAll(() => {
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() })
})
afterAll(() => {
  if (original) Object.defineProperty(globalThis, 'indexedDB', original)
  else Reflect.deleteProperty(globalThis, 'indexedDB')
})
const origin = 'b'.repeat(64)
const sample = (id: string, text = 'Vila') => ({
  meta: { id, storageVersion: 4 },
  files: { id, files: { 'script.js': text } },
  state: { id, ir: null },
  game: { placar: 'oito' },
})
test('CAS conserva outra aba, confere V4 recente e faz GC somente da última referência privada', async () => {
  const scope = privateRegionalProjectScope('guardas-v5')
  const candidate = await prepareRetainedParts(sample('a'))
  const a = await commitRetainedProject(scope, { id: 'a', origin, expectedToken: null, candidate })
  const snapshot = await readRetainedParts(scope, a)
  expect(snapshot).toStrictEqual(sample('a'))
  const regional = await prepareRetainedParts(sample('b'))
  const b = await commitRetainedProject(scope, {
    id: 'b',
    origin,
    expectedToken: null,
    candidate: regional,
  })
  const content = candidate.parts.files!.strings[0]![1],
    bodyKey = 'sz:v5:body:' + content
  expect(await readValue(scope.store, bodyKey)).toBeString()
  await commitRetainedProject(scope, { id: 'a', origin, expectedToken: a.token, candidate: null })
  expect(await readValue(scope.store, bodyKey)).toBeString()
  await expect(readRetainedParts(scope, a)).rejects.toThrow()
  const cas = {
    id: 'b',
    origin,
    expectedToken: b.token,
    source: [['marca-antiga', undefined] as const],
    candidate: null,
  }
  await writeInOneTransaction(scope.store, { puts: [['marca-antiga', 'restauro']] })
  await expect(commitRetainedProject(scope, cas)).rejects.toThrow()
  expect(await readRetainedParts(scope, b)).toStrictEqual(sample('b'))
  const pair = await Promise.allSettled(
    [0, 1].map(() => commitRetainedProject(scope, { ...cas, source: undefined })),
  )
  expect(pair.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
  expect(await readValue(scope.store, bodyKey)).toBeUndefined()
  expect((await readRetainedManifest(scope, 'b'))?.deleted).toBe(true)
})
test('isola escopos e conserva cabeças futuras ou divergência no corpo da foto', async () => {
  const scope = privateRegionalProjectScope('futuro-v5')
  const other = privateRegionalProjectScope('outra-conta-v5')
  const candidate = await prepareRetainedParts(sample('id'))
  const head = await commitRetainedProject(scope, {
    id: 'id',
    origin,
    expectedToken: null,
    candidate,
  })
  expect(await readRetainedManifest(other, 'id')).toBeUndefined()
  await expect(
    commitRetainedProject(createProjectStorageScope('conta-publica'), {
      id: 'id',
      origin,
      expectedToken: null,
      candidate,
    }),
  ).rejects.toThrow()
  const key = retainedProjectKey('id')
  const future = JSON.stringify({ ...head, version: 2 })
  await writeInOneTransaction(scope.store, {
    puts: [['sz:v5:body:' + candidate.parts.meta!.shape, 'outra coisa']],
  })
  await expect(readRetainedParts(scope, head)).rejects.toThrow()
  await writeInOneTransaction(scope.store, { puts: [[key, future]] })
  await expect(readRetainedManifest(scope, 'id')).rejects.toThrow()
  await expect(
    commitRetainedProject(scope, { id: 'id', origin, expectedToken: head.token, candidate: null }),
  ).rejects.toThrow()
  expect(await readValues(scope.store, [key])).toEqual([future])
})

test('usa a origem e a receita capturadas quando o chamador muda seus argumentos em voo', async () => {
  const scope = privateRegionalProjectScope('captura-v5')
  await writeInOneTransaction(scope.store, { puts: [['sujeito', { revisao: 1 }]] })
  const observed = { revisao: 1 }
  const candidate = await prepareRetainedParts(sample('jogo'))
  const pending = commitRetainedProject(scope, {
    id: 'jogo',
    expectedToken: null,
    origin,
    candidate,
    source: [['sujeito', observed]],
  })
  observed.revisao = 2
  candidate.parts.files!.strings.length = 0
  candidate.bodies.clear()
  const head = await pending
  expect(await readRetainedParts(scope, head)).toStrictEqual(sample('jogo'))
  const gone = await commitRetainedProject(scope, {
    id: head.id,
    expectedToken: head.token,
    origin,
    candidate: null,
  })
  const replay = await prepareRetainedParts(sample('jogo'))
  await expect(
    commitRetainedProject(scope, {
      id: head.id,
      expectedToken: gone.token,
      origin,
      candidate: replay,
    }),
  ).rejects.toThrow()
  expect(await readRetainedManifest(scope, head.id)).toEqual(gone)
})
