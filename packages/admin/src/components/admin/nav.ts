import {
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  MessagesSquare,
  Package,
  ReceiptText,
  ScrollText,
  Users,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Prefixo p/ marcar ativo (default = href). */
  match?: string
  soon?: boolean
  /** Quando definido, limita a visibilidade no menu a estes papéis. */
  roles?: readonly string[]
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
  {
    label: 'Comunidade',
    href: '/admin/comunidade/servidores',
    icon: MessagesSquare,
    match: '/admin/comunidade',
  },
  {
    label: 'Auditoria',
    href: '/admin/auditoria',
    icon: ScrollText,
    roles: ['superadmin', 'admin'],
  },
]

export const CATALOG_TABS = [
  { label: 'Produtos', href: '/admin/catalogo/produtos' },
  { label: 'Ofertas', href: '/admin/catalogo/ofertas' },
  { label: 'Cupons', href: '/admin/catalogo/cupons' },
]

export const MEMBERS_TABS = [
  { label: 'Alunos', href: '/admin/membros' },
  { label: 'Cursos', href: '/admin/membros/cursos' },
  { label: 'Análises', href: '/admin/membros/analises' },
]

export const PAYMENTS_TABS = [
  { label: 'Transações', href: '/admin/pagamentos/transacoes' },
  { label: 'Assinaturas', href: '/admin/pagamentos/assinaturas' },
  { label: 'Operações', href: '/admin/pagamentos/operacoes' },
]

export const COMMUNITY_TABS = [
  { label: 'Servidores', href: '/admin/comunidade/servidores' },
  { label: 'Moderação', href: '/admin/comunidade/moderacao' },
]
