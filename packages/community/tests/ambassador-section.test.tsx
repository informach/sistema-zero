import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { AmbassadorEnrollmentView } from '../src/lib/types'

/**
 * Embaixador em Meu perfil (20/10/2026): os estados do cartão do Kids na voz do adulto, com as
 * peças deste app, e a rota que só aceita a conta adulta própria.
 */

const getSession = mock()
const upstream = {
  GET: mock(async () => new Response('get')),
  POST: mock(async () => new Response('post')),
}
mock.module('server-only', () => ({}))
mock.module('@/server/session', () => ({ getSession }))
mock.module('@/server/shell', () => ({ shell: { routes: { ambassadorMe: upstream } } }))

const { AmbassadorSection, AMBASSADOR_TERMS } = await import(
  '../src/components/community/profile/ambassador-section'
)
const { isOwnAdultAccountSession, requireOwnAdultAccount } = await import(
  '../src/server/own-account'
)
const route = await import('../src/app/api/embaixador/route')

const enrolled = (
  over: Partial<NonNullable<AmbassadorEnrollmentView['ambassador']>> = {},
  rest: Partial<AmbassadorEnrollmentView> = {},
): AmbassadorEnrollmentView => ({
  enrolled: true,
  ambassador: {
    code: 'marta-1',
    status: 'active',
    pageUrl: 'https://funil.test/embaixador/tok',
    shareUrl: 'https://funil.test/bolsa/marta-1',
    shareUrls: {
      kids: 'https://funil.test/bolsa/marta-1',
      adult: 'https://funil.test/bolsa/marta-1-adulto',
    },
    pixKeySet: true,
    ...over,
  },
  stats: { redemptionsCompleted: 4, invitesSent: 0 },
  bonus: { amountCents: 3000, eligibleCount: 0, paidCount: 0 },
  ...rest,
})

const html = (view: AmbassadorEnrollmentView) =>
  renderToStaticMarkup(<AmbassadorSection initial={view} />)

describe('seção Embaixador', () => {
  test('sem cadastro: os dois presentes, o valor do serviço, os termos e o botão', () => {
    const out = html({ enrolled: false, bonus: { amountCents: 4500 } })
    expect(out).toContain('id="embaixador"')
    expect(out).toContain('sz-card')
    expect(out).toContain('a um adulto que quer criar o próprio jogo')
    expect(out).toContain('família com criança de 9 a 14 anos')
    expect(out).toMatch(/agradecimento de R\$\s45,00 por/)
    expect(out).toContain(AMBASSADOR_TERMS)
    expect(out).toContain('Quero ser embaixador(a)')
    expect(out).not.toContain('Copiar link')
  })

  test('sem valor do serviço, a frase não inventa número', () => {
    const out = html({ enrolled: false })
    expect(out).toContain('você recebe um agradecimento por')
    expect(out).not.toContain('R$')
  })

  test('cadastrado: resgates e os dois links, o do adulto primeiro', () => {
    const out = html(enrolled())
    expect(out).toContain('Você é embaixador(a) do Sistema Zero')
    expect(out).toContain('4 presentes resgatados pelos seus links. O bônus e a chave Pix')
    const adult = out.indexOf('Copiar link para um adulto')
    const family = out.indexOf('Copiar link para uma família')
    expect(adult).toBeGreaterThan(-1)
    expect(family).toBeGreaterThan(adult)
    expect(out).toContain('class="sz-btn-outline"')
    expect(out).toContain('href="https://funil.test/embaixador/tok"')
    expect(out).toContain('Abrir minha página')
  })

  test('referrals antigo, sem shareUrls: só o link da família', () => {
    const out = html(enrolled({ shareUrls: undefined }))
    expect(out).toContain('Copiar link para uma família')
    expect(out).not.toContain('Copiar link para um adulto')
  })

  test('bônus liberado sem chave Pix: o aviso aparece', () => {
    const out = html(
      enrolled({ pixKeySet: false }, { bonus: { amountCents: 3000, eligibleCount: 1 } }),
    )
    expect(out).toContain('1 bônus a caminho ou pago')
    expect(out).toContain('Falta a sua chave Pix')
  })

  test('pausado: recado com o Atendimento e nenhum link', () => {
    const out = html(enrolled({ status: 'paused' }))
    expect(out).toContain('está pausada no momento')
    expect(out).toContain('href="/ajuda#atendimento"')
    expect(out).not.toContain('Copiar link')
    expect(out).not.toContain('Quero ser embaixador(a)')
  })

  test('e-mail já cadastrado: manda procurar o e-mail, sem link nem botão', () => {
    const out = html({ enrolled: false, emailPending: true, linkEmailSent: true })
    expect(out).toContain('Já existe um cadastro de embaixador com o seu e-mail')
    expect(out).not.toContain('Copiar link')
    expect(out).not.toContain('Quero ser embaixador(a)')
  })
})

describe('rota api/embaixador: só a conta adulta própria', () => {
  beforeEach(() => {
    getSession.mockReset()
    upstream.GET.mockClear()
    upstream.POST.mockClear()
  })
  const account = { id: 'u1', email: 'marta@example.com', firstName: 'Marta', lastName: 'S' }
  const req = () => new Request('https://comunidade.test/api/embaixador', { method: 'POST' })

  test('sem sessão, perfil ou claim do Kids: recusa antes do serviço', async () => {
    const handler = mock(async () => new Response('ok'))
    const cases: [unknown, number][] = [
      [null, 401],
      [{ ...account, activeProfile: { accountId: 'u1' } }, 403],
      [{ ...account, kids: { kind: 'parent', sessionId: 's', authenticatedAt: 1 } }, 403],
    ]
    for (const [session, status] of cases) {
      getSession.mockResolvedValue(session)
      expect((await requireOwnAdultAccount(handler)(req(), {})).status).toBe(status)
    }
    expect(handler).not.toHaveBeenCalled()
  })

  test('GET e POST recusam toda sessão de suporte, até no modo escrita', async () => {
    // A leitura traz o `pageUrl` (capability-URL que troca a chave Pix): também fica fechada.
    for (const mode of ['readonly', 'write'] as const) {
      getSession.mockResolvedValue({ ...account, act: { sub: 'admin-1', mode } })
      for (const res of [await route.GET(req(), {}), await route.POST(req(), {})]) {
        expect(res.status).toBe(403)
        expect((await res.json()).error.code).toBe('IMPERSONATION_FORBIDDEN')
      }
    }
    expect(upstream.GET).not.toHaveBeenCalled()
    expect(upstream.POST).not.toHaveBeenCalled()
  })

  test('a própria conta lê e se cadastra pela rota', async () => {
    getSession.mockResolvedValue(account)
    expect(await (await route.GET(req(), {})).text()).toBe('get')
    expect(await (await route.POST(req(), {})).text()).toBe('post')
    expect(upstream.GET).toHaveBeenCalledTimes(1)
    expect(upstream.POST).toHaveBeenCalledTimes(1)
  })

  test('a página só lê a inscrição na sessão da própria conta', () => {
    expect(isOwnAdultAccountSession(account)).toBe(true)
    expect(isOwnAdultAccountSession(null)).toBe(false)
    expect(
      isOwnAdultAccountSession({ ...account, act: { sub: 'admin-1', mode: 'readonly' } }),
    ).toBe(false)
    expect(isOwnAdultAccountSession({ ...account, activeProfile: { accountId: 'u1' } })).toBe(false)
    expect(isOwnAdultAccountSession({ ...account, kids: { kind: 'parent' } })).toBe(false)
  })
})
