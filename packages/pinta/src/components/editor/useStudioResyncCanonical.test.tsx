import { afterEach, expect, test } from 'bun:test'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { createVectorSpriteAsset } from '../../core/project'
import type { PintaExportedAsset, PintaStudioResyncResult } from '../../core/types'
import { buildStudioPayload } from '../../export/studioBridge'
import { createGalleryStore } from '../../state/galleryStore'
import { makeRect } from '../../vector/shapes'
import { useStudioResync } from './useStudioResync'

afterEach(cleanup)

test('manual export and saved-frame resync keep the full canonical SVG sheet', async () => {
  // Real vector serializer; no canvas override and no claim about browser pixels.
  const asset = createVectorSpriteAsset({ name: 'heroi', frameSize: 16 })
  const animation = asset.animations[0]!
  animation.frames = ['#ff0000', '#0000ff'].map((fill) => [
    makeRect({ x: 0, y: 0 }, { x: 16, y: 16 }, { fill, stroke: null, opacity: 1 }),
  ])
  const gallery = createGalleryStore()
  const sent: PintaExportedAsset[] = []
  const failures: Array<string | undefined> = []
  const send = async (payload: PintaExportedAsset): Promise<PintaStudioResyncResult> => {
    sent.push(payload)
    return { updated: true }
  }
  const { rerender, result } = renderHook(
    ({ current, frameIndex }) =>
      useStudioResync({
        asset: current,
        animationId: animation.id,
        frameIndex,
        gallery,
        send,
        onFailure: (message) => failures.push(message),
      }),
    { initialProps: { current: asset, frameIndex: 0 } },
  )
  expect(sent).toEqual([])
  for (const frameIndex of [0, 1]) {
    const current = { ...asset, updatedAt: asset.updatedAt + frameIndex + 1 }
    const manual = await buildStudioPayload(current, () => null, {
      animationId: animation.id,
      frameIndex,
    })
    if (!manual) throw new Error('Canonical SVG fixture was refused')
    rerender({ current, frameIndex })
    window.dispatchEvent(new Event('pagehide'))
    await waitFor(() => expect(sent).toHaveLength(frameIndex + 1))
    await waitFor(() => expect(result.current).toBe(true))
    expect(sent[frameIndex]).toEqual({
      id: asset.id,
      name: asset.name,
      ...manual,
    })
  }
  expect(sent[0]).toEqual(sent[1])
  expect(sent[0]?.dataUrl).toStartWith('data:image/svg+xml;charset=utf-8,')
  expect(sent[0]?.sprite?.animations).toMatchObject([{ from: 0, to: 1 }])
  const svg = decodeURIComponent(sent[0]!.dataUrl.split(',')[1]!)
  expect(svg).toContain('#ff0000')
  expect(svg).toContain('#0000ff')
  expect(Object.hasOwn(sent[0]!, 'pintaImage')).toBe(false)
  expect(Object.hasOwn(sent[0]!, 'recipe')).toBe(false)
  expect(failures).toEqual([])
})
