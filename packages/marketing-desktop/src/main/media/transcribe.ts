import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { captionSchema, stableEditorialId } from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import { boundedMediaProcess, mediaInputArguments, mediaProcess } from './media-process'
import { speechEngine } from './speech-engine'

const transcriptSchema = z.object({
  transcription: z
    .array(
      z.object({
        offsets: z.object({ from: z.number().nonnegative(), to: z.number().positive() }),
        text: z.string().max(1000),
      }),
    )
    .max(10000),
})
async function removePreparedAudio(audio: string, failure: unknown) {
  try {
    await unlink(audio)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return
    if (failure)
      throw new AggregateError(
        [failure, error],
        'A transcrição falhou e o áudio temporário não pôde ser removido',
      )
    throw error
  }
}
export async function transcribeLocal(
  input: { file: string; mime: string; assetId: string; sha256: string; durationMs: number },
  root: string,
  directory: string,
  signal: AbortSignal,
  progress: (message: string) => void,
) {
  const engine = await speechEngine(root)
  await mkdir(directory, { recursive: true })
  const saved = path.join(directory, 'captions.json')
  try {
    if ((await stat(saved)).size > 10_000_000) throw new Error('Transcrição local acima do limite')
    const previous = z
      .object({
        version: z.string(),
        modelSha256: z.string(),
        sourceSha256: z.string(),
        captions: z.array(captionSchema).min(1).max(10000),
      })
      .parse(JSON.parse(await readFile(saved, 'utf8')))
    if (
      previous.version === engine.version &&
      previous.modelSha256 === engine.modelSha256 &&
      previous.sourceSha256 === input.sha256 &&
      previous.captions.every(
        (caption) => caption.assetId === input.assetId && caption.endMs <= input.durationMs,
      )
    )
      return previous.captions
  } catch (error) {
    if (
      !(
        error instanceof SyntaxError ||
        error instanceof z.ZodError ||
        (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      )
    )
      throw error
  }
  const audio = path.join(directory, 'speech.wav'),
    output = path.join(directory, 'speech')
  if (path.dirname(path.resolve(audio)) !== path.resolve(directory))
    throw new Error('Caminho de áudio temporário inválido')
  let failure: unknown
  try {
    progress('Preparando áudio para transcrição local')
    await mediaProcess(
      'ffmpeg',
      [
        '-v',
        'error',
        '-xerror',
        '-y',
        ...mediaInputArguments(input.file, input.mime),
        '-map',
        '0:a:0',
        '-vn',
        '-ar',
        '16000',
        '-ac',
        '1',
        '-c:a',
        'pcm_s16le',
        audio,
      ],
      signal,
      1800000,
    )
    progress('Transcrevendo neste computador')
    await boundedMediaProcess(
      engine.executable,
      [
        '-m',
        engine.model,
        '-f',
        audio,
        '-l',
        'pt',
        '-t',
        '4',
        '-oj',
        '-of',
        output,
        '-ml',
        '42',
        '-sow',
      ],
      signal,
      1800000,
    )
    signal.throwIfAborted()
    const file = `${output}.json`
    if ((await stat(file)).size > 10_000_000)
      throw new Error('A transcrição excedeu o limite; divida a gravação')
    const result = transcriptSchema.parse(JSON.parse(await readFile(file, 'utf8')))
    const captions = await Promise.all(
      result.transcription
        .filter((item) => item.text.trim())
        .map(async (item, index) => {
          if (item.offsets.to > input.durationMs + 100)
            throw new Error('A transcrição ultrapassou o tempo do original')
          return captionSchema.parse({
            id: await stableEditorialId(
              `whisper:${input.assetId}:${input.sha256}:${engine.modelSha256}:${index}`,
            ),
            assetId: input.assetId,
            startMs: item.offsets.from,
            endMs: Math.min(input.durationMs, item.offsets.to),
            text: item.text.trim(),
            corrected: false,
          })
        }),
    )
    if (!captions.length) throw new Error('Nenhuma fala foi identificada na gravação')
    await writeFile(
      `${saved}.tmp`,
      JSON.stringify({
        version: engine.version,
        modelSha256: engine.modelSha256,
        sourceSha256: input.sha256,
        captions,
      }),
    )
    await rename(`${saved}.tmp`, saved)
    return captions
  } catch (error) {
    failure = error
    throw error
  } finally {
    await removePreparedAudio(audio, failure)
  }
}
