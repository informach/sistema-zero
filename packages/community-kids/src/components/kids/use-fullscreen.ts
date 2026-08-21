'use client'

import type { RefObject } from 'react'
import { useCallback, useEffect, useState } from 'react'
import {
  exitGamepadFullscreen,
  isDocumentFullscreen,
  requestGamepadFullscreen,
} from './gamepad-fullscreen'

/**
 * O botão de tela cheia da página de jogar, nos dois lugares em que ele aparece
 * (a barra do console e o cabeçalho sem controles): entra quando está normal,
 * VOLTA quando está em tela cheia.
 *
 * ⚠️⚠️ O estado vem do NAVEGADOR, nunca de "eu cliquei". A criança sai da tela
 * cheia pelo Esc, pelo gesto do sistema ou pelo botão de voltar do Android — e
 * nesses caminhos ninguém avisa o botão. Guardando o estado no clique, ele fica
 * dizendo "Sair" com a tela já normal, e o toque seguinte não faz nada.
 */
export function useFullscreen(alvoRef: RefObject<HTMLElement | null>) {
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    function sincronizar() {
      setFullscreen(isDocumentFullscreen(document))
    }
    // Lê uma vez no mount: a página pode montar já em tela cheia (remontagem do
    // console ao trocar de modo, por exemplo).
    sincronizar()
    document.addEventListener('fullscreenchange', sincronizar)
    return () => document.removeEventListener('fullscreenchange', sincronizar)
  }, [])

  const alternar = useCallback(() => {
    // ⚠️ Decide pelo documento AO VIVO, e não pelo estado do render: entre o
    // último quadro e o toque o navegador pode ter saído da tela cheia sozinho.
    if (isDocumentFullscreen(document)) void exitGamepadFullscreen(document)
    else void requestGamepadFullscreen(alvoRef.current)
  }, [alvoRef])

  return { fullscreen, alternar }
}
