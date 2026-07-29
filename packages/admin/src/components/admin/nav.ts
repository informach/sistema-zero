import {
  BookOpen,
  CreditCard,
  GraduationCap,
  Home,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  MessagesSquare,
  Package,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Prefixo p/ marcar ativo e resolver a seção (default = href). */
  match?: string
  soon?: boolean
  /** Quando definido, limita a visibilidade/acesso a estes papéis. */
  roles?: readonly string[]
  /**
   * Chip de CONTAGEM na sidebar (pendências do professor) — dado puro; quem resolve
   * o número é o `professor-counts-store` (a sidebar só liga chave → count).
   */
  badgeKey?: 'entregas' | 'recados' | 'moderacao'
}

export interface NavGroup {
  id: 'professor' | 'gestao' | 'config'
  label: string
  /**
   * Quando definido, limita o GRUPO inteiro a estes papéis. Hoje todos os grupos
   * são abertos (comportamento idêntico ao menu plano anterior); ligar o futuro
   * papel `professor` = incluí-lo em ADMIN_ROLES + preencher `roles` em
   * gestao/config — a sidebar e o `canAccessSection` já obedecem.
   */
  roles?: readonly string[]
  items: NavItem[]
}

/**
 * Fonte única da navegação do painel, em 3 áreas por NATUREZA do trabalho:
 * dia a dia do professor · administração recorrente · configuração feita
 * raramente. O agrupamento é do MENU — as rotas existentes não mudaram de URL
 * (só as páginas novas nascem sob /admin/professor). A ambiguidade
 * /admin/membros (Alunos) × /admin/membros/cursos (autoria) × /admin/membros/
 * analises resolve por longest-prefix (`activeHref`/`sectionForPath`).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'professor',
    label: 'Sala do Professor',
    items: [
      // 1º item do grupo = destino do `homeForRole` (a Home do professor É a home do painel).
      { label: 'Início', href: '/admin/professor', icon: Home },
      {
        label: 'Entregas',
        href: '/admin/professor/entregas',
        icon: Inbox,
        badgeKey: 'entregas',
      },
      { label: 'Recados', href: '/admin/professor/recados', icon: Mail, badgeKey: 'recados' },
      { label: 'Desafio do mês', href: '/admin/professor/desafio', icon: Trophy },
      {
        label: 'Moderação',
        href: '/admin/comunidade/moderacao',
        icon: ShieldCheck,
        badgeKey: 'moderacao',
      },
      { label: 'Alunos', href: '/admin/membros', icon: GraduationCap },
      { label: 'Análises', href: '/admin/membros/analises', icon: TrendingUp },
    ],
  },
  {
    id: 'gestao',
    label: 'Gestão',
    items: [
      { label: 'Painel', href: '/admin', icon: LayoutDashboard },
      { label: 'Usuários', href: '/admin/usuarios', icon: Users },
      {
        label: 'Pagamentos',
        href: '/admin/pagamentos/transacoes',
        icon: CreditCard,
        match: '/admin/pagamentos',
      },
      { label: 'Notas fiscais', href: '/admin/notas-fiscais', icon: ReceiptText },
      {
        label: 'Catálogo',
        href: '/admin/catalogo/produtos',
        icon: Package,
        match: '/admin/catalogo',
      },
      { label: 'Uso de IA', href: '/admin/ia', icon: Sparkles },
    ],
  },
  {
    id: 'config',
    label: 'Configuração',
    items: [
      { label: 'Cursos', href: '/admin/membros/cursos', icon: BookOpen },
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
    ],
  },
]

export const CATALOG_TABS = [
  { label: 'Produtos', href: '/admin/catalogo/produtos' },
  { label: 'Ofertas', href: '/admin/catalogo/ofertas' },
  { label: 'Cupons', href: '/admin/catalogo/cupons' },
]

export const PAYMENTS_TABS = [
  { label: 'Transações', href: '/admin/pagamentos/transacoes' },
  { label: 'Assinaturas', href: '/admin/pagamentos/assinaturas' },
  { label: 'Operações', href: '/admin/pagamentos/operacoes' },
]

/** Grupos visíveis p/ o papel (filtra grupo E itens; grupo sem item visível some). */
export function visibleGroups(role: string): NavGroup[] {
  return NAV_GROUPS.filter((group) => !group.roles || group.roles.includes(role))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)
}

function matchPrefix(item: NavItem): string {
  return item.match ?? item.href
}

/** `/admin` só casa exato (é prefixo de tudo); os demais casam por segmento. */
function prefixMatches(pathname: string, prefix: string): boolean {
  if (prefix === '/admin') return pathname === '/admin'
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

interface ResolvedNav {
  group: NavGroup
  item: NavItem
}

/**
 * Item dono do path por LONGEST-PREFIX: /admin/membros/cursos/x pertence a
 * "Cursos" (config), não a "Alunos" (professor) — o prefixo mais longo vence.
 */
function resolveNav(pathname: string): ResolvedNav | null {
  let best: ResolvedNav | null = null
  let bestLength = -1
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      const prefix = matchPrefix(item)
      if (prefixMatches(pathname, prefix) && prefix.length > bestLength) {
        best = { group, item }
        bestLength = prefix.length
      }
    }
  }
  return best
}

/** href do item ativo p/ o path atual (null = nenhum item da nav é dono do path). */
export function activeHref(pathname: string): string | null {
  return resolveNav(pathname)?.item.href ?? null
}

/** Seção (grupo) dona do path atual — base do gate por área. */
export function sectionForPath(pathname: string): NavGroup['id'] | null {
  return resolveNav(pathname)?.group.id ?? null
}

/**
 * O papel pode acessar o path? Combina `roles` do grupo e do item donos do
 * path; path fora da nav é liberado (o gate binário do layout continua valendo).
 * Hoje só Auditoria restringe — o gate por seção liga quando o papel
 * `professor` nascer (preencher `roles` nos grupos gestao/config).
 */
export function canAccessSection(role: string, pathname: string): boolean {
  const resolved = resolveNav(pathname)
  if (!resolved) return true
  if (resolved.group.roles && !resolved.group.roles.includes(role)) return false
  if (resolved.item.roles && !resolved.item.roles.includes(role)) return false
  return true
}

/**
 * O path exige papel específico (grupo ou item com `roles`)? O gate do proxy só
 * paga a verificação de JWT quando true — hoje, só Auditoria.
 */
export function pathIsRoleRestricted(pathname: string): boolean {
  const resolved = resolveNav(pathname)
  return Boolean(resolved && (resolved.group.roles || resolved.item.roles))
}

/** Home do papel (1º item visível) — destino do redirect quando a seção é negada. */
export function homeForRole(role: string): string {
  return visibleGroups(role)[0]?.items[0]?.href ?? '/login'
}
