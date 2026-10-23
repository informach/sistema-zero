/**
 * O perfil Python que a página pública executa, lido do PRÓPRIO documento publicado (sem
 * outra busca): tipo e a identidade exata do runtime aprovado na publicação. É informação,
 * não autorização: quem decide executar é a revisão publicada. Projetos JavaScript não
 * ganham selo: a página deles continua como era.
 */
export function publicRuntimeLabel(project: {
  programmingLanguage?: string
  kind?: string
  runtime?: { profileId?: unknown; releaseId?: unknown }
}): { label: string; detail: string | null } | null {
  if (project.programmingLanguage !== 'python') return null
  const label = `Python ${project.kind === 'pro' ? 'Pro' : 'Clássico'}`
  const { profileId, releaseId } = project.runtime ?? {}
  const detail =
    typeof profileId === 'string' && typeof releaseId === 'string'
      ? `Perfil ${profileId}, versão ${releaseId}`
      : null
  return { label, detail }
}
