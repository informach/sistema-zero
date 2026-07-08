import { BookOpen, Inbox, LayoutDashboard, type LucideIcon, Settings } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Prefixo p/ marcar ativo (default = href). */
  match?: string
  /** Prefixos EXTRAS que também marcam o item ativo (rotas-filhas fora do href). */
  matchAlso?: string[]
  /** Badge "em breve" (a área existe como stub, a tela rica vem depois). */
  soon?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Painel', href: '/', icon: LayoutDashboard },
  { label: 'Caixa de entrada', href: '/tickets', icon: Inbox },
  { label: 'Base de conhecimento', href: '/base-conhecimento', icon: BookOpen },
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
]
