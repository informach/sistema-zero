import { GraduationCap, Home, Mail, MessagesSquare } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: typeof Home
  /** Prefixo extra que também marca o item como ativo. */
  match?: string
}

/**
 * Navegação principal do aluno (centralizada no header). Compras/Perfil vivem
 * no menu do avatar. `/cursos` (catálogo) e `/cursos/[slug]` (detalhe) acendem
 * "Todos os cursos"; a home (grid "Meus cursos") acende "Início".
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/cursos', label: 'Todos os cursos', icon: GraduationCap, match: '/cursos' },
  { href: '/comunidade', label: 'Comunidade', icon: MessagesSquare, match: '/comunidade' },
  { href: '/recados', label: 'Recados', icon: Mail, match: '/recados' },
]
