import { expect, test } from 'bun:test'
import { loadPgzeroModuleSources } from './pgzero/moduleSources'
import { PYGAME_CE_WHEEL } from './pygame/contract'
import { loadPygameModuleSources } from './pygame/moduleSources'
import { loadRaylibModuleSources } from './raylib/moduleSources'
import { loadTurtleModuleSources } from './turtle/moduleSources'

for (const [label, load] of [
  ['Turtle', loadTurtleModuleSources],
  ['Pygame Zero', loadPgzeroModuleSources],
  ['Pygame-ce', loadPygameModuleSources],
  ['Raylib 2D/3D', loadRaylibModuleSources],
] as const) {
  test(`${label}: withdrawal cancels the entire file batch with its original reason`, async () => {
    const original = globalThis.fetch
    const signals: AbortSignal[] = []
    const urls: string[] = []
    let started!: () => void
    const firstRequest = new Promise<void>((resolve) => {
      started = resolve
    })
    globalThis.fetch = ((_url: string | URL | Request, options?: RequestInit) => {
      urls.push(String(_url))
      const signal = options!.signal!
      signals.push(signal)
      started()
      return new Promise<Response>((_, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
      )
    }) as typeof fetch
    try {
      const owner = new AbortController()
      const reason = new Error('owner withdrawn')
      const pending = load(new URL('https://runtime.example.test/v1/'), owner.signal)
      await firstRequest
      expect(signals.length).toBeGreaterThan(1)
      owner.abort(reason)
      await expect(pending).rejects.toBe(reason)
      expect(signals.every((signal) => signal.aborted)).toBe(true)
      expect(new Set(signals).size).toBe(1)
      expect(urls.every((url) => url.startsWith('https://runtime.example.test/v1/'))).toBe(true)
    } finally {
      globalThis.fetch = original
    }
  })
}

test('Pygame-ce applies per-file limits and returns the pinned wheel with unprefixed module paths', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (url: string | URL | Request) =>
    new Response(
      String(url).endsWith(PYGAME_CE_WHEEL.file) ? new Uint8Array(PYGAME_CE_WHEEL.bytes) : 'source',
    )) as typeof fetch
  try {
    const result = await loadPygameModuleSources(new URL('https://runtime.example.test/v1/'))
    expect(result.wheel.byteLength).toBe(PYGAME_CE_WHEEL.bytes)
    expect(result.sources.has('pinta.py')).toBe(true)
    expect(result.sources.has('pygame/pinta.py')).toBe(false)
    expect(result.sources.has('_szpygame/__init__.py')).toBe(true)
  } finally {
    globalThis.fetch = original
  }
})
