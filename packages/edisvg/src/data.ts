/** Pure canonical ediSVG validation. This entrypoint never imports DOM or React. */
import {
  normalizeWebAnimation,
  readWebAnimation,
  webAnimationPoster,
} from '../vendor/edi-web-data.mjs'

export type { WebAnimationInfo } from '../vendor/edi-web-types.js'
export { normalizeWebAnimation, readWebAnimation, webAnimationPoster }

/** Keep one verified poster beside the runtime payload, so animation fetches do not download it twice. */
export function prepareWebArtwork(input: unknown) {
  const normalized = normalizeWebAnimation(input)
  const poster = webAnimationPoster(normalized)
  if (!poster) throw new Error('A exportação precisa da imagem de reserva.')
  const runtime: Record<string, unknown> = JSON.parse(normalized)
  delete runtime.poster
  const content = normalizeWebAnimation(runtime)
  return { content, info: readWebAnimation(content), poster }
}
