import { afterEach, describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AmbassadorCard } from '../src/app/pais/_components/ambassador-card'
import type { AmbassadorEnrollmentView } from '../src/lib/types'

const originalFetch = globalThis.fetch
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

function serve(view: AmbassadorEnrollmentView | null) {
  globalThis.fetch = Object.assign(
    mock(async () =>
      view ? Response.json(view) : Response.json({ error: { code: 'X' } }, { status: 503 }),
    ),
    { preconnect: originalFetch.preconnect },
  )
}

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
})

const active = (over: Partial<NonNullable<AmbassadorEnrollmentView['ambassador']>> = {}) =>
  ({
    enrolled: true,
    ambassador: {
      code: 'ana-1',
      status: 'active',
      pageUrl: 'https://funil.test/embaixador/tok',
      shareUrl: 'https://funil.test/bolsa/ana-1',
      shareUrls: {
        kids: 'https://funil.test/bolsa/ana-1',
        adult: 'https://funil.test/bolsa/ana-1-adulto',
      },
      pixKeySet: true,
      ...over,
    },
    stats: { redemptionsCompleted: 4, invitesSent: 0 },
    bonus: { amountCents: 3000, eligibleCount: 0, paidCount: 0 },
  }) satisfies AmbassadorEnrollmentView

describe('cartão de embaixador da área dos pais', () => {
  test('sem cadastro: os dois presentes, o valor do serviço e os termos', async () => {
    serve({ enrolled: false, bonus: { amountCents: 4500 } })
    render(<AmbassadorCard />)
    await screen.findByText('Seja um embaixador do Sistema Zero')
    const text = document.body.textContent ?? ''
    expect(text).toContain('família com criança de 9 a 14 anos')
    expect(text).toContain('adulto que quer criar o próprio jogo')
    expect(text).toMatch(/R\$\s45,00/)
    expect(text).toContain('Não é salário nem renda garantida')
    expect(screen.getByRole('button', { name: 'Quero ser embaixador(a)' })).toBeTruthy()
  })

  test('cadastrado: copia o link de cada público', async () => {
    const written: string[] = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (value: string) => void written.push(value) },
    })
    serve(active())
    render(<AmbassadorCard />)
    await screen.findByText('Você é embaixador do Sistema Zero')
    expect(document.body.textContent).toContain('4 presentes resgatados.')
    fireEvent.click(screen.getByRole('button', { name: 'Copiar link para uma família' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copiar link para um adulto' }))
    await waitFor(() =>
      expect(written).toEqual([
        'https://funil.test/bolsa/ana-1',
        'https://funil.test/bolsa/ana-1-adulto',
      ]),
    )
    expect(screen.getByRole('link', { name: 'Abrir minha página' }).getAttribute('href')).toBe(
      'https://funil.test/embaixador/tok',
    )
  })

  test('referrals antigo, sem shareUrls: fica só o link da família', async () => {
    serve(active({ shareUrls: undefined }))
    render(<AmbassadorCard />)
    await screen.findByRole('button', { name: 'Copiar link para uma família' })
    expect(screen.queryByRole('button', { name: 'Copiar link para um adulto' })).toBeNull()
  })

  test('pausado: recado sem os botões de link', async () => {
    serve(active({ status: 'paused' }))
    render(<AmbassadorCard />)
    await screen.findByText(/está pausada no momento/)
    expect(screen.queryByRole('button', { name: /Copiar link/ })).toBeNull()
  })

  test('serviço fora: o cartão some', async () => {
    serve(null)
    const { container } = render(<AmbassadorCard />)
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(container.textContent).toBe('')
  })
})
