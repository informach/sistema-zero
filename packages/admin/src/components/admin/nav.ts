import {
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Users,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Prefixo p/ marcar ativo (default = href). */
  match?: string
  soon?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Painel', href: '/admin', icon: LayoutDashboard },
  { label: 'Usuários', href: '/admin/usuarios', icon: Users },
  { label: 'Pagamentos', href: '/admin/pagamentos', icon: CreditCard, soon: true },
  { label: 'Catálogo', href: '/admin/catalogo/produtos', icon: Package, match: '/admin/catalogo' },
  { label: 'Membros', href: '/admin/membros', icon: GraduationCap, soon: true },
]

export const CATALOG_TABS = [
  { label: 'Produtos', href: '/admin/catalogo/produtos' },
  { label: 'Ofertas', href: '/admin/catalogo/ofertas' },
  { label: 'Cupons', href: '/admin/catalogo/cupons' },
]
