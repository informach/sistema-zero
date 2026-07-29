export const CSS_MEDIA_SIZE_FEATURES = [
  'max-width',
  'min-width',
  'max-height',
  'min-height',
] as const

export const CSS_MEDIA_QUERY_FEATURES = [
  ...CSS_MEDIA_SIZE_FEATURES,
  'prefers-reduced-motion',
] as const

export type CSSMediaSizeFeature = (typeof CSS_MEDIA_SIZE_FEATURES)[number]
export type CSSMediaQueryFeature = (typeof CSS_MEDIA_QUERY_FEATURES)[number]

export type GuidedMediaQueryCondition =
  | { feature: CSSMediaSizeFeature; px: number }
  | { feature: 'prefers-reduced-motion' }

function mediaSizeFeature(value: string): CSSMediaSizeFeature | null {
  switch (value) {
    case 'max-width':
    case 'min-width':
    case 'max-height':
    case 'min-height':
      return value
    default:
      return null
  }
}

export function isCSSMediaSizeFeature(
  feature: CSSMediaQueryFeature,
): feature is CSSMediaSizeFeature {
  return feature !== 'prefers-reduced-motion'
}

/** Lê apenas as duas famílias que os blocos guiados conseguem editar. */
export function parseGuidedMediaQueryCondition(
  condition: string,
): GuidedMediaQueryCondition | null {
  if (/^\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)$/i.test(condition)) {
    return { feature: 'prefers-reduced-motion' }
  }
  const match = /^\(\s*(max-width|min-width|max-height|min-height)\s*:\s*(\d+)px\s*\)$/i.exec(
    condition,
  )
  if (!match) return null
  const feature = mediaSizeFeature((match[1] ?? '').toLowerCase())
  const px = Number(match[2])
  return feature && Number.isFinite(px) ? { feature, px } : null
}

export function formatGuidedMediaQueryCondition(
  feature: CSSMediaQueryFeature,
  px?: number,
): string | null {
  if (feature === 'prefers-reduced-motion') return 'prefers-reduced-motion: reduce'
  if (px === undefined || !Number.isFinite(px) || px < 0) return null
  return `${feature}: ${px}px`
}
