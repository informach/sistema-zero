/** A bounded image from an already presented runtime frame; never source code. */
export interface StudioRuntimeImage {
  dataUrl: string
  width: number
  height: number
  frameSequence: number
}

export const STUDIO_SNAPSHOT_LIMITS = { width: 1024, height: 768, dataUrlChars: 6_000_000 } as const

/** Checks only PNG signature/IHDR and bounded dimensions; this is not a full image decoder. */
export function readStudioRuntimePngDimensions(bytes: Uint8Array) {
  if (bytes.byteLength < 33) return
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (
    view.getUint32(0) !== 0x89504e47 ||
    view.getUint32(4) !== 0x0d0a1a0a ||
    view.getUint32(8) !== 13 ||
    view.getUint32(12) !== 0x49484452
  )
    return
  const width = view.getUint32(16),
    height = view.getUint32(20)
  if (
    width < 1 ||
    width > STUDIO_SNAPSHOT_LIMITS.width ||
    height < 1 ||
    height > STUDIO_SNAPSHOT_LIMITS.height
  )
    return
  return { width, height }
}

/** Bounded PNG transport; validate dimensions from IHDR before any image decoding. */
export function readStudioRuntimeImage(raw: unknown): StudioRuntimeImage | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return
  const value = raw as Record<string, unknown>
  const { dataUrl, width, height, frameSequence } = value
  if (
    typeof dataUrl !== 'string' ||
    dataUrl.length > STUDIO_SNAPSHOT_LIMITS.dataUrlChars ||
    !dataUrl.startsWith('data:image/png;base64,iVBORw0KGgo') ||
    typeof width !== 'number' ||
    !Number.isSafeInteger(width) ||
    width < 1 ||
    width > STUDIO_SNAPSHOT_LIMITS.width ||
    typeof height !== 'number' ||
    !Number.isSafeInteger(height) ||
    height < 1 ||
    height > STUDIO_SNAPSHOT_LIMITS.height ||
    typeof frameSequence !== 'number' ||
    !Number.isSafeInteger(frameSequence) ||
    frameSequence < 1
  )
    return
  const encoded = dataUrl.slice(22)
  if (encoded.length < 44 || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    return
  try {
    const dimensions = readStudioRuntimePngDimensions(
      Uint8Array.from(atob(encoded.slice(0, 44)), (char) => char.charCodeAt(0)),
    )
    if (dimensions?.width !== width || dimensions.height !== height) return
  } catch {
    return
  }
  return { dataUrl, width, height, frameSequence }
}
