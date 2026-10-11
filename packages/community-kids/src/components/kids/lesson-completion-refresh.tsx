'use client'

import { useLessonRefresh } from '@sistemazero/member-shell/lib/use-lesson-refresh'
import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

interface CompletionRefresh {
  lessonCompleted: () => void
  celebrationClosed: () => void
}

const CompletionRefreshContext = createContext<CompletionRefresh | null>(null)

/**
 * A conclusão muda também XP, moedas e ferramentas no layout compartilhado. Ele não é
 * reconsultado só por navegar. Guardamos o pedido AQUI, no layout, até a criança fechar a
 * celebração ou sair da fase (inclusive pelo voltar do navegador ou pelo link do troféu).
 * O pedido sobrevive à desmontagem da aula, sem interromper a festa nem disputar com o push.
 */
export function LessonCompletionRefreshProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const refreshLesson = useLessonRefresh(() => router.refresh())
  const [completedPath, setCompletedPath] = useState<string | null>(null)

  const lessonCompleted = useCallback(() => setCompletedPath(pathname), [pathname])
  const celebrationClosed = useCallback(() => {
    setCompletedPath(null)
    refreshLesson()
  }, [refreshLesson])

  useEffect(() => {
    if (completedPath === null || completedPath === pathname) return
    setCompletedPath(null)
    refreshLesson()
  }, [completedPath, pathname, refreshLesson])

  const value = useMemo(
    () => ({ lessonCompleted, celebrationClosed }),
    [lessonCompleted, celebrationClosed],
  )
  return (
    <CompletionRefreshContext.Provider value={value}>{children}</CompletionRefreshContext.Provider>
  )
}

export function useLessonCompletionRefresh(): CompletionRefresh {
  const value = useContext(CompletionRefreshContext)
  if (!value) throw new Error('LessonCompletionRefreshProvider is missing from the layout.')
  return value
}
