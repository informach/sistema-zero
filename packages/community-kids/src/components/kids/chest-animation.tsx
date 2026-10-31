'use client'

import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import { EdiAnimation } from '@sistemazero/edisvg/react'
import { useMemo, useRef, useState } from 'react'

/** Artwork never claims a reward. It only reports the authored terminal pose after authorization. */
export function ChestAnimation({
  opening,
  opened,
  onReady,
  onFailed,
  onOpened,
}: {
  opening: boolean
  opened: boolean
  onReady: () => void
  onFailed: () => void
  onOpened: () => void
}) {
  const [failed, setFailed] = useState(false)
  const [validated, setValidated] = useState(false)
  const reported = useRef(false)
  const current = useRef({ opening, opened, onReady, onFailed, onOpened })
  current.current = { opening, opened, onReady, onFailed, onOpened }
  const inputs = useMemo(() => ({ aberto: opening }), [opening])
  if (opened || failed) return null
  const art = BUILTIN_ART.chest
  const fail = () => {
    setFailed(true)
    current.current.onFailed()
  }
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 grid place-items-center"
      style={{ opacity: validated ? 1 : 0 }}
    >
      <EdiAnimation
        src={art.url}
        poster={art.poster.url}
        width={32}
        height={32}
        className="kids-chest-artwork"
        inputs={inputs}
        playing={opening}
        onReady={(player) => {
          try {
            if (
              typeof player.getInput('aberto') !== 'boolean' ||
              player.inspect().machine !== 'Baú'
            )
              throw new Error('Contrato do baú inválido.')
            if (!current.current.opened) setValidated(true)
          } catch {
            fail()
          }
        }}
        onRuntimeReadyChange={(ready) => {
          if (ready && !current.current.opened) current.current.onReady()
          else {
            setValidated(false)
            current.current.onFailed()
          }
        }}
        onError={fail}
        onStateChange={(state) => {
          if (
            reported.current ||
            !current.current.opening ||
            current.current.opened ||
            !state.layers.some((layer) => layer.name === 'Tampa' && layer.state === 'Aberto')
          )
            return
          reported.current = true
          current.current.onOpened()
        }}
      />
    </span>
  )
}
