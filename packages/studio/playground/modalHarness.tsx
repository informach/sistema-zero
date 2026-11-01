import type { JSX, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { StudioPortalContainerProvider } from '../src/studio/portal-container'

/**
 * `?modal=1`: o editor dentro de um `<dialog>` aberto com `showModal()`, como o Estúdio de desafio
 * do Arquipélago (member-shell). Sem o contêiner de portais, tudo o que o Studio e o Blockly
 * desenham no `document.body` fica inerte. O e2e `modal-dialog-portals.spec.ts` usa este modo.
 */
export const MODAL_DEMO = new URLSearchParams(window.location.search).get('modal') === '1'

export function DemoModalDialog({ children }: { children: ReactNode }): JSX.Element {
  const ref = useRef<HTMLDialogElement | null>(null)
  const [container, setContainer] = useState<HTMLDialogElement | null>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    setContainer(dialog)
    return () => dialog?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      aria-label="Estúdio no diálogo"
      data-sz-modal-demo=""
      style={{
        position: 'fixed',
        inset: 0,
        margin: 0,
        width: '100vw',
        height: '100dvh',
        maxWidth: 'none',
        maxHeight: 'none',
        padding: 0,
        border: 0,
      }}
      onCancel={(e) => e.preventDefault()}
    >
      <StudioPortalContainerProvider value={container}>{children}</StudioPortalContainerProvider>
    </dialog>
  )
}
