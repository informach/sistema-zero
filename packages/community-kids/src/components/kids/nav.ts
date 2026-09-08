import {
  Blocks,
  Box,
  CircleUserRound,
  GraduationCap,
  Home,
  House,
  Images,
  Lightbulb,
  Mail,
  MessagesSquare,
  Palette,
  Sparkles,
  Trophy,
} from 'lucide-react'

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
    match: ['/pensa', '/pinta', '/molda', '/estudio', '/praticar'],
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

/** Temporary rollback paths while the five-group navigation is evaluated by families. */
export const CLASSIC_NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/cursos', label: 'Cursos', icon: GraduationCap },
  { href: '/ranking', label: 'Ranking', icon: Trophy },
  { href: '/clube-dos-criadores', label: 'Clube', icon: MessagesSquare },
  { href: '/mural-dos-criadores', label: 'Mural', icon: Images },
  { href: '/pensa', label: 'Pensa', icon: Lightbulb },
  { href: '/pinta', label: 'Pinta', icon: Palette },
  { href: '/molda', label: 'Molda', icon: Box },
  { href: '/estudio', label: 'Estúdio', icon: Blocks },
  { href: '/quarto', label: 'Quarto', icon: House },
  { href: '/recados', label: 'Recados', icon: Mail },
  { href: '/perfil', label: 'Perfil', icon: CircleUserRound },
]
export const CLASSIC_MOBILE_NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/cursos', label: 'Cursos', icon: GraduationCap },
  {
    href: '/criar',
    label: 'Criar',
    icon: Sparkles,
    match: ['/pensa', '/pinta', '/molda', '/estudio', '/quarto', '/clube-dos-criadores'],
  },
  { href: '/mural-dos-criadores', label: 'Mural', icon: Images },
  { href: '/perfil', label: 'Perfil', icon: CircleUserRound },
]
