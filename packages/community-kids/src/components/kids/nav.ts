import { CircleUserRound, GraduationCap, Home, MessagesSquare, Sparkles } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: typeof Home
  match?: string | string[]
}

/** Stable destinations across desktop and mobile, regardless of earned tools. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/cursos', label: 'Carreira', icon: GraduationCap },
  {
    href: '/criar',
    label: 'Criar',
    icon: Sparkles,
    match: ['/pensa', '/pinta', '/molda', '/estudio'],
  },
  {
    href: '/comunidade',
    label: 'Comunidade',
    icon: MessagesSquare,
    match: ['/mural-dos-criadores', '/clube-dos-criadores', '/ranking'],
  },
  {
    href: '/perfil',
    label: 'Meu espaço',
    icon: CircleUserRound,
    match: ['/quarto', '/meu-avatar'],
  },
]

export const MOBILE_NAV_ITEMS = NAV_ITEMS
