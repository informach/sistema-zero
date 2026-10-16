import { MAX_VISUAL_IMAGES } from '../visual-input-limits'
import type { ProductionResult } from './journal'

export type RecordingContext = {
  observations: NonNullable<ProductionResult['recordingAnalysis']>
  images: string[]
}

export function videoVisualContext(
  recording: RecordingContext | undefined,
  demonstrations: string[],
) {
  const budget = MAX_VISUAL_IMAGES - demonstrations.length
  if (budget < 0) throw new Error('Há fontes visuais demais neste pedido')
  if (!recording) return { recording, images: demonstrations }
  const counts = recording.observations.map((entry) => entry.samples.length)
  if (counts.reduce((total, count) => total + count, 0) !== recording.images.length)
    throw new Error('As amostras de gravação não correspondem às imagens anexas')
  if (recording.images.length <= budget)
    return { recording, images: [...recording.images, ...demonstrations] }

  // Share the remaining slots across recordings, then sample the entire observed interval.
  // Cached analysis remains complete; only this request's visual context is bounded.
  const quotas = counts.map(() => 0)
  let available = budget
  while (available > 0) {
    for (let index = 0; index < counts.length && available > 0; index++) {
      if (quotas[index]! < counts[index]!) {
        quotas[index]!++
        available--
      }
    }
  }
  let offset = 0
  const images: string[] = []
  const observations = recording.observations.map((entry, index) => {
    const quota = quotas[index]!
    const selected = new Set(
      Array.from({ length: quota }, (_, sample) =>
        quota === 1
          ? Math.floor(entry.samples.length / 2)
          : Math.round((sample * (entry.samples.length - 1)) / (quota - 1)),
      ),
    )
    const samples = entry.samples.filter((_, sample) => {
      if (!selected.has(sample)) return false
      images.push(recording.images[offset + sample]!)
      return true
    })
    offset += entry.samples.length
    return { ...entry, samples }
  })
  return { recording: { observations, images }, images: [...images, ...demonstrations] }
}
