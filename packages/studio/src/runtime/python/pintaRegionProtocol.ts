/** Private, engine-independent part of Pinta's browser texture transport. */
const LOAD_PREFIX = '{"pintaLoad":'
const RELEASE_PREFIX = '{"pintaRelease":'
type PintaTextureRequestText =
  | `${typeof LOAD_PREFIX}${string}`
  | `${typeof RELEASE_PREFIX}${string}`
export const PINTA_TEXTURE_ATTACHMENT = 0
export const PINTA_AFFINE_ARITY = 13
export const PINTA_RELEASE_ARITY = 1

const PNG_SIDE = 4096
const PNG_PIXELS = 4 * 1024 * 1024
const WORLD_PIXELS = 16 * 1024 * 1024
// A PNG in the admitted 16 MiB metadata world costs at least four Base64 characters per 3 bytes.
const WORLD_ENCODED_BYTES = 12 * 1024 * 1024
const HEADER_CHARS = 64_000

export type PintaTextureImage = readonly [width: number, height: number, bytes: number]
export interface PintaTextureLoad {
  readonly images: readonly PintaTextureImage[]
  readonly bytes: number
  readonly pixels: number
}

function invalid(): never {
  throw new Error('Os recursos do cenário do Pinta são inválidos ou passaram do limite.')
}

function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
}

/** A resource exchange does not draw a frame, poll input, or acknowledge a debugger step. */
export function isPintaTextureRequest(value: unknown): value is PintaTextureRequestText {
  return (
    typeof value === 'string' && (value.startsWith(LOAD_PREFIX) || value.startsWith(RELEASE_PREFIX))
  )
}

export function readPintaTextureRequest(
  raw: string,
  maxImages: number,
): PintaTextureLoad | { owner: number } {
  if (raw.length > HEADER_CHARS) invalid()
  let request: unknown
  try {
    request = JSON.parse(raw)
  } catch {
    invalid()
  }
  if (
    !request ||
    typeof request !== 'object' ||
    Array.isArray(request) ||
    Object.keys(request).length !== 1
  )
    invalid()
  if ('pintaRelease' in request) {
    if (!integer(request.pintaRelease, 1, Number.MAX_SAFE_INTEGER)) invalid()
    return { owner: request.pintaRelease }
  }
  if (
    !('pintaLoad' in request) ||
    !Array.isArray(request.pintaLoad) ||
    request.pintaLoad.length < 1 ||
    request.pintaLoad.length > maxImages
  )
    invalid()
  let bytes = 0
  let pixels = 0
  const images: PintaTextureImage[] = []
  for (const descriptor of request.pintaLoad) {
    if (!Array.isArray(descriptor) || descriptor.length !== 3) invalid()
    const [width, height, length] = descriptor
    if (
      !integer(width, 1, PNG_SIDE) ||
      !integer(height, 1, PNG_SIDE) ||
      width * height > PNG_PIXELS ||
      !integer(length, 45, WORLD_ENCODED_BYTES)
    )
      invalid()
    bytes += length
    pixels += width * height
    if (bytes > WORLD_ENCODED_BYTES || pixels > WORLD_PIXELS) invalid()
    images.push([width, height, length])
  }
  return { images, bytes, pixels }
}

function texturePayload(value: unknown, bytes: number): Uint8Array<ArrayBuffer> {
  if (
    !(value instanceof Uint8Array) ||
    !(value.buffer instanceof ArrayBuffer) ||
    value.byteLength !== bytes
  )
    invalid()
  // Keep to_js's transferable copy. A view must not transfer adjacent bytes.
  return value.byteOffset === 0 && value.byteLength === value.buffer.byteLength
    ? (value as Uint8Array<ArrayBuffer>)
    : new Uint8Array(value)
}

export function pintaTextureAttachments(raw: string, payload: unknown, maxImages: number) {
  const request = readPintaTextureRequest(raw, maxImages)
  if ('owner' in request) {
    texturePayload(payload, 0)
    return []
  }
  return [{ id: PINTA_TEXTURE_ATTACHMENT, bytes: texturePayload(payload, request.bytes) }]
}

export function readPintaTextureAttachment(
  attachments: readonly { id: number; bytes: Uint8Array<ArrayBuffer> }[],
  request: PintaTextureLoad,
) {
  const attachment = attachments[0]
  if (attachments.length !== 1 || attachment?.id !== PINTA_TEXTURE_ATTACHMENT) invalid()
  return texturePayload(attachment.bytes, request.bytes)
}

export function checkPintaReleaseAttachments(attachments: readonly unknown[]) {
  if (attachments.length) invalid()
}

/** Check the decoder's actual PNG envelope before letting it allocate pixels. */
export function checkPintaTexturePng(bytes: Uint8Array, width: number, height: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (
    bytes.byteLength < 45 ||
    view.getUint32(0) !== 0x89504e47 ||
    view.getUint32(4) !== 0x0d0a1a0a ||
    view.getUint32(8) !== 13 ||
    view.getUint32(12) !== 0x49484452 ||
    view.getUint32(16) !== width ||
    view.getUint32(20) !== height
  )
    invalid()
  let hasPixels = false
  for (let at = 33; at + 12 <= bytes.length; ) {
    const length = view.getUint32(at)
    const type = view.getUint32(at + 4)
    const end = at + 12 + length
    if (end > bytes.length) invalid()
    switch (type) {
      case 0x49484452: // IHDR again
      case 0x6163544c: // acTL, fcTL, fdAT (animated PNG)
      case 0x6663544c:
      case 0x66644154:
        return invalid()
      case 0x49444154:
        hasPixels = true
        break
      case 0x49454e44:
        if (length === 0 && end === bytes.length && hasPixels) return
        return invalid()
    }
    at = end
  }
  invalid()
}

export function checkPintaOwner(owner: number) {
  if (!integer(owner, 1, Number.MAX_SAFE_INTEGER)) invalid()
}

export function checkPintaAffine(
  list: Float64Array,
  at: number,
  image: { readonly width: number; readonly height: number },
) {
  const x = list[at + 2]!,
    y = list[at + 3]!,
    w = list[at + 4]!,
    h = list[at + 5]!
  if (
    !integer(x, 0, image.width) ||
    !integer(y, 0, image.height) ||
    !integer(w, 1, image.width - x) ||
    !integer(h, 1, image.height - y)
  )
    invalid()
  // The 2D GPU batch uses binary32. Keep its vertices finite, including after crop scaling.
  for (let i = at + 6; i < at + 12; i++) {
    if (!Number.isFinite(Math.fround(list[i]! * (i < at + 10 ? PNG_SIDE * 3 : 3)))) invalid()
  }
  const opacity = list[at + 12]!
  if (!(opacity >= 0 && opacity <= 1)) invalid()
}
