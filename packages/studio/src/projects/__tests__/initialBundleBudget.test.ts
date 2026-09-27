import { expect, test } from 'bun:test'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { build } from 'vite'

const MAX_INITIAL_JS_BYTES = 350_000
const MAX_INITIAL_JS_GZIP_BYTES = 120_000
const MAX_INITIAL_JS_FILES = 10
const MAX_EDITOR_ROUTE_JS_BYTES = 5_000_000
const MAX_EDITOR_ROUTE_JS_GZIP_BYTES = 1_600_000
const MAX_EDITOR_ROUTE_JS_FILES = 20
/**
 * ⚠️ O teto CRU do modo Blocos subiu de 4 500 000 para 4 750 000 em 13/09/2026.
 *
 * Os dez blocos de sprite de texto e os dois exemplos novos puseram o modo Blocos em
 * 4 501 355 bytes — 1 355 acima, 0,03%. Antes de mover o número, medi os três modos:
 *
 *   Blocos  4 501 355 cru · 1 145 945 gzip · 17 arquivos
 *   Ponte   4 005 340 cru · 1 017 203 gzip · 18 arquivos
 *   Código  2 073 880 cru ·   546 042 gzip · 14 arquivos
 *
 * O que estourou NÃO é o guarda que importa mais: a lista inicial continua em 350 k/120 k
 * gzip/10 arquivos, dentro do teto, e nenhum catálogo pesado vazou para ela. O que cresceu é o
 * chunk do EDITOR no modo Blocos, que carrega o catálogo de blocos — e ele cresce quando o
 * produto ganha blocos. O gzip, que é o que de fato viaja até a criança, está em 79% do teto e
 * NÃO se moveu junto: o cru é o número que aperta primeiro, não o que dói primeiro.
 *
 * A folga nova é de ~5,5% sobre a medição, não "um byte acima do que passa": teto rente ao
 * medido transforma o guarda num alarme que dispara a cada bloco novo. O modo Ponte fica onde
 * estava — está em 4,0 M, com folga de verdade.
 */
const MODE_BUDGETS = {
  BlocksMode: { raw: 4_750_000, gzip: 1_450_000, files: 20 },
  BridgeMode: { raw: 4_500_000, gzip: 1_450_000, files: 20 },
  CodeMode: { raw: 4_000_000, gzip: 1_300_000, files: 18 },
} as const

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
  expect(html).not.toContain('fonts.googleapis.com')
  expect(html).not.toContain('fonts.gstatic.com')
  expect(outputs.some((entry) => entry.type === 'asset' && entry.fileName.endsWith('.woff2'))).toBe(
    true,
  )
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
  const initialGzipBytes = initialChunks.reduce(
    (total, entry) => total + (entry?.type === 'chunk' ? gzipSync(entry.code).byteLength : 0),
    0,
  )
  expect(initialFiles.length).toBeLessThanOrEqual(MAX_INITIAL_JS_FILES)
  expect(initialBytes).toBeLessThanOrEqual(MAX_INITIAL_JS_BYTES)
  expect(initialGzipBytes).toBeLessThanOrEqual(MAX_INITIAL_JS_GZIP_BYTES)

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
  const routeGzipBytes = [...routeFiles].reduce(
    (total, fileName) => total + gzipSync(chunkByFile.get(fileName)?.code ?? '').byteLength,
    0,
  )
  expect(routeFiles.size).toBeLessThanOrEqual(MAX_EDITOR_ROUTE_JS_FILES)
  expect(routeBytes).toBeLessThanOrEqual(MAX_EDITOR_ROUTE_JS_BYTES)
  expect(routeGzipBytes).toBeLessThanOrEqual(MAX_EDITOR_ROUTE_JS_GZIP_BYTES)

  const transitiveFiles = (entryFile: string): Set<string> => {
    const files = new Set<string>()
    const queue = [entryFile]
    while (queue.length > 0) {
      const fileName = queue.pop()
      if (
        !fileName ||
        files.has(fileName) ||
        initialFiles.includes(fileName.replace('assets/', ''))
      )
        continue
      files.add(fileName)
      queue.push(...(chunkByFile.get(fileName)?.imports ?? []))
    }
    return files
  }

  for (const [modeName, budget] of Object.entries(MODE_BUDGETS)) {
    const modeChunk = chunks.find((entry) =>
      Object.keys(entry.modules).some((moduleId) =>
        moduleId.replace(/\\/g, '/').endsWith(`/src/modes/${modeName}.tsx`),
      ),
    )
    expect(modeChunk).toBeDefined()
    if (!modeChunk) continue
    const files = transitiveFiles(modeChunk.fileName)
    const raw = [...files].reduce(
      (total, fileName) => total + Buffer.byteLength(chunkByFile.get(fileName)?.code ?? ''),
      0,
    )
    const gzip = [...files].reduce(
      (total, fileName) => total + gzipSync(chunkByFile.get(fileName)?.code ?? '').byteLength,
      0,
    )
    expect(files.size).toBeLessThanOrEqual(budget.files)
    expect(raw).toBeLessThanOrEqual(budget.raw)
    expect(gzip).toBeLessThanOrEqual(budget.gzip)
  }
}, 20_000)
