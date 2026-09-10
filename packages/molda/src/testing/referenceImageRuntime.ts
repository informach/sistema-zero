import { spyOn } from 'bun:test'

/** Decoder/URL browser boundary only. Tests still execute file inspection and resource ownership. */
export function installReferenceImageRuntime() {
  const original = globalThis.Image
  const images: Array<{
    src: string
    removed: boolean
    finish(width?: number, height?: number): void
    fail(): void
  }> = []
  const create = spyOn(URL, 'createObjectURL').mockImplementation(
    () => `blob:reference-${images.length}`,
  )
  const revoke = spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
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
      revoke.mockRestore()
    },
  }
}
