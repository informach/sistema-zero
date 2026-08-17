import { afterEach, describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ChildrenDashboard, FamilyAiCredits } from '../src/app/perfis/parent-dashboard'
import { PurchasesView } from '../src/app/perfis/purchases-view'
import type { ChildDashboardView, MySubscriptionView, PaymentView } from '../src/lib/types'

const originalFetch = globalThis.fetch

const child: ChildDashboardView = {
  profileId: 'profile-1',
  name: 'Lia',
  avatarUrl: null,
  xp: 480,
  streak: { current: 4, best: 8 },
  badgesCount: 3,
  coursesInProgress: 2,
  coursesCompleted: 1,
  projectsCount: 5,
  rankingPosition: 7,
  week: {
    xpEarned: 80,
    lessonsCompleted: 2,
    quizzesPassed: 1,
    badgesUnlocked: 1,
    projectsSubmitted: 1,
  },
  games: [],
}

const payment: PaymentView = {
  id: 'payment-1',
  consumerId: 'consumer-1',
  status: 'PAID',
  method: 'PIX',
  amountInCents: '12900',
  currency: 'BRL',
  description: 'Comunidade dos Criadores',
  metadata: {},
  createdAt: '2026-08-01T12:00:00.000Z',
  paidAt: '2026-08-01T12:05:00.000Z',
}

const subscription: MySubscriptionView = {
  id: 'subscription-1',
  status: 'ACTIVE',
  intervalMonths: 1,
  repeats: null,
  amountInCents: '12900',
  currency: 'BRL',
  card: { brand: 'visa', last4: '4242' },
  cyclesCompleted: 2,
  lastChargeAt: '2026-08-01T12:00:00.000Z',
  description: 'Plano da família',
  canceledAt: null,
  createdAt: '2026-06-01T12:00:00.000Z',
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('superfícies extraídas da área dos pais', () => {
  test('renderiza progresso e créditos e persiste a preferência semanal', async () => {
    const calls: Array<{ path: string; init?: RequestInit }> = []
    globalThis.fetch = Object.assign(
      mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input)
        calls.push({ path, init })
        if (path === '/api/parents/children-stats') return Response.json({ children: [child] })
        if (path === '/api/parents/report-prefs' && init?.method === 'PUT') {
          return Response.json({ disabled: true })
        }
        if (path === '/api/parents/report-prefs') return Response.json({ disabled: false })
        if (path === '/api/parents/ai-credits') {
          return Response.json({
            credits: {
              dayLimit: 10,
              dayRemaining: 7,
              monthLimit: 100,
              monthRemaining: 64,
              monthRenewsOn: '2026-09-01',
            },
          })
        }
        throw new Error(`fetch de teste não previsto: ${path}`)
      }),
      { preconnect: originalFetch.preconnect },
    )

    render(
      <>
        <ChildrenDashboard avatarPhotoByProfile={{ 'profile-1': null }} />
        <FamilyAiCredits />
      </>,
    )

    expect(await screen.findByText('Lia')).toBeTruthy()
    expect(
      screen.getByText(
        '+80 XP · 2 aulas concluídas · 1 quiz aprovado · 1 medalha nova · 1 projeto enviado',
      ),
    ).toBeTruthy()
    expect(
      await screen.findByRole('progressbar', { name: '36 de 100 usados neste mês' }),
    ).toBeTruthy()

    fireEvent.click(
      await screen.findByRole('checkbox', {
        name: /Receber o resumo da semana por e-mail/,
      }),
    )

    await waitFor(() => {
      const put = calls.find(
        (call) => call.path === '/api/parents/report-prefs' && call.init?.method === 'PUT',
      )
      expect(put?.init?.body).toBe(JSON.stringify({ disabled: true }))
    })
  })

  test('pagina compras, volta e cancela uma assinatura com recarga da lista', async () => {
    const onBack = mock(() => {})
    const calls: Array<{ path: string; method: string }> = []
    let canceled = false
    globalThis.fetch = Object.assign(
      mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input)
        const method = init?.method ?? 'GET'
        calls.push({ path, method })
        if (path === '/api/payments/my?limit=20&offset=0') {
          return Response.json({ items: [payment], total: 2, limit: 20, offset: 0 })
        }
        if (path === '/api/payments/my?limit=20&offset=1') {
          return Response.json({
            items: [{ ...payment, id: 'payment-2', description: 'Curso de Games' }],
            total: 2,
            limit: 20,
            offset: 1,
          })
        }
        if (path === '/api/payments/my/subscriptions' && method === 'GET') {
          return Response.json({ items: canceled ? [] : [subscription] })
        }
        if (path === '/api/payments/my/subscriptions/subscription-1' && method === 'DELETE') {
          canceled = true
          return Response.json({ ok: true })
        }
        throw new Error(`fetch de teste não previsto: ${method} ${path}`)
      }),
      { preconnect: originalFetch.preconnect },
    )

    render(<PurchasesView onBack={onBack} />)

    expect(await screen.findByText('Comunidade dos Criadores')).toBeTruthy()
    expect(await screen.findByText('Plano da família')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à área dos pais' }))
    expect(onBack).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))
    expect(await screen.findByText('Curso de Games')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar assinatura' }))

    await waitFor(() => {
      expect(
        calls.filter(
          (call) => call.path === '/api/payments/my/subscriptions' && call.method === 'GET',
        ).length,
      ).toBe(2)
      expect(
        calls.some(
          (call) =>
            call.path === '/api/payments/my/subscriptions/subscription-1' &&
            call.method === 'DELETE',
        ),
      ).toBe(true)
    })
  })

  test('degrada falhas sem manter skeletons ou quebrar a área dos pais', async () => {
    globalThis.fetch = Object.assign(
      mock(async (input: RequestInfo | URL) => {
        const path = String(input)
        if (path === '/api/payments/my/subscriptions') return Response.json({ items: [] })
        if (path.startsWith('/api/payments/my?')) {
          return Response.json({ error: { message: 'offline' } }, { status: 503 })
        }
        throw new TypeError('offline')
      }),
      { preconnect: originalFetch.preconnect },
    )

    render(
      <>
        <ChildrenDashboard avatarPhotoByProfile={{}} />
        <FamilyAiCredits />
        <PurchasesView onBack={() => {}} />
      </>,
    )

    expect(screen.getByRole('heading', { name: 'Progresso dos filhos' })).toBeTruthy()
    expect(await screen.findByText('Nenhuma compra ainda')).toBeTruthy()
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Progresso dos filhos' })).toBeNull()
      expect(screen.queryByRole('heading', { name: 'Ajuda da IA neste mês' })).toBeNull()
    })
  })
})
