import { afterEach, describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProfileEditor } from '../src/app/pais/_components/profile-editor'
import { VoiceNewsCard } from '../src/app/pais/_components/voice-news-card'
import { ProfileForm } from '../src/components/kids/profile-management'
import { parentWelcomeSteps } from '../src/lib/guide'
import type { ProfileView } from '../src/lib/types'

/**
 * "Falar em vez de escrever" do lado dos pais (14/10/2026): a escolha nasce DESLIGADA (a
 * Política promete a opção mais protetiva por padrão), mora no formulário do perfil ao lado do
 * perfil público, diz quem vê o quê, e as famílias que já existem descobrem pela novidade na
 * Família. O microfone só é liberado para a própria origem.
 */

function perfil(extra: Partial<ProfileView> = {}): ProfileView {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Sofia',
    avatarUrl: null,
    whatsapp: null,
    birthDate: null,
    publicProfileEnabled: false,
    sortOrder: 0,
    ...extra,
  }
}

function salvar(container: HTMLElement) {
  const form = container.querySelector('form')
  if (!form) throw new Error('form semântico não renderizado')
  fireEvent.submit(form)
}

describe('formulário do perfil: a fala da criança', () => {
  it('com a fala disponível, a caixa aparece DESLIGADA e diz que só a equipe lê', () => {
    const onSave = mock(() => {})
    const { container } = render(
      <ProfileForm
        editing={{ mode: 'create' }}
        busy={false}
        voiceAvailable
        onCancel={() => {}}
        onSave={onSave}
        onArchive={() => {}}
      />,
    )
    const caixa = screen.getByRole('checkbox', {
      name: /Falar em vez de escrever \(recomendado\)/,
    }) as HTMLInputElement
    expect(caixa.checked).toBe(false)
    expect(container.textContent).toContain('ou o Zappy quando a dúvida é para ele')
    // O que garantimos é que NÓS não guardamos; e a fala vai a um serviço fora do Brasil.
    expect(container.textContent).toContain('nós não guardamos a gravação')
    expect(container.textContent).toContain('fora do Brasil')
    const politica = screen.getByRole('link', { name: /Política de Privacidade/ })
    expect(politica.getAttribute('href')).toBe('https://sistemazero.com.br/kids/privacidade')
    expect(politica.getAttribute('target')).toBe('_blank')
    // O perfil público também diz onde aparece.
    expect(container.textContent).toContain('nunca na internet aberta')

    fireEvent.change(screen.getByLabelText('Nome do perfil'), { target: { value: 'Sofia' } })
    salvar(container)
    expect(onSave).toHaveBeenLastCalledWith(
      { name: 'Sofia', birthDate: null, publicProfileEnabled: false, voiceInputEnabled: false },
      undefined,
    )

    fireEvent.click(caixa)
    salvar(container)
    expect(onSave).toHaveBeenLastCalledWith(
      { name: 'Sofia', birthDate: null, publicProfileEnabled: false, voiceInputEnabled: true },
      undefined,
    )
  })

  it('sem a fala no servidor, a caixa não existe e o valor nem vai no salvar', () => {
    const onSave = mock(() => {})
    const { container } = render(
      <ProfileForm
        editing={{ mode: 'create' }}
        busy={false}
        onCancel={() => {}}
        onSave={onSave}
        onArchive={() => {}}
      />,
    )
    expect(screen.queryByRole('checkbox', { name: /Falar em vez de escrever/ })).toBeNull()
    fireEvent.change(screen.getByLabelText('Nome do perfil'), { target: { value: 'Sofia' } })
    salvar(container)
    expect(onSave).toHaveBeenLastCalledWith(
      { name: 'Sofia', birthDate: null, publicProfileEnabled: false },
      undefined,
    )
  })

  it('na edição, a caixa abre com o que está gravado', () => {
    render(
      <ProfileForm
        editing={{ mode: 'edit', profile: perfil({ voiceInputEnabled: true }) }}
        busy={false}
        voiceAvailable
        onCancel={() => {}}
        onSave={() => {}}
        onArchive={() => {}}
      />,
    )
    const caixa = screen.getByRole('checkbox', {
      name: /Falar em vez de escrever/,
    }) as HTMLInputElement
    expect(caixa.checked).toBe(true)
  })
})

describe('o guia dos pais fala da fala só quando ela existe', () => {
  it('sem criança e com a fala no servidor, o passo de adicionar orienta a ligar', () => {
    const [primeiro] = parentWelcomeSteps({
      profilesCount: 0,
      canCreateProfile: true,
      voiceAvailable: true,
    })
    expect(primeiro?.text).toContain('Falar em vez de escrever')
    const [semFala] = parentWelcomeSteps({ profilesCount: 0, canCreateProfile: true })
    expect(semFala?.text).not.toContain('Falar')
  })
})

describe('novidade na Família', () => {
  const ACCOUNT = '99999999-9999-4999-8999-999999999999'

  it('mostra um atalho por criança com a fala desligada, até "Agora não"', async () => {
    const ligada = perfil({ id: 'a', name: 'Bia', voiceInputEnabled: true })
    const desligada = perfil({ id: 'b', name: 'Caio' })
    render(<VoiceNewsCard accountId={ACCOUNT} profiles={[ligada, desligada]} />)
    const atalho = await screen.findByRole('link', { name: 'Ligar a fala de Caio' })
    expect(atalho.getAttribute('href')).toBe('/pais/crianca/b/editar')
    expect(screen.queryByRole('link', { name: 'Ligar a fala de Bia' })).toBeNull()
    expect(screen.getByRole('heading').textContent).toContain('pode falar em vez de escrever')

    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
    expect(screen.queryByRole('link', { name: 'Ligar a fala de Caio' })).toBeNull()
    expect(localStorage.getItem(`sz:kids:pais:novidade-fala:${ACCOUNT}`)).toBe('1')
  })

  it('some quando todas as crianças já falam, e quando já foi dispensada neste navegador', async () => {
    const { container } = render(
      <VoiceNewsCard accountId={ACCOUNT} profiles={[perfil({ voiceInputEnabled: true })]} />,
    )
    await Promise.resolve()
    expect(container.textContent).toBe('')

    localStorage.setItem(`sz:kids:pais:novidade-fala:${ACCOUNT}`, '1')
    const segundo = render(<VoiceNewsCard accountId={ACCOUNT} profiles={[perfil()]} />)
    await Promise.resolve()
    expect(segundo.container.textContent).toBe('')
  })
})

describe('Permissions-Policy: o microfone só para a própria origem', () => {
  it('libera o microfone para a página (self) e mantém a câmera fechada', async () => {
    const mod = (await import('../next.config')) as {
      default: { headers?: () => Promise<unknown> }
    }
    const emitidos = JSON.stringify(await mod.default.headers?.())
    const politicas = [...emitidos.matchAll(/"Permissions-Policy","value":"([^"]*)"/g)].map(
      (m) => m[1] ?? '',
    )
    expect(politicas.length).toBeGreaterThan(0)
    for (const p of politicas) {
      expect(p).toContain('microphone=(self)')
      expect(p).not.toContain('microphone=*')
    }
    // A política GERAL (a primeira) segue com a câmera fechada: só uma rota própria (a sala das
    // oficinas ao vivo) pode abri-la, e não é a fala que decide isso.
    expect(politicas[0]).toContain('camera=()')
  })
})

describe('criar a criança com a fala marcada e login antigo', () => {
  const originalFetch = globalThis.fetch
  const originalAssign = window.location.assign
  afterEach(() => {
    globalThis.fetch = originalFetch
    window.location.assign = originalAssign
  })

  it('o perfil é criado sem a fala e a página da criança explica como ligar', async () => {
    const corpos: Array<Record<string, unknown>> = []
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const corpo = JSON.parse(String(init?.body))
      corpos.push(corpo)
      if (corpo.voiceInputEnabled === true)
        return Response.json(
          { error: { code: 'PARENT_REAUTH_REQUIRED', message: 'Entre de novo.' } },
          { status: 403 },
        )
      return Response.json({ profile: perfil({ id: 'nova', name: 'Sofia' }) })
    }) as typeof fetch
    const destinos: string[] = []
    window.location.assign = ((url: string | URL) => {
      destinos.push(String(url))
    }) as typeof window.location.assign

    const { container } = render(<ProfileEditor voiceAvailable />)
    fireEvent.change(screen.getByLabelText('Nome do perfil'), { target: { value: 'Sofia' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Falar em vez de escrever/ }))
    salvar(container)

    await waitFor(() => expect(destinos).toHaveLength(1))
    expect(corpos.map((c) => c.voiceInputEnabled)).toEqual([true, false])
    expect(corpos[0]?.requestId).toMatch(/^[a-f0-9-]{36}$/)
    expect(corpos[1]?.requestId).toBe(corpos[0]?.requestId)
    expect(corpos[1]?.name).toBe('Sofia')
    expect(destinos[0]).toBe('/pais/crianca/nova?aviso=fala-entrar')
  })
})
