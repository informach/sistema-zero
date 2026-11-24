import { type RefObject, useEffect, useState } from 'react'

/**
 * Tela cheia de um elemento, nos dois sentidos (pedido de 23/11/2026: o botão do palco só
 * entrava, e para voltar só o Esc funcionava). `active` acompanha o navegador pelo
 * `fullscreenchange`, então sair pelo Esc também troca o botão de volta; `toggle` sai quando ESTE
 * elemento está em tela cheia e entra nos outros casos.
 */
export function useFullscreen(target: RefObject<HTMLElement | null>): {
  active: boolean
  toggle: () => Promise<void>
} {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const update = () =>
      setActive(target.current !== null && document.fullscreenElement === target.current)
    update()
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [target])
  const toggle = async () => {
    const element = target.current
    if (!element) return
    if (document.fullscreenElement === element) await document.exitFullscreen?.()
    else await element.requestFullscreen?.()
  }
  return { active, toggle }
}
