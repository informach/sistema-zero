import { afterEach, describe, expect, mock, test } from 'bun:test'
import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { archiveProfile } from '../src/app/pais/_components/remove-profile'
import { ChildClient } from '../src/app/pais/crianca/[id]/child-client'
import { PARENT_SECTIONS } from '../src/app/pais/parent-routes'
import { ParentsClient } from '../src/app/pais/parents-client'
import { guideDismissedKey, guideWelcomeSeenKey } from '../src/lib/guide'
import { comunidadeContinuarUrl } from '../src/lib/links'
import type { ProfileAllowance } from '../src/lib/profile-allowance'
import { StudyRequestError } from '../src/lib/study-access-client'
import type { ChildDashboardView, ProfileView } from '../src/lib/types'

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
const stats: ChildDashboardView = {
  profileId,
  name: 'André',
  avatarUrl: null,
  xp: 1240,
  streak: { current: 5, best: 9 },
  badgesCount: 8,
  coursesInProgress: 1,
  coursesCompleted: 2,
  projectsCount: 3,
  submissionsCount: 3,
  rankingPosition: 4,
  week: {
    xpEarned: 90,
    lessonsCompleted: 3,
    quizzesPassed: 1,
    badgesUnlocked: 1,
    projectsSubmitted: 0,
    submissionsSubmitted: 0,
  },
  games: [],
}

/** Fetch de mentira: guarda os eventos do guia e responde as listas pedidas. */
function install(
  grants: () => StudyGrantView[] = () => [],
  children: ChildDashboardView[] | null = [],
) {
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
      if (path.includes('children-stats'))
        return children ? Response.json({ children }) : Response.json({}, { status: 503 })
      return Response.json({}, { status: 503 })
    }),
    { preconnect: originalFetch.preconnect },
  )
  return events
}
afterEach(() => {
  globalThis.fetch = originalFetch
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})

function renderFamily({
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
      parentName="Helena"
      initialProfiles={profiles}
      avatarPhotoByProfile={{}}
      profileAllowance={allowance}
      initialAccess={access}
    />,
  )
}

describe('o guia v3 dos pais segue o acesso REAL da família', () => {
  test('família que já preparou não lê "Vamos preparar" e nenhum evento sai', async () => {
    const events = install(() => [grant()])
    renderFamily({ access: { [profileId]: [grant()] } })
    await waitFor(() => expect(screen.getByText('Suas crianças')).toBeTruthy())
    expect(screen.queryByText(/Vamos preparar/)).toBeNull()
    expect(screen.queryByText('O acesso está preparado')).toBeNull()
    expect(events).toEqual([])
  })

  test('família sem acesso vê o guia; fechar é "pular" e o guia não volta', async () => {
    const events = install()
    const first = renderFamily({ access: { [profileId]: [] } })
    expect(
      await screen.findByText('Seu filho já tem perfil. Vamos preparar o acesso?'),
    ).toBeTruthy()
    await waitFor(() => expect(events.map((event) => event.action)).toContain('welcome_opened'))
    // O guia leva direto à página da criança, e o mesmo pedido não se repete logo abaixo.
    expect(
      screen.getByRole('link', { name: 'Preparar o acesso de André' }).getAttribute('href'),
    ).toBe(`/pais/crianca/${profileId}`)
    expect(screen.queryByRole('region', { name: 'Precisa da sua atenção' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar orientação' }))
    await waitFor(() => expect(events.map((event) => event.action)).toContain('tour_skipped'))
    expect(localStorage.getItem(guideDismissedKey('parent'))).toBe('1')
    first.unmount()
    renderFamily({ access: { [profileId]: [] } })
    await waitFor(() => expect(screen.getByText('Suas crianças')).toBeTruthy())
    expect(screen.queryByText(/Vamos preparar/)).toBeNull()
  })

  test('a abertura do guia conta UMA vez, mesmo voltando à Família várias vezes', async () => {
    const events = install()
    const first = renderFamily({ access: { [profileId]: [] } })
    await waitFor(() => expect(events.map((event) => event.action)).toContain('welcome_opened'))
    first.unmount()
    renderFamily({ access: { [profileId]: [] } })
    expect(await screen.findByText(/Vamos preparar o acesso/)).toBeTruthy()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(events.filter((event) => event.action === 'welcome_opened')).toHaveLength(1)
  })

  test('voltar com o acesso pronto depois de começar o guia mostra "O acesso está preparado"', async () => {
    const events = install(() => [grant()])
    localStorage.setItem(guideWelcomeSeenKey('parent'), '1')
    renderFamily({ access: { [profileId]: [grant()] } })
    expect(await screen.findByText('O acesso está preparado')).toBeTruthy()
    // O arremate diz o que fazer agora, sem repetir os três passos.
    expect(screen.getByText(/No aparelho autorizado, a criança clica em/)).toBeTruthy()
    expect(screen.queryByText('2. Autorize o aparelho')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }))
    await waitFor(() => expect(events.map((event) => event.action)).toEqual(['tour_completed']))
  })

  test('consulta que falhou não pede para preparar o que talvez exista', async () => {
    const events = install()
    renderFamily({ access: { [profileId]: null } })
    await waitFor(() => expect(screen.getByText('Suas crianças')).toBeTruthy())
    expect(screen.queryByText(/Vamos preparar/)).toBeNull()
    expect(screen.queryByText('Precisa da sua atenção')).toBeNull()
    expect(events).toEqual([])
  })

  test('sem criança cadastrada, o primeiro passo é adicionar, não escolher', async () => {
    install()
    renderFamily({ profiles: [], access: {} })
    expect(await screen.findByText('Vamos preparar a primeira entrada?')).toBeTruthy()
    expect(screen.getByText('1. Adicione a criança')).toBeTruthy()
    expect(screen.queryByText('1. Escolha a criança')).toBeNull()
    const guide = screen.getByRole('region', { name: 'Vamos preparar a primeira entrada?' })
    expect(
      within(guide).getByRole('link', { name: 'Adicionar criança' }).getAttribute('href'),
    ).toBe('/pais/nova-crianca')
  })
})

describe('a Família', () => {
  test('a barra leva às quatro seções e o passo a passo não sai da área dos pais', async () => {
    install()
    renderFamily({ access: { [profileId]: [grant()] } })
    const nav = screen.getAllByRole('navigation', { name: 'Área dos pais' })[0] as HTMLElement
    for (const section of PARENT_SECTIONS)
      expect(within(nav).getByRole('link', { name: section.label }).getAttribute('href')).toBe(
        section.href,
      )
    expect(within(nav).getByRole('link', { name: 'Família' }).getAttribute('aria-current')).toBe(
      'page',
    )
    // O relato de 11/10/2026: o passo a passo levava à ajuda do LOGIN, sem caminho de volta.
    expect(
      screen.getByRole('link', { name: /Ver o passo a passo completo/ }).getAttribute('href'),
    ).toBe('/pais/ajuda')
    expect(screen.getByRole('button', { name: /Ir para a área da criança/ })).toBeTruthy()
  })

  test('o que pede ação vem primeiro: sem aparelho, vencendo e vencido', () => {
    install()
    // Com o guia fechado: aberto, o "sem aparelho" é dele.
    localStorage.setItem(guideDismissedKey('parent'), '1')
    const view = renderFamily({ access: { [profileId]: [] } })
    let attention = screen.getByRole('region', { name: 'Precisa da sua atenção' })
    expect(within(attention).getByText('André ainda não tem aparelho autorizado.')).toBeTruthy()
    expect(
      within(attention).getByRole('link', { name: 'Preparar acesso' }).getAttribute('href'),
    ).toBe(`/pais/crianca/${profileId}`)
    view.unmount()
    renderFamily({
      access: { [profileId]: [grant({ expiresAt: new Date(Date.now() + 3 * DAY).toISOString() })] },
    })
    attention = screen.getByRole('region', { name: 'Precisa da sua atenção' })
    expect(within(attention).getByText(/no aparelho Computador de casa termina em/)).toBeTruthy()
    expect(within(attention).getByRole('link', { name: 'Renovar prazo' })).toBeTruthy()
  })

  test('o cartão da criança avisa o vencimento e mostra a semana', async () => {
    install(() => [], [stats])
    renderFamily({
      access: { [profileId]: [grant({ expiresAt: new Date(Date.now() + 3 * DAY).toISOString() })] },
    })
    const card = screen.getByRole('heading', { name: 'André' }).closest('li') as HTMLElement
    expect(within(card).getByText('Vence em breve')).toBeTruthy()
    expect(within(card).getByText(/Computador de casa: até/)).toBeTruthy()
    expect(await within(card).findByText('1.240')).toBeTruthy()
    expect(within(card).getByText(/3 aulas concluídas e 1 medalha nova\./)).toBeTruthy()
    expect(
      within(card)
        .getByRole('link', { name: /Acesso nos aparelhos/ })
        .getAttribute('href'),
    ).toBe(`/pais/crianca/${profileId}`)
    expect(
      within(card)
        .getByRole('link', { name: /Ver progresso/ })
        .getAttribute('href'),
    ).toBe(`/pais/crianca/${profileId}?aba=progresso`)
  })

  test('o cartão diz Vencido quando nenhum acesso segue valendo', () => {
    install()
    renderFamily({
      access: { [profileId]: [grant({ expiresAt: new Date(Date.now() - DAY).toISOString() })] },
    })
    expect(screen.getByText('Vencido')).toBeTruthy()
  })

  test('a fase do link que trouxe o responsável segue até a página da criança', () => {
    install()
    render(
      <ParentsClient
        accountId="parent"
        parentName="Helena"
        initialProfiles={[andre]}
        avatarPhotoByProfile={{}}
        profileAllowance={{ kind: 'limited', maxProfiles: 2 }}
        initialAccess={{ [profileId]: [grant()] }}
        studentDestination="/cursos/cade/aulas/1"
      />,
    )
    expect(screen.getByRole('link', { name: /Acesso nos aparelhos/ }).getAttribute('href')).toBe(
      `/pais/crianca/${profileId}?aluno=%2Fcursos%2Fcade%2Faulas%2F1`,
    )
  })

  test('o limite de perfis explica o plano e oferece o caminho', () => {
    install()
    const free = renderFamily({ allowance: { kind: 'limited', maxProfiles: 2 } })
    expect(screen.getByRole('link', { name: /Adicionar criança/ }).getAttribute('href')).toBe(
      '/pais/nova-crianca',
    )
    expect(screen.getByText('1 de 2 perfis do seu plano')).toBeTruthy()
    free.unmount()
    const unlimited = renderFamily({ allowance: { kind: 'unlimited' } })
    expect(screen.getByText('Perfis ilimitados neste acesso.')).toBeTruthy()
    unlimited.unmount()
    const atLimit = renderFamily({ allowance: { kind: 'limited', maxProfiles: 1 } })
    expect(screen.queryByRole('link', { name: /Adicionar criança/ })).toBeNull()
    expect(screen.getByRole('link', { name: 'amplie o seu acesso' }).getAttribute('href')).toBe(
      comunidadeContinuarUrl('pais-limite-perfis'),
    )
    atLimit.unmount()
    // No teto da Comunidade (o assinante), assinar de novo não abre vaga: o caminho é o Atendimento.
    const comunidade = renderFamily({
      profiles: [andre, { ...andre, id: 'outra-crianca', name: 'Bia' }],
      allowance: { kind: 'limited', maxProfiles: 2 },
    })
    expect(screen.queryByRole('link', { name: 'amplie o seu acesso' })).toBeNull()
    expect(
      screen.getByRole('link', { name: 'fale com a gente no Atendimento' }).getAttribute('href'),
    ).toBe('/pais/ajuda/atendimento')
    comunidade.unmount()
    renderFamily({ allowance: { kind: 'unavailable' } })
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })
})

describe('a página da criança', () => {
  function renderChild(familyReady: boolean | null, initialTab: 'acesso' | 'progresso' = 'acesso') {
    return render(
      <ChildClient
        accountId="parent"
        parentName="Helena"
        profile={andre}
        photoUrl={null}
        initialTab={initialTab}
        familyReady={familyReady}
      />,
    )
  }

  test('o primeiro acesso vivo da família registra o passo do guia, uma vez', async () => {
    const events = install(() => [grant()])
    renderChild(false)
    expect(await screen.findByText('Computador de casa')).toBeTruthy()
    await waitFor(() =>
      expect(events).toContainEqual({
        version: 'v3',
        audience: 'parent',
        action: 'access_prepared',
        step: 'access',
      }),
    )
    expect(events.filter((event) => event.action === 'access_prepared')).toHaveLength(1)
  })

  test('família que já tinha acesso não registra o passo de novo', async () => {
    const events = install(() => [grant()])
    renderChild(true)
    expect(await screen.findByText('Computador de casa')).toBeTruthy()
    expect(events.map((event) => event.action)).not.toContain('access_prepared')
  })

  test('as abas trocam entre o acesso e o progresso, e o endereço acompanha', async () => {
    install(() => [], [stats])
    renderChild(true)
    expect(
      screen.getByRole('tab', { name: /Acesso nos aparelhos/ }).getAttribute('aria-selected'),
    ).toBe('true')
    fireEvent.click(screen.getByRole('tab', { name: /Progresso/ }))
    expect(await screen.findByText('Esta semana')).toBeTruthy()
    expect(window.location.search).toBe('?aba=progresso')
    fireEvent.click(screen.getByRole('tab', { name: /Acesso nos aparelhos/ }))
    expect(window.location.search).toBe('')
  })

  test('as setas trocam de aba e os dois painéis ficam montados', async () => {
    install(() => [grant()], [stats])
    renderChild(true)
    const acesso = screen.getByRole('tab', { name: /Acesso nos aparelhos/ })
    expect(acesso.getAttribute('tabindex')).toBe('0')
    fireEvent.keyDown(acesso, { key: 'ArrowRight' })
    const progresso = screen.getByRole('tab', { name: /Progresso/ })
    expect(progresso.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(progresso)
    // O painel de aparelhos segue montado (escondido): trocar de aba não apaga o código gerado.
    const painelAcesso = document.getElementById('painel-acesso') as HTMLElement
    expect(painelAcesso.hidden).toBe(true)
    expect(await within(painelAcesso).findByText('Computador de casa')).toBeTruthy()
    fireEvent.keyDown(progresso, { key: 'Home' })
    expect(acesso.getAttribute('aria-selected')).toBe('true')
  })

  test('com a fase do link, a volta à Família a leva junto', () => {
    install()
    render(
      <ChildClient
        accountId="parent"
        parentName="Helena"
        profile={andre}
        photoUrl={null}
        initialTab="acesso"
        familyReady={true}
        studentDestination="/cursos/cade/aulas/1"
      />,
    )
    const main = screen.getByRole('main')
    expect(within(main).getByRole('link', { name: 'Família' }).getAttribute('href')).toBe(
      '/pais?aluno=%2Fcursos%2Fcade%2Faulas%2F1',
    )
  })

  test('sem data de nascimento, um convite opcional leva ao formulário', () => {
    install()
    renderChild(true)
    expect(
      screen.getByText(
        'Informe a data de nascimento para a plataforma avisar você quando André completar 18 anos.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Informar a data' }).getAttribute('href')).toBe(
      `/pais/crianca/${profileId}/editar`,
    )
    expect(screen.queryByRole('region', { name: 'Aviso dos 18 anos' })).toBeNull()
  })

  test('aos 18 anos o perfil segue e o aviso mostra a área adulta e o arquivamento', async () => {
    const calls: Array<{ path: string; method: string }> = []
    install()
    const listas = globalThis.fetch
    globalThis.fetch = Object.assign(
      mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input)
        const method = init?.method ?? 'GET'
        calls.push({ path, method })
        if (method === 'DELETE') return new Response(null, { status: 409 })
        return listas(input, init)
      }),
      { preconnect: originalFetch.preconnect },
    )
    const year = new Date().getFullYear() - 19
    render(
      <ChildClient
        accountId="parent"
        parentName="Helena"
        profile={{ ...andre, birthDate: `${year}-01-01` }}
        photoUrl={null}
        initialTab="acesso"
        familyReady={true}
      />,
    )
    const aviso = screen.getByRole('region', { name: 'Aviso dos 18 anos' })
    expect(aviso.textContent).toContain(
      'André fez 18 anos. O perfil Kids continua funcionando enquanto a sua assinatura estiver ativa, com os projetos que já estão aqui. Agora André também pode ter uma conta própria na área adulta, que começa nova e usa o mesmo Estúdio.',
    )
    expect(
      within(aviso)
        .getByRole('link', { name: /Conhecer a área adulta/ })
        .getAttribute('href'),
    ).toBe(
      'https://sistemazero.com.br/pro/comunidade-dos-criadores/oferta/continuar?utm_source=plataforma&utm_medium=app&utm_content=pais-perfil-18',
    )
    expect(screen.queryByText(/Informe a data de nascimento/)).toBeNull()
    // Arquivar passa pela MESMA confirmação do editor antes de qualquer pedido.
    fireEvent.click(within(aviso).getByRole('button', { name: 'Arquivar perfil' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Arquivar perfil')).toBeTruthy()
    expect(dialog.textContent).toContain(
      'Arquivar o perfil de André? Ele sai da sua conta e libera a vaga do plano, e André deixa de entrar com ele. O progresso e os projetos ficam guardados, mas não aparecem mais na plataforma.',
    )
    // O perfil de quem fez 18 anos não é chamado de criança.
    expect(dialog.textContent).not.toContain('criança')
    expect(calls.some((call) => call.method === 'DELETE')).toBe(false)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Arquivar' }))
    await waitFor(() =>
      expect(calls).toContainEqual({ path: `/api/profiles/${profileId}`, method: 'DELETE' }),
    )
  })

  test('arquivar com login antigo leva o código do servidor (o atalho "Entrar de novo")', async () => {
    globalThis.fetch = Object.assign(
      mock(async () =>
        Response.json({ error: { code: 'PARENT_REAUTH_REQUIRED' } }, { status: 403 }),
      ),
      { preconnect: originalFetch.preconnect },
    )
    const reauth = await archiveProfile(profileId).catch((error: unknown) => error)
    expect(reauth).toBeInstanceOf(StudyRequestError)
    expect((reauth as StudyRequestError).code).toBe('PARENT_REAUTH_REQUIRED')

    globalThis.fetch = Object.assign(
      mock(async () => new Response('<html>erro</html>', { status: 502 })),
      { preconnect: originalFetch.preconnect },
    )
    const failed = await archiveProfile(profileId).catch((error: unknown) => error)
    expect(failed).toBeInstanceOf(StudyRequestError)
    expect((failed as StudyRequestError).code).toBe('PROFILE_ARCHIVE_FAILED')
    expect((failed as StudyRequestError).message).toBe(
      'Não foi possível arquivar o perfil. Tente novamente.',
    )
  })

  test('volta à Família e edita o perfil por endereços próprios', () => {
    install()
    renderChild(true)
    const main = screen.getByRole('main')
    expect(within(main).getByRole('link', { name: 'Família' }).getAttribute('href')).toBe('/pais')
    expect(
      within(main)
        .getByRole('link', { name: /Editar perfil/ })
        .getAttribute('href'),
    ).toBe(`/pais/crianca/${profileId}/editar`)
  })
})
