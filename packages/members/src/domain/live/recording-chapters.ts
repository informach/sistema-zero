import type { LiveRecordingChapter, LiveSectionMark } from '@sistemazero/core/live'

/**
 * Um trecho gravado, como o gravador registra no manifesto (`RecordingSegment` do
 * `@sistemazero/live-recorder`): instantes de parede e a duração REAL do arquivo. O replay é a
 * concatenação dos trechos na ordem, então as pausas não ocupam tempo no vídeo.
 */
export interface LiveRecordingSegmentTime {
  startsAt: string
  endsAt: string
  durationMs: number
}

/** O manifesto tem no máximo 1440 trechos de até 30 s (o teto do gravador). */
export const RECORDING_SEGMENTS_MAX = 1440

/** Só o que a conta precisa, validado: um manifesto torto não pode virar capítulo absurdo. */
export function recordingSegmentsOf(raw: unknown): LiveRecordingSegmentTime[] | null {
  if (!Array.isArray(raw) || raw.length > RECORDING_SEGMENTS_MAX) return null
  const segments: LiveRecordingSegmentTime[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null
    const { startsAt, endsAt, durationMs } = item as Record<string, unknown>
    if (
      typeof startsAt !== 'string' ||
      typeof endsAt !== 'string' ||
      !Number.isFinite(Date.parse(startsAt)) ||
      !Number.isFinite(Date.parse(endsAt)) ||
      typeof durationMs !== 'number' ||
      !Number.isFinite(durationMs) ||
      durationMs <= 0 ||
      durationMs > 30_000
    )
      return null
    segments.push({ startsAt, endsAt, durationMs })
  }
  return segments
}

/**
 * Capítulos por parte, em segundos DO VÍDEO: cada marca (a abertura de uma parte, no relógio de
 * parede) vira a posição na concatenação dos trechos. Marca dentro de um trecho cai no ponto
 * correspondente; marca durante uma pausa cai no começo do trecho seguinte (a parte começou
 * enquanto nada gravava); marca antes do primeiro trecho cai no 0; marca depois do último
 * trecho não está no vídeo e fica de fora. Capítulos nunca voltam no tempo.
 */
export function recordingChapters(
  marks: LiveSectionMark[],
  segments: LiveRecordingSegmentTime[],
): LiveRecordingChapter[] {
  const timeline: { starts: number; ends: number; offset: number; duration: number }[] = []
  let offset = 0
  for (const segment of segments) {
    const starts = Date.parse(segment.startsAt)
    timeline.push({
      starts,
      ends: Math.max(starts, Date.parse(segment.endsAt)),
      offset,
      duration: segment.durationMs,
    })
    offset += segment.durationMs
  }
  const chapters: LiveRecordingChapter[] = []
  let last = 0
  for (const mark of [...marks].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    const at = Date.parse(mark.at)
    if (!Number.isFinite(at)) continue
    const segment = timeline.find((item) => item.ends > at)
    if (!segment) continue
    const position =
      at <= segment.starts
        ? segment.offset
        : segment.offset + Math.min(at - segment.starts, segment.duration)
    const seconds = Math.max(last, Math.floor(position / 1000))
    last = seconds
    chapters.push({ sectionId: mark.sectionId, seconds })
  }
  return chapters
}
