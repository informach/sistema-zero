import { expect, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { summarizeAsset } from '../../core/assetSummary'
import { COPY } from '../../core/copy'
import type { GalleryPreview } from '../../core/galleryPreview'
import type { GalleryPreviews } from '../../state/galleryPreviews'
import { makeTexture } from '../../testing/fixtures'
import { ProgressiveThumb } from './ProgressiveThumb'

test('offscreen thumbnails do not load; leaving cancels and stale completion does not render', async () => {
  const original = globalThis.IntersectionObserver
  let notify: ((visible: boolean) => void) | undefined
  let disconnected = false
  globalThis.IntersectionObserver = class implements IntersectionObserver {
    readonly root = null
    readonly rootMargin = '120px'
    readonly thresholds = [0]
    constructor(private callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      notify = (isIntersecting) =>
        this.callback([{ target, isIntersecting } as IntersectionObserverEntry], this)
    }
    unobserve() {}
    takeRecords() {
      return []
    }
    disconnect() {
      disconnected = true
    }
  }
  try {
    const requests: Array<{ signal: AbortSignal; finish(value: GalleryPreview | null): void }> = []
    const previews: GalleryPreviews = {
      load: (_summary, signal) =>
        new Promise((finish) => {
          requests.push({ signal, finish })
        }),
      clear() {},
    }
    const { container, unmount } = render(
      <ProgressiveThumb summary={summarizeAsset(makeTexture())} previews={previews} />,
    )
    expect(requests).toHaveLength(0)
    act(() => notify?.(true))
    expect(requests).toHaveLength(1)
    act(() => notify?.(false))
    expect(requests[0]?.signal.aborted).toBe(true)
    await act(async () => {
      requests[0]?.finish({ kind: 'texture', dataUrl: 'data:image/png;base64,old' })
    })
    expect(container.querySelector('img')).toBeNull()
    act(() => notify?.(true))
    await act(async () => {
      requests[1]?.finish({ kind: 'texture', dataUrl: 'data:image/png;base64,new' })
    })
    await waitFor(() =>
      expect(container.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,new'),
    )
    act(() => notify?.(false))
    expect(container.querySelector('img')).toBeNull()
    unmount()
    expect(disconnected).toBe(true)
  } finally {
    globalThis.IntersectionObserver = original
  }
})

test('stored thumbnails need no source read and defer image decoding', () => {
  const previews: GalleryPreviews = {
    load: async () => {
      throw new Error('must not read')
    },
    clear() {},
  }
  const summary = summarizeAsset(makeTexture({ thumb: 'data:image/png;base64,cached' }))
  render(<ProgressiveThumb summary={summary} previews={previews} />)
  const image = screen.getByRole('img')
  expect(image.getAttribute('src')).toBe(summary.thumbDataUrl)
  expect(image.getAttribute('loading')).toBe('lazy')
  expect(image.getAttribute('decoding')).toBe('async')
})

test('a malformed stored image has a friendly fallback and a new image can recover', () => {
  let reads = 0
  const previews: GalleryPreviews = {
    async load() {
      reads += 1
      return null
    },
    clear() {},
  }
  const summary = summarizeAsset(makeTexture({ thumb: 'data:image/png;base64,broken' }))
  const { container, rerender } = render(<ProgressiveThumb summary={summary} previews={previews} />)
  fireEvent.error(screen.getByRole('img'))
  expect(container.querySelector('img')).toBeNull()
  expect(screen.getByRole('img', { name: COPY.gallery.previewUnavailable })).toBeDefined()
  expect(reads).toBe(0)
  rerender(
    <ProgressiveThumb
      summary={{ ...summary, thumbDataUrl: 'data:image/png;base64,new' }}
      previews={previews}
    />,
  )
  expect(container.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,new')
})
