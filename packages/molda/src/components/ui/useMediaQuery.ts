/**
 * matchMedia como hook (SSR-safe: sem window/matchMedia → false). Usado pelo
 * layout responsivo do editor (coluna lateral vira faixa em tela estreita).
 * Cópia por valor do hook homônimo do Pinta.
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
