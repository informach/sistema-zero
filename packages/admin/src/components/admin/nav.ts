import {
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  Package,
  ReceiptText,
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
  {
    label: 'Pagamentos',
    href: '/admin/pagamentos/transacoes',
    icon: CreditCard,
    match: '/admin/pagamentos',
  },
  { label: 'Notas fiscais', href: '/admin/notas-fiscais', icon: ReceiptText },
  { label: 'Catálogo', href: '/admin/catalogo/produtos', icon: Package, match: '/admin/catalogo' },
  { label: 'Membros', href: '/admin/membros', icon: GraduationCap, match: '/admin/membros' },
]

export const CATALOG_TABS = [
  { label: 'Produtos', href: '/admin/catalogo/produtos' },
  { label: 'Ofertas', href: '/admin/catalogo/ofertas' },
  { label: 'Cupons', href: '/admin/catalogo/cupons' },
]

export const MEMBERS_TABS = [
  { label: 'Alunos', href: '/admin/membros' },
  { label: 'Cursos', href: '/admin/membros/cursos' },
]

export const PAYMENTS_TABS = [
  { label: 'Transações', href: '/admin/pagamentos/transacoes' },
  { label: 'Assinaturas', href: '/admin/pagamentos/assinaturas' },
  { label: 'Operações', href: '/admin/pagamentos/operacoes' },
]
