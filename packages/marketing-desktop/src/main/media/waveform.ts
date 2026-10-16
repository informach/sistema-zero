import { open, unlink } from 'node:fs/promises'
import path from 'node:path'
import { waveformSchema } from '@sistemazero/marketing-contracts'
import { mediaInputArguments, mediaProcess } from './media-process'

export async function prepareWaveform(
  input: { file: string; mime: string; assetId: string; sha256: string; durationMs: number },
  directory: string,
  signal: AbortSignal,
) {
  const file = path.join(directory, 'waveform.wav')
  try {
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
        '-af',
        'aresample=8000:async=1:first_pts=0,apad',
        '-t',
        String(input.durationMs / 1000),
        '-ar',
        '8000',
        '-ac',
        '1',
        '-c:a',
        'pcm_s16le',
        file,
      ],
      signal,
      1800000,
    )
    const handle = await open(file, 'r')
    try {
      const size = (await handle.stat()).size,
        header = Buffer.alloc(12)
      await handle.read(header, 0, 12, 0)
      if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WAVE')
        throw new Error('Áudio preparado inválido')
      let offset = 12,
        dataOffset = 0,
        dataSize = 0,
        formatVerified = false
      const chunk = Buffer.alloc(16)
      for (let chunks = 0; offset + 8 <= size && chunks < 100; chunks++) {
        await handle.read(chunk, 0, 8, offset)
        const kind = chunk.toString('ascii', 0, 4),
          length = chunk.readUInt32LE(4)
        if (offset + 8 + length > size) throw new Error('Áudio preparado truncado')
        if (kind === 'fmt ') {
          if (length < 16) throw new Error('Formato de áudio incompleto')
          await handle.read(chunk, 0, 16, offset + 8)
          formatVerified =
            chunk.readUInt16LE(0) === 1 &&
            chunk.readUInt16LE(2) === 1 &&
            chunk.readUInt32LE(4) === 8000 &&
            chunk.readUInt16LE(14) === 16
        }
        if (kind === 'data') {
          dataOffset = offset + 8
          dataSize = length
          break
        }
        offset += 8 + length + (length % 2)
      }
      if (
        !formatVerified ||
        !dataSize ||
        dataSize % 2 ||
        Math.abs(dataSize / 16 - input.durationMs) > 100
      )
        throw new Error('A forma de onda não corresponde ao áudio original')
      const samplesPerBucket = Math.max(1, Math.ceil(dataSize / 2 / 2000)),
        peaks: number[] = []
      const bytes = Buffer.alloc(64000)
      let read = 0,
        within = 0,
        peak = 0
      while (read < dataSize) {
        signal.throwIfAborted()
        const { bytesRead } = await handle.read(
          bytes,
          0,
          Math.min(bytes.length, dataSize - read),
          dataOffset + read,
        )
        if (!bytesRead || bytesRead % 2)
          throw new Error('A leitura da forma de onda foi interrompida')
        for (let index = 0; index < bytesRead; index += 2) {
          peak = Math.max(peak, Math.abs(bytes.readInt16LE(index)) / 32768)
          if (++within === samplesPerBucket) {
            peaks.push(peak)
            within = 0
            peak = 0
          }
        }
        read += bytesRead
      }
      if (within) peaks.push(peak)
      return waveformSchema.parse({
        schemaVersion: 1,
        sourceAssetId: input.assetId,
        sourceSha256: input.sha256,
        durationMs: input.durationMs,
        sampleRate: 8000,
        samplesPerBucket,
        peaks,
      })
    } finally {
      await handle.close()
    }
  } finally {
    await unlink(file).catch((error: unknown) => {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
    })
  }
}
