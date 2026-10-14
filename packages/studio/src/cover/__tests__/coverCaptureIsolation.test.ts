import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { createEmptyProject } from '#core'
import { captureCoverFromProject } from '../coverCapture'

const origin = 'https://kids.example.test'
const initialLocation = window.location.href
const project = () => createEmptyProject('01ARZ3NDEKTSV4RRFFQ69G5FAX', 'Capa isolada')

afterEach(() => {
  for (const frame of document.querySelectorAll('iframe')) frame.remove()
  window.location.href = initialLocation
})

describe('live cover execution isolation', () => {
  test('required isolation without an adapter never mounts an executable frame', async () => {
    expect(await captureCoverFromProject(project(), { requireIsolatedPreview: true })).toBeNull()
    expect(document.querySelector('iframe')).toBeNull()
  })

  test('failed upload never falls back to srcdoc', async () => {
    let attempts = 0
    expect(
      await captureCoverFromProject(project(), {
        requireIsolatedPreview: true,
        originAdapter: {
          async createPreviewUrl() {
            attempts++
            throw new Error('Storage unavailable')
          },
        },
      }),
    ).toBeNull()
    expect(attempts).toBe(2)
    expect(document.querySelector('iframe')).toBeNull()
  })

  test('a same-origin result is rejected and released on both capture passes', async () => {
    window.location.href = origin
    const released: string[] = []
    expect(
      await captureCoverFromProject(project(), {
        requireIsolatedPreview: true,
        originAdapter: {
          async createPreviewUrl() {
            return `${origin}/unsafe.html`
          },
          releasePreviewUrl(url) {
            released.push(url)
          },
        },
      }),
    ).toBeNull()
    expect(released).toEqual([`${origin}/unsafe.html`, `${origin}/unsafe.html`])
    expect(document.querySelector('iframe')).toBeNull()
  })

  test('isolated frame accepts only its own message and releases its artifact', async () => {
    window.location.href = origin
    const released: string[] = []
    const append = spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (!(node instanceof HTMLIFrameElement)) throw new Error('Expected a preview iframe')
      const frame = node
      // No browser/network in this unit boundary: emulate the child WindowProxy.
      const source = {} as Window
      Object.defineProperty(frame, 'contentWindow', { value: source })
      expect(frame.getAttribute('src')).toBe('https://preview.example.test/cover.html')
      expect(frame.hasAttribute('srcdoc')).toBe(false)
      expect(frame.getAttribute('sandbox')).toBe('allow-scripts')
      window.dispatchEvent(
        new MessageEvent('message', {
          source: window,
          origin: 'null',
          data: { __szCover: true, dataUrl: 'data:image/png;base64,wrong' },
        }),
      )
      window.dispatchEvent(
        new MessageEvent('message', {
          source,
          origin: 'null',
          data: { __szCover: true, dataUrl: 'data:image/png;base64,valid' },
        }),
      )
      return node
    })
    try {
      const cover = await captureCoverFromProject(project(), {
        requireIsolatedPreview: true,
        timeoutMs: 1000,
        originAdapter: {
          async createPreviewUrl() {
            return 'https://preview.example.test/cover.html'
          },
          releasePreviewUrl(url) {
            released.push(url)
          },
        },
      })
      expect(cover).toBe('data:image/png;base64,valid')
      expect(released).toEqual(['https://preview.example.test/cover.html'])
      expect(document.querySelector('iframe')).toBeNull()
    } finally {
      append.mockRestore()
    }
  })
})
