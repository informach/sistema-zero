import {
  CalendarDays,
  ChartColumn,
  Images,
  LayoutDashboard,
  Lightbulb,
  type LucideIcon,
  Plug,
  SquareKanban,
} from 'lucide-react'

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
  // /conteudos/[id] (detalhe/composer) é navegação que NASCE do kanban.
  { label: 'Pipeline', href: '/pipeline', icon: SquareKanban, matchAlso: ['/conteudos'] },
  { label: 'Calendário', href: '/calendario', icon: CalendarDays },
  { label: 'Ideias', href: '/ideias', icon: Lightbulb },
  { label: 'Biblioteca', href: '/midia', icon: Images },
  { label: 'Métricas', href: '/metricas', icon: ChartColumn },
  { label: 'Conexões', href: '/conexoes', icon: Plug },
]
