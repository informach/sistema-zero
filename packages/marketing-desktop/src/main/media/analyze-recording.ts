import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { mediaInputArguments, mediaProcess } from './media-process'
import { probeVideo } from './probe-video'

export class SilenceIntervals {
  private pending = ''
  private start: number | undefined
  readonly intervals: Array<{ startMs: number; endMs: number }> = []
  push(chunk: string) {
    this.pending += chunk
    if (this.pending.length > 100000) throw new Error('A análise de áudio excedeu o limite')
    const lines = this.pending.split(/[\r\n]/)
    this.pending = lines.pop() ?? ''
    for (const line of lines) {
      const start = line.match(/silence_start:\s*([\d.]+)/),
        end = line.match(/silence_end:\s*([\d.]+)/)
      if (start) this.start = Number(start[1]) * 1000
      if (end && this.start !== undefined) {
        const endMs = Number(end[1]) * 1000
        if (endMs > this.start) this.intervals.push({ startMs: this.start, endMs })
        this.start = undefined
        if (this.intervals.length > 10000)
          throw new Error('Há pausas demais; selecione uma gravação menor')
      }
    }
  }
  finish() {
    this.push('\n')
    return this.intervals
  }
}
export async function analyzeRecording(
  file: string,
  mime: string,
  directory: string,
  signal: AbortSignal,
  captureFrames: boolean,
) {
  const metadata = await probeVideo(file, mime, signal)
  if (!metadata.durationMs) throw new Error('Duração da gravação não identificada')
  const silence = new SilenceIntervals()
  if (metadata.hasAudio)
    await mediaProcess(
      'ffmpeg',
      [
        '-hide_banner',
        '-nostats',
        ...mediaInputArguments(file, mime),
        '-map',
        '0:a:0',
        '-vn',
        '-af',
        'silencedetect=noise=-35dB:d=0.4',
        '-f',
        'null',
        '-',
      ],
      signal,
      1800000,
      (chunk) => silence.push(chunk),
    )
  const frames: Array<{ atMs: number; file: string }> = []
  if (captureFrames && mime.startsWith('video/')) {
    await mkdir(directory, { recursive: true })
    // A bounded sample is evidence of these instants only, never a claim about the whole recording.
    for (let index = 0; index < 6; index++) {
      const atMs = Math.round((metadata.durationMs * (index + 0.5)) / 6),
        output = path.join(directory, `sample-${index}.png`)
      await mediaProcess(
        'ffmpeg',
        [
          '-v',
          'error',
          '-y',
          '-ss',
          String(atMs / 1000),
          ...mediaInputArguments(file, mime),
          '-map',
          '0:v:0',
          '-an',
          '-frames:v',
          '1',
          '-vf',
          'scale=640:-2',
          output,
        ],
        signal,
      )
      frames.push({ atMs, file: output })
    }
  }
  return { metadata, silence: silence.finish(), frames }
}
