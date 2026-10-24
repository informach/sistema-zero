import type { ProjectAsset } from './projectAssets'

const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/vnd.wave': 'wav',
  'audio/vnd.wav': 'wav',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'model/gltf-binary': 'glb',
  'application/octet-stream': 'bin',
  'image/vnd.radiance': 'hdr',
  'image/x-hdr': 'hdr',
}

export function projectAssetFileExtension(
  mime: string,
  kind?: ProjectAsset['kind'],
  fallback = 'bin',
): string {
  if (kind === 'model3d') return 'glb'
  if (kind === 'environment3d') return 'hdr'
  return MIME_EXTENSIONS[mime] ?? fallback
}

/**
 * An SVG `data:` URL exactly as `decodeProjectAsset` reads it. A prefix test would also take
 * `data:image/svg+xmlX,…`, whose MIME maps to no extension.
 */
export function isSvgDataUrl(value: string): boolean {
  return /^data:image\/svg\+xml(?:;charset=(?:utf-8|us-ascii))?(?:;base64)?,/i.test(value)
}

export function decodeProjectAsset(dataUrl: string): {
  mime: string
  bytes: Uint8Array<ArrayBuffer>
} {
  // Pinta serializes SVG as UTF-8 with an explicit charset (RFC2397).
  // Media bytes stay unchanged; other text encodings are not supported here.
  const match = /^data:([^;,]+)(?:;charset=(?:utf-8|us-ascii))?(;base64)?,([\s\S]*)$/i.exec(dataUrl)
  if (!match) throw new Error('O arquivo do material tem um formato inválido.')
  const mime = match[1]!.toLowerCase()
  const raw = match[3]!
  let bytes: Uint8Array<ArrayBuffer>
  if (match[2]) {
    // Keep atob's validation/padding rules. A direct indexed copy avoids the
    // per-character iterator and callback allocation for large media files.
    const binary = atob(raw)
    bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  } else bytes = new TextEncoder().encode(decodeURIComponent(raw))
  return { mime, bytes }
}

export async function digestAssetBytes(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const result = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(result), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function encodeAssetBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 8192)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  return btoa(binary)
}
