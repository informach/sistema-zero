import { createLogger, type Logger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from './application/leituras-dos-membros'
import { ConferenciaDoMapa } from './application/mapa-das-ilhas'
import { ServicoDasCartas } from './application/servico-das-cartas'
import { ServicoDoJogo } from './application/servico-do-jogo'
import type { Env } from './infrastructure/config/env'
import { MembrosHttp } from './infrastructure/members/membros-http'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { createDbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from './infrastructure/persistence/drizzle/repositorio'
import { createServer } from './interfaces/http/server'

export interface Application {
  logger: Logger
  start(): Promise<void>
  stop(): Promise<void>
}

export function createApplication(env: Env): Application {
  const logger = withSentryMirror(
    createLogger({ level: env.NODE_ENV === 'production' ? 'info' : 'debug' }),
  )
  const connection = createDbConnection(env.DATABASE_URL, { max: env.DATABASE_POOL_MAX })
  const politica = {
    modo: env.ARQUIPELAGO_MODO,
    publicos: new Set(env.ARQUIPELAGO_PUBLICOS),
    lista: new Set(env.ARQUIPELAGO_LISTA),
  }
  const servico = new ServicoDoJogo(new DrizzleRepositorioDoJogo(connection.db), politica)
  const membros =
    env.MEMBERS_URL && env.ARQUIPELAGO_MEMBERS_TOKEN
      ? new MembrosHttp({ url: env.MEMBERS_URL, token: env.ARQUIPELAGO_MEMBERS_TOKEN })
      : null
  const mapa = new ConferenciaDoMapa(membros, logger)
  const cartas = new ServicoDasCartas(politica, new LeiturasDosMembros(membros))
  const app = createServer({
    logger,
    servico,
    cartas,
    cliente: { dir: env.ARQUIPELAGO_CLIENTE_DIR, servirMapas: env.ARQUIPELAGO_SERVIR_MAPAS },
    tokenInterno: env.INTERNAL_API_TOKEN,
    maxRequestBodyBytes: env.MAX_REQUEST_BODY_BYTES,
    readiness: async () => {
      await connection.sql`select 1`
    },
    mapaDasIlhas: () => mapa.situacao().situacao,
  })

  let server: ReturnType<typeof app.listen> | null = null
  return {
    logger,
    async start() {
      server = app.listen({ hostname: env.HOST, port: env.PORT })
      logger.info('app.started', {
        port: env.PORT,
        appEnv: env.APP_ENV ?? 'dev',
        modo: env.ARQUIPELAGO_MODO,
        publicos: env.ARQUIPELAGO_PUBLICOS,
        members: membros !== null,
      })
      // Não segura a subida: o resultado sai no log e no /readyz.
      void mapa.conferir()
    },
    async stop() {
      await server?.stop()
      await connection.close()
    },
  }
}
