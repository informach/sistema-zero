import { Home, Receipt, User } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: typeof Home
  /** Prefixo extra que também marca o item como ativo. */
  match?: string
}

/** Navegação principal do aluno. Cursos vivem na home (grid "Meus cursos"). */
export const NAV_ITEMS: NavItem[] = [
  { href: '/home', label: 'Início', icon: Home, match: '/cursos' },
  { href: '/compras', label: 'Compras', icon: Receipt },
  { href: '/perfil', label: 'Perfil', icon: User },
]
