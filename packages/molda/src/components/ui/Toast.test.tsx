import { afterEach, describe, expect, test } from 'bun:test'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { ToastProvider, useToast } from './Toast'

/**
 * O toast com AÇÕES ("consertar depois e perguntar"): os botões chamam a ação e fecham,
 * a mensagem é a única região viva, e o relógio para enquanto um botão tem foco.
 */
afterEach(cleanup)

function Trigger({ onFix }: { onFix: () => void }): JSX.Element {
  const { showToast } = useToast()
  return (
    <button
      type="button"
      onClick={() => showToast('Face virada.', [{ label: 'Virar', onClick: onFix }])}
    >
      avisar
    </button>
  )
}

describe('Toast com ações', () => {
  test('o botão da ação chama o conserto e fecha o toast', () => {
    let fixed = 0
    render(
      <ToastProvider>
        <Trigger onFix={() => (fixed += 1)} />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'avisar' }))
    screen.getByText('Face virada.')
    fireEvent.click(screen.getByRole('button', { name: 'Virar' }))
    expect(fixed).toBe(1)
    expect(screen.queryByText('Face virada.')).toBeNull()
  })

  test('só a mensagem é região viva; com o foco num botão o toast não some sozinho', async () => {
    render(
      <ToastProvider>
        <Trigger onFix={() => undefined} />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'avisar' }))
    const live = screen.getByText('Face virada.')
    expect(live.getAttribute('aria-live')).toBe('polite')
    const action = screen.getByRole('button', { name: 'Virar' })
    expect(action.closest('[aria-live]')).toBeNull()
    fireEvent.focus(action)
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)))
    expect(screen.queryByText('Face virada.')).not.toBeNull()
  })
})
