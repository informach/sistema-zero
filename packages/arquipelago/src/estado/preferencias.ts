import { useEffect, useState } from 'react'

/**
 * O que o aparelho diz da pessoa: toque (tablet e celular) e o pedido de menos movimento do
 * sistema (`prefers-reduced-motion`). Os dois seguem a mudança sem recarregar.
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

export function useMenosMovimento(): boolean {
  return useConsulta('(prefers-reduced-motion: reduce)')
}
