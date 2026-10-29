import { describe, expect, mock, test } from 'bun:test'
import { ValidationError } from '@sistemazero/core/errors'
import { UnauthorizedError } from '@sistemazero/core/http'
import { JOURNEY_LEVEL_SLUGS } from '@sistemazero/core/journey'
import { Elysia } from 'elysia'
import { KidsJourneyUnavailableError } from '../src/domain/kids-journey/kids-journey.errors'
import {
  ProjectCheckBusyError,
  ProjectCheckRejectedError,
  ProjectCheckUnavailableError,
  StudioProjectSyncingError,
} from '../src/domain/learning/learning.errors'
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
  objetivos?: unknown
  aulas?: unknown
  saldo?: unknown
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
        objetivos: (over.objetivos ?? { analisar: mock(), verificar: mock() }) as never,
        aulas: over.aulas as never,
        saldo: over.saldo as never,
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

const postar = (caminho: string, corpo: unknown, chave: string | null = token) =>
  new Request(`http://local/members/internal/arquipelago${caminho}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(chave ? { 'x-arquipelago-token': chave } : {}),
    },
    body: JSON.stringify(corpo),
  })
const projeto = { formatVersion: 2, name: 'Desafio', files: {} }
const objetivo = {
  id: 'repetir',
  label: 'Use o bloco repetir',
  rule: { type: 'usesBlock', blockType: 'sz_js_repeat' },
}
const pedidoDeAnalise = {
  audience: 'kids',
  projetoInicial: projeto,
  gabarito: projeto,
  objetivos: [objetivo],
}
const pedidoDeVerificacao = {
  requester: userId,
  audience: 'kids',
  objetivos: [objetivo],
  projetoInicial: projeto,
  projeto,
}
const analiseVazia = {
  blocosDoGabarito: [],
  blocosDesconhecidos: [],
  vista: [],
  problemas: [],
  gabarito: [],
  inicial: [],
}

test('objetivos exigem o token de leitura (nem ausente, nem o das moedas)', async () => {
  const analisar = mock(async () => analiseVazia)
  const verificar = mock(async () => ({ passou: true, resultados: [] }))
  const { app } = criar({ objetivos: { analisar, verificar } })
  for (const [caminho, corpo] of [
    ['/objetivos/analisar', pedidoDeAnalise],
    ['/objetivos/verificar', pedidoDeVerificacao],
  ] as const) {
    expect((await app.handle(postar(caminho, corpo, null))).status).toBe(401)
    expect((await app.handle(postar(caminho, corpo, tokenDasMoedas))).status).toBe(401)
  }
  expect(analisar).toHaveBeenCalledTimes(0)
  expect(verificar).toHaveBeenCalledTimes(0)
})

test('analisar valida o corpo e devolve a análise do serviço', async () => {
  const analisar = mock(async () => analiseVazia)
  const { app } = criar({ objetivos: { analisar, verificar: mock() } })
  for (const ruim of [
    { ...pedidoDeAnalise, audience: 'teen' },
    { ...pedidoDeAnalise, gabarito: 'texto' },
    { ...pedidoDeAnalise, objetivos: [{ ...objetivo, rule: 'x' }] },
    { ...pedidoDeAnalise, objetivos: [{ ...objetivo, id: 'x'.repeat(81) }] },
  ])
    expect((await app.handle(postar('/objetivos/analisar', ruim))).status).toBe(400)
  const ok = await app.handle(postar('/objetivos/analisar', pedidoDeAnalise))
  expect(ok.status).toBe(200)
  expect(await ok.json()).toEqual(analiseVazia)
  expect(analisar).toHaveBeenCalledWith(pedidoDeAnalise)
})

test('verificar traduz os erros do verificador (400, 409, 424, 429)', async () => {
  const casos: [unknown, number, string][] = [
    [new ValidationError('Este projeto não é do tipo deste desafio.'), 400, 'VALIDATION_ERROR'],
    [new ProjectCheckRejectedError('regra impossível'), 400, 'PROJECT_CHECK_REJECTED'],
    [new StudioProjectSyncingError(), 409, 'STUDIO_PROJECT_SYNCING'],
    [new ProjectCheckUnavailableError(), 424, 'PROJECT_CHECK_UNAVAILABLE'],
    [new ProjectCheckBusyError(), 429, 'PROJECT_CHECK_BUSY'],
  ]
  for (const [erro, status, code] of casos) {
    const { app } = criar({
      objetivos: {
        analisar: mock(),
        verificar: async () => {
          throw erro
        },
      },
    })
    const res = await app.handle(postar('/objetivos/verificar', pedidoDeVerificacao))
    expect(res.status).toBe(status)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(code)
  }
  const quebrado = criar({
    objetivos: {
      analisar: mock(),
      verificar: async () => {
        throw new Error('banco fora')
      },
    },
  })
  expect(
    (await quebrado.app.handle(postar('/objetivos/verificar', pedidoDeVerificacao))).status,
  ).toBe(500)
})

test('verificar valida o corpo e repassa o pedido', async () => {
  const verificar = mock(async () => ({
    passou: true,
    resultados: [{ id: 'repetir', passou: true }],
  }))
  const { app } = criar({ objetivos: { analisar: mock(), verificar } })
  for (const ruim of [
    { ...pedidoDeVerificacao, requester: 'nao-e-uuid' },
    { ...pedidoDeVerificacao, objetivos: [] },
    { ...pedidoDeVerificacao, projeto: null },
  ])
    expect((await app.handle(postar('/objetivos/verificar', ruim))).status).toBe(400)
  const ok = await app.handle(postar('/objetivos/verificar', pedidoDeVerificacao))
  expect(await ok.json()).toEqual({ passou: true, resultados: [{ id: 'repetir', passou: true }] })
  expect(verificar).toHaveBeenCalledWith(pedidoDeVerificacao)
})

describe('aulas concluídas (a volta ao curso dos pais, 29/10/2026)', () => {
  const lia = '11111111-1111-4111-8111-111111111111'
  const tom = '22222222-2222-4222-8222-222222222222'
  const pedir = (query: string, chave = token) =>
    new Request(`http://local/members/internal/arquipelago/aulas-concluidas?${query}`, {
      headers: { 'x-arquipelago-token': chave },
    })
  const janela = 'de=2026-10-22T03:00:00.000Z&ate=2026-10-29T03:00:00.000Z'

  test('repassa pessoas e janela ao serviço e devolve o formato do contrato', async () => {
    const resposta = { usuarios: [{ userId: lia, concluidasEm: ['2026-10-26T15:00:00.000Z'] }] }
    const concluidas = mock(async () => resposta)
    const { app } = criar({ aulas: { concluidas } })
    const res = await app.handle(pedir(`usuarios=${lia},${tom}&${janela}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(resposta)
    expect(concluidas).toHaveBeenCalledWith({
      usuarios: [lia, tom],
      de: new Date('2026-10-22T03:00:00.000Z'),
      ate: new Date('2026-10-29T03:00:00.000Z'),
    })
  })

  test('exige o token de leitura; pedido malformado é 400; sem a leitura ligada, 424', async () => {
    const concluidas = mock(async () => ({ usuarios: [] }))
    const { app } = criar({ aulas: { concluidas } })
    expect((await app.handle(pedir(`usuarios=${lia}&${janela}`, tokenDasMoedas))).status).toBe(401)
    for (const q of [
      janela,
      `usuarios=nao-e-uuid&${janela}`,
      `usuarios=${lia}&de=ontem&ate=hoje`,
      `usuarios=${Array.from({ length: 21 }, () => lia).join(',')}&${janela}`,
    ])
      expect((await app.handle(pedir(q))).status).toBe(400)
    expect(concluidas).toHaveBeenCalledTimes(0)
    const desligada = criar({})
    expect((await desligada.app.handle(pedir(`usuarios=${lia}&${janela}`))).status).toBe(424)
  })

  test('janela fora do limite do serviço vira 400', async () => {
    const concluidas = mock(async () => {
      throw new ValidationError('Janela fora do limite')
    })
    const { app } = criar({ aulas: { concluidas } })
    expect((await app.handle(pedir(`usuarios=${lia}&${janela}`))).status).toBe(400)
  })
})

describe('saldo (a galeria do Arquipélago, 29/10/2026)', () => {
  const lia = '11111111-1111-4111-8111-111111111111'
  const pedir = (query: string, chave = token) =>
    new Request(`http://local/members/internal/arquipelago/saldo?${query}`, {
      headers: { 'x-arquipelago-token': chave },
    })

  test('lê o saldo da pessoa no público dela', async () => {
    const getBalance = mock(async () => 85)
    const { app } = criar({ saldo: { getBalance } })
    const res = await app.handle(pedir(`userId=${lia}&accountId=${lia}&audience=kids`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ saldo: 85 })
    expect(getBalance).toHaveBeenCalledWith(lia, 'kids')
  })

  test('token das moedas não lê; pergunta malformada é 400; sem a leitura, 424', async () => {
    const getBalance = mock(async () => 0)
    const { app } = criar({ saldo: { getBalance } })
    const q = `userId=${lia}&accountId=${lia}&audience=kids`
    expect((await app.handle(pedir(q, tokenDasMoedas))).status).toBe(401)
    expect((await app.handle(pedir(`userId=x&accountId=${lia}&audience=kids`))).status).toBe(400)
    expect(getBalance).toHaveBeenCalledTimes(0)
    expect((await criar({}).app.handle(pedir(q))).status).toBe(424)
  })
})
