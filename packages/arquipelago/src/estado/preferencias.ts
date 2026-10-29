import { useEffect, useState } from 'react'

/**
 * O que o aparelho diz da pessoa: toque (tablet e celular), seguindo a mudança sem recarregar. O
 * pedido de menos movimento é o `useReducedMotion` do `avatar-quarto` (o mesmo do quarto).
 */
function useConsulta(consulta: string): boolean {
  const [vale, setVale] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(consulta)
    setVale(mq.matches)
    const muda = () => setVale(mq.matches)
    mq.addEventListener('change', muda)
    return () => mq.removeEventListener('change', muda)
  }, [consulta])
  return vale
}

export function useToque(): boolean {
  return useConsulta('(pointer: coarse)')
}
