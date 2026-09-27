import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { useSceneWorkshop } from './useSceneWorkshop'

const SceneAppearancePanel = lazy(() =>
  import('./SceneAppearancePanel').then((module) => ({ default: module.SceneAppearancePanel })),
)

/**
 * "Materiais e camadas", na aba Pintar. ⚠️ É uma tela OU a pintura, nunca as duas: abrir o
 * painel fecha a pintura (`onOpen`), e a pintura que abre (`closed`, por "Pintar nesta
 * camada") recolhe o painel. Juntas, repetiriam controles (a escolha de quadro, por exemplo).
 */
export function SceneAppearanceTools({
  workshop,
  onOpen,
  closed = false,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
  onOpen?(): void
  closed?: boolean
}) {
  const [open, setOpen] = useState(false)
  const details = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (!closed || !details.current?.open) return
    details.current.open = false
    setOpen(false)
  }, [closed])
  return (
    <details
      ref={details}
      className="rounded-xl border border-mld-border p-2"
      onToggle={(event) => {
        const next = event.currentTarget.open
        setOpen(next)
        if (next) onOpen?.()
      }}
    >
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">
        {COPY.scene.appearanceTitle}
      </summary>
      {open && (
        <Suspense fallback={<p role="status">{COPY.scene.appearanceLoading}</p>}>
          <SceneAppearancePanel workshop={workshop} />
        </Suspense>
      )}
    </details>
  )
}
