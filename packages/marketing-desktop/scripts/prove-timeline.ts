import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer'
import { videoSchema } from '@sistemazero/marketing-contracts'
import sharp from 'sharp'
import { LocalAssets } from '../src/main/assets'
import { mediaProcess } from '../src/main/media/media-process'
import { prepareVideo } from '../src/main/media/prepare-video'
import { probeVideo } from '../src/main/media/probe-video'

const directory = path.resolve('.cache/timeline-proof')
await mkdir(directory, { recursive: true })
const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
for (const [index, color] of colors.entries())
  await sharp({ create: { width: 320, height: 240, channels: 3, background: color } })
    .png()
    .toFile(path.join(directory, `frame-${index}.png`))
const source = path.join(directory, 'original com áudio.mp4'),
  signal = AbortSignal.timeout(240000)
await mediaProcess(
  'ffmpeg',
  [
    '-v',
    'error',
    '-y',
    '-framerate',
    '1',
    '-i',
    path.join(directory, 'frame-%d.png'),
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=6',
    '-r',
    '30000/1001',
    '-c:v',
    'libx264',
    '-threads',
    '2',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-t',
    '6',
    source,
  ],
  signal,
)
const assets = new LocalAssets(path.join(directory, 'assets'))
await assets.start()
try {
  const asset = await assets.importFile(source),
    trackId = randomUUID(),
    overlay = randomUUID()
  const prepared = await prepareVideo(source, 'video/mp4', path.join(directory, 'prepared'), signal)
  const presentation = await assets.importFile(prepared.file)
  const timeline = videoSchema.parse({
    schemaVersion: 1,
    recipeVersion: 'marketing-timeline-v1',
    width: 480,
    height: 640,
    fps: { numerator: 30000, denominator: 1001 },
    durationInFrames: 60,
    tracks: [
      { id: trackId, kind: 'visual' },
      { id: overlay, kind: 'visual' },
    ],
    clips: [
      {
        id: randomUUID(),
        trackId,
        assetId: asset.id,
        kind: 'video',
        startFrame: 0,
        durationInFrames: 30,
        sourceStartMs: 500,
        playbackRate: 1,
      },
      {
        id: randomUUID(),
        trackId,
        assetId: asset.id,
        kind: 'video',
        startFrame: 30,
        durationInFrames: 30,
        sourceStartMs: 2500,
        playbackRate: 2,
      },
      {
        id: randomUUID(),
        trackId: overlay,
        kind: 'text',
        startFrame: 45,
        durationInFrames: 15,
        text: 'Crie seu jogo',
        effect: 'cta',
        position: 'bottom',
      },
    ],
    captions: [
      {
        id: randomUUID(),
        assetId: asset.id,
        startMs: 500,
        endMs: 1200,
        text: 'Olá, criação!',
        corrected: true,
      },
      {
        id: randomUUID(),
        assetId: asset.id,
        startMs: 2500,
        endMs: 3500,
        text: 'Veja o jogo.',
        corrected: false,
      },
    ],
    background: '#172a46',
    accent: '#ffdb56',
  })
  const inputProps = { timeline, assets: { [asset.id]: presentation.url } },
    serveUrl = path.resolve('dist/remotion')
  const composition = await selectComposition({ serveUrl, id: 'MarketingTimeline', inputProps })
  const expected: [number, number[]][] = [
    [0, [255, 0, 0]],
    [20, [0, 255, 0]],
    [30, [0, 0, 255]],
    [50, [255, 255, 0]],
  ]
  const frames = []
  for (const [frame, color] of expected) {
    const output = path.join(directory, `frame-output-${frame}.png`)
    await renderStill({ serveUrl, composition, inputProps, frame, output, imageFormat: 'png' })
    const { data, info } = await sharp(output)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const actual = [...data.subarray((10 * info.width + 10) * 3, (10 * info.width + 10) * 3 + 3)]
    const colorError = Math.max(
      ...actual.map((value, index) => Math.abs(value - (color[index] ?? 0))),
    )
    frames.push({ frame, color: actual, colorError })
  }
  const output = path.join(directory, 'montagem.mp4')
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: 'h264',
    audioCodec: 'aac',
    colorSpace: 'bt709',
    imageFormat: 'png',
    outputLocation: output,
    concurrency: 2,
  })
  const metadata = await probeVideo(output, 'video/mp4', signal)
  if (!metadata.hasAudio || Math.abs((metadata.durationMs ?? 0) - 2002) > 50)
    throw new Error('Duração ou áudio do vídeo final divergente')
  await assets.verify(asset.id)
  const colorPassed = frames.every((frame) => frame.colorError <= 15)
  await writeFile(
    path.join(directory, 'evidence.json'),
    JSON.stringify(
      {
        timeline,
        sourceSha256: asset.sha256,
        metadata,
        frames,
        colorPassed,
        originalPreserved: true,
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify({ timelineProof: colorPassed, frames, metadata, originalPreserved: true }),
  )
  if (!colorPassed)
    throw new Error(
      'Render concluído, mas a fidelidade de cor ainda não passou; confira evidence.json',
    )
} finally {
  assets.close()
}
