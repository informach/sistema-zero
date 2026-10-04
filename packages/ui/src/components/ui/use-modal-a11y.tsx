'use client'

import { useEffect, useRef } from 'react'
import { lockBodyScroll, unlockBodyScroll } from './scroll-lock'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * ACOMPANHANTES do modal (03/10/2026): o que fica FORA do card e mesmo assim faz parte dele — o
 * vídeo flutuante da aula por cima da atividade ampliada. Quem marca é o consumidor, com
 * `data-sz-modal-companion`, e só o modal que pede (`companions: true`) os inclui no Tab: um
 * diálogo de confirmação aberto por cima não pode mandar o Tab para o vídeo.
 */
const COMPANION = '[data-sz-modal-companion]'

/**
 * O que o Tab alcança de verdade, para achar as PONTAS do card e a ordem dos acompanhantes.
 * Mais largo que o `FOCUSABLE`: `summary` ("Ver a explicação" da cena), o player e o texto
 * editável também são paradas do Tab, e um ciclo montado só com o `FOCUSABLE` os pulava (full
 * review de 03/10/2026). A guarda de foco do vídeo flutuante fica fora da roda.
 */
const TABBABLE = `${FOCUSABLE},summary,iframe,video[controls],audio[controls],[contenteditable]:not([contenteditable="false"])`
const FOCUS_GUARD = '[data-sz-focus-guard]'

/** Um alvo que o foco alcança de verdade: sem `inert` em volta e desenhado na tela. */
function reachable(element: HTMLElement): boolean {
  // O atributo, e não `tabIndex`: o happy-dom devolve -1 para `summary`, que é parada do Tab.
  const declared = element.getAttribute('tabindex')
  if ((declared !== null && Number(declared) < 0) || element.matches(FOCUS_GUARD)) return false
  if (element.closest('[inert]')) return false
  return typeof element.checkVisibility === 'function' ? element.checkVisibility() : true
}

function tabbables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(reachable)
}

function companionTargets(card: HTMLElement): HTMLElement[] {
  const targets: HTMLElement[] = []
  for (const companion of document.querySelectorAll<HTMLElement>(COMPANION)) {
    if (card.contains(companion)) continue
    if (companion.matches(TABBABLE) && reachable(companion)) targets.push(companion)
    targets.push(...tabbables(companion))
  }
  return targets
}

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
  companions = false,
}: {
  open: boolean
  onClose: () => void
  /** Inclui no Tab os acompanhantes (`data-sz-modal-companion`) que estiverem na página. */
  companions?: boolean
}) {
  const cardRef = useRef<T>(null)
  const onCloseRef = useRef(onClose)
  const idRef = useRef(0)
  if (idRef.current === 0) idRef.current = ++modalIdSequence
  const companionsRef = useRef(companions)
  companionsRef.current = companions

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
      const extra = companionsRef.current ? companionTargets(card) : []
      if (extra.length > 0) {
        // Com acompanhante, card e acompanhantes viram uma roda só. ⚠️ Dentro do card quem
        // anda é o NAVEGADOR (a ordem dele inclui o que nenhuma lista prevê); daqui só se
        // desviam as passagens: a última parada do card leva ao acompanhante, e a última do
        // acompanhante volta ao card.
        const inCard = tabbables(card)
        const active = document.activeElement as HTMLElement | null
        const at = active ? extra.indexOf(active) : -1
        let next: HTMLElement | undefined
        if (at !== -1) {
          if (e.shiftKey) next = at === 0 ? (inCard.at(-1) ?? extra.at(-1)) : extra[at - 1]
          else next = at === extra.length - 1 ? (inCard[0] ?? extra[0]) : extra[at + 1]
        } else if (!e.shiftKey && (inCard.length === 0 || active === inCard.at(-1))) {
          next = extra[0]
        } else if (e.shiftKey && (inCard.length === 0 || active === inCard[0] || active === card)) {
          next = extra.at(-1)
        } else if (!active || !card.contains(active)) {
          // O foco escapou (para a página embaixo): volta para a roda.
          next = e.shiftKey ? extra.at(-1) : (inCard[0] ?? extra[0])
        }
        if (next) {
          e.preventDefault()
          next.focus()
        }
        return
      }
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
