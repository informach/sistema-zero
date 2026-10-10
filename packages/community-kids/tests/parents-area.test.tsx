import { afterEach, describe, expect, mock, test } from 'bun:test'
import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ParentsClient } from '../src/app/pais/parents-client'
import { guideDismissedKey } from '../src/lib/guide'
import { COMUNIDADE_OFERTA_URL } from '../src/lib/links'
import type { ProfileAllowance } from '../src/lib/profile-allowance'
import type { ProfileView } from '../src/lib/types'

const originalFetch = globalThis.fetch
const profileId = '11111111-1111-4111-8111-111111111111'
const DAY = 86_400_000
const andre: ProfileView = {
  id: profileId,
  name: 'André',
  avatarUrl: null,
  whatsapp: null,
  birthDate: null,
  publicProfileEnabled: false,
  sortOrder: 0,
}
function grant(over: Partial<StudyGrantView> = {}): StudyGrantView {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    profileId,
    label: 'Computador de casa',
    expiresAt: new Date(Date.now() + 60 * DAY).toISOString(),
    revokedAt: null,
    lastUsedAt: null,
    ...over,
  }
}

/** Fetch de mentira: guarda os eventos do guia e responde as listas pedidas. */
function install(grants: () => StudyGrantView[] = () => []) {
  const events: Array<Record<string, unknown> & { action: string }> = []
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path === '/api/onboarding/events') {
        events.push(JSON.parse(String(init?.body)))
        return new Response(null, { status: 204 })
      }
      if (path.includes('/api/study/grants?')) return Response.json({ grants: grants() })
      if (path === '/api/study/prepare') return Response.json({ ok: true })
      if (path.includes('children-stats')) return Response.json({ children: [] })
      return Response.json({}, { status: 503 })
    }),
    { preconnect: originalFetch.preconnect },
  )
  return events
}
afterEach(() => {
  globalThis.fetch = originalFetch
})

function renderParents({
  profiles = [andre],
  access,
  allowance = { kind: 'limited', maxProfiles: 2 },
}: {
  profiles?: ProfileView[]
  access?: Record<string, StudyGrantView[] | null>
  allowance?: ProfileAllowance
} = {}) {
  return render(
    <ParentsClient
      accountId="parent"
      initialProfiles={profiles}
      avatarPhotoByProfile={{}}
      profileAllowance={allowance}
      initialAccess={access}
    />,
  )
}

describe('guia v3 dos pais segue o acesso REAL da família', () => {
  test('família que já preparou não lê "Vamos preparar" e fechar não é "pular"', async () => {
    const events = install(() => [grant()])
    renderParents({ access: { [profileId]: [grant()] } })
    await waitFor(() => expect(screen.getByText('Seus filhos')).toBeTruthy())
    expect(screen.queryByText(/Vamos preparar/)).toBeNull()
    expect(events.some((event) => event.action === 'welcome_opened')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Como preparar o acesso' }))
    expect(screen.getByText('O acesso está preparado')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }))
    await waitFor(() =>
      expect(events.map((event) => event.action)).toEqual([
        'guide_reopened',
        'welcome_opened',
        'tour_completed',
      ]),
    )
    expect(localStorage.getItem(guideDismissedKey('parent'))).toBe('1')
  })

  test('família sem acesso vê o guia; autorizar registra o acesso preparado', async () => {
    let authorized = false
    const events = install(() => (authorized ? [grant()] : []))
    renderParents({ access: { [profileId]: [] } })
    expect(
      await screen.findByText('Seu filho já tem perfil. Vamos preparar o acesso?'),
    ).toBeTruthy()
    await waitFor(() => expect(events.map((event) => event.action)).toContain('welcome_opened'))
    authorized = true
    fireEvent.click(screen.getByRole('button', { name: /Acesso nos aparelhos/ }))
    expect(await screen.findByText('O acesso está preparado')).toBeTruthy()
    await waitFor(() =>
      expect(events).toContainEqual({
        version: 'v3',
        audience: 'parent',
        action: 'access_prepared',
        step: 'access',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }))
    await waitFor(() => expect(events.map((event) => event.action)).toContain('tour_completed'))
    expect(events.map((event) => event.action)).not.toContain('tour_skipped')
  })

  test('recarregar não "desprepara": o estado vem do servidor, não do painel aberto', async () => {
    install(() => [grant()])
    const first = renderParents({ access: { [profileId]: [grant()] } })
    fireEvent.click(screen.getByRole('button', { name: 'Como preparar o acesso' }))
    expect(screen.getByText('O acesso está preparado')).toBeTruthy()
    first.unmount()
    renderParents({ access: { [profileId]: [grant()] } })
    fireEvent.click(screen.getByRole('button', { name: 'Como preparar o acesso' }))
    expect(screen.getByText('O acesso está preparado')).toBeTruthy()
  })

  test('consulta que falhou não pede para preparar o que talvez exista', async () => {
    const events = install()
    renderParents({ access: { [profileId]: null } })
    await waitFor(() => expect(screen.getByText('Seus filhos')).toBeTruthy())
    expect(screen.queryByText(/Vamos preparar/)).toBeNull()
    expect(events).toEqual([])
  })

  test('sem criança cadastrada, o primeiro passo é adicionar, não escolher', async () => {
    install()
    renderParents({ profiles: [], access: {} })
    expect(await screen.findByText('Vamos preparar a primeira entrada?')).toBeTruthy()
    expect(screen.getByText('1. Adicione a criança')).toBeTruthy()
    expect(screen.queryByText('1. Escolha a criança')).toBeNull()
  })
})

describe('área dos pais', () => {
  test('o cartão da criança avisa o vencimento próximo', () => {
    install()
    renderParents({
      access: { [profileId]: [grant({ expiresAt: new Date(Date.now() + 3 * DAY).toISOString() })] },
    })
    const card = screen.getByRole('heading', { name: 'André' }).closest('li') as HTMLElement
    expect(within(card).getByText('Vence em breve')).toBeTruthy()
    expect(within(card).getByText(/Computador de casa: até/)).toBeTruthy()
  })

  test('o cartão diz Vencido quando nenhum acesso segue valendo', () => {
    install()
    renderParents({
      access: { [profileId]: [grant({ expiresAt: new Date(Date.now() - DAY).toISOString() })] },
    })
    expect(screen.getByText('Vencido')).toBeTruthy()
  })

  test('o limite de perfis volta a explicar o plano e oferecer o caminho', () => {
    install()
    const view = renderParents({ allowance: { kind: 'unlimited' } })
    expect(screen.getByText('Perfis ilimitados neste acesso.')).toBeTruthy()
    view.unmount()
    const atLimit = renderParents({ allowance: { kind: 'limited', maxProfiles: 1 } })
    expect(screen.getByRole('link', { name: 'amplie o seu acesso' }).getAttribute('href')).toBe(
      COMUNIDADE_OFERTA_URL,
    )
    atLimit.unmount()
    renderParents({ allowance: { kind: 'unavailable' } })
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Abrir acompanhamento da família' }).getAttribute('href'),
    ).toBe('/responsavel')
  })

  test('abrir o painel leva o foco ao título; voltar devolve ao botão que abriu', async () => {
    install()
    renderParents({ access: { [profileId]: [] } })
    fireEvent.click(screen.getByRole('button', { name: /Acesso nos aparelhos/ }))
    await waitFor(() =>
      expect(document.activeElement?.textContent).toBe('Acesso de André nos aparelhos'),
    )
    fireEvent.click(screen.getByRole('button', { name: /Voltar aos filhos/ }))
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: /Acesso nos aparelhos/ }),
      ),
    )
  })

  test('as ações principais ficam em pílula de 44px', () => {
    install()
    renderParents({ access: { [profileId]: [] } })
    const nav = screen.getByRole('navigation', { name: 'Ações do responsável' })
    expect(nav.className).toContain('[&_button]:min-h-11')
    expect(
      within(nav).getByRole('button', { name: /Ir para a área do aluno/ }).className,
    ).toContain('min-h-11')
  })
})
