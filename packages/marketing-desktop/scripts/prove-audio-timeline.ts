import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { outcomeSchema } from '@sistemazero/marketing-contracts'
import { LocalAssets } from '../src/main/assets'
import { mediaProcess } from '../src/main/media/media-process'
import { probeVideo } from '../src/main/media/probe-video'

const directory = path.resolve('.cache/speech-proof/audio-render')
await mkdir(directory, { recursive: true })
const outcome = outcomeSchema.options[0].parse(
  JSON.parse(await readFile('.cache/speech-proof/pause-edit/outcome.json', 'utf8')),
)
const timeline = outcome.video?.variants[0]?.timeline,
  sourceId = outcome.recordingAnalysis?.[0]?.assetId
if (!timeline || !sourceId) throw new Error('Prova de corte não encontrada')
const assets = new LocalAssets(path.join(directory, 'assets')),
  signal = AbortSignal.timeout(240000)
await assets.start()
try {
  const original = await assets.importFile(path.resolve('.cache/speech-proof/fala-verificacao.wav'))
  const inputProps = { timeline, assets: { [sourceId]: original.url } },
    serveUrl = path.resolve('dist/remotion')
  const composition = await selectComposition({ serveUrl, id: 'MarketingTimeline', inputProps })
  const output = path.join(directory, 'sem-pausas.mp4')
  if (!process.argv.includes('--reuse-render'))
    await renderMedia({
      serveUrl,
      composition,
      inputProps,
      outputLocation: output,
      codec: 'h264',
      audioCodec: 'aac',
      colorSpace: 'bt709',
      imageFormat: 'png',
      concurrency: 2,
    })
  const metadata = await probeVideo(output, 'video/mp4', signal)
  const originalPcm = path.join(directory, 'original.wav'),
    editedPcm = path.join(directory, 'edited.wav')
  for (const [inputFile, pcmFile] of [
    [assets.get(original.id).path, originalPcm],
    [output, editedPcm],
  ]) {
    if (!inputFile || !pcmFile) throw new Error('Caminho ausente')
    await mediaProcess(
      'ffmpeg',
      [
        '-v',
        'error',
        '-y',
        '-i',
        inputFile,
        '-vn',
        '-ar',
        '16000',
        '-ac',
        '1',
        '-c:a',
        'pcm_s16le',
        pcmFile,
      ],
      signal,
    )
  }
  const samples = async (file: string) => {
    const bytes = await readFile(file)
    if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE')
      throw new Error('WAV inválido na prova de áudio')
    let formatVerified = false
    for (let offset = 12; offset + 8 <= bytes.length; ) {
      const kind = bytes.toString('ascii', offset, offset + 4),
        size = bytes.readUInt32LE(offset + 4),
        start = offset + 8
      if (start + size > bytes.length) throw new Error('Chunk WAV truncado')
      if (kind === 'fmt ') {
        formatVerified =
          size >= 16 &&
          bytes.readUInt16LE(start) === 1 &&
          bytes.readUInt16LE(start + 2) === 1 &&
          bytes.readUInt32LE(start + 4) === 16000 &&
          bytes.readUInt16LE(start + 14) === 16
      }
      if (kind === 'data') {
        if (!formatVerified) throw new Error('A comparação exige PCM mono de 16 bits a 16 kHz')
        return bytes.subarray(start, start + size)
      }
      offset = start + size + (size % 2)
    }
    throw new Error('WAV sem amostras')
  }
  const before = await samples(originalPcm),
    after = await samples(editedPcm),
    fps = timeline.fps.numerator / timeline.fps.denominator
  const checks = []
  for (const clip of timeline.clips.filter((clip) => clip.kind === 'audio')) {
    const source = Math.round((Math.round((clip.sourceStartMs * fps) / 1000) / fps + 0.5) * 16000),
      destination = Math.round((clip.startFrame / fps + 0.5) * 16000),
      length = 4000
    let best = -1,
      shift = 0
    for (let delta = -533; delta <= 533; delta++) {
      let ab = 0,
        aa = 0,
        bb = 0
      for (let index = 0; index < length; index++) {
        const a = before.readInt16LE((source + index) * 2),
          b = after.readInt16LE((destination + index + delta) * 2)
        ab += a * b
        aa += a * a
        bb += b * b
      }
      const value = ab / Math.sqrt(aa * bb)
      if (value > best) {
        best = value
        shift = delta
      }
    }
    if (best < 0.94) throw new Error(`Áudio não acompanha o corte: correlação ${best}`)
    checks.push({ clipId: clip.id, correlation: best, offsetMs: (shift * 1000) / 16000 })
  }
  if (
    !metadata.hasAudio ||
    Math.abs((metadata.durationMs ?? 0) - (timeline.durationInFrames * 1000) / fps) > 100
  )
    throw new Error('Duração final ou trilha de áudio divergente')
  await assets.verify(original.id)
  await writeFile(
    path.join(directory, 'evidence.json'),
    JSON.stringify({ checks, metadata, originalPreserved: true }, null, 2),
  )
  console.log(JSON.stringify({ audioCutsPassed: true, checks, metadata }))
} finally {
  assets.close()
}
