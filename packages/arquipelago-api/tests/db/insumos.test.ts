import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  type CompraDeInsumos,
  criarSalvamentoInicial,
  ResultadoDaCompraDeInsumosSchema,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import { ServicoDosInsumos } from '../../src/application/servico-dos-insumos'
import {
  CompraDesatualizadaError,
  CompraIncompativelError,
  CompraPendenteError,
  CompraSemEspacoError,
  type DonoDaCompra,
} from '../../src/domain/insumos.port'
import { MoedasIndisponiveisError } from '../../src/domain/moedas.port'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../src/infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDosInsumos } from '../../src/infrastructure/persistence/drizzle/repositorio-insumos'
import { createServer } from '../../src/interfaces/http/server'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'
import { DesafiosEmMemoria, desafiosDesligados } from '../fakes/desafios'

const url = process.env.ARQUIPELAGO_INSUMOS_TEST_DATABASE_URL
if (url) {
  const u = new URL(url)
  if (
    !['postgres:', 'postgresql:'].includes(u.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    !/^\/arquipelago_test[a-z0-9_]*$/.test(u.pathname)
  )
    throw Error('Use apenas Postgres local descartável arquipelago_test')
}
let db: DbConnection
let repo: DrizzleRepositorioDosInsumos
let saves: DrizzleRepositorioDoJogo
const agora = new Date('2026-10-30T12:00:00Z')
beforeAll(async () => {
  if (!url) return
  db = createDbConnection(url, { max: 5 })
  await migrarBancoDeTeste(db)
  repo = new DrizzleRepositorioDosInsumos(db.db)
  saves = new DrizzleRepositorioDoJogo(db.db)
})
afterAll(async () => {
  await db?.close()
})
async function perfil(publico: DonoDaCompra['publico'] = 'kids', leite = 0) {
  const dono: DonoDaCompra = { jogadorId: randomUUID(), contaId: randomUUID(), publico }
  if (publico === 'adulto') dono.contaId = dono.jogadorId
  const s = criarSalvamentoInicial(agora)
  s.inventario.leite = leite
  await saves.gravarSalvamento({ ...dono, revisaoBase: 0, salvamento: s, agora })
  const pedido: CompraDeInsumos = {
    versao: 1,
    chave: randomUUID(),
    revisaoBase: 1,
    item: 'leite',
    quantidade: 3,
  }
  return { dono, pedido, s }
}
const pagar = async () => ({ situacao: 'debitado' as const, saldo: 74 })

test.skipIf(!url)(
  'HTTP protege identidade e suporte, preserva pendência e retoma nos dois públicos',
  async () => {
    const politica = {
      modo: 'aberto' as const,
      publicos: new Set(['kids' as const, 'adulto' as const]),
      lista: new Set<string>(),
    }
    const logger = createLogger({ level: 'error' })
    const leituras = new LeiturasDosMembros(null)
    const cobradas = new Map<string, number>()
    let perder = true
    const app = createServer({
      logger,
      tokenInterno: 'token-insumos-local',
      servico: new ServicoDoJogo(saves, politica),
      cartas: new ServicoDasCartas(politica, leituras),
      equipe: new ServicoDaEquipe(
        new DesafiosEmMemoria(),
        null,
        leituras,
        new ConferenciaDoMapa(null, logger),
      ),
      desafios: desafiosDesligados(politica),
      insumos: new ServicoDosInsumos({
        repo,
        politica,
        agora: () => agora,
        debito: {
          debitar: async (p) => {
            cobradas.set(p.key, p.amount)
            if (perder) throw new MoedasIndisponiveisError()
            return pagar()
          },
        },
      }),
      cliente: { dir: '.', servirMapas: false },
      readiness: async () => {},
    })
    for (const publico of ['kids', 'adulto'] as const) {
      const { dono, pedido, s } = await perfil(publico)
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        'x-internal-token': 'token-insumos-local',
        'x-auth-user-id': dono.jogadorId,
        'x-auth-user-role': 'member',
        'x-auth-user-status': 'active',
        ...(publico === 'kids'
          ? { 'x-auth-account-id': dono.contaId, 'x-auth-kids-context': 'student' }
          : {}),
      }
      const chamar = (path: string, metodo: string, corpo?: unknown, h = headers) =>
        app.handle(
          new Request(`http://local/arquipelago${path}`, {
            method: metodo,
            headers: h,
            ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
          }),
        )
      expect(
        (
          await chamar('/insumos/comprar', 'POST', pedido, {
            ...headers,
            'x-internal-token': 'errado',
          })
        ).status,
      ).toBe(401)
      expect((await chamar('/insumos/comprar', 'POST', { ...pedido, moedas: 0 })).status).toBe(400)
      expect(
        (
          await chamar('/insumos/comprar', 'POST', pedido, {
            ...headers,
            'x-auth-impersonator-id': randomUUID(),
          })
        ).status,
      ).toBe(403)
      expect(
        (
          await chamar('/insumos/pendente', 'GET', undefined, {
            ...headers,
            'x-auth-impersonator-id': randomUUID(),
          })
        ).status,
      ).toBe(403)
      perder = true
      expect((await chamar('/insumos/comprar', 'POST', pedido)).status).toBe(424)
      expect(await (await chamar('/insumos/pendente', 'GET')).json()).toEqual({ versao: 1, pedido })
      const bloqueado = await chamar('/salvamento', 'PUT', { revisaoBase: 1, salvamento: s })
      expect(bloqueado.status).toBe(423)
      expect(await bloqueado.json()).toMatchObject({ error: { code: 'COMPRA_PENDENTE' } })
      perder = false
      const final = await chamar('/insumos/comprar', 'POST', pedido)
      expect(final.status).toBe(200)
      const recebido = ResultadoDaCompraDeInsumosSchema.parse(await final.json())
      expect(recebido.situacao).toBe('entregue')
      expect(recebido.guardado.salvamento?.inventario.leite).toBe(3)
      expect(recebido.guardado.revisao).toBe(2)
      expect(cobradas.get(pedido.chave)).toBe(6)
      expect(await (await chamar('/insumos/pendente', 'GET')).json()).toEqual({
        versao: 1,
        pedido: null,
      })
    }
    expect(cobradas.size).toBe(2)
  },
)
async function erroDa(operacao: Promise<unknown>) {
  try {
    await operacao
    return null
  } catch (erro) {
    if (!(erro instanceof Error)) throw erro
    return erro
  }
}

test.skipIf(!url)(
  'reserva trava PUT e segunda compra; entrega e revisão mudam juntas uma só vez',
  async () => {
    const { dono, pedido, s } = await perfil()
    const r = await repo.reservar(dono, pedido, agora)
    expect(r.moedas).toBe(6)
    expect(r.situacao).toBe('pendente')
    expect(
      await erroDa(saves.gravarSalvamento({ ...dono, revisaoBase: 1, salvamento: s, agora })),
    ).toBeInstanceOf(CompraPendenteError)
    expect(
      await erroDa(repo.reservar(dono, { ...pedido, chave: randomUUID() }, agora)),
    ).toBeInstanceOf(CompraPendenteError)
    let chamadas = 0
    const debito = async () => {
      chamadas++
      return pagar()
    }
    const results = await Promise.all([
      repo.concluir(dono, pedido.chave, debito, agora),
      repo.concluir(dono, pedido.chave, debito, agora),
    ])
    expect(chamadas).toBe(1)
    for (const result of results) {
      expect(result.compra.situacao).toBe('entregue')
      expect(result.guardado.revisao).toBe(2)
      expect(SalvamentoSchema.parse(result.guardado.dados).inventario.leite).toBe(3)
    }
    expect(await repo.pendente(dono)).toBeNull()
    // Consumir depois não é desfeito por uma resposta antiga de compra repetida.
    const consumido = SalvamentoSchema.parse(results[0]!.guardado.dados)
    consumido.inventario.leite = 1
    expect(
      (await saves.gravarSalvamento({ ...dono, revisaoBase: 2, salvamento: consumido, agora })).ok,
    ).toBe(true)
    const repetida = await repo.concluir(dono, pedido.chave, debito, agora)
    expect(repetida.guardado.revisao).toBe(3)
    expect(SalvamentoSchema.parse(repetida.guardado.dados).inventario.leite).toBe(1)
    expect(chamadas).toBe(1)
  },
)

test.skipIf(!url)(
  'resposta da carteira perdida conserva reserva e retoma a chave original sem novo débito',
  async () => {
    const { dono, pedido } = await perfil('adulto')
    await repo.reservar(dono, pedido, agora)
    const livro = new Set<string>()
    let cobrancas = 0
    const carteira = async (perderResposta: boolean) => {
      if (!livro.has(pedido.chave)) {
        livro.add(pedido.chave)
        cobrancas++
      }
      if (perderResposta) throw Error('Resposta perdida depois de cobrar')
      return pagar()
    }
    expect(
      (await erroDa(repo.concluir(dono, pedido.chave, () => carteira(true), agora)))?.message,
    ).toContain('Resposta perdida')
    expect((await repo.pendente(dono))?.pedido).toEqual(pedido)
    expect((await saves.lerSalvamento(dono.jogadorId))?.revisao).toBe(1)
    const r = await repo.concluir(dono, pedido.chave, () => carteira(false), agora)
    expect(r.guardado.revisao).toBe(2)
    expect(r.compra.situacao).toBe('entregue')
    expect(cobrancas).toBe(1)
  },
)

test.skipIf(!url)(
  'saldo insuficiente é final para a chave e libera gravação sem conceder itens',
  async () => {
    const { dono, pedido, s } = await perfil()
    await repo.reservar(dono, pedido, agora)
    const r = await repo.concluir(
      dono,
      pedido.chave,
      async () => ({ situacao: 'saldo-insuficiente' }),
      agora,
    )
    expect(r.compra.situacao).toBe('saldo-insuficiente')
    expect(r.guardado.revisao).toBe(1)
    expect(SalvamentoSchema.parse(r.guardado.dados).inventario.leite).toBe(0)
    const repetida = await repo.concluir(
      dono,
      pedido.chave,
      async () => {
        throw Error('Não deve cobrar novamente')
      },
      agora,
    )
    expect(repetida.compra.situacao).toBe('saldo-insuficiente')
    expect(
      (await saves.gravarSalvamento({ ...dono, revisaoBase: 1, salvamento: s, agora })).ok,
    ).toBe(true)
  },
)

test.skipIf(!url)(
  'capacidade, revisão, identidade e troca de conteúdo são recusadas antes da carteira',
  async () => {
    const { dono, pedido } = await perfil('kids', 998)
    expect(await erroDa(repo.reservar(dono, pedido, agora))).toBeInstanceOf(CompraSemEspacoError)
    expect(
      await erroDa(repo.reservar({ ...dono, publico: 'adulto' }, pedido, agora)),
    ).toBeInstanceOf(CompraIncompativelError)
    expect(
      await erroDa(repo.reservar({ ...dono, contaId: randomUUID() }, pedido, agora)),
    ).toBeInstanceOf(CompraIncompativelError)
    expect(await erroDa(repo.reservar(dono, { ...pedido, revisaoBase: 2 }, agora))).toBeInstanceOf(
      CompraDesatualizadaError,
    )
    const uma = { ...pedido, quantidade: 1 }
    await repo.reservar(dono, uma, agora)
    expect(await erroDa(repo.reservar(dono, { ...uma, item: 'ovo' }, agora))).toBeInstanceOf(
      CompraIncompativelError,
    )
    const outro = await perfil()
    expect(await erroDa(repo.reservar(outro.dono, uma, agora))).toBeInstanceOf(
      CompraIncompativelError,
    )
    expect(await erroDa(repo.concluir(outro.dono, uma.chave, pagar, agora))).toBeInstanceOf(
      CompraIncompativelError,
    )
    expect((await repo.reservar(dono, uma, agora)).pedido).toEqual(uma)
  },
)

test.skipIf(!url)(
  'duas reservas concorrentes têm um único vencedor e PUT concorrente não apaga a entrega',
  async () => {
    const { dono, pedido, s } = await perfil()
    const outras = [pedido, { ...pedido, chave: randomUUID() }]
    const reservas = await Promise.allSettled(outras.map((p) => repo.reservar(dono, p, agora)))
    expect(reservas.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const atual = await repo.pendente(dono)
    if (!atual) throw Error('Reserva ausente')
    let iniciou!: () => void
    let soltar!: () => void
    const inicio = new Promise<void>((r) => {
      iniciou = r
    })
    const espera = new Promise<void>((r) => {
      soltar = r
    })
    const compra = repo.concluir(
      dono,
      atual.pedido.chave,
      async () => {
        iniciou()
        await espera
        return pagar()
      },
      agora,
    )
    await inicio
    const put = saves.gravarSalvamento({ ...dono, revisaoBase: 1, salvamento: s, agora })
    soltar()
    await compra
    const antigo = await put
    expect(antigo.ok).toBe(false)
    if (!antigo.ok) expect(antigo.atual?.revisao).toBe(2)
    expect(
      SalvamentoSchema.parse((await saves.lerSalvamento(dono.jogadorId))?.dados).inventario.leite,
    ).toBe(3)
  },
)
