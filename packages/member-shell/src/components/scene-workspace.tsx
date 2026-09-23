'use client'

import { Button } from '@sistemazero/ui/button'
import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import { Maximize2, Minimize2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'

/** Amplia a mesma árvore: nem o controlador nem os controles da cena são remontados. */
export function SceneWorkspace({
  labelledBy,
  header,
  children,
}: {
  labelledBy: string
  header: ReactNode
  children: ReactNode
}) {
  // Reserva o lugar na aula enquanto a experiência ocupa a janela.
  const [inlineHeight, setInlineHeight] = useState<number | null>(null)
  const expanded = inlineHeight !== null
  const workspaceRef = useModalA11y<HTMLElement>({
    open: expanded,
    onClose: () => setInlineHeight(null),
  })

  return (
    <div className="sz-scene-workspace-slot" style={{ minHeight: inlineHeight ?? undefined }}>
      <section
        ref={workspaceRef}
        {...(expanded ? { role: 'dialog', 'aria-modal': true, tabIndex: -1 } : {})}
        aria-labelledby={labelledBy}
        className={`sz-lesson-scene sz-scene-workspace${expanded ? ' sz-scene-workspace--expanded' : ''}`}
      >
        <header className="sz-scene-workspace-header">
          <div className="sz-scene-workspace-heading space-y-3">{header}</div>
          <Button
            variant="outline"
            className="min-h-11 gap-2 whitespace-normal"
            aria-expanded={expanded}
            onClick={(event) => {
              // WebKit não foca botões ao clicar. O modal deve guardar ESTE gatilho
              // para o retorno, não o último elemento focado em outro lugar da aula.
              if (!expanded) event.currentTarget.focus({ preventScroll: true })
              setInlineHeight(expanded ? null : (workspaceRef.current?.offsetHeight ?? 0))
            }}
          >
            {expanded ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />}
            {expanded ? 'Voltar à aula' : 'Ampliar experiência'}
          </Button>
        </header>
        {children}
      </section>
    </div>
  )
}
