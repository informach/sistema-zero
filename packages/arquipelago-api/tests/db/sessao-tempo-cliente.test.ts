import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { createLogger } from '@sistemazero/core/logging'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { criarSessaoTempo } from '../../../arquipelago/src/sistemas/sessao-tempo'
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
  const destino = new URL(url)
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(destino.hostname) ||
    destino.pathname !== '/arquipelago_test'
  )
    throw new Error('Use somente o banco local descartável arquipelago_test')
}
let db: DbConnection
beforeAll(async () => {
  if (!url) return
  db = createDbConnection(url)
  await migrate(db.db, {
    migrationsFolder: path.join(
      import.meta.dir,
      '../../src/infrastructure/persistence/drizzle/migrations',
    ),
    migrationsTable: 'arquipelago_migrations',
  })
}, 30_000)
afterAll(async () => db?.close())

const POLITICA = {
  modo: 'aberto' as const,
  publicos: new Set(['kids', 'adulto'] as const),
  lista: new Set<string>(),
}

test.skipIf(!url)(
  'o cliente recupera resposta perdida da API real sem duplicar tempo no Postgres',
  async () => {
    const jogador = randomUUID(),
      conta = randomUUID(),
      id = randomUUID()
    let agora = new Date('2026-10-27T12:00:00Z')
    const repo = new DrizzleRepositorioDoJogo(db.db)
    const servico = new ServicoDoJogo(
      repo,
      { modo: 'aberto', publicos: new Set(['kids']), lista: new Set() },
      () => agora,
      new RepositorioDeSessoesDeTempo(db.db),
    )
    const app = createServer({
      logger: createLogger({ level: 'error' }),
      servico,
      cartas: new ServicoDasCartas(POLITICA, new LeiturasDosMembros(null)),
      equipe: new ServicoDaEquipe(
        new DrizzleRepositorioDeDesafios(db.db),
        null,
        new LeiturasDosMembros(null),
        new ConferenciaDoMapa(null, createLogger({ level: 'error' })),
      ),
      desafios: desafiosDesligados(POLITICA),
      cliente: { dir: '.', servirMapas: false },
      tokenInterno: 'token-local-de-teste',
      readiness: async () => {},
    })
    const comandos: unknown[] = []
    let perder = true
    const sessao = criarSessaoTempo({
      novaId: () => id,
      relogio: () => 0,
      aoConfirmar: () => {},
      servico: {
        async buscar(caminho, opcoes) {
          comandos.push(opcoes?.corpo)
          const resposta = await app.handle(
            new Request(`http://local/arquipelago${caminho}`, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-internal-token': 'token-local-de-teste',
                'x-auth-user-id': jogador,
                'x-auth-account-id': conta,
                'x-auth-kids-context': 'student',
                'x-auth-user-role': 'member',
                'x-auth-user-status': 'active',
              },
              body: JSON.stringify(opcoes?.corpo),
            }),
          )
          const corpo = await resposta.json()
          if (
            (opcoes?.corpo as { acao?: string }).acao === 'pulsar' &&
            perder &&
            resposta.status === 200
          ) {
            perder = false
            throw new Error('resposta perdida após gravação')
          }
          return { status: resposta.status, corpo }
        },
      },
    })
    await sessao.iniciar()
    agora = new Date('2026-10-27T12:00:10Z')
    let falha: unknown
    try {
      await sessao.pulsar()
    } catch (erro) {
      falha = erro
    }
    expect(falha).toBeInstanceOf(Error)
    expect(sessao.valida()).toBe(false)
    expect((await sessao.recuperar())?.usadoHojeSegundos).toBe(10)
    expect(comandos[1]).toEqual(comandos[2])
    agora = new Date('2026-10-27T12:00:15Z')
    expect((await sessao.pausar())?.usadoHojeSegundos).toBe(15)
    expect(await repo.lerTempo(jogador, '2026-10-27')).toBe(15)
  },
  30_000,
)
