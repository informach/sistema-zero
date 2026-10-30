import { createLogger, type Logger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from './application/leituras-dos-membros'
import { ConferenciaDoMapa } from './application/mapa-das-ilhas'
import { ServicoDaEquipe } from './application/servico-da-equipe'
import { ServicoDaFamilia } from './application/servico-da-familia'
import { ServicoDaGaleria } from './application/servico-da-galeria'
import { ServicoDaMedicao } from './application/servico-da-medicao'
import { ServicoDasCartas } from './application/servico-das-cartas'
import { ServicoDasProfissoes } from './application/servico-das-profissoes'
import { ServicoDasVisitas } from './application/servico-das-visitas'
import { ServicoDoJogo } from './application/servico-do-jogo'
import { ServicoDosDesafios } from './application/servico-dos-desafios'
import { ServicoDosFantasmas } from './application/servico-dos-fantasmas'
import { ServicoDosInsumos } from './application/servico-dos-insumos'
import { ServicoDosMinijogos } from './application/servico-dos-minijogos'
import { ServicoDosPedidos } from './application/servico-dos-pedidos'
import type { Env } from './infrastructure/config/env'
import { MembrosHttp } from './infrastructure/members/membros-http'
import { MoedasHttp } from './infrastructure/members/moedas-http'
import { PosseHttp } from './infrastructure/members/posse-http'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { createDbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDoJogo } from './infrastructure/persistence/drizzle/repositorio'
import { DrizzleRepositorioDaFamilia } from './infrastructure/persistence/drizzle/repositorio-da-familia'
import {
  DrizzleRepositorioDeDesafios,
  DrizzleRepositorioDoJogadorNosDesafios,
} from './infrastructure/persistence/drizzle/repositorio-de-desafios'
import { DrizzleRepositorioDosFantasmas } from './infrastructure/persistence/drizzle/repositorio-fantasmas'
import { DrizzleRepositorioDosInsumos } from './infrastructure/persistence/drizzle/repositorio-insumos'
import { DrizzleRepositorioDaMedicao } from './infrastructure/persistence/drizzle/repositorio-medicao'
import { DrizzleRepositorioDosMinijogos } from './infrastructure/persistence/drizzle/repositorio-minijogos'
import { DrizzleRepositorioDosPedidos } from './infrastructure/persistence/drizzle/repositorio-pedidos'
import { DrizzleRepositorioDasProfissoes } from './infrastructure/persistence/drizzle/repositorio-profissoes'
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
  const posse =
    env.MEMBERS_URL && env.ARQUIPELAGO_COINS_TOKEN
      ? new PosseHttp({ url: env.MEMBERS_URL, token: env.ARQUIPELAGO_COINS_TOKEN })
      : null
  const galeria = new ServicoDaGaleria({ posse, politica })
  const servico = new ServicoDoJogo(
    new DrizzleRepositorioDoJogo(connection.db),
    politica,
    undefined,
    new RepositorioDeSessoesDeTempo(connection.db),
    (jogador) => galeria.aparenciasPagas(jogador),
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
    minijogos: new DrizzleRepositorioDosMinijogos(connection.db),
    politica,
    modo: env.ARQUIPELAGO_DESAFIOS,
    repo: new DrizzleRepositorioDoJogadorNosDesafios(connection.db),
    leituras,
    membros,
    moedas,
    logger,
  })
  const repositorioDaFamilia = new DrizzleRepositorioDaFamilia(connection.db)
  const familia = new ServicoDaFamilia({
    familia: repositorioDaFamilia,
    jogo: new DrizzleRepositorioDoJogo(connection.db),
    desafios: new DrizzleRepositorioDoJogadorNosDesafios(connection.db),
    politica,
    modoDosDesafios: env.ARQUIPELAGO_DESAFIOS,
    leituras,
    logger,
  })
  const visitas = new ServicoDasVisitas({
    familia: repositorioDaFamilia,
    politica,
    membros,
    logger,
  })
  const app = createServer({
    fantasmas: new ServicoDosFantasmas({
      repo: new DrizzleRepositorioDosFantasmas(connection.db),
      politica,
      visitas,
    }),
    pedidos: new ServicoDosPedidos({
      repo: new DrizzleRepositorioDosPedidos(connection.db),
      moedas,
      leituras,
      politica,
      logger,
    }),
    insumos: new ServicoDosInsumos({
      repo: new DrizzleRepositorioDosInsumos(connection.db),
      debito: moedas,
      politica,
    }),
    profissoes: new ServicoDasProfissoes({
      repo: new DrizzleRepositorioDasProfissoes(connection.db),
      moedas,
      leituras,
      politica,
      logger,
    }),
    minijogos: new ServicoDosMinijogos(new DrizzleRepositorioDosMinijogos(connection.db), politica),
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
    galeria,
    visitas,
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
