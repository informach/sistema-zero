/**
 * Hook mínimo de media query (usado pelo Modo Missão split e pelas abas do
 * kanban no mobile). Ambiente sem matchMedia → false (layout empilhado).
 */
import { useEffect, useState } from 'react'

function matches(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(query).matches
}

export function useMediaQuery(query: string): boolean {
  const [value, setValue] = useState(() => matches(query))

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const list = window.matchMedia(query)
    setValue(list.matches)
    const onChange = (event: MediaQueryListEvent): void => setValue(event.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return value
}
