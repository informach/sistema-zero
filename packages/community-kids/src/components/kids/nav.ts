import type { CreativeToolId } from '@sistemazero/core/career'
import {
  Blocks,
  Box,
  CircleUserRound,
  GraduationCap,
  Home,
  Lightbulb,
  type LucideIcon,
  MessagesSquare,
  Palette,
  Sparkles,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react'

/** Um destino DENTRO de uma seção, aberto pelo menu sem passar pela página-hub. */
export interface NavChild {
  href: string
  label: string
  icon: LucideIcon
  /**
   * Ferramenta de criação que este link abre. O menu só a oferece quando a criança
   * PODE abrir (posse + posto), pela mesma régua da página de destino
   * (`creativeToolAvailability`). Ausente = link incondicional.
   */
  tool?: CreativeToolId
}

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /**
   * Os destinos da seção. Com filhos, o item do menu ABRE a lista em vez de navegar
   * (a página-hub vira o primeiro filho) — foi o pedido das crianças, que faziam
   * dois cliques e uma página no meio para ir do Estúdio ao Pinta.
   */
  children?: NavChild[]
  /**
   * Rotas que VOLTAM para esta seção pela setinha, mas NÃO acendem o item no menu.
   * É o caso dos Recados: eles ganharam destaque próprio no rodapé do menu, então
   * acender "Comunidade" junto deixaria duas coisas azuis ao mesmo tempo.
   */
  inner?: string[]
  /** O texto da setinha que volta para esta seção, em 2ª pessoa. */
  backLabel: string
}

/** Stable destinations across desktop and mobile, regardless of earned tools. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Início', icon: Home, backLabel: 'Voltar ao início' },
  // A página da Carreira É o mapa, e é assim que a trilha já chamava a volta.
  { href: '/cursos', label: 'Carreira', icon: GraduationCap, backLabel: 'Voltar ao mapa' },
  {
    href: '/criar',
    label: 'Criar',
    icon: Sparkles,
    children: [
      { href: '/criar', label: 'Meus trabalhos', icon: Sparkles },
      { href: '/estudio', label: 'Estúdio', icon: Blocks, tool: 'estudio-completo' },
      { href: '/pinta', label: 'Pinta', icon: Palette, tool: 'pinta' },
      { href: '/pensa', label: 'Pensa', icon: Lightbulb, tool: 'pensa' },
      { href: '/molda', label: 'Molda', icon: Box, tool: 'molda' },
    ],
    backLabel: 'Voltar para Criar',
  },
  {
    href: '/comunidade',
    label: 'Comunidade',
    icon: MessagesSquare,
    children: [
      { href: '/comunidade', label: 'Nossa turma', icon: Users },
      { href: '/mural-dos-criadores', label: 'Mural dos Criadores', icon: Sparkles },
      { href: '/clube-dos-criadores', label: 'Clube dos Criadores', icon: MessagesSquare },
      { href: '/ranking', label: 'Ranking', icon: Trophy },
    ],
    // O perfil de OUTRA criança (`/crianca/<id>`) chega do Mural, do Clube e do Ranking.
    // Os Recados ficam fora dos filhos de propósito: já têm o sino no rodapé do menu.
    inner: ['/recados', '/crianca'],
    backLabel: 'Voltar à Comunidade',
  },
  {
    href: '/perfil',
    label: 'Meu espaço',
    icon: CircleUserRound,
    children: [
      { href: '/perfil', label: 'Meu perfil', icon: UserRound },
      { href: '/meu-avatar', label: 'Meu avatar', icon: CircleUserRound },
      { href: '/quarto', label: 'Meu quarto', icon: Home },
    ],
    backLabel: 'Voltar ao Meu espaço',
  },
]

export const MOBILE_NAV_ITEMS = NAV_ITEMS

/**
 * As rotas que acendem o item além do próprio `href`. É DERIVADA dos filhos, nunca
 * escrita à mão: o menu é a fonte única do mapa (ver `backToSection`), e uma segunda
 * lista de rotas envelheceria em silêncio assim que um filho novo entrasse.
 */
export function navMatch(item: NavItem): string[] {
  return (item.children ?? []).map((child) => child.href).filter((href) => href !== item.href)
}

/**
 * Os destinos da seção que ESTA criança pode abrir. A régua de posse/posto é a mesma da
 * página de destino (`creativeToolAvailability`, resolvida no servidor): o menu não pode
 * oferecer uma porta trancada. `tools === null` (a consulta falhou) mostra TODOS — um
 * soluço de rede não encolhe o menu na cara dela.
 */
export function visibleChildren(item: NavItem, tools: CreativeToolId[] | null): NavChild[] {
  return (item.children ?? []).filter(
    (child) => !child.tool || tools === null || tools.includes(child.tool),
  )
}

function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function isNavActive(pathname: string, href: string, match?: string | string[]): boolean {
  // Raiz só acende em match exato (todo path começa com '/').
  if (href === '/') return pathname === '/'
  if (underPrefix(pathname, href)) return true
  const matches = typeof match === 'string' ? [match] : (match ?? [])
  return matches.some((prefix) => underPrefix(pathname, prefix))
}

/** O item do menu a que uma rota pertence (o que fica aceso), ou `null` fora deles. */
export function navSectionOf(pathname: string): NavItem | null {
  return NAV_ITEMS.find((item) => isNavActive(pathname, item.href, navMatch(item))) ?? null
}

/**
 * Qual grupo fica aberto: o que a criança escolheu, ou (o normal) o da PÁGINA em que ela
 * está. É o que faz o Pinta ficar a um clique de quem está no Estúdio.
 */
export function openGroupFor(pathname: string, escolhido: string | null): string | null {
  return escolhido ?? navSectionOf(pathname)?.href ?? null
}

/**
 * Para onde a setinha de uma página INTERNA volta: a página principal da seção a que
 * ela pertence (a do menu que fica acesa, ou a dona dela pelo `inner`). A régua é o
 * próprio mapa do menu, nunca uma lista paralela: uma rota nova que entra nos FILHOS
 * de uma seção ganha a volta certa sem ninguém lembrar de mais nada.
 *
 * `null` na página principal (ali não há para onde voltar) e fora de qualquer seção. As
 * galerias das ferramentas usam a mesma régua pelo contrato `hostChrome.back`.
 */
export function backToSection(pathname: string): { href: string; label: string } | null {
  for (const item of NAV_ITEMS) {
    if (pathname === item.href) return null
    const inside =
      isNavActive(pathname, item.href, navMatch(item)) ||
      (item.inner ?? []).some((prefix) => underPrefix(pathname, prefix))
    if (inside) return { href: item.href, label: item.backLabel }
  }
  return null
}
