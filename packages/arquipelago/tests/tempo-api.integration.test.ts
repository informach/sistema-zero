import { afterAll, beforeAll, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import 'fake-indexeddb/auto'
import { ServicoDoJogo } from '../../arquipelago-api/src/application/servico-do-jogo'
import {
  createDbConnection,
  type DbConnection,
} from '../../arquipelago-api/src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from '../../arquipelago-api/src/infrastructure/persistence/drizzle/repositorio'
import { createServer } from '../../arquipelago-api/src/interfaces/http/server'
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
    const service = new ServicoDoJogo(repo, {
      modo: 'aberto',
      publicos: new Set(['kids']),
      lista: new Set(),
    })
    const app = createServer({
      logger: createLogger({ level: 'error' }),
      servico: service,
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
