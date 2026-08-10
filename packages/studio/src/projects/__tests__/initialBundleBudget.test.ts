import { expect, test } from 'bun:test'
import { join } from 'node:path'
import { build } from 'vite'

const MAX_INITIAL_JS_BYTES = 350_000
const MAX_INITIAL_JS_FILES = 10

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
  expect(htmlAsset?.type).toBe('asset')
  if (!htmlAsset || htmlAsset.type !== 'asset') return

  const html =
    typeof htmlAsset.source === 'string'
      ? htmlAsset.source
      : new TextDecoder().decode(htmlAsset.source)
  const initialFiles = [
    ...html.matchAll(/(?:src|href)="\/assets\/([^"?]+\.js)(?:\?[^" ]*)?"/g),
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
}, 20_000)
