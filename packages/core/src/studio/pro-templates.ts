export const STUDIO_PRO_TEMPLATE_IDS = [
  'vanilla-js',
  'vanilla-vite',
  'react-ts',
  'three-js',
  'three-ts',
] as const

export type StudioProTemplateId = (typeof STUDIO_PRO_TEMPLATE_IDS)[number]

const STUDIO_PRO_TEMPLATE_ID_SET = new Set<string>(STUDIO_PRO_TEMPLATE_IDS)

export function isStudioProTemplateId(value: unknown): value is StudioProTemplateId {
  return typeof value === 'string' && STUDIO_PRO_TEMPLATE_ID_SET.has(value)
}
