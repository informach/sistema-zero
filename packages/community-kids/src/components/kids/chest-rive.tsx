'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { economiaDeDados } from '@/lib/economia-de-dados'
import { useReducedMotion } from './room/use-reduced-motion'

const ChestRiveCanvas = dynamic(
  () => import('./chest-rive-canvas').then((m) => m.ChestRiveCanvas),
  { ssr: false },
)

export {
  CHEST_RIVE_ARTBOARD,
  CHEST_RIVE_OPEN_STATE,
  CHEST_RIVE_OPEN_TRIGGER,
  CHEST_RIVE_OPENED_INPUT,
  CHEST_RIVE_STATE_MACHINE,
} from './chest-rive-contract'

/**
 * Canvas decorativo que fica SOBRE o SVG do baú. O SVG só some depois de o
 * runtime estar pronto; assim SSR, dados econômicos, movimento reduzido e falha
 * nunca deixam um círculo vazio no meio da trilha.
 */
export function ChestRive({
  src,
  opening,
  opened,
  onReady,
  onFailed,
  onOpened,
}: {
  src: string | null
  opening: boolean
  /** Espelha `chest.claimed`: leva direto ao estado terminal após um F5. */
  opened: boolean
  onReady: () => void
  onFailed: () => void
  onOpened: () => void
}) {
  const reducedMotion = useReducedMotion()
  const [canLoad, setCanLoad] = useState(false)
  const [load, setLoad] = useState({ src, failed: false })

  // Nasce fechado para o HTML do servidor e o primeiro quadro do cliente serem
  // iguais. Só então decide se este aparelho pode baixar o runtime/WASM.
  useEffect(() => {
    setCanLoad(!reducedMotion && !economiaDeDados())
  }, [reducedMotion])

  if (load.src !== src) setLoad({ src, failed: false })

  if (!src || !canLoad || load.failed) return null

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <ChestRiveCanvas
        key={src}
        src={src}
        opening={opening}
        opened={opened}
        onReady={onReady}
        onFailed={() => {
          setLoad({ src, failed: true })
          onFailed()
        }}
        onOpened={onOpened}
      />
    </span>
  )
}
