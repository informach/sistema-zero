import { expect, test } from 'bun:test'
import { join } from 'node:path'
import { build } from 'vite'

const MAX_INITIAL_JS_BYTES = 350_000
const MAX_INITIAL_JS_FILES = 10
const MAX_EDITOR_ROUTE_JS_BYTES = 5_000_000
const MAX_EDITOR_ROUTE_JS_FILES = 20

test('a lista inicial não pré-carrega o editor nem os catálogos pesados', async () => {
  const previousNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  const result = await build({
    configFile: join(import.meta.dir, '../../../playground/vite.config.ts'),
    mode: 'production',
    logLevel: 'silent',
    build: { write: false },
  }).finally(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
  })
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((entry) => {
    if (!('output' in entry)) throw new Error('O build retornou um watcher inesperado.')
    return entry.output
  })
  const htmlAsset = outputs.find(
    (entry) => entry.type === 'asset' && entry.fileName === 'index.html',
  )
  if (!htmlAsset) throw new Error('O build não emitiu index.html.')
  if (htmlAsset.type !== 'asset') throw new Error('index.html não foi emitido como asset.')
  expect(htmlAsset.type).toBe('asset')

  const html =
    typeof htmlAsset.source === 'string'
      ? htmlAsset.source
      : new TextDecoder().decode(htmlAsset.source)
  const initialFiles = [
    ...html.matchAll(/(?:src|href)="(?:\.\/|\/)?assets\/([^"?]+\.js)(?:\?[^" ]*)?"/g),
  ].map((match) => match[1])
  const initialChunks = initialFiles.map((fileName) =>
    outputs.find((entry) => entry.type === 'chunk' && entry.fileName === `assets/${fileName}`),
  )

  expect(initialChunks.every(Boolean)).toBe(true)
  const initialBytes = initialChunks.reduce(
    (total, entry) => total + (entry?.type === 'chunk' ? Buffer.byteLength(entry.code) : 0),
    0,
  )
  expect(initialFiles.length).toBeLessThanOrEqual(MAX_INITIAL_JS_FILES)
  expect(initialBytes).toBeLessThanOrEqual(MAX_INITIAL_JS_BYTES)

  const chunks = outputs.filter((entry) => entry.type === 'chunk')
  const editorChunk = chunks.find((entry) =>
    Object.keys(entry.modules).some((moduleId) =>
      moduleId.replace(/\\/g, '/').endsWith('/src/studio/StudioEditor.tsx'),
    ),
  )
  expect(editorChunk).toBeDefined()
  if (!editorChunk) return
  const appChunk = chunks.find((entry) =>
    Object.keys(entry.modules).some((moduleId) =>
      moduleId.replace(/\\/g, '/').endsWith('/playground/App.tsx'),
    ),
  )
  expect(appChunk).toBeDefined()
  if (!appChunk) return
  expect(editorChunk).not.toBe(appChunk)
  expect(initialChunks).not.toContain(editorChunk)

  const chunkByFile = new Map(chunks.map((entry) => [entry.fileName, entry]))
  const routeFiles = new Set<string>()
  const pending = [appChunk.fileName, editorChunk.fileName]
  while (pending.length > 0) {
    const fileName = pending.pop()
    if (
      !fileName ||
      routeFiles.has(fileName) ||
      initialFiles.includes(fileName.replace('assets/', ''))
    )
      continue
    routeFiles.add(fileName)
    const chunk = chunkByFile.get(fileName)
    if (chunk) pending.push(...chunk.imports)
  }
  const routeBytes = [...routeFiles].reduce(
    (total, fileName) => total + Buffer.byteLength(chunkByFile.get(fileName)?.code ?? ''),
    0,
  )
  expect(routeFiles.size).toBeLessThanOrEqual(MAX_EDITOR_ROUTE_JS_FILES)
  expect(routeBytes).toBeLessThanOrEqual(MAX_EDITOR_ROUTE_JS_BYTES)
}, 20_000)
