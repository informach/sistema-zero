import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import 'fake-indexeddb/auto'
import { LeiturasDosMembros } from '../../arquipelago-api/src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../arquipelago-api/src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../arquipelago-api/src/application/servico-da-equipe'
import { ServicoDasCartas } from '../../arquipelago-api/src/application/servico-das-cartas'
import { ServicoDoJogo } from '../../arquipelago-api/src/application/servico-do-jogo'
import {
  createDbConnection,
  type DbConnection,
} from '../../arquipelago-api/src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../arquipelago-api/src/infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDeDesafios } from '../../arquipelago-api/src/infrastructure/persistence/drizzle/repositorio-de-desafios'
import { createServer } from '../../arquipelago-api/src/interfaces/http/server'
import { desafiosDesligados } from '../../arquipelago-api/tests/fakes/desafios'
import { createLogger } from '../../core/src/logging'
import { criarFilaDeTempo } from '../src/sistemas/fila-tempo'

const url = process.env.ARQUIPELAGO_TEMPO_TEST_DATABASE_URL
if (url) {
  const u = new URL(url)
  if (
    !['127.0.0.1', 'localhost', '::1'].includes(u.hostname) ||
    !u.pathname.startsWith('/arquipelago_test')
  )
    throw new Error('Use somente banco local descartável arquipelago_test')
}
let db: DbConnection
beforeAll(() => {
  if (url) db = createDbConnection(url)
})
afterAll(async () => {
  await db?.close()
})

test.skipIf(!url)(
  'fila recupera resposta perdida pela API e conta uma vez no Postgres',
  async () => {
    const user = randomUUID(),
      account = randomUUID()
    const repo = new DrizzleRepositorioDoJogo(db.db)
    const politica = {
      modo: 'aberto' as const,
      publicos: new Set(['kids' as const]),
      lista: new Set<string>(),
    }
    const service = new ServicoDoJogo(repo, politica)
    const logger = createLogger({ level: 'error' })
    // Sem Members: cartões, cadastro e desafios ficam desligados (este teste é só do tempo).
    const leituras = new LeiturasDosMembros(null)
    const app = createServer({
      logger,
      servico: service,
      cartas: new ServicoDasCartas(politica, leituras),
      equipe: new ServicoDaEquipe(
        new DrizzleRepositorioDeDesafios(db.db),
        null,
        leituras,
        new ConferenciaDoMapa(null, logger),
      ),
      desafios: desafiosDesligados(politica),
      cliente: { dir: '.', servirMapas: false },
      tokenInterno: 'token-local-de-teste',
      readiness: async () => {},
    })
    let perderResposta = true
    const requests: string[] = []
    const fila = await criarFilaDeTempo({
      perfil: user,
      servico: {
        async buscar(caminho, pedido) {
          const corpo = pedido?.corpo as { eventoId: string }
          requests.push(corpo.eventoId)
          const response = await app.handle(
            new Request(`http://local/arquipelago${caminho}`, {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-internal-token': 'token-local-de-teste',
                'x-auth-user-id': user,
                'x-auth-account-id': account,
                'x-auth-kids-context': 'student',
                'x-auth-user-role': 'member',
                'x-auth-user-status': 'active',
              },
              body: JSON.stringify(pedido?.corpo),
            }),
          )
          const json = await response.json()
          if (perderResposta && response.status === 200)
            throw new Error('resposta perdida após gravação')
          return { status: response.status, corpo: json }
        },
      },
      aoConfirmar: () => {},
      aoErro: () => {},
    })
    for (let i = 0; i < 10; i++) await fila.somarSegundo()
    await expect(fila.guardarEEnviar()).rejects.toThrow()
    perderResposta = false
    await fila.guardarEEnviar()
    expect(new Set(requests).size).toBe(1)
    const [linha] =
      await db.sql`select sum(segundos)::integer as total from arquipelago.tempo_diario where jogador_id = ${user}`
    expect(linha?.total).toBe(10)
    await fila.encerrar()
  },
)
