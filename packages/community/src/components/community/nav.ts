import { BookOpen, Castle, CircleHelp, Home, Radio, Sparkles, Users } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: typeof Home
  /** Prefixos extras que também marcam o item como ativo. */
  match?: readonly string[]
}

/**
 * Navegação principal do aluno (direção de arte de 18/10/2026; menu lateral desde o "Estúdio à
 * noite", 25/10/2026): seis destinos, sempre com ícone E texto. No computador eles formam o menu
 * lateral, com Recados logo abaixo; no celular, Início, Cursos, Criar e Comunidade viram abas e o
 * resto mora em "Mais" (`community-nav.tsx`). Progresso fica no menu do perfil, junto de avatar,
 * espaço 3D, perfil e compras: nenhuma rota saiu, só mudou de lugar.
 * `/cursos` (catálogo, trilha e detalhe) acende "Cursos"; a home acende "Início".
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/cursos', label: 'Cursos', icon: BookOpen, match: ['/maestrias'] },
  { href: '/criar', label: 'Criar', icon: Sparkles },
  // As oficinas ao vivo (cursos ao vivo, 14/10/2026): só as turmas em que a pessoa tem vaga.
  { href: '/oficinas', label: 'Oficinas', icon: Radio },
  { href: '/arquipelago', label: 'Arquipélago', icon: Castle },
  {
    href: '/comunidade',
    label: 'Comunidade',
    icon: Users,
    match: ['/mural-dos-criadores-adulto', '/desafios', '/criador'],
  },
  { href: '/ajuda', label: 'Ajuda', icon: CircleHelp, match: ['/como-fazer'] },
]

/** O item acende na própria rota, nas sub-rotas e nos prefixos extras. A raiz, só exata. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === '/') return pathname === '/'
  return [item.href, ...(item.match ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

/** Só apresenta o jogo quando o serviço liberou o público. */
export function visibleCommunityNav(
  items: readonly NavItem[],
  arquipelagoLiberado: boolean,
): readonly NavItem[] {
  return items.filter((item) => item.href !== '/arquipelago' || arquipelagoLiberado)
}
