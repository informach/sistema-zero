import { mock, spyOn } from 'bun:test'

/** Decoder/URL browser boundary only. Tests still execute file inspection and resource ownership. */
export function installReferenceImageRuntime() {
  const original = globalThis.Image
  const images: Array<{
    src: string
    removed: boolean
    finish(width?: number, height?: number): void
    fail(): void
  }> = []
  const ownedUrls = new Set<string>()
  const create = spyOn(URL, 'createObjectURL').mockImplementation(() => {
    const url = `blob:reference-${images.length}`
    ownedUrls.add(url)
    return url
  })
  const revoke = mock((_url: string) => {})
  const originalRevoke = URL.revokeObjectURL.bind(URL)
  // Downloads from earlier tests release their real URLs on a delayed timer.
  // Count every release of our decoder URLs, including erroneous duplicates.
  const revokeUrl = spyOn(URL, 'revokeObjectURL').mockImplementation((url) => {
    if (ownedUrls.has(url)) revoke(url)
    else originalRevoke(url)
  })
  globalThis.Image = class {
    src = ''
    removed = false
    naturalWidth = 2
    naturalHeight = 2
    private resolve!: () => void
    private reject!: (error: Error) => void
    private pending = new Promise<void>((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
    constructor() {
      images.push(this)
    }
    decode() {
      return this.pending
    }
    removeAttribute() {
      this.removed = true
      this.src = ''
    }
    finish(width = 2, height = 2) {
      this.naturalWidth = width
      this.naturalHeight = height
      this.resolve()
    }
    fail() {
      this.reject(new Error('Cannot decode image'))
    }
  } as unknown as typeof Image
  return {
    images,
    create,
    revoke,
    restore() {
      globalThis.Image = original
      create.mockRestore()
      revokeUrl.mockRestore()
    },
  }
}
