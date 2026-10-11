import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import {
  childGuideAvatarDismissedKey,
  childGuideStartDismissedKey,
  childGuideWelcomeSeenKey,
  readGuideFlag,
  writeGuideFlag,
  writeSessionGuideFlag,
} from '../src/lib/guide'

// ⚠️ Mock SUPERCONJUNTO: ver o comentário em `profile-entry-states.test.tsx`. Um
// mock que só devolve `useRouter` quebra o link de quem importa `usePathname`.
const nav = await import('next/navigation')
const refresh = mock(() => {})
mock.module('next/navigation', () => ({ ...nav, useRouter: () => ({ refresh }) }))

const { ChildGuide } = await import('../src/components/kids/child-guide')

const originalFetch = globalThis.fetch

function installFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  globalThis.fetch = Object.assign(mock(handler), { preconnect: originalFetch.preconnect })
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

  /**
   * ⚠️ A queixa da usuária (14/08): quem já montou o avatar e já estudou apertava
   * "Como funciona", lia uma linha e o "Vamos lá" fechava sem nada acontecer. Agora a modal
   * carrega a explicação do app, e o botão não promete mais movimento nenhum.
   */
  it('quem já fez tudo recebe a explicação do app, e o botão não promete o que não vem', async () => {
    installFetch(async () => new Response(null, { status: 204 }))

    render(
      <ChildGuide
        profileKey="perfil-1"
        childName="Ana"
        hasAvatar
        hasCourseActivity
        startAvailable
      />,
    )

    // Nada a guiar → a modal NÃO abre sozinha.
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Como funciona?' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getAllByRole('listitem').length).toBeGreaterThan(3)
    expect(dialog.textContent).toContain('Estúdio')
    expect(dialog.textContent).toContain('Mural')
    expect(screen.queryByRole('button', { name: /Vamos lá/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Entendi!' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    // Sem balão para revelar: fechar não deixa a criança olhando para o nada.
    expect(screen.queryByRole('link', { name: 'Criar meu avatar' })).toBeNull()
  })
})
