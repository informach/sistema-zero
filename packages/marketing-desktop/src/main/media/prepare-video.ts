import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { mediaInputArguments, mediaProcess } from './media-process'
import { probeVideo } from './probe-video'

/** A presentation derivative. Original media and all editorial times remain unchanged. */
export async function prepareVideo(
  file: string,
  mime: string,
  directory: string,
  signal: AbortSignal,
  preview = false,
) {
  const original = await probeVideo(file, mime, signal)
  if (!mime.startsWith('video/')) throw new Error('A preparação visual exige vídeo')
  if (['smpte2084', 'arib-std-b67'].includes(original.colorTransfer ?? ''))
    throw new Error(
      'Este original é HDR. A conversão HDR ainda não está disponível; o original foi preservado',
    )
  await mkdir(directory, { recursive: true })
  const output = path.join(directory, 'presentation.mp4')
  // Explicit conversion AND tags avoid browser/decoder disagreement for untagged SD footage.
  // FFmpeg respects source color metadata, performs autorotation and preserves timestamps in seconds.
  await mediaProcess(
    'ffmpeg',
    [
      '-v',
      'error',
      '-xerror',
      '-y',
      ...mediaInputArguments(file, mime),
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-map_metadata',
      '-1',
      '-vf',
      preview
        ? "scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2:out_color_matrix=bt709:out_range=tv"
        : 'scale=trunc(iw/2)*2:trunc(ih/2)*2:out_color_matrix=bt709:out_range=tv',
      '-fps_mode',
      'cfr',
      '-r',
      '30',
      '-t',
      String((original.durationMs ?? 0) / 1000),
      '-c:v',
      'libx264',
      '-threads',
      '2',
      '-crf',
      preview ? '23' : '18',
      '-pix_fmt',
      'yuv420p',
      '-colorspace',
      'bt709',
      '-color_primaries',
      'bt709',
      '-color_trc',
      'bt709',
      '-color_range',
      'tv',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      output,
    ],
    signal,
    1800000,
  )
  const metadata = await probeVideo(output, 'video/mp4', signal)
  if (Math.abs((metadata.durationMs ?? 0) - (original.durationMs ?? 0)) > 100)
    throw new Error('A preparação alterou a duração do original além de um quadro')
  return { file: output, metadata, original }
}
