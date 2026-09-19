'use client'

import { usePathname } from 'next/navigation'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { cn } from '@/lib/cn'
import { isEmbeddedAppPath } from '@/lib/embedded-app-path'
import { isLessonPath } from '@/lib/lesson-path'

interface LessonChromeContextValue {
  /** Estado atual: esconder o MENU (barra esquerda global). */
  navHidden: boolean
  /** Estado atual: esconder a LISTA DE AULAS (barra direita da aula). */
  outlineHidden: boolean
  /**
   * Oferecer o botão do MENU: página de aula OU app de criação embarcado
   * (Estúdio/Pensa/Pinta/Molda) + tela ≥768px (a barra esquerda aparece a partir do
   * `md` do Tailwind, então dá p/ ganhar espaço já aqui — cobre notebook com
   * zoom/telas menores).
   */
  navAvailable: boolean
  /**
   * Oferecer o botão da LISTA DE AULAS em toda página de aula, inclusive no
   * celular, onde a lista também começa recolhida.
   */
  outlineAvailable: boolean
  /** A barra ESQUERDA deve colapsar agora; na aula já no primeiro quadro. */
  navCollapsed: boolean
  /** A barra DIREITA deve colapsar agora. */
  outlineCollapsed: boolean
  toggleNav: () => void
  toggleOutline: () => void
}

const INERT: LessonChromeContextValue = {
  navHidden: false,
  outlineHidden: false,
  navAvailable: false,
  outlineAvailable: false,
  navCollapsed: false,
  outlineCollapsed: false,
  toggleNav: () => {},
  toggleOutline: () => {},
}

/**
 * `true` quando a viewport tem ao menos `minWidthPx`. Espelha o `useIsDesktop` do
 * member-shell. Só o menu global precisa deste limiar de 768 px; a lista de
 * aulas pode ser aberta também no celular.
 *
 * ⚠️ Começa `false` TAMBÉM no cliente, de propósito. Ler o `matchMedia` no
 * inicializador não quebra o SSR, mas quebra a HIDRATAÇÃO: o servidor renderiza
 * com `false` e o 1º render do cliente (o que o React compara) já vinha `true`
 * num desktop — e o `FocusModeToggle` faz `if (!available) return null`, então o
 * HTML do servidor saía SEM os botões e o do cliente COM eles. Isso é o React
 * #418 ("the server rendered HTML didn't match the client") que aparecia no
 * console de toda página de aula. O efeito abaixo aplica o valor real logo após
 * a montagem. O recolhimento inicial independe desta medição.
 */
function useMinWidth(minWidthPx: number): boolean {
  const query = `(min-width: ${minWidthPx}px)`
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    setMatches(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

const LessonChromeContext = createContext<LessonChromeContextValue>(INERT)

/**
 * Em aulas e ferramentas de criação, o menu esquerdo começa recolhido a cada
 * entrada. Na aula, a lista da direita também começa recolhida. Fora dessas
 * telas, como em Criar, o menu esquerdo permanece aberto.
 */
export function FocusModeProvider({
  viewerId,
  children,
}: {
  viewerId: string | null
  children: ReactNode
}) {
  const pathname = usePathname()
  const isTablet = useMinWidth(768) // md — barra esquerda (menu)
  const onLesson = isLessonPath(pathname)
  const onFocus = onLesson || isEmbeddedAppPath(pathname)
  const [focusChrome, setFocusChrome] = useState<{
    path: string
    navOpen: boolean
    outlineOpen: boolean
  } | null>(null)
  const navHidden = onFocus && !(focusChrome?.path === pathname && focusChrome.navOpen)
  const outlineHidden = onLesson
    ? !(focusChrome?.path === pathname && focusChrome.outlineOpen)
    : false

  // biome-ignore lint/correctness/useExhaustiveDependencies: trocar o perfil reinicia o chrome mesmo na mesma rota
  useEffect(() => {
    setFocusChrome(null)
  }, [viewerId])

  useEffect(() => {
    if (!onFocus) setFocusChrome(null)
  }, [onFocus])

  const toggleNav = useCallback(() => {
    if (!onFocus) return
    setFocusChrome((previous) => ({
      path: pathname,
      navOpen: !(previous?.path === pathname && previous.navOpen),
      outlineOpen: previous?.path === pathname ? previous.outlineOpen : false,
    }))
  }, [onFocus, pathname])

  const toggleOutline = useCallback(() => {
    if (!onLesson) return
    setFocusChrome((previous) => ({
      path: pathname,
      navOpen: previous?.path === pathname ? previous.navOpen : false,
      outlineOpen: !(previous?.path === pathname && previous.outlineOpen),
    }))
  }, [onLesson, pathname])

  const value = useMemo<LessonChromeContextValue>(() => {
    const navAvailable = onFocus && isTablet
    // A lista de aulas é EXCLUSIVA da aula: nos apps embarcados ela nem existe.
    const outlineAvailable = onLesson
    return {
      navHidden,
      outlineHidden,
      navAvailable,
      outlineAvailable,
      // Recolhe já no HTML inicial; esperar `matchMedia` faria o menu aparecer
      // por um quadro antes de o efeito medir a viewport.
      navCollapsed: navHidden,
      outlineCollapsed: outlineHidden && outlineAvailable,
      toggleNav,
      toggleOutline,
    }
  }, [isTablet, onFocus, onLesson, navHidden, outlineHidden, toggleNav, toggleOutline])

  return <LessonChromeContext.Provider value={value}>{children}</LessonChromeContext.Provider>
}

export function useFocusMode(): LessonChromeContextValue {
  return useContext(LessonChromeContext)
}

/**
 * Fallback do `<Suspense>` da sidebar no layout `(app)` (a chrome carrega avatar +
 * gamificação por trás). Espelha o esqueleto antigo, mas REAGE a `navCollapsed` para
 * já vir recolhido no 1º paint quando a aula começa —
 * senão piscaria a barra aberta antes da barra real montar. ⚠️ A largura acompanha a
 * do `AppSidebar` (16.75rem, as telas-modelo de 11/09/2026): diferente, a página pula
 * de lado quando o menu real chega. A cor também (a âncora escura do Pen): um esqueleto
 * claro piscaria branco antes de o menu escuro chegar.
 */
export function SidebarFallback() {
  const { navCollapsed } = useFocusMode()
  return (
    <aside
      inert={navCollapsed}
      aria-hidden={navCollapsed}
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 overflow-hidden border-(--menu-2) bg-(--menu) md:block',
        'kids-menu transition-[width,border,opacity] duration-300 ease-in-out motion-reduce:transition-none',
        navCollapsed ? 'w-0 border-r-0 opacity-0' : 'w-(--kids-menu-width) border-r opacity-100',
      )}
    />
  )
}
