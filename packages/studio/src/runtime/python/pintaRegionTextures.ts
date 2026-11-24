import { checkPintaOwner, checkPintaTexturePng, type PintaTextureLoad } from './pintaRegionProtocol'

interface PintaTextureStoreOptions<T extends { width: number; height: number }> {
  maxImages: number
  maxPixels: number
  existing(): { images: number; pixels: number }
  /** Accepts ownership of the bitmap upon success. */
  create(bitmap: ImageBitmap): T
  release(texture: T): void
}

/** One registry per execution frame. An owner appears only after all its PNGs were decoded. */
export function createPintaTextureStore<T extends { width: number; height: number }>(
  options: PintaTextureStoreOptions<T>,
) {
  const owners = new Map<number, { images: T[]; pixels: number }>()
  let count = 0
  let pixels = 0
  let lastOwner = 0
  let staging: T[] | undefined
  let disposed = false

  function active() {
    if (disposed) throw new Error('A execução do cenário do Pinta foi encerrada.')
  }

  function release(owner: number) {
    const entry = owners.get(owner)
    if (!entry) return
    owners.delete(owner)
    pixels -= entry.pixels
    count -= entry.images.length
    for (const image of entry.images) options.release(image)
  }

  return {
    get count() {
      return count
    },
    get pixels() {
      return pixels
    },
    async load(request: PintaTextureLoad, payload: Uint8Array<ArrayBuffer>) {
      active()
      if (staging) throw new Error('Um cenário do Pinta já está sendo preparado.')
      const current = options.existing()
      if (
        current.images + count + request.images.length > options.maxImages ||
        current.pixels + pixels + request.pixels > options.maxPixels
      )
        throw new Error('As imagens do jogo passaram do limite de tamanho ou quantidade.')
      let offset = 0
      const pngs = request.images.map(([width, height, length]) => {
        const bytes = payload.subarray(offset, offset + length)
        offset += length
        checkPintaTexturePng(bytes, width, height)
        return { width, height, bytes }
      })
      const candidate: T[] = []
      staging = candidate
      try {
        for (const { bytes, width, height } of pngs) {
          let bitmap: ImageBitmap
          try {
            bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }), {
              premultiplyAlpha: 'none',
              colorSpaceConversion: 'none',
              imageOrientation: 'none',
            })
          } catch {
            throw new Error('Não consegui abrir uma imagem do cenário do Pinta.')
          }
          try {
            active()
            if (bitmap.width !== width || bitmap.height !== height)
              throw new Error('As dimensões da imagem diferem do PNG do cenário do Pinta.')
            candidate.push(options.create(bitmap))
          } catch (error) {
            bitmap.close()
            throw error
          }
        }
        const owner = lastOwner + 1
        checkPintaOwner(owner)
        owners.set(owner, { images: candidate, pixels: request.pixels })
        lastOwner = owner
        pixels += request.pixels
        count += candidate.length
        return owner
      } catch (error) {
        for (const image of candidate) options.release(image)
        throw error
      } finally {
        staging = undefined
      }
    },
    image(owner: number, index: number): T {
      checkPintaOwner(owner)
      const result =
        Number.isSafeInteger(index) && index >= 0 ? owners.get(owner)?.images[index] : undefined
      if (!result) throw new Error('A imagem do cenário do Pinta não pertence a um mundo aberto.')
      return result
    },
    release(owner: number) {
      checkPintaOwner(owner)
      release(owner)
    },
    dispose() {
      disposed = true
      for (const owner of owners.keys()) release(owner)
      if (staging) for (const image of staging.splice(0)) options.release(image)
    },
  }
}
