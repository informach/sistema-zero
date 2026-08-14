import { describe, expect, it } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { Dialog, handleDialogDocumentFocusIn, handleDialogDocumentKeyDown } from './Dialog'

describe('Dialog', () => {
  it('Escape fecha só o modal do topo e devolve o foco em duas etapas', () => {
    function NestedDialogs() {
      const [parentOpen, setParentOpen] = useState(false)
      const [childOpen, setChildOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setParentOpen(true)}>
            abrir pai
          </button>
          <Dialog open={parentOpen} onClose={() => setParentOpen(false)} title="modal pai">
            <button type="button" onClick={() => setChildOpen(true)}>
              abrir filho
            </button>
            <Dialog open={childOpen} onClose={() => setChildOpen(false)} title="modal filho">
              conteúdo filho
            </Dialog>
          </Dialog>
        </>
      )
    }

    render(<NestedDialogs />)
    const outerTrigger = screen.getByRole('button', { name: 'abrir pai' })
    outerTrigger.focus()
    fireEvent.click(outerTrigger)
    const childTrigger = screen.getByRole('button', { name: 'abrir filho' })
    childTrigger.focus()
    fireEvent.click(childTrigger)
    expect(screen.getByRole('dialog', { name: 'modal filho' })).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'modal filho' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'modal pai' })).toBeTruthy()
    expect(document.activeElement).toBe(childTrigger)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'modal pai' })).toBeNull()
    expect(document.activeElement).toBe(outerTrigger)
  })

  it('listeners do documento recuperam foco e mantêm Tab/Shift+Tab dentro do modal', () => {
    const background = document.createElement('button')
    const card = document.createElement('div')
    const first = document.createElement('button')
    const last = document.createElement('button')
    card.tabIndex = -1
    card.append(first, last)
    document.body.append(background, card)
    let closeCount = 0

    const onKeyDown = (event: KeyboardEvent): void => {
      handleDialogDocumentKeyDown(event, card, () => {
        closeCount += 1
      })
    }
    const onFocusIn = (event: FocusEvent): void => handleDialogDocumentFocusIn(event, card)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)

    try {
      background.focus()
      expect(document.activeElement).toBe(first)

      last.focus()
      const forward = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      })
      last.dispatchEvent(forward)
      expect(forward.defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(first)

      const backward = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
      first.dispatchEvent(backward)
      expect(backward.defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(last)

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
      expect(closeCount).toBe(1)
    } finally {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
      background.remove()
      card.remove()
    }
  })
})
