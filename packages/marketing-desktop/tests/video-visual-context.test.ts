import { expect, test } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { recordingAnalysisSchema } from '@sistemazero/marketing-contracts'
import sharp from 'sharp'
import { claudeInput } from '../src/main/claude-input'
import { videoVisualContext } from '../src/main/execution/video-visual-context'
import { prepareVideoVisualImages } from '../src/main/media/visual-images'

function recordingFixture() {
  const observations = Array.from({ length: 3 }, () =>
    recordingAnalysisSchema.parse({
      version: 'ffmpeg-remotion-4.0.535-v1',
      scope: 'audio-and-frames',
      assetId: crypto.randomUUID(),
      sha256: 'a'.repeat(64),
      metadata: { width: 640, height: 360, rotation: 0, durationMs: 6000, codec: 'h264' },
      silence: [{ startMs: 100, endMs: 600 }],
      samples: Array.from({ length: 6 }, (_, frame) => ({
        assetId: crypto.randomUUID(),
        atMs: frame * 1000 + 500,
      })),
    }),
  )
  const images = observations.flatMap((entry) =>
    entry.samples.map((sample) => `${sample.assetId}.png`),
  )
  return { observations, images }
}

test('três gravações e seis demonstrações cabem no mesmo pedido com referências alinhadas', () => {
  const recording = recordingFixture()
  const original = structuredClone(recording)
  const demonstrations = Array.from({ length: 6 }, (_, index) => `demonstration-${index}.png`)
  const visual = videoVisualContext(recording, demonstrations)
  expect(visual.images).toHaveLength(18)
  expect(visual.images.slice(-6)).toEqual(demonstrations)
  expect(visual.recording?.images).toEqual(
    visual.recording?.observations.flatMap((entry) =>
      entry.samples.map((sample) => `${sample.assetId}.png`),
    ),
  )
  for (const [index, entry] of (visual.recording?.observations ?? []).entries()) {
    const originalEntry = recording.observations[index]
    if (!originalEntry) throw new Error('Gravação ausente')
    expect(entry.samples).toHaveLength(4)
    expect(entry.samples[0]).toEqual(originalEntry.samples[0])
    expect(entry.samples.at(-1)).toEqual(originalEntry.samples.at(-1))
    expect(entry.silence).toEqual(originalEntry.silence)
  }
  expect(recording).toEqual(original)
})

test('capturas grandes têm visualização limitada para a IA sem mudar os arquivos de origem', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'marketing-visual-review-'))
  if (
    path.dirname(directory) !== path.resolve(os.tmpdir()) ||
    !path.basename(directory).startsWith('marketing-visual-review-')
  )
    throw new Error('Diretório inválido')
  try {
    const file = path.join(directory, 'captura.png')
    const original = await sharp(randomBytes(1600 * 1000 * 3), {
      raw: { width: 1600, height: 1000, channels: 3 },
    })
      .png()
      .toBuffer()
    expect(original.length).toBeGreaterThan(4_000_000)
    await writeFile(file, original)
    const signal = new AbortController().signal
    const files = await prepareVideoVisualImages([file], directory, signal)
    const result = files[0]
    if (!result) throw new Error('Imagem ausente')
    expect((await stat(result)).size).toBeLessThanOrEqual(1_000_000)
    const metadata = await sharp(await readFile(result)).metadata()
    expect(metadata.width! / metadata.height!).toBeCloseTo(1.6, 2)
    expect(await readFile(file)).toEqual(original)
    const input = JSON.parse(await claudeInput('Conferir captura', Array(18).fill(result), signal))
    expect(
      input.message.content.filter((block: { type: string }) => block.type === 'image'),
    ).toHaveLength(18)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('sem demonstração todas as amostras continuam disponíveis; sem gravação só seguem as fontes', () => {
  const recording = recordingFixture()
  expect(videoVisualContext(recording, [])).toEqual({ recording, images: recording.images })
  expect(videoVisualContext(undefined, ['source.png'])).toEqual({
    recording: undefined,
    images: ['source.png'],
  })
})
