import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { createLogger } from '@sistemazero/core/logging'
import { LeiturasDosMembros } from '../../src/application/leituras-dos-membros'
import { ConferenciaDoMapa } from '../../src/application/mapa-das-ilhas'
import { ServicoDaEquipe } from '../../src/application/servico-da-equipe'
import { ServicoDaMedicao } from '../../src/application/servico-da-medicao'
import { ServicoDasCartas } from '../../src/application/servico-das-cartas'
import { ServicoDoJogo } from '../../src/application/servico-do-jogo'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRepositorioDaMedicao } from '../../src/infrastructure/persistence/drizzle/repositorio-medicao'
import {
  desafios,
  desafiosConcluidos,
  salvamentos,
  sessoesDeTempo,
  tempoDiario,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { createServer } from '../../src/interfaces/http/server'
import { DesafiosEmMemoria, desafiosDesligados } from './desafios'
import { RepositorioEmMemoria } from './memoria'

export const AGORA_MEDICAO = new Date('2026-10-28T15:00:00Z')
export const TOKEN_MEDICAO = 'somente-local-medicao'
export const idMedicao = (n: number) => `12345678-1234-4234-8234-${String(n).padStart(12, '0')}`
export function validarBancoMedicao(url: string): void {
  const u = new URL(url)
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    !/^\/arquipelago_test(?:_[a-z0-9_]+)?$/.test(u.pathname)
  )
    throw new Error('Use um Postgres local descartável arquipelago_test.')
}
/** Dados fictícios exclusivamente no banco descartável validado pelo chamador. */
export async function semearMedicao(db: DbConnection) {
  await db.sql`TRUNCATE arquipelago.tempo_diario, arquipelago.sessoes_de_tempo, arquipelago.salvamentos, arquipelago.desafios CASCADE`
  for (let i = 1; i <= 10; i++) {
    const dias = ['2026-10-01', ...(i <= 5 ? ['2026-10-02', '2026-10-07'] : [])]
    for (const dia of dias)
      await db.db
        .insert(tempoDiario)
        .values({ jogadorId: idMedicao(i), dia, segundos: 60, atualizadoEm: AGORA_MEDICAO })
  }
  for (let i = 11; i <= 14; i++)
    await db.db.insert(tempoDiario).values({
      jogadorId: idMedicao(i),
      dia: '2026-10-10',
      segundos: 60,
      atualizadoEm: AGORA_MEDICAO,
    })
  // Janela ainda aberta e jogador antigo: não viram retorno zero nem nova entrada.
  await db.db.insert(tempoDiario).values([
    { jogadorId: idMedicao(30), dia: '2026-09-01', segundos: 60, atualizadoEm: AGORA_MEDICAO },
    { jogadorId: idMedicao(30), dia: '2026-10-01', segundos: 60, atualizadoEm: AGORA_MEDICAO },
    { jogadorId: idMedicao(31), dia: '2026-10-27', segundos: 60, atualizadoEm: AGORA_MEDICAO },
    { jogadorId: idMedicao(32), dia: '2026-10-01', segundos: 0, atualizadoEm: AGORA_MEDICAO },
  ])
  // Dez pessoas jogaram em 01/10 (sessão que contou tempo); uma sessão só aberta não conta.
  for (let i = 1; i <= 11; i++)
    await db.db.insert(sessoesDeTempo).values({
      jogadorId: idMedicao(i),
      sessaoId: idMedicao(500 + i),
      cursor: new Date(i === 11 ? '2026-10-01T15:00:00Z' : '2026-10-01T16:00:00Z'),
      vencimento: new Date('2026-10-01T16:00:20Z'),
      estado: 'encerrada',
      ultimaSequencia: 3,
      ultimaAcao: 'pausar',
      criadoEm: new Date('2026-10-01T15:00:00Z'),
      atualizadoEm: new Date('2026-10-01T16:00:00Z'),
    })
  for (const publico of ['kids', 'adulto'] as const) {
    for (let i = 1; i <= 5; i++) {
      const dados = criarSalvamentoInicial(AGORA_MEDICAO)
      const ganhoEm = '2026-10-02T03:00:00.000Z'
      dados.projetos =
        publico === 'kids'
          ? {
              geladeira: { ganhoEm, aparencia: { origem: 'pinta', id: 'ficticio' } },
              forno: { ganhoEm, aparencia: { origem: 'molda', id: 'ficticio' } },
            }
          : { geladeira: { ganhoEm, aparencia: { origem: 'galeria', id: 'ficticio' } } }
      await db.db.insert(salvamentos).values({
        jogadorId: idMedicao(i + (publico === 'adulto' ? 100 : 0)),
        publico,
        revisao: 1,
        dados,
        criadoEm: AGORA_MEDICAO,
        atualizadoEm: AGORA_MEDICAO,
      })
    }
  }
  await db.db.insert(desafios).values({
    id: idMedicao(200),
    slug: 'medicao-local',
    publico: 'kids',
    ilha: 'bosque',
    tipo: 'desafio-do-dia',
    ordem: 0,
    situacao: 'rascunho',
    revisao: 1,
    conteudo: {},
    criadoEm: AGORA_MEDICAO,
    atualizadoEm: AGORA_MEDICAO,
    atualizadoPor: idMedicao(999),
  })
  for (let i = 1; i <= 5; i++)
    await db.db.insert(desafiosConcluidos).values({
      jogadorId: idMedicao(i),
      desafioId: idMedicao(200),
      publico: 'kids',
      revisao: 1,
      concluidoEm: new Date('2026-10-02T02:59:59Z'),
      moedas: 0,
      moedasSituacao: 'creditado',
      moedasExtra: 0,
      moedasExtraSituacao: 'creditado',
    })
}
/** Members de mentira: as pessoas 1 a 5 concluíram aula duas horas depois de jogar em 01/10. */
export const aulasDaMedicao = {
  ligadas: () => true,
  async aulasConcluidas(usuarios: readonly string[]) {
    return new Map(
      usuarios
        .filter((u) => Number(u.slice(-12)) <= 5)
        .map((u) => [u, [new Date('2026-10-01T18:00:00Z')]]),
    )
  },
}
export function servidorMedicao(db: DbConnection) {
  const politica = {
    modo: 'aberto' as const,
    publicos: new Set(['kids' as const, 'adulto' as const]),
    lista: new Set<string>(),
  }
  const logger = createLogger({ level: 'error' })
  const leituras = new LeiturasDosMembros(null)
  return createServer({
    logger,
    servico: new ServicoDoJogo(new RepositorioEmMemoria(), politica),
    cartas: new ServicoDasCartas(politica, leituras),
    equipe: new ServicoDaEquipe(
      new DesafiosEmMemoria(),
      null,
      leituras,
      new ConferenciaDoMapa(null, logger),
    ),
    desafios: desafiosDesligados(politica),
    medicao: new ServicoDaMedicao(
      new DrizzleRepositorioDaMedicao(db.db),
      () => AGORA_MEDICAO,
      aulasDaMedicao,
    ),
    cliente: { dir: '/nao-existe', servirMapas: false },
    tokenInterno: TOKEN_MEDICAO,
    readiness: async () => {},
  })
}
