import { createLogger, type Logger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from './application/leituras-dos-membros'
import { ConferenciaDoMapa } from './application/mapa-das-ilhas'
import { ServicoDaEquipe } from './application/servico-da-equipe'
import { ServicoDaFamilia } from './application/servico-da-familia'
import { ServicoDaMedicao } from './application/servico-da-medicao'
import { ServicoDasCartas } from './application/servico-das-cartas'
import { ServicoDoJogo } from './application/servico-do-jogo'
import { ServicoDosDesafios } from './application/servico-dos-desafios'
import type { Env } from './infrastructure/config/env'
import { MembrosHttp } from './infrastructure/members/membros-http'
import { MoedasHttp } from './infrastructure/members/moedas-http'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { createDbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from './infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDaFamilia } from './infrastructure/persistence/drizzle/repositorio-da-familia'
import {
  DrizzleRepositorioDeDesafios,
  DrizzleRepositorioDoJogadorNosDesafios,
} from './infrastructure/persistence/drizzle/repositorio-de-desafios'
import { DrizzleRepositorioDaMedicao } from './infrastructure/persistence/drizzle/repositorio-medicao'
import { RepositorioDeSessoesDeTempo } from './infrastructure/persistence/drizzle/repositorio-sessoes-tempo'
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
  const servico = new ServicoDoJogo(
    new DrizzleRepositorioDoJogo(connection.db),
    politica,
    undefined,
    new RepositorioDeSessoesDeTempo(connection.db),
  )
  const membros =
    env.MEMBERS_URL && env.ARQUIPELAGO_MEMBERS_TOKEN
      ? new MembrosHttp({ url: env.MEMBERS_URL, token: env.ARQUIPELAGO_MEMBERS_TOKEN })
      : null
  const mapa = new ConferenciaDoMapa(membros, logger)
  const leituras = new LeiturasDosMembros(membros)
  const cartas = new ServicoDasCartas(politica, leituras)
  const equipe = new ServicoDaEquipe(
    new DrizzleRepositorioDeDesafios(connection.db),
    membros,
    leituras,
    mapa,
  )
  const moedas =
    env.MEMBERS_URL && env.ARQUIPELAGO_COINS_TOKEN
      ? new MoedasHttp({ url: env.MEMBERS_URL, token: env.ARQUIPELAGO_COINS_TOKEN })
      : null
  const desafios = new ServicoDosDesafios({
    politica,
    modo: env.ARQUIPELAGO_DESAFIOS,
    repo: new DrizzleRepositorioDoJogadorNosDesafios(connection.db),
    leituras,
    membros,
    moedas,
    logger,
  })
  const familia = new ServicoDaFamilia({
    familia: new DrizzleRepositorioDaFamilia(connection.db),
    jogo: new DrizzleRepositorioDoJogo(connection.db),
    desafios: new DrizzleRepositorioDoJogadorNosDesafios(connection.db),
    politica,
    modoDosDesafios: env.ARQUIPELAGO_DESAFIOS,
    leituras,
    logger,
  })
  const app = createServer({
    medicao: new ServicoDaMedicao(
      new DrizzleRepositorioDaMedicao(connection.db),
      undefined,
      leituras,
      logger,
    ),
    logger,
    servico,
    cartas,
    equipe,
    desafios,
    familia,
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
        desafios: env.ARQUIPELAGO_DESAFIOS,
        moedas: moedas !== null,
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
