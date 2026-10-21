/**
 * O perfil que a página pública executa, lido do PRÓPRIO documento publicado (sem outra
 * busca): linguagem + tipo, e, no Python, a identidade exata do runtime aprovado na
 * publicação. É informação, não autorização: quem decide executar é a revisão publicada.
 */
export function publicRuntimeLabel(project: {
  programmingLanguage?: string
  kind?: string
  runtime?: { profileId?: unknown; releaseId?: unknown }
}): { label: string; detail: string | null } {
  const python = project.programmingLanguage === 'python'
  const label = `${python ? 'Python' : 'JavaScript'} ${project.kind === 'pro' ? 'Pro' : 'Clássico'}`
  const { profileId, releaseId } = project.runtime ?? {}
  const detail =
    python && typeof profileId === 'string' && typeof releaseId === 'string'
      ? `Perfil ${profileId}, versão ${releaseId}`
      : null
  return { label, detail }
}
