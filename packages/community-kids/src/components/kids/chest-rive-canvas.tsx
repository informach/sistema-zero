'use client'

import { Alignment, EventType, Fit, Layout, useRive } from '@rive-app/react-canvas'
import { useEffect, useRef } from 'react'
import {
  CHEST_RIVE_ARTBOARD,
  CHEST_RIVE_OPEN_STATE,
  CHEST_RIVE_OPEN_TRIGGER,
  CHEST_RIVE_STATE_MACHINE,
  riveEntrouNoEstado,
} from './chest-rive-contract'
import './rive-runtime'

const LAYOUT = new Layout({ fit: Fit.Contain, alignment: Alignment.Center })

/**
 * A fronteira entre o arquivo da designer e a UI da trilha.
 *
 * O Rive não recebe XP, moedas, URL de API nem sabe abrir diálogo. Ele só recebe
 * o gatilho `open` depois de o servidor confirmar o resgate e avisa quando entra
 * no estado terminal `Open`. O componente pai decide o que isso significa.
 */
export function ChestRiveCanvas({
  src,
  opening,
  onReady,
  onFailed,
  onOpened,
}: {
  src: string
  opening: boolean
  onReady: () => void
  onFailed: () => void
  onOpened: () => void
}) {
  const opened = useRef(false)
  const validated = useRef(false)
  const { RiveComponent, rive } = useRive({
    src,
    artboard: CHEST_RIVE_ARTBOARD,
    stateMachine: CHEST_RIVE_STATE_MACHINE,
    layout: LAYOUT,
    autoplay: true,
    enableRiveAssetCDN: false,
    onLoadError: onFailed,
  })

  /**
   * Um arquivo com nomes trocados pode até pintar o primeiro quadro, mas não
   * responde ao clique. Validamos o contrato antes de esconder o SVG para essa
   * falha degradar graciosamente em vez de congelar a interface.
   */
  useEffect(() => {
    if (!rive || validated.current) return
    const trigger = rive
      .stateMachineInputs(CHEST_RIVE_STATE_MACHINE)
      ?.find((input) => input.name === CHEST_RIVE_OPEN_TRIGGER)
    if (!trigger) {
      validated.current = true
      onFailed()
      return
    }
    validated.current = true
    onReady()
  }, [rive, onFailed, onReady])

  useEffect(() => {
    if (!rive || !opening || opened.current) return
    const trigger = rive
      .stateMachineInputs(CHEST_RIVE_STATE_MACHINE)
      ?.find((input) => input.name === CHEST_RIVE_OPEN_TRIGGER)
    if (!trigger) {
      onFailed()
      return
    }
    opened.current = true
    trigger.fire()
  }, [opening, rive, onFailed])

  useEffect(() => {
    if (!rive) return
    // A versão atual do runtime expõe a conclusão de uma máquina simples por
    // StateChange. O nome do estado faz parte do contrato do `.riv`; nunca há uma
    // duração escrita no React que possa ficar fora de sincronia com a arte.
    const finished = (event: { data?: unknown }) => {
      if (riveEntrouNoEstado(event.data, CHEST_RIVE_OPEN_STATE)) onOpened()
    }
    rive.on(EventType.StateChange, finished)
    return () => rive.off(EventType.StateChange, finished)
  }, [rive, onOpened])

  return <RiveComponent aria-hidden="true" className="size-full" />
}
