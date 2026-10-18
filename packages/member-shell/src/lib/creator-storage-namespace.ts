/** Identidade de armazenamento local, independente da identidade enviada ao servidor. */
export function creatorStorageNamespace(
  viewerId: string | null,
  audience: 'adult' | 'kids',
): string {
  if (!viewerId) return ''
  return audience === 'adult' ? `adult:${viewerId}` : viewerId
}
