import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { SessionBoundary } from '../src/components/kids/session-boundary'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

test('voltar a uma página guardada no histórico confere a sessão imediatamente', async () => {
  let changed = false
  const check = mock(async () => Response.json({ sessionId: changed ? 'new-session' : null }))
  globalThis.fetch = Object.assign(check, { preconnect: originalFetch.preconnect })
  await act(async () => {
    render(<SessionBoundary kind="student" />)
  })
  changed = true
  fireEvent(window, new Event('pageshow'))
  await waitFor(() => expect(Boolean(screen.queryByRole('dialog'))).toBe(true))
  expect(check.mock.calls.length).toBeGreaterThan(0)
})

test('falha temporária da conferência não anuncia encerramento da sessão', async () => {
  globalThis.fetch = Object.assign(
    mock(async () => Response.json({}, { status: 503 })),
    {
      preconnect: originalFetch.preconnect,
    },
  )
  await act(async () => {
    render(<SessionBoundary kind="parent" />)
    window.dispatchEvent(new Event('focus'))
  })
  expect(Boolean(screen.queryByRole('dialog'))).toBe(false)
})

test('a troca em outra aba diz o que aconteceu e o X também revalida', async () => {
  const assign = spyOn(window.location, 'assign').mockImplementation(() => {})
  globalThis.fetch = Object.assign(
    mock(async () => Response.json({ sessionId: 'outra-sessao' })),
    { preconnect: originalFetch.preconnect },
  )
  try {
    await act(async () => {
      render(<SessionBoundary kind="student" />)
    })
    const dialog = await screen.findByRole('dialog', { name: 'O perfil mudou em outra aba' })
    expect(screen.getByRole('button', { name: 'Continuar com meu perfil' })).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar e abrir de novo' }))
    expect(assign).toHaveBeenCalledWith('/perfis')
  } finally {
    assign.mockRestore()
  }
})

test('na área dos pais o botão diz e faz o mesmo: abre a área dos pais de novo', async () => {
  const assign = spyOn(window.location, 'assign').mockImplementation(() => {})
  globalThis.fetch = Object.assign(
    mock(async () => Response.json({ sessionId: 'outra-sessao' })),
    { preconnect: originalFetch.preconnect },
  )
  try {
    await act(async () => {
      render(<SessionBoundary kind="parent" />)
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir a área dos pais' }))
    expect(assign).toHaveBeenCalledWith('/pais')
    expect(screen.queryByRole('button', { name: 'Continuar com meu perfil' })).toBeNull()
  } finally {
    assign.mockRestore()
  }
})
