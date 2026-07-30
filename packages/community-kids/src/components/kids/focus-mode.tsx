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
import { isLessonPath } from '@/lib/lesson-path'

interface LessonChromeContextValue {
  /** Preferência bruta: esconder o MENU (barra esquerda global). */
  navHidden: boolean
  /** Preferência bruta: esconder a LISTA DE AULAS (barra direita da aula). */
  outlineHidden: boolean
  /**
   * Oferecer o botão do MENU: página de aula + tela ≥768px (a barra esquerda
   * aparece a partir do `md` do Tailwind, então dá p/ ganhar espaço já aqui —
   * cobre notebook com zoom/telas menores).
   */
  navAvailable: boolean
  /**
   * Oferecer o botão da LISTA DE AULAS: página de aula + tela ≥1024px. Abaixo de
   * `lg` a lista fica EMPILHADA embaixo (largura total), então escondê-la não
   * alargaria o estúdio — o botão não faz sentido ali.
   */
  outlineAvailable: boolean
  /** A barra ESQUERDA deve colapsar agora (`navHidden && navAvailable`). */
  navCollapsed: boolean
  /** A barra DIREITA deve colapsar agora (`outlineHidden && outlineAvailable`). */
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
 * `true` quando a viewport tem ao menos `minWidthPx`. SSR-safe (init lazy guarda
 * `typeof window` → `false` no servidor; reage a `change`). Espelha o
 * `useIsDesktop` do member-shell, mas parametrizado — precisamos de DOIS limiares
 * (768 p/ o menu, 1024 p/ a lista de aulas).
 */
function useMinWidth(minWidthPx: number): boolean {
  const query = `(min-width: ${minWidthPx}px)`
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
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

const navKey = (viewerId: string) => `sz:kids:hide-nav:${viewerId}`
const outlineKey = (viewerId: string) => `sz:kids:hide-outline:${viewerId}`

function readPref(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    // localStorage indisponível (modo privado/quota) → sem preferência, sem crash.
    return false
  }
}

function writePref(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // best-effort — nunca atrapalha a aula.
  }
}

/**
 * Estado do "modo foco" da aula: duas preferências INDEPENDENTES — esconder o menu
 * esquerdo (`navHidden`) e esconder a lista de aulas à direita (`outlineHidden`) —,
 * lembradas por PERFIL no localStorage. Montado no layout `(app)` (que NÃO remonta
 * entre navegações), então o estado atravessa a navegação. O colapso só "vale" em
 * página de aula + desktop (`available`): a preferência persistida NUNCA some a barra
 * em `/cursos`, `/perfil` etc. Padrão de persistência do `level-up-watcher`.
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
  const isDesktop = useMinWidth(1024) // lg — coluna direita (lista de aulas)
  // Inicia FALSE nos dois lados (SSR + 1º render cliente) p/ não dar mismatch de
  // hidratação; a preferência salva é aplicada num efeito pós-mount.
  const [navHidden, setNavHidden] = useState(false)
  const [outlineHidden, setOutlineHidden] = useState(false)

  useEffect(() => {
    if (!viewerId) return
    setNavHidden(readPref(navKey(viewerId)))
    setOutlineHidden(readPref(outlineKey(viewerId)))
  }, [viewerId])

  const toggleNav = useCallback(() => {
    setNavHidden((prev) => {
      const next = !prev
      if (viewerId) writePref(navKey(viewerId), next)
      return next
    })
  }, [viewerId])

  const toggleOutline = useCallback(() => {
    setOutlineHidden((prev) => {
      const next = !prev
      if (viewerId) writePref(outlineKey(viewerId), next)
      return next
    })
  }, [viewerId])

  const value = useMemo<LessonChromeContextValue>(() => {
    const onLesson = isLessonPath(pathname)
    const navAvailable = onLesson && isTablet
    const outlineAvailable = onLesson && isDesktop
    return {
      navHidden,
      outlineHidden,
      navAvailable,
      outlineAvailable,
      navCollapsed: navHidden && navAvailable,
      outlineCollapsed: outlineHidden && outlineAvailable,
      toggleNav,
      toggleOutline,
    }
  }, [pathname, isTablet, isDesktop, navHidden, outlineHidden, toggleNav, toggleOutline])

  return <LessonChromeContext.Provider value={value}>{children}</LessonChromeContext.Provider>
}

export function useFocusMode(): LessonChromeContextValue {
  return useContext(LessonChromeContext)
}

/**
 * Fallback do `<Suspense>` da sidebar no layout `(app)` (a chrome carrega avatar +
 * gamificação por trás). Espelha o esqueleto antigo, mas REAGE a `navCollapsed` para
 * já vir recolhido no 1º paint quando a preferência do perfil é "esconder o menu" —
 * senão piscaria a barra em `w-60` antes da barra real montar.
 */
export function SidebarFallback() {
  const { navCollapsed } = useFocusMode()
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 overflow-hidden border-border bg-card md:block',
        'transition-[width,border,opacity] duration-300 ease-in-out motion-reduce:transition-none',
        navCollapsed ? 'w-0 border-r-0 opacity-0' : 'w-60 border-r opacity-100',
      )}
    />
  )
}
