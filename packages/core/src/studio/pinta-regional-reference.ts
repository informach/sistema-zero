export const UNSUPPORTED_PINTA_REGION =
  'Este cenário usa dados que esta versão do Estúdio ainda não abre. O original foi preservado.'

/** A marker or unsupported scene can never be stripped into a legacy cover. */
export function hasRegionalPintaReference(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  const scene = record.scene as { version?: unknown } | null | undefined
  return (
    Object.hasOwn(record, 'regional') || (typeof scene?.version === 'number' && scene.version >= 4)
  )
}

/** Private regional editing does not authorize cloud snapshots or publication. */
export function assertLegacyStudioProjectMaterials(project: unknown): void {
  if (!project || typeof project !== 'object') return
  const { assets } = project as { assets?: unknown }
  if (Array.isArray(assets) && assets.some(hasRegionalPintaReference))
    throw new Error(UNSUPPORTED_PINTA_REGION)
}
