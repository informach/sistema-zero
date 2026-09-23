'use client'

import {
  Alignment,
  EventType,
  Fit,
  Layout,
  StateMachineInputType,
  useRive,
} from '@rive-app/react-canvas'
import { useEffect, useRef, useState } from 'react'
import {
  CHEST_RIVE_ARTBOARD,
  CHEST_RIVE_OPEN_STATE,
  CHEST_RIVE_OPEN_TRIGGER,
  CHEST_RIVE_OPENED_INPUT,
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
  opened,
  onReady,
  onFailed,
  onOpened,
}: {
  src: string
  opening: boolean
  opened: boolean
  onReady: () => void
  onFailed: () => void
  onOpened: () => void
}) {
  const openingTriggered = useRef(false)
  const validated = useRef(false)
  const [visible, setVisible] = useState(false)
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
    const inputs = rive.stateMachineInputs(CHEST_RIVE_STATE_MACHINE)
    const trigger = inputs?.find((input) => input.name === CHEST_RIVE_OPEN_TRIGGER)
    const openedInput = inputs?.find((input) => input.name === CHEST_RIVE_OPENED_INPUT)
    if (
      !trigger ||
      trigger.type !== StateMachineInputType.Trigger ||
      !openedInput ||
      openedInput.type !== StateMachineInputType.Boolean
    ) {
      validated.current = true
      onFailed()
      return
    }
    openedInput.value = opened
    validated.current = true
    // O canvas nasce invisível. Assim uma página já resgatada só o revela depois
    // de o booleano levar a máquina ao quadro Open — sem lampejo do Closed.
    setVisible(true)
    onReady()
  }, [opened, rive, onFailed, onReady])

  useEffect(() => {
    if (!rive || !validated.current) return
    const openedInput = rive
      .stateMachineInputs(CHEST_RIVE_STATE_MACHINE)
      ?.find((input) => input.name === CHEST_RIVE_OPENED_INPUT)
    if (!openedInput || openedInput.type !== StateMachineInputType.Boolean) {
      onFailed()
      return
    }
    openedInput.value = opened
  }, [opened, rive, onFailed])

  useEffect(() => {
    if (!rive || !opening || opened || openingTriggered.current) return
    const trigger = rive
      .stateMachineInputs(CHEST_RIVE_STATE_MACHINE)
      ?.find((input) => input.name === CHEST_RIVE_OPEN_TRIGGER)
    if (!trigger) {
      onFailed()
      return
    }
    openingTriggered.current = true
    trigger.fire()
  }, [opened, opening, rive, onFailed])

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

  return (
    <RiveComponent aria-hidden="true" className={visible ? 'size-full' : 'size-full opacity-0'} />
  )
}
