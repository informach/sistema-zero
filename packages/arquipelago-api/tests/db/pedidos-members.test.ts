import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { criarSalvamentoInicial, diaDeSaoPaulo } from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { Elysia } from 'elysia'
import { ArquipelagoCoinsRepository } from '../../../members/src/infrastructure/persistence/drizzle/arquipelago-coins.repository'
import type { DbConnection as MembersConnection } from '../../../members/src/infrastructure/persistence/drizzle/db'
import { arquipelagoCoinsRoutes } from '../../../members/src/interfaces/http/routes/arquipelago-coins.routes'
import { openKidsJourneyTestDatabase } from '../../../members/tests/db/kids-journey-database'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ServicoDosPedidos } from '../../src/application/servico-dos-pedidos'
import { MoedasHttp } from '../../src/infrastructure/members/moedas-http'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../src/infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDosPedidos } from '../../src/infrastructure/persistence/drizzle/repositorio-pedidos'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'

const jogoUrl = process.env.ARQUIPELAGO_PEDIDOS_TEST_DATABASE_URL
const membersUrl = process.env.ARQUIPELAGO_INSUMOS_MEMBERS_TEST_DATABASE_URL
if (jogoUrl) {
  const u = new URL(jogoUrl)
  if (
    !['postgres:', 'postgresql:'].includes(u.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    !/^\/arquipelago_test[a-z0-9_]*$/.test(u.pathname)
  )
    throw Error('Use banco local descartável arquipelago_test')
}
let jogo: DbConnection
let members: MembersConnection
beforeAll(async () => {
  if (!jogoUrl || !membersUrl) return
  members = await openKidsJourneyTestDatabase(membersUrl)
  jogo = createDbConnection(jogoUrl, { max: 2 })
  await migrarBancoDeTeste(jogo)
}, 120_000)
afterAll(async () => {
  await jogo?.close()
  await members?.close()
})

test.skipIf(!jogoUrl || !membersUrl)(
  'pedidos usam a carteira real: resposta perdida, teto semanal e replay nos dois públicos',
  async () => {
    const carteira = new ArquipelagoCoinsRepository(members.db)
    const app = new Elysia().use(
      arquipelagoCoinsRoutes({ repository: carteira, token: 'pedidos-local' }),
    )
    let perder = false
    const chaves: string[] = []
    const fetchLocal = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init)
      if (new URL(req.url).origin !== 'http://members-local') throw Error('Rede externa proibida')
      chaves.push(((await req.clone().json()) as { key: string }).key)
      const r = await app.handle(req)
      if (perder) throw Error('Resposta perdida após o commit da carteira')
      return r
    }) as typeof fetch
    const saves = new DrizzleRepositorioDoJogo(jogo.db)
    const repo = new DrizzleRepositorioDosPedidos(jogo.db)
    const agora = new Date()
    const dia = diaDeSaoPaulo(agora)
    let data = agora
    const api = new ServicoDosPedidos({
      repo,
      moedas: new MoedasHttp({
        url: 'http://members-local',
        token: 'pedidos-local',
        fetch: fetchLocal,
      }),
      leituras: new LeiturasDosMembros(null),
      politica: { modo: 'aberto', publicos: new Set(['kids', 'adulto']), lista: new Set() },
      logger: createLogger({ level: 'error' }),
      agora: () => data,
    })
    for (const publico of ['kids', 'adulto'] as const) {
      const id = randomUUID(),
        contaId = publico === 'kids' ? randomUUID() : id
      const audience = publico === 'kids' ? ('kids' as const) : ('adult' as const)
      const dono = { jogadorId: id, contaId, publico }
      const jogador = {
        id,
        contaId: publico === 'kids' ? contaId : null,
        publico,
        equipe: true,
        somenteLeitura: false,
      }
      const s = criarSalvamentoInicial(agora)
      s.moradores.bento.amizade = 80
      s.moradores.bento.pedido = { dia, id: 'milho-2', entregue: false }
      s.moradores.capi.pedido = { dia, id: 'alface-2', entregue: false }
      s.inventario = { milho: 3, alface: 3 }
      await saves.gravarSalvamento({ ...dono, revisaoBase: 0, salvamento: s, agora })
      const pedido = {
        versao: 1 as const,
        chave: randomUUID(),
        revisaoBase: 1,
        morador: 'bento' as const,
        dia,
        pedido: 'milho-2',
      }
      perder = true
      data = agora
      const pendente = await api.entregar(jogador, pedido)
      expect(pendente.pagamento).toBe('pendente')
      expect(pendente.guardado.salvamento?.inventario.milho).toBe(1)
      expect((await api.pendentes(jogador)).pedidos).toEqual([pedido])
      const gravado = pendente.guardado.salvamento!
      delete gravado.inventario.fuba
      await saves.gravarSalvamento({ ...dono, revisaoBase: 2, salvamento: gravado, agora })
      perder = false
      const confirmado = await api.entregar(jogador, pedido)
      expect(confirmado.pagamento).toBe('creditado')
      expect(confirmado.guardado.revisao).toBe(3)
      expect(confirmado.guardado.salvamento?.inventario.fuba).toBeUndefined()
      const pago = await repo.ler(dono, pedido.chave)
      expect(pago!.entrega.pagamentoId).not.toBe(pedido.chave)
      expect(chaves.filter((c) => c === pago!.entrega.pagamentoId)).toHaveLength(2)
      const [um] =
        await members.sql`select count(*)::int n, sum(amount)::int valor from members.coin_events where user_id=${id} and audience=${audience}`
      expect(um).toMatchObject({ n: 1, valor: 4 })
      // Outro prêmio do jogo ocupa o restante do teto. Compras não reabrem este limite.
      expect(
        await carteira.movimentar(
          {
            userId: id,
            accountId: contaId,
            audience,
            key: randomUUID(),
            operation: 'credit',
            amount: 96,
          },
          agora,
        ),
      ).toMatchObject({ ok: true })
      const capi = {
        ...pedido,
        chave: randomUUID(),
        revisaoBase: 3,
        morador: 'capi' as const,
        pedido: 'alface-2',
      }
      const limitado = await api.entregar(jogador, capi)
      expect(limitado.pagamento).toBe('teto')
      expect(limitado.guardado.salvamento?.moradores.capi.amizade).toBe(30)
      expect(limitado.guardado.salvamento?.inventario.alface).toBe(1)
      const chamadas = chaves.length
      // Na mesma semana, a retomada não cobra de novo.
      expect((await api.entregar(jogador, capi)).pagamento).toBe('teto')
      expect(chaves).toHaveLength(chamadas)
      // Numa semana seguinte do jogo o crédito volta com a mesma chave (A32). A carteira real
      // ainda está na mesma semana do relógio dela e recusa pelo teto: nada é creditado em dobro.
      data = new Date(agora.getTime() + 8 * 86_400_000)
      const idDoCapi = (await repo.ler(dono, capi.chave))!.entrega.pagamentoId
      expect((await api.entregar(jogador, capi)).pagamento).toBe('teto')
      expect(chaves).toHaveLength(chamadas + 1)
      expect(chaves.at(-1)).toBe(idDoCapi)
      expect((await api.entregar(jogador, capi)).pagamento).toBe('teto')
      expect((await api.entregar(jogador, pedido)).pagamento).toBe('creditado')
      expect(chaves).toHaveLength(chamadas + 1)
      const [wallet] =
        await members.sql`select coin_balance from members.gamification_profiles where user_id=${id} and audience=${audience}`
      expect(wallet).toMatchObject({ coin_balance: 100 })
      expect((await api.pendentes(jogador)).pedidos).toEqual([])
    }
  },
  30_000,
)
