/** Identidade estável do projeto local do Estúdio associado a um plano Pensa. */
export function pensaStudioProjectId(pensaProjectId: string): string {
  return `pensa-${pensaProjectId.replace(/-/g, '')}`
}

/**
 * O caminho de volta: o projeto `pensa-<32 hex>` do Estúdio → o id do plano (os hífens do uuid
 * re-inseridos em 8-4-4-4-12). Qualquer outro projeto (jogo livre, id fora do formato) → `null`.
 */
export function pensaPlanIdFromStudioProjectId(studioProjectId: string): string | null {
  const match = /^pensa-([0-9a-f]{32})$/i.exec(studioProjectId)
  if (!match?.[1]) return null
  const hex = match[1].toLowerCase()
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Namespace por perfil: irmãos no mesmo navegador não compartilham o vínculo. */
export function pensaStudioLinkKey(viewerId: string | null, pensaProjectId: string): string {
  return `sz:studio:pensa-link:${viewerId ?? 'account'}:${pensaProjectId}`
}
