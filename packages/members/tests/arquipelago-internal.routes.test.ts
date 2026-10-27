import { expect, mock, test } from 'bun:test'
import { UnauthorizedError } from '@sistemazero/core/http'
import { JOURNEY_LEVEL_SLUGS } from '@sistemazero/core/journey'
import { Elysia } from 'elysia'
import { KidsJourneyUnavailableError } from '../src/domain/kids-journey/kids-journey.errors'
import { arquipelagoCoinsRoutes } from '../src/interfaces/http/routes/arquipelago-coins.routes'
import { arquipelagoInternalRoutes } from '../src/interfaces/http/routes/arquipelago-internal.routes'

const token = 'token-de-leitura-do-jogo-exclusivo-e-longo'
const tokenDasMoedas = 'token-das-moedas-que-nao-serve-para-leitura'
const get = (chave?: string) =>
  new Request('http://local/members/internal/arquipelago/jornada', {
    headers: chave ? { 'x-arquipelago-token': chave } : {},
  })

function criar(over: {
  staffPreview?: () => Promise<{ policyVersion: number }>
  policy?: () => Promise<{ version: number; policy: { stages: { id: string; title: string }[] } }>
  configurado?: string
  leituras?: unknown
}) {
  const staffPreview = mock(over.staffPreview ?? (async () => ({ policyVersion: 4 })))
  const policy = mock(
    over.policy ??
      (async () => ({
        version: 2,
        policy: { stages: [{ id: 'aprendiz', title: 'Aprendiz' }] },
      })),
  )
  const app = new Elysia()
    .onError({ as: 'global' }, ({ error, set }) => {
      if (error instanceof UnauthorizedError) {
        set.status = 401
        return { error: 'unauthorized' }
      }
    })
    // As duas portas no mesmo prefixo: cada uma confere só o próprio token.
    .use(arquipelagoCoinsRoutes({ repository: { movimentar: mock() }, token: tokenDasMoedas }))
    .use(
      arquipelagoInternalRoutes({
        kidsJourney: { staffPreview } as never,
        adultJourney: { policy } as never,
        leituras: (over.leituras ?? { jogador: mock(), curriculoDeBlocos: mock() }) as never,
        token: 'configurado' in over ? over.configurado : token,
      }),
    )
  return { app, staffPreview, policy }
}

test('jornada exige o token de leitura (nem ausente, nem o das moedas)', async () => {
  const { app, staffPreview } = criar({})
  expect((await app.handle(get())).status).toBe(401)
  expect((await app.handle(get('errado'))).status).toBe(401)
  expect((await app.handle(get(tokenDasMoedas))).status).toBe(401)
  expect(staffPreview).toHaveBeenCalledTimes(0)
  const semToken = criar({ configurado: undefined })
  expect((await semToken.app.handle(get(token))).status).toBe(401)
})

test('jornada devolve os postos do Kids e as etapas do adulto', async () => {
  const { app } = criar({})
  const res = await app.handle(get(token))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({
    kids: { versao: 4, postos: [...JOURNEY_LEVEL_SLUGS] },
    adulto: { versao: 2, configurada: true, etapas: [{ id: 'aprendiz', titulo: 'Aprendiz' }] },
  })
})

test('Kids sem política publicada responde versão 0; outra falha não vira "não publicada"', async () => {
  const naoPublicada = criar({
    staffPreview: async () => {
      throw new KidsJourneyUnavailableError()
    },
    policy: async () => ({ version: 0, policy: { stages: [] } }),
  })
  expect(await (await naoPublicada.app.handle(get(token))).json()).toEqual({
    kids: { versao: 0, postos: [] },
    adulto: { versao: 0, configurada: false, etapas: [] },
  })
  const bancoFora = criar({
    staffPreview: async () => {
      throw new Error('conexão recusada')
    },
  })
  expect((await bancoFora.app.handle(get(token))).status).toBe(500)
})

const userId = '7a1f3c4e-2b8d-4c6a-9e1f-0d2c3b4a5e6f'
const accountId = '1b2c3d4e-5f60-4718-9a2b-3c4d5e6f7a8b'
const ler = (caminho: string, chave = token) =>
  new Request(`http://local/members/internal/arquipelago${caminho}`, {
    headers: { 'x-arquipelago-token': chave },
  })

test('jogador valida a pergunta, devolve posto e blocos e traduz a jornada indisponível', async () => {
  const jogador = mock(async () => ({ posicao: 2, total: 8, blocos: ['move_right'] }))
  const { app } = criar({ leituras: { jogador, curriculoDeBlocos: mock() } })
  expect((await app.handle(ler('/jogador?userId=x&accountId=y&audience=kids'))).status).toBe(400)
  const ok = await app.handle(ler(`/jogador?userId=${userId}&accountId=${accountId}&audience=kids`))
  expect(await ok.json()).toEqual({ posicao: 2, total: 8, blocos: ['move_right'] })
  expect(jogador).toHaveBeenCalledWith({ userId, accountId, audience: 'kids' })
  const fora = criar({
    leituras: {
      jogador: async () => {
        throw new KidsJourneyUnavailableError()
      },
      curriculoDeBlocos: mock(),
    },
  })
  expect(
    (await fora.app.handle(ler(`/jogador?userId=${userId}&accountId=${accountId}&audience=kids`)))
      .status,
  ).toBe(424)
  expect((await app.handle(ler('/jogador', tokenDasMoedas))).status).toBe(401)
})

test('currículo de blocos exige o público', async () => {
  const curriculoDeBlocos = mock(async () => ({ versao: 1, cursos: [], catalogo: [] }))
  const { app } = criar({ leituras: { jogador: mock(), curriculoDeBlocos } })
  expect((await app.handle(ler('/curriculo-de-blocos'))).status).toBe(400)
  expect((await app.handle(ler('/curriculo-de-blocos?audience=adult'))).status).toBe(200)
  expect(curriculoDeBlocos).toHaveBeenCalledWith('adult')
})
