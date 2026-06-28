'use client'

import { useEffect, useRef } from 'react'
import { lockBodyScroll, unlockBodyScroll } from './scroll-lock'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

let modalIdSequence = 0
const openModalStack: number[] = []

function removeModalFromStack(id: number) {
  const index = openModalStack.lastIndexOf(id)
  if (index !== -1) openModalStack.splice(index, 1)
}

/**
 * Gestão de foco de modal (a11y), compartilhada pelo `Dialog` e por overlays
 * "bespoke" que precisam do MESMO comportamento sem o chrome do Dialog (ex.: as
 * celebrações do kids — card centralizado com mascote/confete). Ao abrir leva o
 * foco para dentro (o leitor de tela anuncia o diálogo pelo `aria-label`), PRENDE
 * o Tab no card, fecha no Esc e DEVOLVE o foco ao gatilho ao fechar. Pilha
 * refcontada (só o do TOPO trata Esc/Tab) + lock de scroll do body.
 *
 * Retorna o `ref` do card — o consumidor o aplica ao container do diálogo
 * (`role="dialog" aria-modal="true" aria-label tabIndex={-1}`).
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const cardRef = useRef<T>(null)
  const onCloseRef = useRef(onClose)
  const idRef = useRef(0)
  if (idRef.current === 0) idRef.current = ++modalIdSequence

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const id = idRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null
    const card = cardRef.current
    removeModalFromStack(id)
    openModalStack.push(id)
    // Foca o container (anuncia o título) — evita cair num botão como 1º foco.
    card?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (openModalStack[openModalStack.length - 1] !== id) return
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !card) return
      const focusables = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE))
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (!first || !last) {
        e.preventDefault()
        card.focus()
        return
      }
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === card)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    lockBodyScroll()
    return () => {
      document.removeEventListener('keydown', onKey)
      removeModalFromStack(id)
      unlockBodyScroll()
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus()
    }
  }, [open])

  return cardRef
}
