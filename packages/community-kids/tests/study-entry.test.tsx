import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StudentEntry } from '../src/components/kids/student-entry'
import { StudyDeviceManager } from '../src/components/kids/study-device-manager'
import { SupportProfileSelector } from '../src/components/kids/support-profile-selector'
import { CONNECTION_MESSAGE } from '../src/lib/study-access-client'
import { accessEndPreviewPhrase } from '../src/lib/study-access-view'

const originalFetch = globalThis.fetch
const profileId = '11111111-1111-4111-8111-111111111111'
const siblingId = '22222222-2222-4222-8222-222222222222'
const grantId = '33333333-3333-4333-8333-333333333333'
const otherGrantId = '66666666-6666-4666-8666-666666666666'
const DAY = 86_400_000
function install(
  handler: (
    path: string,
    body: Record<string, unknown>,
    method: string,
  ) => Response | Promise<Response>,
) {
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, init?: RequestInit) =>
      handler(
        String(input),
        typeof init?.body === 'string' ? JSON.parse(init.body) : {},
        init?.method ?? 'GET',
      ),
    ),
    { preconnect: originalFetch.preconnect },
  )
}
function grant(over: Partial<StudyGrantView> = {}): StudyGrantView {
  return {
    id: grantId,
    profileId,
    label: 'Computador de casa',
    expiresAt: new Date(Date.now() + 60 * DAY).toISOString(),
    revokedAt: null,
    lastUsedAt: null,
    ...over,
  }
}
const profiles = [
  { id: profileId, name: 'André', available: true, expiresAt: null, revoked: false },
  { id: siblingId, name: 'Débora', available: false, expiresAt: null, revoked: false },
]
afterEach(() => {
  globalThis.fetch = originalFetch
})

async function renderManager(onGrants = mock(() => {})) {
  render(
    <StudyDeviceManager
      profileId={profileId}
      name="André"
      accountId="parent"
      onGrants={onGrants}
    />,
  )
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Autorizar aparelho' }).hasAttribute('disabled'),
    ).toBe(false),
  )
  return onGrants
}

describe('entrada da criança', () => {
  test('o suporte escolhe o perfil sem preparar aparelho nem pedir código dos pais', async () => {
    const paths: string[] = []
    install((path) => {
      paths.push(path)
      return Response.json({}, { status: 503 })
    })
    render(
      <SupportProfileSelector
        profiles={[{ id: profileId, name: 'André' }]}
        actorName="Equipe"
        familyName="Helena"
        mode="readonly"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'André' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(paths).toEqual([`/api/profiles/${profileId}/select`])
    expect(Boolean(screen.queryByLabelText('Código de acesso'))).toBe(false)
  })

  test('navegador novo pede o código de acesso, sem e-mail ou senha do responsável', async () => {
    install(() => Response.json({ ok: true }))
    await act(async () => {
      render(<StudentEntry profiles={[]} />)
    })
    expect(screen.getByLabelText('Código de acesso')).toBeTruthy()
    expect(screen.queryByLabelText('E-mail')).toBeNull()
    expect(screen.queryByLabelText('Senha')).toBeNull()
    expect(screen.getByRole('button', { name: 'Entrar para criar' }).hasAttribute('disabled')).toBe(
      true,
    )
  })

  test('escolher irmã sem autorização pede o código dela, com o erro preso ao campo', async () => {
    const requests: Array<{ path: string; body: Record<string, unknown> }> = []
    install((path, body) => {
      requests.push({ path, body })
      return path.endsWith('/redeem')
        ? Response.json({ error: { code: 'STUDY_ACCESS_REQUIRED' } }, { status: 403 })
        : Response.json({ ok: true })
    })
    render(<StudentEntry profiles={profiles} />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Débora/ }).hasAttribute('disabled')).toBe(false),
    )
    fireEvent.click(screen.getByRole('button', { name: /Débora/ }))
    expect(screen.getByText(/Digite o código para entrar como Débora/)).toBeTruthy()
    const field = screen.getByLabelText('Código de acesso')
    fireEvent.change(field, { target: { value: 'ABCDE-FGHJK' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar para criar' }))
    const alert = await screen.findByRole('alert')
    expect(alert.id).toBe('study-code-error')
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(field.getAttribute('aria-describedby')).toContain('study-code-error')
    // O código digitado continua lá para corrigir.
    expect((field as HTMLInputElement).value).toBe('ABCDE-FGHJK')
    expect(
      requests.find((request) => request.path.endsWith('/redeem'))?.body.expectedProfileId,
    ).toBe(siblingId)
    expect(requests.some((request) => request.path.endsWith('/enter'))).toBe(false)
  })

  test('a criança não tem como remover o acesso dos irmãos neste aparelho', async () => {
    const paths: string[] = []
    install((path) => {
      paths.push(path)
      return Response.json({ ok: true })
    })
    render(<StudentEntry profiles={profiles} />)
    await waitFor(() => expect(paths).toContain('/api/study/prepare'))
    expect(screen.queryByText(/Remover/)).toBeNull()
    expect(paths.some((path) => path.includes('/forget'))).toBe(false)
  })

  test('escolher um perfil mostra "Entrando…" no cartão e não envia duas vezes', async () => {
    const enters: string[] = []
    install((path) => {
      if (path.endsWith('/enter')) {
        enters.push(path)
        return new Promise<Response>(() => {})
      }
      return Response.json({ ok: true })
    })
    render(<StudentEntry profiles={profiles} />)
    const card = await screen.findByRole('button', { name: /André/ })
    await waitFor(() => expect(card.hasAttribute('disabled')).toBe(false))
    fireEvent.click(card)
    fireEvent.click(card)
    expect(within(card).getByText('Entrando…')).toBeTruthy()
    expect(card.getAttribute('aria-busy')).toBe('true')
    expect(enters).toHaveLength(1)
  })

  test('internet fora mostra a frase de conexão, nunca o erro do navegador', async () => {
    install((path) =>
      path.endsWith('/enter')
        ? Promise.reject(new TypeError('Failed to fetch'))
        : Response.json({ ok: true }),
    )
    render(<StudentEntry profiles={profiles} />)
    const card = await screen.findByRole('button', { name: /André/ })
    await waitFor(() => expect(card.hasAttribute('disabled')).toBe(false))
    fireEvent.click(card)
    expect((await screen.findByRole('alert')).textContent).toBe(CONNECTION_MESSAGE)
    expect(screen.queryByText(/Failed to fetch/)).toBeNull()
  })

  test('código com a internet fora não marca o campo como errado', async () => {
    install((path) =>
      path.endsWith('/redeem')
        ? new Response('<html>Bad gateway</html>', { status: 502 })
        : Response.json({ ok: true }),
    )
    await act(async () => {
      render(<StudentEntry profiles={[]} />)
    })
    const field = screen.getByLabelText('Código de acesso')
    fireEvent.change(field, { target: { value: 'ABCDE-FGHJK' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar para criar' }))
    expect((await screen.findByRole('alert')).textContent).toBe(CONNECTION_MESSAGE)
    expect(field.getAttribute('aria-invalid')).toBeNull()
  })

  test('"Voltar aos perfis" devolve o foco ao cartão que abriu o código', async () => {
    install(() => Response.json({ ok: true }))
    render(<StudentEntry profiles={profiles} />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Débora/ }).hasAttribute('disabled')).toBe(false),
    )
    fireEvent.click(screen.getByRole('button', { name: /Débora/ }))
    fireEvent.click(screen.getByRole('button', { name: /Voltar aos perfis/ }))
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /Débora/ })),
    )
  })
})

describe('painel de aparelhos na área dos pais', () => {
  test('autorizar o aparelho atual mostra a data antes, o resumo e a confirmação real', async () => {
    let created = false
    let submitted: Record<string, unknown> | undefined
    const current = grant({
      label: 'Notebook da sala',
      expiresAt: '2099-10-10T12:00:00Z',
      isCurrentDevice: true,
    })
    install((path, body) => {
      if (path.includes('/grants?')) return Response.json({ grants: created ? [current] : [] })
      if (path.endsWith('/grants')) {
        created = true
        submitted = body
        return Response.json({ grant: current })
      }
      return Response.json({ ok: true })
    })
    const onGrants = await renderManager()
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar aparelho' }))
    fireEvent.click(screen.getByRole('radio', { name: /^Neste aparelho/ }))
    fireEvent.change(screen.getByLabelText('Nome do aparelho'), {
      target: { value: 'Notebook da sala' },
    })
    fireEvent.click(screen.getByRole('radio', { name: '7 dias' }))
    // A data de término e o resumo aparecem ANTES de confirmar.
    expect(screen.getByText(`Termina ${accessEndPreviewPhrase(7)}.`)).toBeTruthy()
    const summary = screen.getByText('Resumo').parentElement as HTMLElement
    expect(within(summary).getByText('André')).toBeTruthy()
    expect(within(summary).getByText('Notebook da sala')).toBeTruthy()
    expect(within(summary).getByText(/^7 dias, termina/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar este aparelho' }))
    expect(
      await screen.findByText(/Este navegador está liberado para André até 10 de out\. de 2099/),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /Ir para a área da criança/ })).toBeTruthy()
    expect(submitted).toEqual({
      profileId,
      label: 'Notebook da sala',
      durationDays: 7,
      mode: 'current',
    })
    expect(onGrants).toHaveBeenLastCalledWith(profileId, [current])
  })

  test('Cancelar descarta o rascunho: o formulário não volta sozinho', async () => {
    const draftKey = `sz:access-draft:parent:${profileId}`
    sessionStorage.setItem(
      draftKey,
      JSON.stringify({ mode: 'current', label: 'Notebook', duration: 7 }),
    )
    install((path) =>
      path.includes('/grants?') ? Response.json({ grants: [] }) : Response.json({ ok: true }),
    )
    const view = render(
      <StudyDeviceManager
        profileId={profileId}
        name="André"
        accountId="parent"
        onGrants={() => {}}
      />,
    )
    expect(await screen.findByLabelText('Nome do aparelho')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(sessionStorage.getItem(draftKey)).toBeNull()
    view.unmount()
    await renderManager()
    expect(screen.queryByLabelText('Nome do aparelho')).toBeNull()
  })

  test('renovar mostra o que muda, tem Cancelar e não mexe no prazo do formulário', async () => {
    const patches: Array<Record<string, unknown>> = []
    install((path, body, method) => {
      if (path.includes('/grants?')) return Response.json({ grants: [grant()] })
      if (method === 'PATCH') {
        patches.push(body)
        return Response.json({ ok: true })
      }
      return Response.json({ ok: true })
    })
    await renderManager()
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar aparelho' }))
    fireEvent.click(screen.getByRole('radio', { name: '7 dias' }))
    fireEvent.click(screen.getByRole('button', { name: 'Renovar prazo' }))
    const dialog = screen.getByRole('dialog', { name: 'Renovar prazo' })
    expect(within(dialog).getByText('André')).toBeTruthy()
    expect(within(dialog).getByText('Computador de casa')).toBeTruthy()
    expect(within(dialog).getByText(/^Até /)).toBeTruthy()
    fireEvent.change(within(dialog).getByLabelText('Novo prazo, a partir de hoje'), {
      target: { value: '30' },
    })
    expect(
      within(dialog).getByText(`Nova data: termina ${accessEndPreviewPhrase(30)}.`),
    ).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog', { name: 'Renovar prazo' })).toBeNull()
    expect((screen.getByRole('radio', { name: '7 dias' }) as HTMLInputElement).checked).toBe(true)
    expect(patches).toEqual([])
    // Reaberto, o diálogo nasce no prazo padrão e confirma só o que foi escolhido nele.
    fireEvent.click(screen.getByRole('button', { name: 'Renovar prazo' }))
    const again = screen.getByRole('dialog', { name: 'Renovar prazo' })
    expect(
      (within(again).getByLabelText('Novo prazo, a partir de hoje') as HTMLSelectElement).value,
    ).toBe('90')
    fireEvent.click(within(again).getByRole('button', { name: 'Confirmar novo prazo' }))
    await waitFor(() => expect(patches).toEqual([{ action: 'renew', durationDays: 90 }]))
    expect((screen.getByRole('radio', { name: '7 dias' }) as HTMLInputElement).checked).toBe(true)
  })

  test('o código vem com o endereço do ambiente e sai da tela quando a criança entra', async () => {
    const happy = (window as unknown as { happyDOM?: { setURL(url: string): void } }).happyDOM
    const previousUrl = window.location.href
    happy?.setURL('https://kids.sistemazero.com.br/pais')
    let joined = false
    install((path) => {
      if (path.includes('/grants?'))
        return Response.json({
          grants: joined ? [grant({ id: otherGrantId, label: 'PC da sala' })] : [],
        })
      if (path.endsWith('/grants'))
        return Response.json({
          code: 'ABCDE-FGHJK',
          codeExpiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        })
      return Response.json({ ok: true })
    })
    try {
      await renderManager()
      fireEvent.click(screen.getByRole('button', { name: 'Autorizar aparelho' }))
      fireEvent.click(screen.getByRole('button', { name: 'Gerar código' }))
      expect(((await screen.findByLabelText('Código para copiar')) as HTMLInputElement).value).toBe(
        'ABCDE-FGHJK',
      )
      expect(
        ((await screen.findByLabelText('Endereço da plataforma')) as HTMLInputElement).value,
      ).toBe('kids.sistemazero.com.br')
      expect(screen.getByText(/Depois de usar o código, o acesso dura pelo prazo/)).toBeTruthy()
      // Ainda não entrou: o painel diz e o código fica.
      fireEvent.click(screen.getByRole('button', { name: 'Conferir se a criança já entrou' }))
      expect(await screen.findByText(/Ainda não\./)).toBeTruthy()
      joined = true
      fireEvent.click(screen.getByRole('button', { name: 'Conferir se a criança já entrou' }))
      expect(await screen.findByText(/Pronto! André já entrou em PC da sala/)).toBeTruthy()
      expect(screen.queryByLabelText('Código para copiar')).toBeNull()
    } finally {
      happy?.setURL(previousUrl)
    }
  })

  test('cada acesso mostra Vence em breve e Vencido, com alvos de 44px', async () => {
    install((path) =>
      path.includes('/grants?')
        ? Response.json({
            grants: [
              grant({
                label: 'Notebook da avó',
                expiresAt: new Date(Date.now() + 2 * DAY).toISOString(),
              }),
              grant({
                id: otherGrantId,
                label: 'Tablet',
                expiresAt: new Date(Date.now() - DAY).toISOString(),
              }),
            ],
          })
        : Response.json({ ok: true }),
    )
    await renderManager()
    expect(screen.getByText('Vence em breve')).toBeTruthy()
    expect(screen.getByText('Vencido')).toBeTruthy()
    // Alvos de toque de 44px: o Renovar e o menu de cada aparelho.
    for (const renew of screen.getAllByRole('button', { name: 'Renovar prazo' }))
      expect(renew.className).toContain('h-11')
    for (const more of screen.getAllByRole('button', { name: /^Mais opções de / }))
      expect(more.className).toContain('min-h-11')
  })

  test('oferece nova tentativa quando a lista carrega mas a preparação do navegador falha', async () => {
    let attempts = 0
    install((path) => {
      if (path.includes('/grants?')) return Response.json({ grants: [] })
      attempts++
      return attempts === 1 ? Response.json({}, { status: 503 }) : Response.json({ ok: true })
    })
    render(
      <StudyDeviceManager
        profileId={profileId}
        name="André"
        accountId="parent"
        onGrants={() => {}}
      />,
    )
    expect(await screen.findByRole('alert')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Autorizar aparelho' }).hasAttribute('disabled'),
      ).toBe(false),
    )
    expect(attempts).toBe(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('uma autorização remota não afirma que o navegador atual está liberado', async () => {
    install((path) =>
      path.includes('/grants?')
        ? Response.json({
            grants: [grant({ label: 'Notebook da criança', isCurrentDevice: false })],
          })
        : Response.json({ ok: true }),
    )
    await renderManager()
    expect(screen.getByText('Liberado')).toBeTruthy()
    expect(Boolean(screen.queryByText(/próprio perfil neste aparelho/))).toBe(false)
    expect(screen.getByText(/No aparelho autorizado/)).toBeTruthy()
  })

  test('o "Ir para a área da criança" da confirmação faz a troca segura', async () => {
    const replace = spyOn(window.location, 'replace').mockImplementation(() => {})
    const paths: string[] = []
    const current = grant({ isCurrentDevice: true })
    let created = false
    install((path) => {
      paths.push(path)
      if (path.includes('/grants?')) return Response.json({ grants: created ? [current] : [] })
      if (path.endsWith('/grants')) {
        created = true
        return Response.json({ grant: current })
      }
      return Response.json({ ok: true })
    })
    try {
      await renderManager()
      fireEvent.click(screen.getByRole('button', { name: 'Autorizar aparelho' }))
      fireEvent.click(screen.getByRole('radio', { name: /^Neste aparelho/ }))
      fireEvent.click(screen.getByRole('button', { name: 'Autorizar este aparelho' }))
      fireEvent.click(await screen.findByRole('button', { name: /Ir para a área da criança/ }))
      await waitFor(() => expect(replace).toHaveBeenCalledWith('/perfis'))
      expect(paths).toContain('/api/study/leave')
    } finally {
      replace.mockRestore()
    }
  })
})

describe('o painel percebe a criança que voltou a um navegador já conhecido', () => {
  test('reautorizar o mesmo perfil no mesmo navegador conserva o id e ainda tira o código', async () => {
    const expired = grant({ expiresAt: new Date(Date.now() - DAY).toISOString() })
    let renewed = false
    install((path) => {
      if (path.includes('/grants?'))
        return Response.json({
          grants: [renewed ? { ...expired, expiresAt: grant().expiresAt } : expired],
        })
      if (path.endsWith('/grants'))
        return Response.json({
          code: 'ABCDE-FGHJK',
          codeExpiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        })
      return Response.json({ ok: true })
    })
    await renderManager()
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar aparelho' }))
    fireEvent.click(screen.getByRole('button', { name: 'Gerar código' }))
    expect(await screen.findByLabelText('Código para copiar')).toBeTruthy()
    renewed = true
    fireEvent.click(screen.getByRole('button', { name: 'Conferir se a criança já entrou' }))
    expect(await screen.findByText(/Pronto! André já entrou em Computador de casa/)).toBeTruthy()
    expect(screen.queryByLabelText('Código para copiar')).toBeNull()
  })
})
