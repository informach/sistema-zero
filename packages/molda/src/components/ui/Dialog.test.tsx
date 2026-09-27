import { afterEach, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { Dialog } from './Dialog'

afterEach(cleanup)

test('Tab wraps from the final disclosure summary and Shift+Tab returns to it', () => {
  const view = render(
    <Dialog open title="Cópia" onClose={() => {}}>
      <details>
        <summary>Movimentos nesta cópia</summary>
        <p>Acenar</p>
      </details>
    </Dialog>,
  )
  const close = within(view.container).getByRole('button'),
    summary = view.container.querySelector('summary')!
  summary.focus()
  fireEvent.keyDown(summary, { key: 'Tab' })
  expect(document.activeElement === close).toBe(true)
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
  expect(document.activeElement === summary).toBe(true)
})

test('closed details hide descendant controls from the trap, including nested disclosures', () => {
  const view = render(
    <Dialog open title="Cópia" onClose={() => {}}>
      <details>
        <summary>Movimentos</summary>
        <button type="button">Usar movimento</button>
        <details open>
          <summary>Mais informações</summary>
          <button type="button">Ajuda</button>
        </details>
      </details>
    </Dialog>,
  )
  const close = within(view.container).getByRole('button', { name: 'Fechar' }),
    outer = view.container.querySelector('details')!,
    summary = outer.querySelector('summary')!,
    help = within(view.container).getByText('Ajuda')
  close.focus()
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
  expect(document.activeElement === summary).toBe(true)
  outer.open = true
  close.focus()
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
  expect(document.activeElement === help).toBe(true)
  fireEvent.keyDown(help, { key: 'Tab' })
  expect(document.activeElement === close).toBe(true)
})
