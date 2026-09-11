import { CircleUserRound, GraduationCap, Home, MessagesSquare, Sparkles } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: typeof Home
  /** Rotas que acendem o item no menu além do próprio `href`. */
  match?: string | string[]
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
    match: ['/pensa', '/pinta', '/molda', '/estudio'],
    backLabel: 'Voltar para Criar',
  },
  {
    href: '/comunidade',
    label: 'Comunidade',
    icon: MessagesSquare,
    match: ['/mural-dos-criadores', '/clube-dos-criadores', '/ranking'],
    inner: ['/recados'],
    backLabel: 'Voltar à Comunidade',
  },
  {
    href: '/perfil',
    label: 'Meu espaço',
    icon: CircleUserRound,
    match: ['/quarto', '/meu-avatar'],
    backLabel: 'Voltar ao Meu espaço',
  },
]

export const MOBILE_NAV_ITEMS = NAV_ITEMS

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

/**
 * Para onde a setinha de uma página INTERNA volta: a página principal da seção a que
 * ela pertence (a do menu que fica acesa, ou a dona dela pelo `inner`). A régua é o
 * próprio mapa do menu, nunca uma lista paralela: uma rota nova que entra no `match`
 * de uma seção ganha a volta certa sem ninguém lembrar de mais nada.
 *
 * `null` na página principal (ali não há para onde voltar) e fora de qualquer seção. As
 * galerias das ferramentas usam a mesma régua pelo contrato `hostChrome.back`.
 */
export function backToSection(pathname: string): { href: string; label: string } | null {
  for (const item of NAV_ITEMS) {
    if (pathname === item.href) return null
    const inside =
      isNavActive(pathname, item.href, item.match) ||
      (item.inner ?? []).some((prefix) => underPrefix(pathname, prefix))
    if (inside) return { href: item.href, label: item.backLabel }
  }
  return null
}
