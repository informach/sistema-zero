import { z } from 'zod'
import { mediaInputArguments, mediaProcess } from './media-process'
import type { MediaMetadata } from './probe-image'

const numeric = z.union([z.number(), z.string().regex(/^-?\d+(?:\.\d+)?$/)]).transform(Number)
const probeSchema = z.object({
  format: z.object({ duration: numeric.optional(), format_name: z.string() }),
  streams: z
    .array(
      z.object({
        codec_type: z.string(),
        codec_name: z.string(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        duration: numeric.optional(),
        avg_frame_rate: z.string().optional(),
        r_frame_rate: z.string().optional(),
        sample_rate: z.string().optional(),
        channels: z.number().optional(),
        color_space: z.string().optional(),
        color_transfer: z.string().optional(),
        side_data_list: z.array(z.object({ rotation: z.number().optional() })).optional(),
      }),
    )
    .max(64),
})
export async function probeVideo(
  file: string,
  mime: string,
  signal: AbortSignal,
): Promise<
  MediaMetadata & {
    hasAudio: boolean
    frameRate: { numerator: number; denominator: number } | null
    colorSpace: string | null
    colorTransfer: string | null
  }
> {
  const result = await mediaProcess(
    'ffprobe',
    [
      '-v',
      'error',
      ...mediaInputArguments(file, mime),
      '-show_format',
      '-show_streams',
      '-of',
      'json',
    ],
    signal,
  )
  const data = probeSchema.parse(JSON.parse(result.stdout)),
    video = data.streams.find((stream) => stream.codec_type === 'video'),
    audio = data.streams.find((stream) => stream.codec_type === 'audio')
  if (mime.startsWith('video/') && !video)
    throw new Error('O arquivo não contém uma trilha de vídeo')
  if (mime.startsWith('audio/') && !audio) throw new Error('O arquivo não contém áudio')
  const seconds = data.format.duration ?? video?.duration ?? audio?.duration
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0 || seconds > 86400)
    throw new Error('Duração de mídia ausente ou fora do limite de 24 horas')
  if (video && (!video.width || !video.height || video.width * video.height > 40_000_000))
    throw new Error('Dimensões de vídeo ausentes ou acima de 40 megapixels')
  const raw = video?.avg_frame_rate?.match(/^(\d+)\/(\d+)$/),
    numerator = raw ? Number(raw[1]) : 0,
    denominator = raw ? Number(raw[2]) : 0
  const frameRate = numerator > 0 && denominator > 0 ? { numerator, denominator } : null
  // Browser WebM/VFR can omit avg_frame_rate while carrying valid timestamps.
  // Preserve that unknown value; r_frame_rate is a base rate, not the average.
  // Presentation derivatives choose their CFR explicitly in prepareVideo.
  if (video) {
    // Some malformed VFR containers advertise a duration shorter than their last PTS.
    // Do not silently discard that tail when creating a CFR presentation derivative.
    const tail = await mediaProcess(
      'ffprobe',
      [
        '-v',
        'error',
        ...mediaInputArguments(file, mime),
        '-select_streams',
        'v:0',
        '-read_intervals',
        `${Math.max(0, seconds - 2)}%`,
        '-show_entries',
        'packet=pts_time',
        '-of',
        'json',
      ],
      signal,
    )
    const packets = z
      .object({ packets: z.array(z.object({ pts_time: numeric.optional() })).max(100000) })
      .parse(JSON.parse(tail.stdout))
    if (
      packets.packets.some(
        (packet) => packet.pts_time !== undefined && packet.pts_time > seconds + 0.1,
      )
    )
      throw new Error(
        'A duração informada pelo vídeo não cobre todos os quadros; recupere uma cópia válida do original',
      )
  }
  return {
    width: video?.width ?? null,
    height: video?.height ?? null,
    durationMs: seconds * 1000,
    codec: video?.codec_name ?? audio?.codec_name ?? null,
    rotation: video?.side_data_list?.find((item) => item.rotation !== undefined)?.rotation ?? 0,
    hasAudio: Boolean(audio),
    frameRate,
    colorSpace: video?.color_space ?? null,
    colorTransfer: video?.color_transfer ?? null,
  }
}
