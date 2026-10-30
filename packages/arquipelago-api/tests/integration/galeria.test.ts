import { beforeEach, describe, expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  GALERIA,
  GaleriaDoJogadorSchema,
  type PosseDaGaleria,
  type ResultadoDaCompraDaGaleria,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDaGaleria } from '../../src/application/servico-da-galeria'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import type { PoliticaDeAcesso } from '../../src/domain/acesso'
import { type PortaDaPosse, PosseIndisponivelError } from '../../src/domain/posse.port'
import { createServer } from '../../src/interfaces/http/server'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'
import { membrosDeMentira } from '../fakes/membros'
import { RepositorioEmMemoria } from '../fakes/memoria'

const TOKEN = 'token-interno-de-teste'
const LIA = '11111111-1111-4111-8111-111111111111'
const CONTA = '22222222-2222-4222-8222-222222222222'
const ADULTO = '33333333-3333-4333-8333-333333333333'
const AGORA = new Date('2026-10-29T15:00:00Z')
const CHAVE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OUTRA_CHAVE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const FORNO = GALERIA['forno-classico']
let politica: PoliticaDeAcesso
let posse: PortaDaPosse | null
let resposta: PosseDaGaleria
let resultado: ResultadoDaCompraDaGaleria
let pedidos: Parameters<PortaDaPosse['comprar']>[0][]
let leiturasFeitas: Parameters<PortaDaPosse['ler']>[0][]
let app: ReturnType<typeof createServer>

function montar() {
  const logger = createLogger({ level: 'error' }),
    membros = membrosDeMentira()
  const leituras = new LeiturasDosMembros(membros)
  const galeria = new ServicoDaGaleria({ posse, politica })
  app = createServer({
    logger,
    servico: new ServicoDoJogo(
      new RepositorioEmMemoria(),
      politica,
      () => AGORA,
      undefined,
      (jogador) => galeria.aparenciasPagas(jogador),
    ),
    cartas: new ServicoDasCartas(politica, leituras),
    equipe: new ServicoDaEquipe(
      new DesafiosEmMemoria(),
      membros,
      leituras,
      new ConferenciaDoMapa(membros, logger),
      () => AGORA,
    ),
    desafios: desafiosDesligados(politica),
    galeria,
    cliente: { dir: '/nao-existe', servirMapas: false },
    tokenInterno: TOKEN,
    readiness: async () => {},
  })
}

beforeEach(() => {
  politica = { modo: 'aberto', publicos: new Set(['kids', 'adulto']), lista: new Set() }
  resposta = { versao: 1, possuidas: [], saldo: 120 }
  resultado = { ok: true, jaPossuia: false, posse: { versao: 1, possuidas: [FORNO.id], saldo: 70 } }
  pedidos = []
  leiturasFeitas = []
  // Apenas transporte externo. A prova de débito/concorrência usa o Postgres do Members.
  posse = {
    async ler(dono) {
      leiturasFeitas.push(dono)
      return resposta
    },
    async comprar(pedido) {
      pedidos.push(pedido)
      return resultado
    },
  }
  montar()
})

const crianca = (extra: Record<string, string> = {}) => ({
  'x-internal-token': TOKEN,
  'x-auth-user-id': LIA,
  'x-auth-account-id': CONTA,
  'x-auth-kids-context': 'student',
  'x-auth-user-role': 'member',
  'x-auth-user-status': 'active',
  ...extra,
})

async function chamar(metodo: string, caminho: string, headers: object, corpo?: unknown) {
  const r = await app.handle(
    new Request(`http://local${caminho}`, {
      method: metodo,
      headers:
        corpo === undefined
          ? (headers as Record<string, string>)
          : { ...(headers as Record<string, string>), 'content-type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),
  )
  const texto = await r.text()
  let json: unknown = null
  try {
    json = JSON.parse(texto)
  } catch {}
  return { status: r.status, json: json as Record<string, unknown> }
}

const comprar = (chave = CHAVE, headers: object = crianca(), aparencia = FORNO.id) =>
  chamar('POST', '/arquipelago/galeria/compras', headers, { aparencia, chave })

describe('leitura e compra pela autoridade canônica', () => {
  test('leitura usa perfil, conta e público da sessão', async () => {
    const r = await chamar('GET', '/arquipelago/galeria', crianca())
    expect(r.status).toBe(200)
    expect(GaleriaDoJogadorSchema.parse(r.json)).toEqual({
      possuidas: [],
      saldo: 120,
      ilimitado: false,
    })
    expect(leiturasFeitas).toEqual([{ userId: LIA, accountId: CONTA, audience: 'kids' }])
  })
  test('o adulto usa a própria conta e a vitrine adult', async () => {
    const headers = {
      'x-internal-token': TOKEN,
      'x-auth-user-id': ADULTO,
      'x-auth-user-role': 'member',
      'x-auth-user-status': 'active',
    }
    expect((await comprar(CHAVE, headers)).status).toBe(200)
    expect(pedidos[0]).toEqual({
      userId: ADULTO,
      accountId: ADULTO,
      audience: 'adult',
      aparencia: FORNO.id,
      equipe: false,
    })
  })
  test('não manda preço nem chave de débito fornecidos pelo navegador', async () => {
    const r = await comprar()
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ possuidas: [FORNO.id], saldo: 70, ilimitado: false })
    expect(pedidos).toEqual([
      { userId: LIA, accountId: CONTA, audience: 'kids', aparencia: FORNO.id, equipe: false },
    ])
    await comprar(OUTRA_CHAVE)
    expect(pedidos[1]).toEqual(pedidos[0])
  })
  test('saldo curto preserva o erro de negócio e não inventa posse', async () => {
    resultado = { ok: false, codigo: 'SALDO_INSUFICIENTE' }
    resposta.saldo = 10
    expect(await comprar()).toMatchObject({
      status: 409,
      json: {
        error: { code: 'SALDO_INSUFICIENTE' },
        preco: FORNO.preco,
        saldo: 10,
      },
    })
  })
  test('Members fora não vira galeria vazia nem concessão local', async () => {
    posse = {
      ler: async () => {
        throw new PosseIndisponivelError()
      },
      comprar: async () => {
        throw new PosseIndisponivelError()
      },
    }
    montar()
    expect((await comprar()).status).toBe(424)
    expect((await chamar('GET', '/arquipelago/galeria', crianca())).status).toBe(424)
    expect(
      (await chamar('GET', '/arquipelago/galeria', crianca({ 'x-auth-user-role': 'admin' })))
        .status,
    ).toBe(424)
    posse = null
    montar()
    expect((await comprar()).status).toBe(424)
  })
  test('recusa de identidade do Members nunca é sucesso', async () => {
    resultado = { ok: false, codigo: 'DONO_DIFERENTE' }
    expect((await comprar()).status).toBe(424)
  })
  test('suporte lê, mas não compra', async () => {
    const headers = crianca({ 'x-auth-impersonator-id': ADULTO })
    expect((await chamar('GET', '/arquipelago/galeria', headers)).status).toBe(200)
    expect((await comprar(CHAVE, headers)).status).toBe(403)
    expect(pedidos).toHaveLength(0)
  })
  test('equipe vem da identidade e continua com saldo visual ilimitado', async () => {
    const r = await comprar(CHAVE, crianca({ 'x-auth-user-role': 'admin' }))
    expect(r.json).toEqual({ possuidas: [FORNO.id], saldo: null, ilimitado: true })
    expect(pedidos[0]?.equipe).toBe(true)
  })
  test('corpo estranho, inclusive privilégio forjado, é recusado antes da porta', async () => {
    for (const corpo of [
      { aparencia: 'forno-dourado', chave: CHAVE },
      { aparencia: FORNO.id, chave: 'x' },
      { aparencia: FORNO.id, chave: CHAVE, preco: 1 },
      { aparencia: FORNO.id, chave: CHAVE, equipe: true },
      { aparencia: FORNO.id, chave: CHAVE, userId: ADULTO },
    ])
      expect((await chamar('POST', '/arquipelago/galeria/compras', crianca(), corpo)).status).toBe(
        400,
      )
    expect(pedidos).toHaveLength(0)
  })
  test('jogo fechado recusa antes de consultar ou comprar', async () => {
    politica.modo = 'desligado'
    montar()
    expect((await comprar()).status).toBe(403)
    expect((await chamar('GET', '/arquipelago/galeria', crianca())).status).toBe(403)
    expect(pedidos).toHaveLength(0)
    expect(leiturasFeitas).toHaveLength(0)
  })
})

describe('aparência no salvamento', () => {
  const comForno = (s: Salvamento): Salvamento => {
    const galeria = { origem: 'galeria' as const, id: FORNO.id }
    return {
      ...s,
      projetos: {
        forno: { ganhoEm: AGORA.toISOString(), aparencia: galeria, aparencias: [galeria] },
      },
    }
  }
  const gravar = (salvamento: unknown) =>
    chamar('PUT', '/arquipelago/salvamento', crianca(), { revisaoBase: 0, salvamento })
  test('posse canônica aceita o save sem registro de compra no jogo', async () => {
    expect((await gravar(comForno(criarSalvamentoInicial(AGORA)))).status).toBe(422)
    resposta.possuidas = [FORNO.id]
    expect((await gravar(comForno(criarSalvamentoInicial(AGORA)))).status).toBe(200)
    expect(leiturasFeitas.at(-1)).toEqual({ userId: LIA, accountId: CONTA, audience: 'kids' })
  })
  test('a aparência de um objeto não vale em outro', async () => {
    resposta.possuidas = [FORNO.id]
    const s = comForno(criarSalvamentoInicial(AGORA))
    expect((await gravar({ ...s, projetos: { geladeira: s.projetos.forno } })).status).toBe(422)
  })
  test('sem aparência comprada não precisa da porta de posse', async () => {
    posse = null
    montar()
    expect((await gravar(criarSalvamentoInicial(AGORA))).status).toBe(200)
  })
  test('porta fora recusa o save sem substituir a posse por vazia', async () => {
    posse = null
    montar()
    expect((await gravar(comForno(criarSalvamentoInicial(AGORA)))).status).toBe(424)
  })
})
