import { expect, test } from 'bun:test'
import { sampleSceneAnimationTransform } from '../../../scene/sampleAnimation'
import { animatedScene } from '../../../testing/sceneAnimation'
import { sceneAnimationCurvePlot } from './animationCurvePlot'

test('curve drawing samples the same effective transform, includes exact arrivals and stays bounded for dense clips', () => {
  const source = animatedScene(),
    node = source.nodes.find((node) => node.id === 'body')!,
    clip = source.animations[0]!
  const plot = sceneAnimationCurvePlot(node, clip, 'translation')
  expect(plot.points.some((point) => point.time === 1.123456789123)).toBe(true)
  for (const point of plot.points)
    expect(point.values).toEqual(
      sampleSceneAnimationTransform(node, clip.space, clip.tracks, point.time).translation,
    )
  const dense = {
    ...clip,
    tracks: [
      {
        ...clip.tracks[0]!,
        channel: 'translation' as const,
        keys: Array.from({ length: 65536 }, (_, i) => ({
          time: (i / 65535) * 2,
          value: [i % 2, 0, 0] as [number, number, number],
          interpolation: 'step' as const,
        })),
      },
    ],
  }
  const general = sceneAnimationCurvePlot(node, dense, 'translation')
  expect(general.sampled).toBe(true)
  expect(general.points.length).toBeLessThanOrEqual(257)
  const zoomed = sceneAnimationCurvePlot(
    node,
    dense,
    'translation',
    dense.tracks[0]!.keys[45]!.time,
    dense.tracks[0]!.keys[48]!.time,
  )
  expect(zoomed.sampled).toBe(false)
  expect(zoomed.points.some((point) => point.time === dense.tracks[0]!.keys[46]!.time)).toBe(true)
})
