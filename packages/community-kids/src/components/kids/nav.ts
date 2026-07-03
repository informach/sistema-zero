import {
  Blocks,
  CircleUserRound,
  GraduationCap,
  Home,
  House,
  Images,
  Lightbulb,
  MessagesSquare,
  Palette,
  Sparkles,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: typeof Home
  /** Prefixo(s) extra(s) que também marcam o item como ativo. */
  match?: string | string[]
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
  // O trio criativo anda JUNTO no menu, na ordem da jornada: Pensa planeja →
  // Pinta desenha → Estúdio constrói.
  { href: '/pensa', label: 'Pensa', icon: Lightbulb, match: '/pensa' },
  { href: '/pinta', label: 'Pinta', icon: Palette, match: '/pinta' },
  { href: '/estudio', label: 'Estúdio', icon: Blocks, match: '/estudio' },
  // O avatar é acessado pelo clique no avatar em /perfil (sem item próprio no menu).
  { href: '/quarto', label: 'Quarto', icon: House },
  { href: '/perfil', label: 'Perfil', icon: CircleUserRound },
]

/**
 * Tab bar MOBILE (07/2026): 5 abas no máximo — 9 alvos minúsculos eram demais
 * para mãos pequenas. "Criar" é um hub (/criar) com cards grandes para o trio
 * criativo (Pensa/Pinta/Estúdio) + Quarto + Clube; a aba acende em qualquer
 * uma dessas rotas. A sidebar do desktop segue com os 9 itens diretos.
 */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/cursos', label: 'Cursos', icon: GraduationCap, match: '/cursos' },
  {
    href: '/criar',
    label: 'Criar',
    icon: Sparkles,
    match: ['/criar', '/pensa', '/pinta', '/estudio', '/quarto', '/clube-dos-criadores'],
  },
  { href: '/mural-dos-criadores', label: 'Mural', icon: Images, match: '/mural-dos-criadores' },
  { href: '/perfil', label: 'Perfil', icon: CircleUserRound },
]
