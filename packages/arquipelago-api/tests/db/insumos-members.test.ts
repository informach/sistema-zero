import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { Elysia } from 'elysia'
import { ArquipelagoCoinsRepository } from '../../../members/src/infrastructure/persistence/drizzle/arquipelago-coins.repository'
import type { DbConnection as MembersConnection } from '../../../members/src/infrastructure/persistence/drizzle/db'
import { arquipelagoCoinsRoutes } from '../../../members/src/interfaces/http/routes/arquipelago-coins.routes'
import { openKidsJourneyTestDatabase } from '../../../members/tests/db/kids-journey-database'
import { PlataformaIndisponivelError } from '../../src/application/erros'
import { ServicoDosInsumos } from '../../src/application/servico-dos-insumos'
import { MoedasHttp } from '../../src/infrastructure/members/moedas-http'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../src/infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDosInsumos } from '../../src/infrastructure/persistence/drizzle/repositorio-insumos'
import { migrarBancoDeTeste } from '../fakes/banco-migrado'

const jogoUrl = process.env.ARQUIPELAGO_INSUMOS_TEST_DATABASE_URL
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
  // O helper do Members também recusa host remoto e nome fora de kids_journey_*.
  members = await openKidsJourneyTestDatabase(membersUrl)
  jogo = createDbConnection(jogoUrl, { max: 2 })
  await migrarBancoDeTeste(jogo)
}, 120_000)
afterAll(async () => {
  await jogo?.close()
  await members?.close()
})

test.skipIf(!jogoUrl || !membersUrl)(
  'API e carteira reais preservam uma única cobrança após perda da resposta S2S',
  async () => {
    const membersApp = new Elysia().use(
      arquipelagoCoinsRoutes({
        repository: new ArquipelagoCoinsRepository(members.db),
        token: 'token-local-insumos',
      }),
    )
    let perder = true
    const chamadas: string[] = []
    const fetchLocal = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init)
      if (new URL(req.url).origin !== 'http://members-local')
        throw Error('Rede externa proibida no teste')
      chamadas.push(((await req.clone().json()) as { key: string }).key)
      const resposta = await membersApp.handle(req)
      if (perder) throw Error('Resposta perdida depois do commit da carteira')
      return resposta
    }) as typeof fetch
    const saves = new DrizzleRepositorioDoJogo(jogo.db)
    const repo = new DrizzleRepositorioDosInsumos(jogo.db)
    const servico = new ServicoDosInsumos({
      repo,
      debito: new MoedasHttp({
        url: 'http://members-local',
        token: 'token-local-insumos',
        fetch: fetchLocal,
      }),
      politica: { modo: 'aberto', publicos: new Set(['kids', 'adulto']), lista: new Set() },
    })
    for (const publico of ['kids', 'adulto'] as const) {
      const id = randomUUID(),
        contaId = publico === 'kids' ? randomUUID() : id
      const audience = publico === 'kids' ? 'kids' : 'adult'
      await members.sql`insert into members.gamification_profiles(id,user_id,account_id,audience,coin_balance,created_at,updated_at)
      values(${randomUUID()},${id},${contaId},${audience},80,now(),now())`
      const jogador = {
        id,
        contaId: publico === 'kids' ? contaId : null,
        publico,
        equipe: false,
        somenteLeitura: false,
      }
      await saves.gravarSalvamento({
        jogadorId: id,
        contaId,
        publico,
        revisaoBase: 0,
        salvamento: criarSalvamentoInicial(new Date()),
        agora: new Date(),
      })
      const pedido = {
        versao: 1 as const,
        chave: randomUUID(),
        revisaoBase: 1,
        item: 'leite' as const,
        quantidade: 3,
      }
      perder = true
      let falha: unknown
      try {
        await servico.comprar(jogador, pedido)
      } catch (e) {
        falha = e
      }
      expect(falha).toBeInstanceOf(PlataformaIndisponivelError)
      expect((await servico.pendente(jogador)).pedido).toEqual(pedido)
      expect((await saves.lerSalvamento(id))?.revisao).toBe(1)
      perder = false
      const r = await servico.comprar(jogador, pedido)
      expect(r.situacao).toBe('entregue')
      expect(r.saldo).toBe(74)
      expect(r.guardado.salvamento?.inventario.leite).toBe(3)
      expect(r.guardado.revisao).toBe(2)
      const [wallet] =
        await members.sql`select coin_balance from members.gamification_profiles where user_id=${id} and audience=${audience}`
      const [livro] =
        await members.sql`select count(*)::int n, sum(amount)::int valor from members.coin_events where user_id=${id} and audience=${audience}`
      expect(wallet).toMatchObject({ coin_balance: 74 })
      expect(livro).toMatchObject({ n: 1, valor: -6 })
      await servico.comprar(jogador, pedido)
      expect(chamadas.filter((k) => k === pedido.chave)).toHaveLength(2)
    }
  },
)
