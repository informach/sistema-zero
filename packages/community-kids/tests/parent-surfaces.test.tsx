import { afterEach, describe, expect, mock, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { FamilyAiCredits } from '../src/app/pais/_components/ai-credits-card'
import { ChildProgress } from '../src/app/pais/_components/child-progress'
import { ParentSubscriptions, PurchaseHistory } from '../src/app/pais/_components/purchase-history'
import type { ChildrenStats } from '../src/app/pais/_components/use-children-stats'
import { WeeklyReportToggle } from '../src/app/pais/_components/weekly-report-toggle'
import { HelpContent } from '../src/app/pais/ajuda/help-content'
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
  submissionsCount: 5,
  rankingPosition: 7,
  week: {
    xpEarned: 80,
    lessonsCompleted: 2,
    quizzesPassed: 1,
    badgesUnlocked: 1,
    projectsSubmitted: 1,
    submissionsSubmitted: 1,
  },
  games: [{ title: 'Corre Dino', playId: 'play-1', publishedAt: '2026-10-09T12:00:00.000Z' }],
  career: {
    level: 'coder',
    nextLevel: 'hacker',
    pendingPublications: [{ courseSlug: 'cade', title: 'Cadê Todo Mundo?' }],
    tools: [
      { id: 'estudio-completo', owned: true, state: 'available', requiredLevel: 'coder' },
      { id: 'pensa', owned: true, state: 'career-locked', requiredLevel: 'hacker' },
      { id: 'molda', owned: false, state: 'not-included', requiredLevel: 'explorer' },
    ],
  },
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

function installFetch(handler: (path: string, method: string, init?: RequestInit) => Response) {
  const calls: Array<{ path: string; method: string; body?: unknown }> = []
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      const method = init?.method ?? 'GET'
      calls.push({ path, method, body: init?.body })
      return handler(path, method, init)
    }),
    { preconnect: originalFetch.preconnect },
  )
  return calls
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('o progresso de uma criança', () => {
  test('mostra a semana, a jornada, as ferramentas e o cartão do jogo', () => {
    render(<ChildProgress profileId="profile-1" stats={{ state: 'ready', children: [child] }} />)
    const week = screen.getByRole('region', { name: 'Esta semana' })
    expect(within(week).getByText('+80')).toBeTruthy()
    expect(within(week).getByText('aulas concluídas')).toBeTruthy()
    expect(within(week).getByText('Corre Dino')).toBeTruthy()
    // O cartão monta o endereço absoluto do jogo a partir da origem da página.
    ;(window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(
      'https://kids.test/pais/acompanhamento',
    )
    fireEvent.click(within(week).getByRole('button', { name: /Cartão do jogo/ }))
    expect(screen.getByRole('dialog')).toBeTruthy()

    const journey = screen.getByRole('region', { name: 'Jornada do Criador' })
    expect(within(journey).getByText('Cadê Todo Mundo?')).toBeTruthy()
    const tools = screen.getByRole('region', { name: 'Ferramentas' })
    expect(within(tools).getByText('Liberado')).toBeTruthy()
    expect(within(tools).getByText(/^Libera no /)).toBeTruthy()
    expect(within(tools).getByText('Não incluído na conta')).toBeTruthy()
    const totals = screen.getByRole('region', { name: 'No total' })
    expect(within(totals).getByText('7º lugar')).toBeTruthy()
    expect(within(totals).getByText('4 (recorde 8)')).toBeTruthy()
  })

  // O e-mail semanal manda desligar o resumo no Acompanhamento: o interruptor não pode depender
  // de a criança ter números nem de a consulta ter dado certo.
  test('o que vai ao lado aparece em todo estado', () => {
    const aside = <p>interruptor do resumo</p>
    const estados: ChildrenStats[] = [
      { state: 'loading' },
      { state: 'failed' },
      { state: 'ready', children: [] },
      { state: 'ready', children: [child] },
    ]
    for (const stats of estados) {
      const view = render(<ChildProgress profileId="profile-1" stats={stats} aside={aside} />)
      expect(screen.getByText('interruptor do resumo')).toBeTruthy()
      view.unmount()
    }
  })

  test('falha da consulta oferece tentar de novo; criança sem dados ganha um recado', () => {
    const failed = render(<ChildProgress profileId="profile-1" stats={{ state: 'failed' }} />)
    expect(screen.getByText('Não conseguimos consultar o acompanhamento')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Tentar de novo/ })).toBeTruthy()
    failed.unmount()
    render(<ChildProgress profileId="outra" stats={{ state: 'ready', children: [child] }} />)
    expect(screen.getByText(/O acompanhamento aparece quando a criança começa/)).toBeTruthy()
  })
})

describe('os cartões da conta', () => {
  test('o resumo da semana é um interruptor que grava a escolha', async () => {
    const calls = installFetch((path, method) => {
      if (path === '/api/parents/report-prefs' && method === 'PUT')
        return Response.json({ disabled: true })
      if (path === '/api/parents/report-prefs') return Response.json({ disabled: false })
      throw new Error(`fetch de teste não previsto: ${method} ${path}`)
    })
    render(<WeeklyReportToggle />)
    const toggle = await screen.findByRole('switch', {
      name: /Receber o resumo da semana por e-mail/,
    })
    expect((toggle as HTMLInputElement).checked).toBe(true)
    fireEvent.click(toggle)
    await waitFor(() =>
      expect(calls.find((call) => call.method === 'PUT')?.body).toBe(
        JSON.stringify({ disabled: true }),
      ),
    )
    await waitFor(() => expect((toggle as HTMLInputElement).checked).toBe(false))
  })

  test('o uso da IA da família aparece com a barra do mês', async () => {
    installFetch((path) => {
      if (path === '/api/parents/ai-credits')
        return Response.json({
          credits: {
            dayLimit: 10,
            dayRemaining: 7,
            monthLimit: 100,
            monthRemaining: 64,
            monthRenewsOn: '2026-11-01',
          },
        })
      throw new Error(`fetch de teste não previsto: ${path}`)
    })
    render(<FamilyAiCredits />)
    expect(
      await screen.findByRole('progressbar', { name: '36 de 100 usados neste mês' }),
    ).toBeTruthy()
    expect(screen.getByText(/Hoje: 3 de 10/)).toBeTruthy()
  })

  test('pagina as compras e cancela a assinatura com confirmação', async () => {
    let canceled = false
    const calls = installFetch((path, method) => {
      if (path === '/api/payments/my?limit=20&offset=0')
        return Response.json({ items: [payment], total: 2, limit: 20, offset: 0 })
      if (path === '/api/payments/my?limit=20&offset=1')
        return Response.json({
          items: [{ ...payment, id: 'payment-2', description: 'Curso de Games' }],
          total: 2,
          limit: 20,
          offset: 1,
        })
      if (path === '/api/payments/my/subscriptions' && method === 'GET')
        return Response.json({ items: canceled ? [] : [subscription] })
      if (path === '/api/payments/my/subscriptions/subscription-1' && method === 'DELETE') {
        canceled = true
        return Response.json({ ok: true })
      }
      throw new Error(`fetch de teste não previsto: ${method} ${path}`)
    })
    render(
      <>
        <ParentSubscriptions />
        <PurchaseHistory />
      </>,
    )
    expect(await screen.findByText('Comunidade dos Criadores')).toBeTruthy()
    expect(await screen.findByText('Plano da família')).toBeTruthy()
    expect(screen.getByText(/VISA •••• 4242/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))
    expect(await screen.findByText('Curso de Games')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar assinatura' }))
    await waitFor(() => {
      expect(calls.some((call) => call.method === 'DELETE')).toBe(true)
      expect(
        calls.filter(
          (call) => call.path === '/api/payments/my/subscriptions' && call.method === 'GET',
        ),
      ).toHaveLength(2)
    })
    await waitFor(() => expect(screen.queryByText('Plano da família')).toBeNull())
  })

  test('falhas não deixam esqueleto nem derrubam a conta', async () => {
    installFetch((path) => {
      if (path === '/api/payments/my/subscriptions') return Response.json({ items: [] })
      if (path.startsWith('/api/payments/my?'))
        return Response.json({ error: { message: 'offline' } }, { status: 503 })
      throw new TypeError('offline')
    })
    render(
      <>
        <FamilyAiCredits />
        <WeeklyReportToggle />
        <PurchaseHistory />
      </>,
    )
    expect(await screen.findByText(/Nenhuma compra ainda/)).toBeTruthy()
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Ajuda da IA neste mês/ })).toBeNull()
      expect(screen.queryByRole('switch')).toBeNull()
    })
  })
})

describe('a Ajuda mora dentro da área dos pais', () => {
  test('passo a passo, perguntas e atendimento sem sair da área', () => {
    render(<HelpContent parentName="Helena" />)
    expect(screen.getByRole('heading', { name: 'Como preparar o acesso' })).toBeTruthy()
    expect(screen.getByText('O código não funcionou')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Abrir o atendimento/ }).getAttribute('href')).toBe(
      '/pais/ajuda/atendimento',
    )
    expect(screen.getByRole('link', { name: 'Esqueci minha senha' }).getAttribute('href')).toBe(
      '/esqueci-senha',
    )
    const nav = screen.getAllByRole('navigation', { name: 'Área dos pais' })[0] as HTMLElement
    expect(within(nav).getByRole('link', { name: 'Ajuda' }).getAttribute('aria-current')).toBe(
      'page',
    )
  })

  // Os endereços antigos seguem vivos: e-mails já enviados e o aviso de resposta do helpdesk
  // apontam para eles.
  test('os endereços antigos levam às páginas novas', () => {
    const read = (path: string) => readFileSync(join(import.meta.dir, '../src/app', path), 'utf8')
    expect(read('responsavel/page.tsx')).toContain("redirect('/pais/acompanhamento')")
    expect(read('responsavel/ajuda/page.tsx')).toContain("redirect('/pais/ajuda/atendimento')")
  })
})
