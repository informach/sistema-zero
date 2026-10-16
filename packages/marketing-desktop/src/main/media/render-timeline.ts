import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type TimelineProps, timelinePropsSchema } from '@sistemazero/marketing-production/data'
import type { ExecutionResources } from '../execution/supervisor'
import { withOutputBudget } from './output-budget'
import { probeVideo } from './probe-video'
import { renderProcess } from './render-process'

export async function renderTimeline(
  props: TimelineProps,
  resources: Pick<ExecutionResources, 'assets'>,
  directory: string,
  signal: AbortSignal,
) {
  const value = timelinePropsSchema.parse(props)
  if (
    !value.timeline.clips.some(
      (clip) => clip.kind === 'video' || clip.kind === 'image' || clip.kind === 'text' || clip.kind === 'art',
    )
  )
    throw new Error('Adicione cenas à montagem antes de exportar')
  if (Object.values(value.assets).some((url) => !resources.assets.ownsUrl(url)))
    throw new Error('O render só aceita arquivos confirmados neste cache')
  const seconds =
    (value.timeline.durationInFrames * value.timeline.fps.denominator) /
    value.timeline.fps.numerator
  const release = await resources.assets.reserve(
    Math.min(
      2_000_000_000,
      Math.ceil(seconds * value.timeline.width * value.timeline.height * 0.5 + 16 * 1024 * 1024),
    ),
  )
  try {
    await mkdir(directory, { recursive: true })
    const input = path.join(directory, 'timeline-input.json'),
      output = path.join(directory, 'timeline.mp4')
    await writeFile(input, JSON.stringify(value))
    await withOutputBudget(directory, [output], 2_000_000_000, signal, (bounded) =>
      renderProcess(input, output, 'timeline', bounded),
    )
    const metadata = await probeVideo(output, 'video/mp4', signal)
    if (
      metadata.width !== value.timeline.width ||
      metadata.height !== value.timeline.height ||
      metadata.codec !== 'h264' ||
      Math.abs((metadata.durationMs ?? 0) - seconds * 1000) > 100
    )
      throw new Error('A saída não corresponde à duração, dimensões ou codec da montagem')
    return await resources.assets.importFile(output)
  } finally {
    release()
  }
}
