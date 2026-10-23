/**
 * Os endereços da área dos pais (11/10/2026), num lugar só: a barra, os atalhos e os testes leem
 * daqui. `/responsavel` e `/responsavel/ajuda` continuam existindo só como redirecionamento,
 * porque e-mails antigos (o aviso de resposta do atendimento) apontam para eles.
 */
export type ParentSectionId = 'familia' | 'acompanhamento' | 'oficinas' | 'conta' | 'ajuda'

export const PARENT_SECTIONS: readonly { id: ParentSectionId; label: string; href: string }[] = [
  { id: 'familia', label: 'Família', href: '/pais' },
  { id: 'acompanhamento', label: 'Acompanhamento', href: '/pais/acompanhamento' },
  { id: 'oficinas', label: 'Oficinas', href: '/pais/oficinas' },
  { id: 'conta', label: 'Conta', href: '/pais/conta' },
  { id: 'ajuda', label: 'Ajuda', href: '/pais/ajuda' },
]

export const NEW_CHILD_HREF = '/pais/nova-crianca'

/** A conversa com a equipe (era `/responsavel/ajuda`). */
export const PARENT_SUPPORT_HREF = '/pais/ajuda/atendimento'

/**
 * A página da criança; `aba` abre direto no progresso. `aluno` é a aula do link que trouxe o
 * responsável (`/pais?aluno=`): ela viaja junto até a página da criança, senão "Ir para a área da
 * criança" depois de autorizar o aparelho abria a área da criança, e não a aula.
 */
export function childHref(profileId: string, aba?: 'progresso', aluno?: string): string {
  const params = new URLSearchParams()
  if (aba) params.set('aba', aba)
  if (aluno) params.set('aluno', aluno)
  const query = params.toString()
  return `/pais/crianca/${encodeURIComponent(profileId)}${query ? `?${query}` : ''}`
}

/** A Família, levando a aula pendente de volta quando houver. */
export function familyHref(aluno?: string): string {
  return aluno ? `/pais?aluno=${encodeURIComponent(aluno)}` : '/pais'
}

/** Para onde vai o "Ir para a área da criança": a aula do link, depois da escolha do perfil. */
export function studentEntryFor(aluno?: string): string {
  return aluno ? `/login/aluno?next=${encodeURIComponent(aluno)}` : '/perfis'
}

export function childEditHref(profileId: string): string {
  return `/pais/crianca/${encodeURIComponent(profileId)}/editar`
}
