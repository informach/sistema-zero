import { createHash } from 'node:crypto'
import { prepareWebArtwork } from '@sistemazero/edisvg/data'

export const MAX_ANIMATION_BYTES = 10_000_000
export class InvalidAnimationFileError extends Error {
  readonly code = 'INVALID_ANIMATION_FILE'
}

export function ownedAnimationPreview(src: string, prefix: string): boolean {
  if (!src.startsWith(prefix)) return false
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/animation\.edi-animation\.json$/.test(
    src.slice(prefix.length),
  )
}

/** Validates every resource and the actual PNG. Neither project JSON nor uploaded JS is executed. */
export function prepareAnimationFile(bytes: Uint8Array) {
  if (!bytes.byteLength || bytes.byteLength > MAX_ANIMATION_BYTES)
    throw new InvalidAnimationFileError('A animação deve ter até 10 MB.')
  try {
    const { content, info, poster } = prepareWebArtwork(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    )
    return {
      content: Buffer.from(content),
      sha256: createHash('sha256').update(content).digest('hex'),
      info,
      poster: { ...poster, sha256: createHash('sha256').update(poster.bytes).digest('hex') },
    }
  } catch {
    throw new InvalidAnimationFileError(
      'Arquivo inválido. Exporte no ediSVG em Animação para web, com a imagem de reserva.',
    )
  }
}
