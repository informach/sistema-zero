import {
  Award,
  BookOpen,
  CalendarDays,
  Contact,
  CreditCard,
  Gamepad2,
  Gift,
  Headset,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  MessageSquareText,
  MessagesSquare,
  Package,
  Radio,
  ReceiptText,
  Route,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  Users,
} from 'lucide-react'
import type { Platform } from '@/lib/platform'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Prefixo p/ marcar ativo e resolver a seção (default = href). */
  match?: string
  /**
   * Outros prefixos que também pertencem ao item. A Jornada tem duas telas (Kids e Adultos) e
   * um item só no menu: as duas acendem a Jornada.
   */
  alsoMatch?: readonly string[]
  /** Destino por comunidade: o item leva à tela da comunidade escolhida na lente. */
  platformHref?: Readonly<Record<Platform, string>>
  soon?: boolean
  /** Quando definido, limita a visibilidade/acesso a estes papéis. */
  roles?: readonly string[]
  /**
   * Chip de CONTAGEM na sidebar (o que espera a equipe) — dado puro; quem resolve
   * o número é o `professor-counts-store` (a sidebar só liga chave → count).
   */
  badgeKey?: 'entregas' | 'recados' | 'moderacao'
}

export interface NavGroup {
  id: 'turma' | 'conteudo' | 'negocio'
  label: string
  /**
   * Quando definido, limita o GRUPO inteiro a estes papéis. Hoje todos os grupos
   * são abertos; ligar o futuro papel `professor` = incluí-lo em ADMIN_ROLES +
   * preencher `roles` em conteudo/negocio — a sidebar e o `canAccessSection` já obedecem.
   */
  roles?: readonly string[]
  items: NavItem[]
}

/**
 * Fonte única da navegação do painel ("A sala da equipe", proposta de 23/10/2026), em três
 * áreas nomeadas pelo que a pessoa faz: Turma (cuidar de quem aprende, todo dia), Conteúdo
 * (preparar o que se aprende) e Negócio (manter a casa de pé). Os nomes são os das
 * comunidades: Projetos, Recados, Clube dos Criadores. As rotas não mudaram de URL; Ranking e
 * Análises viraram abas de Alunos e as duas Jornadas viraram um item que segue a lente. A
 * ambiguidade /admin/membros (Alunos) × /admin/membros/cursos (Cursos) resolve por
 * longest-prefix (`activeHref`/`sectionForPath`).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'turma',
    label: 'Turma',
    items: [
      // 1º item do grupo = destino do `homeForRole` e a entrada de todo mundo (Hoje).
      { label: 'Hoje', href: '/admin/professor', icon: Sun },
      { label: 'Encontros', href: '/admin/professor/ao-vivo', icon: Radio },
      {
        label: 'Projetos',
        href: '/admin/professor/entregas',
        icon: Inbox,
        badgeKey: 'entregas',
      },
      { label: 'Maestrias', href: '/admin/professor/maestrias', icon: Award },
      {
        label: 'Recados',
        href: '/admin/professor/recados',
        icon: MessagesSquare,
        badgeKey: 'recados',
      },
      {
        label: 'Moderação',
        href: '/admin/comunidade/moderacao',
        icon: ShieldCheck,
        badgeKey: 'moderacao',
      },
      // Lista, Ranking e Análises são abas da mesma área (o `match` cobre as três).
      { label: 'Alunos', href: '/admin/membros', icon: Users },
    ],
  },
  {
    id: 'conteudo',
    label: 'Conteúdo',
    items: [
      { label: 'Cursos', href: '/admin/membros/cursos', icon: BookOpen },
      { label: 'Oficinas', href: '/admin/oficinas', icon: CalendarDays },
      {
        label: 'Jornada',
        href: '/admin/professor/jornada-kids',
        icon: Route,
        alsoMatch: ['/admin/professor/jornada-adulta'],
        platformHref: {
          kids: '/admin/professor/jornada-kids',
          adult: '/admin/professor/jornada-adulta',
        },
      },
      { label: 'Desafio do mês', href: '/admin/professor/desafio', icon: Trophy },
      { label: 'Jogo', href: '/admin/jogo', icon: Gamepad2 },
      { label: 'Como fazer', href: '/admin/como-fazer', icon: LifeBuoy },
      {
        label: 'Clube e Comunidade',
        href: '/admin/comunidade/servidores',
        icon: MessageSquareText,
        match: '/admin/comunidade',
      },
    ],
  },
  {
    id: 'negocio',
    label: 'Negócio',
    items: [
      { label: 'Visão geral', href: '/admin', icon: LayoutDashboard },
      { label: 'Contas', href: '/admin/usuarios', icon: Contact },
      {
        label: 'Vendas',
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
      { label: 'Campanhas', href: '/admin/embaixadores', icon: Gift },
      { label: 'Zappy e Pensa', href: '/admin/ia', icon: Sparkles },
      // Somente leitura: o trabalho acontece no app de atendimento (outra aba).
      { label: 'Atendimento', href: '/admin/atendimento', icon: Headset },
      {
        label: 'Auditoria',
        href: '/admin/auditoria',
        icon: ScrollText,
        roles: ['superadmin', 'admin'],
      },
    ],
  },
]

/** Destino do item para a comunidade da lente (a Jornada muda de tela; os outros, não). */
export function hrefForPlatform(item: NavItem, platform: Platform): string {
  return item.platformHref?.[platform] ?? item.href
}

/** As abas de Alunos (a lista, o ranking por XP e as análises de conclusão). */
export const ALUNOS_TABS = [
  { label: 'Lista', href: '/admin/membros' },
  { label: 'Ranking', href: '/admin/membros/ranking' },
  { label: 'Análises', href: '/admin/membros/analises' },
]

export const CATALOG_TABS = [
  { label: 'Produtos', href: '/admin/catalogo/produtos' },
  { label: 'Ofertas', href: '/admin/catalogo/ofertas' },
  { label: 'Cupons', href: '/admin/catalogo/cupons' },
]

export const PAYMENTS_TABS = [
  { label: 'Vendas', href: '/admin/pagamentos/transacoes' },
  { label: 'Assinaturas', href: '/admin/pagamentos/assinaturas' },
  { label: 'Regularização', href: '/admin/pagamentos/regularizacao' },
  { label: 'Saúde dos pagamentos', href: '/admin/pagamentos/operacoes' },
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

function matchPrefixes(item: NavItem): readonly string[] {
  return [item.match ?? item.href, ...(item.alsoMatch ?? [])]
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
 * "Cursos" (conteudo), não a "Alunos" (turma): o prefixo mais longo vence.
 */
function resolveNav(pathname: string): ResolvedNav | null {
  let best: ResolvedNav | null = null
  let bestLength = -1
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      for (const prefix of matchPrefixes(item)) {
        if (prefixMatches(pathname, prefix) && prefix.length > bestLength) {
          best = { group, item }
          bestLength = prefix.length
        }
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
 * `professor` nascer (preencher `roles` nos grupos conteudo/negocio).
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

/**
 * Rotas ESCOPADAS pelo seletor global de plataforma (Kids × Adultos): telas de
 * ensino/comunidade filtram pela plataforma ativa. `/admin/membros` cobre
 * alunos, ficha, criança, análises e cursos (autoria). Catálogo, campanhas
 * e vendas também seguem a lente. Infraestrutura compartilhada e auditoria
 * conservam a indicação explícita de visão compartilhada. Mesma régua de prefixo por segmento do `prefixMatches`.
 */
const PLATFORM_SCOPED_PREFIXES = [
  '/admin/catalogo',
  '/admin/embaixadores',
  '/admin/pagamentos/transacoes',
  '/admin/pagamentos/assinaturas',
  '/admin/professor',
  '/admin/comunidade/moderacao',
  '/admin/membros',
  // Oficinas ao vivo: as turmas dos cursos ao vivo DA plataforma ativa (14/10/2026).
  '/admin/oficinas',
  // Como fazer: cada comunidade tem a sua biblioteca (`audience=` na API); a tela já seguia a
  // lente, e a legenda dizia o contrário (23/10/2026).
  '/admin/como-fazer',
] as const

/**
 * Dentro de um prefixo escopado, as telas que mostram as DUAS comunidades: a agenda de
 * Encontros (e as salas) lê os encontros sem filtro de plataforma, então o selo diz
 * "Kids e Adultos juntos" e a lente mostra a legenda das duas comunidades (23/10/2026).
 */
const BOTH_COMMUNITIES_PREFIXES = ['/admin/professor/ao-vivo'] as const

export function pathIsPlatformScoped(pathname: string): boolean {
  if (pathname === '/admin') return true
  // O editor aponta para um curso FIXO: trocar o seletor não troca a entidade.
  // A tela mostra a audiência canônica do próprio curso.
  if (pathname.startsWith('/admin/membros/cursos/')) return false
  if (BOTH_COMMUNITIES_PREFIXES.some((prefix) => prefixMatches(pathname, prefix))) return false
  return PLATFORM_SCOPED_PREFIXES.some((prefix) => prefixMatches(pathname, prefix))
}
