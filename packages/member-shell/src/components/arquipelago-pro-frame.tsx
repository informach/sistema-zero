'use client'

import { useEffect, useRef } from 'react'
import { lerMensagemDoPro, type MensagemDoPro } from '../lib/arquipelago-pro-mensagem'

/**
 * O quadro do modo Código por cima do jogo (lacunas, 01/11/2026): a rota isolada do Pro, da mesma
 * origem, com o isolamento entre origens delegado (`allow="cross-origin-isolated"`; a página do
 * jogo já é isolada). A página do jogo fica sem `unsafe-eval`: quem roda o WebContainer é o quadro.
 */
export function ArquipelagoProFrame({
  src,
  titulo,
  onMensagem,
}: {
  src: string
  titulo: string
  onMensagem: (mensagem: MensagemDoPro) => void
}) {
  const quadro = useRef<HTMLIFrameElement | null>(null)
  const ouvir = useRef(onMensagem)
  ouvir.current = onMensagem
  useEffect(() => {
    const aoReceber = (evento: MessageEvent) => {
      const mensagem = lerMensagemDoPro(
        evento,
        quadro.current?.contentWindow ?? null,
        window.location.origin,
      )
      if (mensagem) ouvir.current(mensagem)
    }
    window.addEventListener('message', aoReceber)
    return () => window.removeEventListener('message', aoReceber)
  }, [])
  return (
    <iframe
      ref={quadro}
      src={src}
      title={titulo}
      allow="cross-origin-isolated; clipboard-read; clipboard-write"
      className="h-full w-full border-0"
    />
  )
}
