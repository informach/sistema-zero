import { afterEach, expect, mock, test } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { useLayoutEffect, useRef } from 'react'
import { useDialogFocus } from './dialogFocus'

afterEach(cleanup)

function Dialog({
  busy,
  onClose,
  escapeOnCommit = false,
}: {
  busy: boolean
  onClose: () => void
  escapeOnCommit?: boolean
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  useDialogFocus({ open: true, cardRef, busy, onClose })
  // Reproduz uma tecla entre o commit visível e os efeitos passivos. O teclado
  // precisa usar o estado que a janela acabou de mostrar, mesmo com a CPU ocupada.
  useLayoutEffect(() => {
    if (escapeOnCommit) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    }
  })
  return <div ref={cardRef} role="dialog" aria-label="Equipe" tabIndex={-1} aria-busy={busy} />
}

test('Esc volta a fechar assim que a janela deixa de estar ocupada', () => {
  const onClose = mock(() => {})
  const view = render(<Dialog busy onClose={onClose} />)
  view.rerender(<Dialog busy={false} onClose={onClose} escapeOnCommit />)
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('Esc fica bloqueado assim que a janela começa a gravar', () => {
  const onClose = mock(() => {})
  const view = render(<Dialog busy={false} onClose={onClose} />)
  view.rerender(<Dialog busy onClose={onClose} escapeOnCommit />)
  expect(onClose).toHaveBeenCalledTimes(0)
})

test('Esc usa a ação de fechar do commit atual', () => {
  const previousClose = mock(() => {})
  const currentClose = mock(() => {})
  const view = render(<Dialog busy={false} onClose={previousClose} />)
  view.rerender(<Dialog busy={false} onClose={currentClose} escapeOnCommit />)
  expect(previousClose).toHaveBeenCalledTimes(0)
  expect(currentClose).toHaveBeenCalledTimes(1)
})
