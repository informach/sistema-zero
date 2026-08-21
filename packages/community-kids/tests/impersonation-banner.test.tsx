import { afterEach, describe, expect, mock, test } from 'bun:test'
import { ImpersonationBanner } from '@sistemazero/member-shell/components/impersonation-banner'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function failingFetch() {
  const request = mock(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    Response.json(
      { error: { code: 'SERVICE_UNAVAILABLE', message: 'Serviço indisponível.' } },
      { status: 503 },
    ),
  )
  globalThis.fetch = Object.assign(request, { preconnect: originalFetch.preconnect })
  return request
}

describe('ImpersonationBanner', () => {
  test('readonly explica a sessão e exige confirmação antes de ativar edição', async () => {
    const request = failingFetch()
    render(<ImpersonationBanner studentName="Rafa Daibert" actorName="Ana Admin" mode="readonly" />)

    expect(screen.getByText(/somente leitura/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ativar edição' }))
    const dialog = screen.getByRole('dialog', { name: 'Ativar modo de edição?' })
    expect(dialog).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Ativar edição' }))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    expect(request.mock.calls[0]?.[0]).toBe('/api/auth/impersonation/mode')
    expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toEqual({ mode: 'write' })
    expect((await screen.findByRole('alert')).textContent).toContain('Serviço indisponível.')
  })

  test('write usa aviso explícito e permite rebaixar para readonly', async () => {
    const request = failingFetch()
    render(<ImpersonationBanner studentName="Rafa" actorName="Ana" mode="write" />)

    expect(screen.getByText(/Modo de edição ativo/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Desativar edição' }))

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toEqual({ mode: 'readonly' })
  })

  test('falha ao encerrar mantém o banner visível e permite tentar novamente', async () => {
    const request = failingFetch()
    render(<ImpersonationBanner studentName="Rafa" actorName="Ana" mode="write" />)

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    expect(request.mock.calls[0]?.[0]).toBe('/api/auth/logout')
    expect((await screen.findByRole('alert')).textContent).toContain('Serviço indisponível.')
    expect(screen.getByText(/Modo de edição ativo/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Encerrar' })).toBeTruthy()
  })
})
