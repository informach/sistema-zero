export interface GalleryDeliveryConfig {
  minItems: number
  maxItems: number
}
/** Standalone drawings include their pixels/vectors/palettes. Maps reference a separate tileset. */
export const GALLERY_DRAWING_KINDS: readonly string[] = [
  'pixel-sprite',
  'pixel-background',
  'tileset',
  'vector-sprite',
  'vector-background',
  'vector-tileset',
]
export interface GallerySelection {
  itemId: string
  revision: number
}
export interface GallerySubmissionItem extends GallerySelection {
  name: string
  kind: string
  storageKey: string
  parts: { hash: string; storageKey: string }[]
}
export interface GallerySubmission {
  kind: 'gallery-delivery'
  version: 1
  requestId: string
  tool: 'studio' | 'pinta'
  items: GallerySubmissionItem[]
}
export interface GalleryDeliveryInput {
  requestId: string
  revision: string
  items: GallerySelection[]
  message?: string
}
export type GalleryDeliveryPlan =
  | { completed: true; result: { submittedAt: string; passed?: boolean; score?: number } }
  | {
      completed: false
      snapshot: GallerySubmission
      copies: { source: string; destination: string }[]
    }
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
export function isGalleryDeliveryConfig(v: unknown, kind: string): v is GalleryDeliveryConfig {
  return (
    record(v) &&
    typeof v.minItems === 'number' &&
    Number.isInteger(v.minItems) &&
    typeof v.maxItems === 'number' &&
    Number.isInteger(v.maxItems) &&
    v.minItems >= 1 &&
    v.maxItems >= v.minItems &&
    v.maxItems <= (kind === 'studio' ? 1 : 12)
  )
}
export function isGalleryBlock(
  content: unknown,
): content is { kind: 'studio' | 'pinta'; gallery: GalleryDeliveryConfig } {
  return (
    record(content) &&
    (content.kind === 'studio' || content.kind === 'pinta') &&
    isGalleryDeliveryConfig(content.gallery, content.kind)
  )
}
export function isGallerySubmission(v: unknown): v is GallerySubmission {
  return (
    record(v) &&
    v.kind === 'gallery-delivery' &&
    v.version === 1 &&
    typeof v.requestId === 'string' &&
    (v.tool === 'studio' || v.tool === 'pinta') &&
    Array.isArray(v.items) &&
    v.items.length > 0 &&
    v.items.length <= 12 &&
    v.items.every(
      (i) =>
        record(i) &&
        typeof i.itemId === 'string' &&
        typeof i.name === 'string' &&
        typeof i.kind === 'string' &&
        typeof i.revision === 'number' &&
        typeof i.storageKey === 'string' &&
        Array.isArray(i.parts) &&
        i.parts.every(
          (p) => record(p) && typeof p.hash === 'string' && typeof p.storageKey === 'string',
        ),
    )
  )
}
