import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { RespostaSessaoTempoSchema } from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../src/infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDeDesafios } from '../../src/infrastructure/persistence/drizzle/repositorio-de-desafios'
import { RepositorioDeSessoesDeTempo } from '../../src/infrastructure/persistence/drizzle/repositorio-sessoes-tempo'
import { createServer } from '../../src/interfaces/http/server'
import { desafiosDesligados } from '../fakes/desafios'

const url = process.env.TEST_DATABASE_URL
if (url) {
  const target = new URL(url)
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.pathname !== '/arquipelago_test'
  )
    throw new Error('Use somente o banco local descartável arquipelago_test')
}
let conexao: DbConnection
beforeAll(async () => {
  if (!url) return
  conexao = createDbConnection(url)
  await migrate(conexao.db, {
    migrationsFolder: path.join(
      import.meta.dir,
      '../../src/infrastructure/persistence/drizzle/migrations',
    ),
    migrationsTable: 'arquipelago_migrations',
  })
})
afterAll(async () => conexao?.close())

const POLITICA = {
  modo: 'aberto' as const,
  publicos: new Set(['kids', 'adulto'] as const),
  lista: new Set<string>(),
}

test.skipIf(!url)(
  'a API usa o horário do servidor e protege identidade e sessões de leitura',
  async () => {
    const jogador = randomUUID(),
      conta = randomUUID(),
      sessaoId = randomUUID()
    let agora = new Date('2026-10-27T12:00:00.000Z')
    const servico = new ServicoDoJogo(
      new DrizzleRepositorioDoJogo(conexao.db),
      POLITICA,
      () => agora,
      new RepositorioDeSessoesDeTempo(conexao.db),
    )
    const app = createServer({
      logger: createLogger({ level: 'error' }),
      servico,
      cartas: new ServicoDasCartas(POLITICA, new LeiturasDosMembros(null)),
      equipe: new ServicoDaEquipe(
        new DrizzleRepositorioDeDesafios(conexao.db),
        null,
        new LeiturasDosMembros(null),
        new ConferenciaDoMapa(null, createLogger({ level: 'error' })),
      ),
      desafios: desafiosDesligados(POLITICA),
      cliente: { dir: '.', servirMapas: false },
      tokenInterno: 'token-local-de-teste',
      readiness: async () => {},
    })
    const headers = {
      'content-type': 'application/json',
      'x-internal-token': 'token-local-de-teste',
      'x-auth-user-id': jogador,
      'x-auth-account-id': conta,
      'x-auth-kids-context': 'student',
      'x-auth-user-role': 'member',
      'x-auth-user-status': 'active',
    }
    const chamar = (body: unknown, h: Record<string, string> = headers) =>
      app.handle(
        new Request('http://local/arquipelago/tempo/sessao', {
          method: 'POST',
          headers: h,
          body: JSON.stringify(body),
        }),
      )
    const inicio = { sessaoId, sequencia: 0, acao: 'iniciar' }
    expect((await chamar({ ...inicio, agora: '2099-01-01T00:00:00Z' })).status).toBe(400)
    const semToken: Record<string, string> = { ...headers }
    delete semToken['x-internal-token']
    expect((await chamar(inicio, semToken)).status).toBe(401)
    expect(
      (await chamar(inicio, { ...headers, 'x-auth-impersonator-id': randomUUID() })).status,
    ).toBe(403)
    expect((await chamar(inicio, { ...headers, 'x-auth-kids-context': 'parent' })).status).toBe(403)
    const adulto: Record<string, string> = { ...headers }
    delete adulto['x-auth-account-id']
    delete adulto['x-auth-kids-context']
    expect((await chamar(inicio, adulto)).status).toBe(403)
    const aberta = await chamar(inicio)
    expect(aberta.status).toBe(200)
    expect(RespostaSessaoTempoSchema.parse(await aberta.json())).toMatchObject({
      situacao: 'ativa',
      servidorEm: agora.toISOString(),
      usadoHojeSegundos: 0,
    })
    agora = new Date(agora.getTime() + 10_000)
    const pulso = await chamar({ sessaoId, sequencia: 1, acao: 'pulsar' })
    expect(pulso.status).toBe(200)
    expect(RespostaSessaoTempoSchema.parse(await pulso.json())).toMatchObject({
      situacao: 'ativa',
      servidorEm: agora.toISOString(),
      usadoHojeSegundos: 10,
    })
    expect((await chamar({ sessaoId, sequencia: 3, acao: 'pulsar' })).status).toBe(409)
  },
)
