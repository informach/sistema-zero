/** Identidade estável do projeto local do Estúdio associado a um plano Pensa. */
export function pensaStudioProjectId(pensaProjectId: string): string {
  return `pensa-${pensaProjectId.replace(/-/g, '')}`
}

/** Namespace por perfil: irmãos no mesmo navegador não compartilham o vínculo. */
export function pensaStudioLinkKey(viewerId: string | null, pensaProjectId: string): string {
  return `sz:studio:pensa-link:${viewerId ?? 'account'}:${pensaProjectId}`
}
