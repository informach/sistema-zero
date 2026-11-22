export const UNSUPPORTED_PINTA_REGION =
  'Este cenário usa dados que esta versão do Estúdio ainda não abre. O original foi preservado.'

/** Explicit markers only. Plain uploaded PNGs are still usable as images. */
export function hasRegionalPintaReference(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  const scene = record.scene as { version?: unknown } | null | undefined
  return (
    Object.hasOwn(record, 'regional') || (typeof scene?.version === 'number' && scene.version >= 4)
  )
}
