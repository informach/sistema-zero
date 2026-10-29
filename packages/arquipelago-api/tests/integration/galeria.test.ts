import { beforeEach, describe, expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  GALERIA,
  GaleriaDoJogadorSchema,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { aparenciasPagas, ServicoDaGaleria } from '../../src/application/servico-da-galeria'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import type { PoliticaDeAcesso } from '../../src/domain/acesso'
import { MembrosIndisponiveisError, type PortaDosMembros } from '../../src/domain/membros.port'
import { MoedasIndisponiveisError, type PortaDoDebito } from '../../src/domain/moedas.port'
import { createServer } from '../../src/interfaces/http/server'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'
import { GaleriaEmMemoria } from '../fakes/galeria'
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

let repo: RepositorioEmMemoria
let compras: GaleriaEmMemoria
let politica: PoliticaDeAcesso
let membros: PortaDosMembros | null
let saldo: number
let debitos: Parameters<PortaDoDebito['debitar']>[0][]
let debito: PortaDoDebito | null
let app: ReturnType<typeof createServer>

/** O Members de mentira: debita da carteira, com a chave idempotente como o de verdade. */
function carteira(): PortaDoDebito {
  const feitas = new Map<string, number>()
  return {
    async debitar(pedido) {
      debitos.push(pedido)
      const feita = feitas.get(pedido.key)
      if (feita !== undefined) return { situacao: 'debitado', saldo }
      if (saldo < pedido.amount) return { situacao: 'saldo-insuficiente' }
      saldo -= pedido.amount
      feitas.set(pedido.key, pedido.amount)
      return { situacao: 'debitado', saldo }
    },
  }
}

function montar() {
  const logger = createLogger({ level: 'error' })
  const leituras = new LeiturasDosMembros(membros)
  app = createServer({
    logger,
    servico: new ServicoDoJogo(
      repo,
      politica,
      () => AGORA,
      undefined,
      (id) => aparenciasPagas(compras, id),
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
    galeria: new ServicoDaGaleria({
      galeria: compras,
      debito,
      leituras,
      politica,
      logger,
      agora: () => AGORA,
    }),
    cliente: { dir: '/nao-existe', servirMapas: false },
    tokenInterno: TOKEN,
    readiness: async () => {},
  })
}

beforeEach(() => {
  repo = new RepositorioEmMemoria()
  compras = new GaleriaEmMemoria()
  politica = { modo: 'aberto', publicos: new Set(['kids', 'adulto']), lista: new Set() }
  saldo = 120
  debitos = []
  debito = carteira()
  membros = membrosDeMentira({ lerSaldo: async () => ({ saldo }) })
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

describe('ler a galeria', () => {
  test('o que ela já comprou e o saldo do Members', async () => {
    const r = await chamar('GET', '/arquipelago/galeria', crianca())
    expect(r.status).toBe(200)
    expect(GaleriaDoJogadorSchema.parse(r.json)).toEqual({
      possuidas: [],
      saldo: 120,
      ilimitado: false,
    })
  })

  test('saldo fora do ar ou Members desligado: saldo desconhecido, a galeria abre igual', async () => {
    membros = membrosDeMentira({
      lerSaldo: async () => {
        throw new MembrosIndisponiveisError('rede')
      },
    })
    montar()
    expect((await chamar('GET', '/arquipelago/galeria', crianca())).json.saldo).toBeNull()
    membros = null
    montar()
    expect((await chamar('GET', '/arquipelago/galeria', crianca())).json.saldo).toBeNull()
  })

  test('equipe: ilimitado, sem ler saldo', async () => {
    membros = membrosDeMentira()
    montar()
    const r = await chamar('GET', '/arquipelago/galeria', crianca({ 'x-auth-user-role': 'admin' }))
    expect(r.json).toEqual({ possuidas: [], saldo: null, ilimitado: true })
  })
})

describe('comprar', () => {
  test('debita o preço do catálogo com a chave do pedido e só então vale', async () => {
    const r = await comprar()
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ possuidas: [FORNO.id], saldo: 120 - FORNO.preco, ilimitado: false })
    expect(debitos).toEqual([
      { userId: LIA, accountId: CONTA, audience: 'kids', key: CHAVE, amount: FORNO.preco },
    ])
  })

  test('repetir (a mesma chave ou outra) nunca cobra duas vezes', async () => {
    await comprar()
    const deNovo = await comprar()
    const outra = await comprar(OUTRA_CHAVE)
    expect(deNovo.json.possuidas).toEqual([FORNO.id])
    expect(outra.json.possuidas).toEqual([FORNO.id])
    expect(saldo).toBe(120 - FORNO.preco)
    expect(debitos).toHaveLength(1)
  })

  test('saldo curto: erro próprio com o preço e o saldo, nada cobrado nem guardado', async () => {
    saldo = 10
    const r = await comprar()
    expect(r.status).toBe(409)
    expect(r.json).toMatchObject({
      error: { code: 'SALDO_INSUFICIENTE' },
      preco: FORNO.preco,
      saldo: 10,
    })
    expect(compras.linhas.size).toBe(0)
    // Juntou moedas: outra chave compra do zero.
    saldo = 100
    expect((await comprar(OUTRA_CHAVE)).json.possuidas).toEqual([FORNO.id])
    expect(debitos.at(-1)?.key).toBe(OUTRA_CHAVE)
  })

  test('porta de moedas fora do ar: 424 e a compra fica pendente com a mesma chave', async () => {
    debito = {
      async debitar(p) {
        debitos.push(p)
        throw new MoedasIndisponiveisError()
      },
    }
    montar()
    expect((await comprar()).status).toBe(424)
    expect((await chamar('GET', '/arquipelago/galeria', crianca())).json.possuidas).toEqual([])
    // Voltou: o próximo pedido, mesmo com outra chave, repete a chave guardada.
    debito = carteira()
    montar()
    expect((await comprar(OUTRA_CHAVE)).json.possuidas).toEqual([FORNO.id])
    expect(debitos.map((d) => d.key)).toEqual([CHAVE, CHAVE])
  })

  test('sem a porta de moedas configurada: 424, nada cobrado', async () => {
    debito = null
    montar()
    expect((await comprar()).status).toBe(424)
  })

  test('sessão somente leitura não compra', async () => {
    const r = await comprar(CHAVE, crianca({ 'x-auth-impersonator-id': ADULTO }))
    expect(r.status).toBe(403)
    expect(r.json).toMatchObject({ error: { code: 'SOMENTE_LEITURA' } })
    expect(debitos).toEqual([])
    expect(compras.linhas.size).toBe(0)
  })

  test('a equipe compra sem gastar', async () => {
    const r = await comprar(CHAVE, crianca({ 'x-auth-user-role': 'admin' }))
    expect(r.json).toEqual({ possuidas: [FORNO.id], saldo: null, ilimitado: true })
    expect(debitos).toEqual([])
  })

  test('pedido estranho (id fora do catálogo, chave inválida, preço no corpo) é 400', async () => {
    for (const corpo of [
      { aparencia: 'forno-dourado', chave: CHAVE },
      { aparencia: FORNO.id, chave: 'x' },
      { aparencia: FORNO.id, chave: CHAVE, preco: 1 },
    ])
      expect((await chamar('POST', '/arquipelago/galeria/compras', crianca(), corpo)).status).toBe(
        400,
      )
    expect(debitos).toEqual([])
  })

  test('jogo fechado para ela: 403 e nada cobrado', async () => {
    politica = { modo: 'desligado', publicos: new Set(['kids']), lista: new Set() }
    montar()
    expect((await comprar()).status).toBe(403)
    expect(debitos).toEqual([])
  })
})

describe('a aparência da galeria no salvamento', () => {
  const comForno = (s: Salvamento): Salvamento => {
    const galeria = { origem: 'galeria' as const, id: FORNO.id }
    return {
      ...s,
      projetos: {
        forno: { ganhoEm: AGORA.toISOString(), aparencia: galeria, aparencias: [galeria] },
      },
    }
  }
  const gravar = (salvamento: unknown, revisaoBase = 0) =>
    chamar('PUT', '/arquipelago/salvamento', crianca(), { revisaoBase, salvamento })

  test('só entra depois de paga', async () => {
    const s = comForno(criarSalvamentoInicial(AGORA))
    const antes = await gravar(s)
    expect(antes.status).toBe(422)
    expect(antes.json).toMatchObject({ error: { code: 'APARENCIA_NAO_COMPRADA' } })
    await comprar()
    expect((await gravar(s)).status).toBe(200)
  })

  test('a aparência de um objeto não vale em outro', async () => {
    await comprar()
    const galeria = { origem: 'galeria' as const, id: FORNO.id }
    const s = {
      ...criarSalvamentoInicial(AGORA),
      projetos: {
        geladeira: { ganhoEm: AGORA.toISOString(), aparencia: galeria, aparencias: [galeria] },
      },
    }
    expect((await gravar(s)).status).toBe(422)
  })

  test('sem nenhuma da galeria, nada muda na gravação', async () => {
    expect((await gravar(criarSalvamentoInicial(AGORA))).status).toBe(200)
  })
})
