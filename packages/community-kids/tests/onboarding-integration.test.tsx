import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import {
  childGuideAvatarDismissedKey,
  childGuideStartDismissedKey,
  childGuideWelcomeSeenKey,
  guideDismissedKey,
  guideWelcomeSeenKey,
  readGuideFlag,
  writeGuideFlag,
  writeSessionGuideFlag,
} from '../src/lib/guide'

const refresh = mock(() => {})
mock.module('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const { PerfisClient } = await import('../src/app/perfis/perfis-client')
const { ChildGuide } = await import('../src/components/kids/child-guide')

const originalFetch = globalThis.fetch

function installFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  globalThis.fetch = Object.assign(mock(handler), { preconnect: originalFetch.preconnect })
}

const profile = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Sofia',
  avatarUrl: null,
  whatsapp: null,
  birthDate: null,
  publicProfileEnabled: false,
  sortOrder: 0,
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('tour guiado da criança — fluxo real', () => {
  it('não monta o live region atrás do modal e mantém a volta para a home no CTA do avatar', async () => {
    const events: Array<{ action?: string; version?: string }> = []
    installFetch(async (input, init) => {
      if (String(input) === '/api/onboarding/events' && typeof init?.body === 'string') {
        events.push(JSON.parse(init.body))
      }
      return new Response(null, { status: 204 })
    })
    render(
      <ChildGuide
        profileKey="perfil-1"
        childName="Ana"
        hasAvatar={false}
        hasCourseActivity={false}
        startAvailable
      />,
    )

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(readGuideFlag(childGuideWelcomeSeenKey('perfil-1'))).toBe(false)
    const mountedLiveRegionBehindDialog = screen.queryByRole('status') !== null
    fireEvent.click(screen.getByRole('button', { name: /Vamos lá/ }))
    expect(mountedLiveRegionBehindDialog).toBe(false)
    expect(readGuideFlag(childGuideWelcomeSeenKey('perfil-1'))).toBe(true)

    const avatarCta = await screen.findByRole('link', { name: 'Criar meu avatar' })
    expect(avatarCta.getAttribute('href')).toBe('/meu-avatar?returnTo=%2F')
    expect(avatarCta.getAttribute('aria-describedby')).toBe('child-avatar-guide')
    expect(document.getElementById('child-avatar-guide')?.textContent).toContain(
      'montar o SEU avatar',
    )
    expect(document.activeElement).toBe(avatarCta)
    expect(screen.getByRole('button', { name: 'Como funciona?' })).toBeTruthy()
    await waitFor(() => {
      expect(events.some((event) => event.action === 'welcome_opened')).toBe(true)
      expect(events.some((event) => event.action === 'welcome_completed')).toBe(true)
      expect(events.every((event) => event.version === 'v2')).toBe(true)
    })
  })

  it('Como funciona restaura passos dispensados sem depender de limpar o navegador', async () => {
    writeGuideFlag(childGuideWelcomeSeenKey('perfil-1'))
    writeGuideFlag(childGuideStartDismissedKey('perfil-1'))
    writeSessionGuideFlag(childGuideAvatarDismissedKey('perfil-1'))
    installFetch(async () => new Response(null, { status: 204 }))

    render(
      <ChildGuide
        profileKey="perfil-1"
        childName="Ana"
        hasAvatar={false}
        hasCourseActivity={false}
        startAvailable
      />,
    )

    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Como funciona?' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Vamos lá/ }))
    expect(await screen.findByRole('link', { name: 'Criar meu avatar' })).toBeTruthy()
  })
})

describe('tour guiado dos pais — transições reais', () => {
  it('não monta o live region atrás do modal de boas-vindas', async () => {
    render(
      <PerfisClient
        initialProfiles={[]}
        avatarPhotoByProfile={{}}
        isProfileSession={false}
        parentVerified={false}
        profileAllowance={{ kind: 'limited', maxProfiles: 2 }}
        guideKey="conta-1"
      />,
    )

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(readGuideFlag(guideWelcomeSeenKey('conta-1'))).toBe(false)
    const mountedLiveRegionBehindDialog = screen.queryByRole('status') !== null
    fireEvent.click(screen.getByRole('button', { name: /Vamos lá/ }))
    expect(mountedLiveRegionBehindDialog).toBe(false)
    expect(readGuideFlag(guideWelcomeSeenKey('conta-1'))).toBe(true)
    const parentArea = screen.getByRole('button', { name: 'Área dos pais' })
    expect(parentArea.getAttribute('aria-describedby')).toBe('parent-area-guide')
    expect(document.getElementById('parent-area-guide')?.textContent).toContain('Área dos pais')
    await waitFor(() => expect(document.activeElement).toBe(parentArea))
  })

  it('libera novamente o gate quando a verificação da senha falha por rede', async () => {
    writeGuideFlag(guideWelcomeSeenKey('conta-1'))
    writeGuideFlag(guideDismissedKey('conta-1'))
    installFetch(async (input) => {
      if (String(input) === '/api/parents/verify') throw new TypeError('offline')
      return new Response(null, { status: 204 })
    })

    render(
      <PerfisClient
        initialProfiles={[]}
        avatarPhotoByProfile={{}}
        isProfileSession={false}
        parentVerified={false}
        profileAllowance={{ kind: 'limited', maxProfiles: 2 }}
        guideKey="conta-1"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Área dos pais' }))
    fireEvent.change(screen.getByLabelText('Senha do responsável'), {
      target: { value: 'senha-segura' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Entrar' }).hasAttribute('disabled')).toBe(false),
    )
  })

  it('após remover o último perfil sem allowance entra no estado terminal correto', async () => {
    writeGuideFlag(guideDismissedKey('conta-1'))
    installFetch(async (input, init) => {
      if (String(input) === '/api/parents/children-stats') {
        return Response.json({ children: [] })
      }
      if (String(input).includes('/api/profiles/') && init?.method === 'DELETE') {
        return new Response(null, { status: 200 })
      }
      return new Response(null, { status: 204 })
    })

    render(
      <PerfisClient
        initialProfiles={[profile]}
        avatarPhotoByProfile={{}}
        isProfileSession={false}
        parentVerified
        startManaging
        profileAllowance={{ kind: 'none' }}
        guideKey="conta-1"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sofia' }))
    fireEvent.click(screen.getByRole('button', { name: /Remover/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover' }))

    expect(
      await screen.findByRole('heading', { name: 'Nenhum perfil liberado ainda' }),
    ).toBeTruthy()
  })

  it('Como funciona adapta o conteúdo para uma família que já possui perfil', async () => {
    render(
      <PerfisClient
        initialProfiles={[profile]}
        avatarPhotoByProfile={{}}
        isProfileSession={false}
        parentVerified={false}
        profileAllowance={{ kind: 'limited', maxProfiles: 1 }}
        guideKey="conta-1"
      />,
    )

    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Como funciona?' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    const mentionsCreation = screen.queryByText(/cria o perfil do seu filho/i) !== null
    const explainsSelection = screen.queryByText(/escolha quem vai aprender/i) !== null
    fireEvent.click(screen.getByRole('button', { name: /Vamos lá/ }))
    expect(mentionsCreation).toBe(false)
    expect(explainsSelection).toBe(true)
  })
})
