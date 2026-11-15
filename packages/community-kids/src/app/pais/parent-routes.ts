/**
 * Os endereços da área dos pais (11/10/2026), num lugar só: a barra, os atalhos e os testes leem
 * daqui. `/responsavel` e `/responsavel/ajuda` continuam existindo só como redirecionamento,
 * porque e-mails antigos (o aviso de resposta do atendimento) apontam para eles.
 */
export type ParentSectionId = 'inicio' | 'familia' | 'cursos' | 'oficinas' | 'conta' | 'ajuda'

/**
 * O menu lateral da área dos pais (redesenho de 14/11/2026): o Acompanhamento virou a aba
 * Progresso da página de cada filho, e os cursos para pais ganharam a sua seção.
 */
export const PARENT_SECTIONS: readonly { id: ParentSectionId; label: string; href: string }[] = [
  { id: 'inicio', label: 'Início', href: '/pais' },
  { id: 'familia', label: 'Família', href: '/pais/familia' },
  { id: 'cursos', label: 'Cursos para pais', href: '/pais/cursos' },
  { id: 'oficinas', label: 'Oficinas ao vivo', href: '/pais/oficinas' },
  { id: 'conta', label: 'Conta', href: '/pais/conta' },
  { id: 'ajuda', label: 'Ajuda', href: '/pais/ajuda' },
]

/** As abas da página de cada filho. Sem `aba`, abre no Progresso. */
export type ChildTab = 'progresso' | 'aparelhos' | 'jogo' | 'perfil'
export const CHILD_TABS: readonly ChildTab[] = ['progresso', 'aparelhos', 'jogo', 'perfil']

export function childTabOf(value: string | null | undefined): ChildTab {
  // `acesso` era o nome da aba de aparelhos até 14/11/2026: links salvos continuam abrindo nela.
  if (value === 'acesso') return 'aparelhos'
  return CHILD_TABS.find((tab) => tab === value) ?? 'progresso'
}

/** Os cursos para pais e a conversa de uma dúvida mandada de dentro de uma aula deles. */
export const PARENT_COURSES_HREF = '/pais/cursos'
export function parentCourseHref(slug: string, lessonId?: string | null): string {
  const base = `${PARENT_COURSES_HREF}/${encodeURIComponent(slug)}`
  return lessonId ? `${base}/aulas/${encodeURIComponent(lessonId)}` : base
}
export function parentDoubtHref(threadId: string): string {
  return `/pais/ajuda/duvidas/${encodeURIComponent(threadId)}`
}

export const NEW_CHILD_HREF = '/pais/nova-crianca'

/** A conversa com a equipe (era `/responsavel/ajuda`). */
export const PARENT_SUPPORT_HREF = '/pais/ajuda/atendimento'

/**
 * A página do filho; `aba` escolhe a aba (sem ela, o Progresso). `aluno` é a aula do link que
 * trouxe o responsável (`/pais?aluno=`): ela viaja junto até a página do filho, senão "Ir para a
 * área da criança" depois de autorizar o aparelho abria a área da criança, e não a aula.
 */
export function childHref(profileId: string, aba?: ChildTab, aluno?: string): string {
  const params = new URLSearchParams()
  if (aba) params.set('aba', aba)
  if (aluno) params.set('aluno', aluno)
  const query = params.toString()
  return `/pais/crianca/${encodeURIComponent(profileId)}${query ? `?${query}` : ''}`
}

/** A Família, levando a aula pendente de volta quando houver. */
export function familyHref(aluno?: string): string {
  return aluno ? `/pais/familia?aluno=${encodeURIComponent(aluno)}` : '/pais/familia'
}

/** Para onde vai o "Ir para a área da criança": a aula do link, depois da escolha do perfil. */
export function studentEntryFor(aluno?: string): string {
  return aluno ? `/login/aluno?next=${encodeURIComponent(aluno)}` : '/perfis'
}

/** Editar o perfil virou a aba Perfil da página do filho (o endereço antigo redireciona). */
export function childEditHref(profileId: string): string {
  return childHref(profileId, 'perfil')
}
