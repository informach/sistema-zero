import {
  Blocks,
  CircleUserRound,
  GraduationCap,
  Home,
  House,
  Images,
  MessagesSquare,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: typeof Home
  /** Prefixo extra que também marca o item como ativo. */
  match?: string
}

/**
 * Navegação principal do aluno — sidebar (desktop) + tab bar (mobile),
 * estilo Duolingo. `/cursos` (catálogo) e `/cursos/[slug]` (trilha) acendem
 * "Cursos"; a home (grid "Meus cursos") acende "Início". Perfil tem item
 * próprio (criança navega por ícones grandes; o menu do avatar segue
 * existindo p/ tema/sair).
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/cursos', label: 'Cursos', icon: GraduationCap, match: '/cursos' },
  {
    href: '/clube-dos-criadores',
    label: 'Clube',
    icon: MessagesSquare,
    match: '/clube-dos-criadores',
  },
  { href: '/mural-dos-criadores', label: 'Mural', icon: Images, match: '/mural-dos-criadores' },
  { href: '/estudio', label: 'Estúdio', icon: Blocks, match: '/estudio' },
  // O avatar é acessado pelo clique no avatar em /perfil (sem item próprio no menu).
  { href: '/quarto', label: 'Quarto', icon: House },
  { href: '/perfil', label: 'Perfil', icon: CircleUserRound },
]
