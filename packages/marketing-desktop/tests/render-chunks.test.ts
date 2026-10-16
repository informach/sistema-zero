import { afterEach, expect, test } from 'bun:test'
import { mkdtemp, readdir, readFile, rm, utimes, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { videoSchema } from '@sistemazero/marketing-contracts'
import { defaultTimeline } from '@sistemazero/marketing-production/data'
import { RenderChunkCache } from '../src/main/media/render-chunk-cache'
import {
  type ChunkContext,
  timelineAudioKey,
  timelineChunks,
} from '../src/main/media/timeline-chunks'

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) {
    if (
      path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) ||
      !path.basename(directory).startsWith('marketing-render-chunks-')
    )
      throw new Error('Diretório de teste fora do escopo')
    await rm(directory, { recursive: true, force: true })
  }
})
const context: ChunkContext = {
  directory: 'unused',
  maximumBytes: 4_000_000_000,
  engineSha256: 'e'.repeat(64),
  assetHashes: {},
}
function fixture() {
  const trackId = defaultTimeline.timeline.tracks[0]!.id
  return videoSchema.parse({
    ...defaultTimeline.timeline,
    durationInFrames: 450,
    clips: [10, 170, 320].map((startFrame) => ({
      id: crypto.randomUUID(),
      trackId,
      kind: 'text',
      text: 'Cena',
      startFrame,
      durationInFrames: 100,
    })),
  })
}
const keys = (timeline: ReturnType<typeof fixture>, selected = context) =>
  timelineChunks(timeline, selected).chunks.map((chunk) => chunk.key)

test('ajuste de uma cena conserva somente os trechos realmente independentes; motor e fonte invalidam tudo', () => {
  const timeline = fixture(),
    original = keys(timeline),
    changed = structuredClone(timeline)
  changed.clips[1]!.text = 'Outro encerramento'
  const next = keys(changed)
  expect(next[0]).toBe(original[0])
  expect(next[1]).not.toBe(original[1])
  expect(next[2]).toBe(original[2])
  expect(
    keys(timeline, { ...context, engineSha256: 'd'.repeat(64) }).every(
      (key, i) => key !== original[i],
    ),
  ).toBe(true)
  const fontAssetId = crypto.randomUUID(),
    withFont = { ...timeline, fontAssetId }
  const a = keys(withFont, { ...context, assetHashes: { [fontAssetId]: 'a'.repeat(64) } }),
    b = keys(withFont, { ...context, assetHashes: { [fontAssetId]: 'b'.repeat(64) } })
  expect(a.every((key, i) => key !== b[i])).toBe(true)
  expect(() => keys(withFont)).toThrow('não foi verificada')
})

test('legenda e mídia respeitam os intervalos visuais nas junções', () => {
  const timeline = fixture(),
    assetId = crypto.randomUUID(),
    hashes = { ...context, assetHashes: { [assetId]: 'a'.repeat(64) } }
  timeline.clips.push(
    videoSchema.parse({
      ...timeline,
      clips: [
        {
          id: crypto.randomUUID(),
          trackId: timeline.tracks[0]!.id,
          kind: 'video',
          assetId,
          startFrame: 0,
          durationInFrames: 450,
        },
      ],
    }).clips[0]!,
  )
  timeline.captions = [
    {
      id: crypto.randomUUID(),
      assetId,
      startMs: 6000,
      endMs: 7000,
      text: 'Antes',
      corrected: false,
    },
  ]
  const original = keys(timeline, hashes)
  timeline.captions[0]!.text = 'Depois'
  const revised = keys(timeline, hashes)
  expect(revised[0]).toBe(original[0])
  expect(revised[1]).not.toBe(original[1])
  expect(revised[2]).toBe(original[2])
  expect(
    keys(timeline, { ...hashes, assetHashes: { [assetId]: 'b'.repeat(64) } }).every(
      (key, i) => key !== revised[i],
    ),
  ).toBe(true)
  timeline.captions[0]!.startMs = 4960
  timeline.captions[0]!.endMs = 5040
  const boundary = keys(timeline, hashes)
  timeline.captions[0]!.text = 'Limite alterado'
  const after = keys(timeline, hashes)
  expect(after[0]).not.toBe(boundary[0])
  expect(after[1]).not.toBe(boundary[1])
  expect(after[2]).toBe(boundary[2])
})

test('fps racional cobre cada quadro uma vez; último trecho menor e planos longos limitados', () => {
  const timeline = {
    ...fixture(),
    fps: { numerator: 30000, denominator: 1001 },
    durationInFrames: 467,
  }
  expect(timelineChunks(timeline, context).chunks.map(({ from, to }) => [from, to])).toEqual([
    [0, 149],
    [150, 299],
    [300, 449],
    [450, 466],
  ])
  expect(
    timelineChunks({ ...timeline, durationInFrames: 2160000 }, context).chunks.length,
  ).toBeLessThanOrEqual(240)
})

async function cacheFixture(limit?: number) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'marketing-render-chunks-'))
  directories.push(directory)
  const cache = new RenderChunkCache(directory, limit)
  await cache.initialize()
  return cache
}
const signal = () => new AbortController().signal
async function seed(cache: RenderChunkCache, key: string) {
  return cache.create(key, 'video', signal(), async (file) => {
    await writeFile(file, 'video')
  })
}

test('reinício verifica bytes; corrupção, tipo incorreto e recibo sem mídia nunca geram hit', async () => {
  const cache = await cacheFixture(),
    key = 'a'.repeat(64),
    file = await seed(cache, key)
  expect(await new RenderChunkCache(cache.directory).get(key, 'video', signal())).toBe(file)
  expect(await cache.get(key, 'audio', signal())).toBeNull()
  await writeFile(file, 'outro')
  expect(await cache.get(key, 'video', signal())).toBeNull()
  await seed(cache, key)
  expect(await cache.get(key, 'video', signal())).not.toBeNull()
  await rm(file)
  expect(await cache.get(key, 'video', signal())).toBeNull()
  await writeFile(cache.files(key, 'video').receipt, '{')
  expect(await cache.get(key, 'video', signal())).toBeNull()
  await expect(cache.get('../fora', 'video', signal())).rejects.toThrow()
})

test('cancelamento conserva trechos concluídos e elimina somente a tentativa incompleta', async () => {
  const cache = await cacheFixture(),
    done = 'b'.repeat(64),
    pending = 'c'.repeat(64),
    controller = new AbortController()
  await seed(cache, done)
  await expect(
    cache.create(pending, 'video', controller.signal, async (file) => {
      await writeFile(file, 'partial')
      controller.abort(new Error('cancelado'))
    }),
  ).rejects.toThrow('cancelado')
  expect(await cache.get(done, 'video', signal())).not.toBeNull()
  expect((await readdir(cache.directory)).some((file) => file.startsWith(pending))).toBe(false)
})

test('quota e recuperação removem intermediários antigos; preservam arquivos alheios ao cache', async () => {
  const cache = await cacheFixture(400),
    older = 'a'.repeat(64),
    newer = 'b'.repeat(64),
    incomplete = 'c'.repeat(64)
  await seed(cache, older)
  await utimes(cache.files(older, 'video').receipt, new Date(0), new Date(0))
  await seed(cache, newer)
  await writeFile(cache.files(incomplete, 'video', true).media, 'interrompido')
  await writeFile(path.join(cache.directory, 'original.txt'), 'preservado')
  await cache.prune()
  expect(await cache.get(older, 'video', signal())).toBeNull()
  expect(await cache.get(newer, 'video', signal())).not.toBeNull()
  expect((await readdir(cache.directory)).some((file) => file.startsWith(incomplete))).toBe(false)
  expect(await readFile(path.join(cache.directory, 'original.txt'), 'utf8')).toBe('preservado')
})

test('limpeza solicitada contabiliza arquivos e bytes dos trechos regeneráveis', async () => {
  const cache = await cacheFixture()
  await seed(cache, 'd'.repeat(64))
  await seed(cache, 'e'.repeat(64))
  const cleared = await new RenderChunkCache(cache.directory, 0).initialize()
  expect(cleared.removed).toBe(4)
  expect(cleared.freedBytes).toBeGreaterThan(300)
  expect(await readdir(cache.directory)).toEqual([])
})

test('mix contínuo invalida áudio por corte, mídia, volume e mudo; copy e legenda preservam a faixa', () => {
  const timeline = fixture(),
    assetId = crypto.randomUUID(),
    selected = { ...context, assetHashes: { [assetId]: 'a'.repeat(64) } }
  timeline.clips.push(
    videoSchema.parse({
      ...timeline,
      clips: [
        {
          id: crypto.randomUUID(),
          trackId: timeline.tracks[0]!.id,
          kind: 'video',
          assetId,
          startFrame: 0,
          durationInFrames: 450,
        },
      ],
    }).clips[0]!,
  )
  const original = timelineAudioKey(timeline, selected)
  const visualBeforeAudioChange = keys(timeline, selected)
  const volumeChange = structuredClone(timeline)
  volumeChange.clips[3]!.volume = 0.25
  expect(keys(volumeChange, selected)).toEqual(visualBeforeAudioChange)
  timeline.clips[0]!.text = 'Outra copy'
  timeline.captions = [
    { id: crypto.randomUUID(), assetId, startMs: 0, endMs: 1000, text: 'Legenda', corrected: true },
  ]
  expect(timelineAudioKey(timeline, selected)).toBe(original)
  for (const property of ['sourceStartMs', 'volume', 'playbackRate', 'fadeInFrames'] as const) {
    const changed = structuredClone(timeline)
    changed.clips[3]![property] += 0.5
    expect(timelineAudioKey(changed, selected)).not.toBe(original)
  }
  expect(
    timelineAudioKey(timeline, { ...selected, assetHashes: { [assetId]: 'b'.repeat(64) } }),
  ).not.toBe(original)
  timeline.tracks[0]!.muted = true
  expect(timelineAudioKey(timeline, selected)).not.toBe(original)
  const mutedVisual = keys(timeline, selected)
  timeline.tracks[0]!.muted = false
  expect(keys(timeline, selected)).toEqual(mutedVisual)
})
