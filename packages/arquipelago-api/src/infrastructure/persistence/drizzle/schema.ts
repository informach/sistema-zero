import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

/**
 * Schema `arquipelago` (Postgres compartilhado, 1 schema por bounded context). Só o serviço do
 * jogo lê e grava aqui; a plataforma nunca toca estas tabelas (e o jogo nunca toca as dela).
 */
export const arquipelagoSchema = pgSchema('arquipelago')

/** Um salvamento por jogador (perfil no Kids, conta no adulto). `revisao` é a trava. */
export const salvamentos = arquipelagoSchema.table(
  'salvamentos',
  {
    jogadorId: uuid().primaryKey(),
    publico: varchar({ length: 8 }).notNull(),
    revisao: integer().notNull(),
    dados: jsonb().notNull(),
    criadoEm: timestamp({ withTimezone: true }).notNull(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    check('salvamentos_publico_check', sql`${t.publico} in ('kids', 'adulto')`),
    check('salvamentos_revisao_check', sql`${t.revisao} >= 1`),
  ],
)

/** Segundos de tempo livre por jogador e dia civil de São Paulo. */
export const tempoDiario = arquipelagoSchema.table(
  'tempo_diario',
  {
    jogadorId: uuid().notNull(),
    dia: date({ mode: 'string' }).notNull(),
    segundos: integer().notNull(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.jogadorId, t.dia] }),
    check('tempo_diario_segundos_check', sql`${t.segundos} between 0 and 86400`),
  ],
)

/** Eventos aceitos, para que uma resposta perdida possa ser reenviada sem somar duas vezes. */
export const eventosTempo = arquipelagoSchema.table(
  'eventos_tempo',
  {
    jogadorId: uuid().notNull(),
    eventoId: uuid().notNull(),
    dia: date({ mode: 'string' }).notNull(),
    segundos: integer().notNull(),
    criadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.jogadorId, t.eventoId] }),
    check('eventos_tempo_segundos_check', sql`${t.segundos} between 1 and 120`),
  ],
)

/** O limite diário que o responsável escolheu para a família (sem linha = 30 minutos). */
export const limitesDaFamilia = arquipelagoSchema.table(
  'limites_da_familia',
  {
    contaId: uuid().primaryKey(),
    minutos: integer().notNull(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [check('limites_da_familia_minutos_check', sql`${t.minutos} between 10 and 240`)],
)

/**
 * Os desafios cadastrados pela equipe (seção Jogo do Admin). `revisao` é a trava da edição; a
 * publicação congela uma cópia em `desafio_publicacoes`. Um quadro do Quadro das Cores por ilha e
 * público (fora os arquivados).
 */
export const desafios = arquipelagoSchema.table(
  'desafios',
  {
    id: uuid().primaryKey(),
    slug: varchar({ length: 80 }).notNull(),
    publico: varchar({ length: 8 }).notNull(),
    ilha: varchar({ length: 40 }).notNull(),
    tipo: varchar({ length: 40 }).notNull(),
    quadro: smallint(),
    ordem: integer().notNull(),
    situacao: varchar({ length: 12 }).notNull(),
    revisao: integer().notNull(),
    revisaoPublicada: integer(),
    conteudo: jsonb().notNull(),
    criadoEm: timestamp({ withTimezone: true }).notNull(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull(),
    atualizadoPor: uuid().notNull(),
  },
  (t) => [
    uniqueIndex('desafios_slug_unico').on(t.slug),
    uniqueIndex('desafios_quadro_unico')
      .on(t.publico, t.ilha, t.quadro)
      .where(sql`${t.tipo} = 'quadro-das-cores' and ${t.situacao} <> 'arquivado'`),
    index('desafios_lista').on(t.publico, t.ilha, t.ordem),
    check('desafios_publico_check', sql`${t.publico} in ('kids', 'adulto')`),
    check(
      'desafios_tipo_check',
      sql`${t.tipo} in ('quadro-das-cores', 'desafio-do-dia', 'pedido-de-morador')`,
    ),
    check('desafios_situacao_check', sql`${t.situacao} in ('rascunho', 'publicado', 'arquivado')`),
    check(
      'desafios_quadro_check',
      sql`(${t.tipo} = 'quadro-das-cores') = (${t.quadro} is not null) and (${t.quadro} is null or ${t.quadro} between 1 and 6)`,
    ),
    check('desafios_revisao_check', sql`${t.revisao} >= 1`),
  ],
)

/** Cópia imutável de cada publicação: o que a pessoa joga e o que a conferência usa. */
export const desafioPublicacoes = arquipelagoSchema.table(
  'desafio_publicacoes',
  {
    desafioId: uuid()
      .notNull()
      .references(() => desafios.id, { onDelete: 'cascade' }),
    revisao: integer().notNull(),
    conteudo: jsonb().notNull(),
    blocosDerivados: text().array().notNull(),
    blocosExigidos: text().array().notNull(),
    /** Os objetivos como a criança os vê (sem regra), feitos pelo Members na publicação. */
    vista: jsonb().notNull(),
    analise: jsonb().notNull(),
    publicadoEm: timestamp({ withTimezone: true }).notNull(),
    publicadoPor: uuid().notNull(),
  },
  (t) => [primaryKey({ columns: [t.desafioId, t.revisao] })],
)

/** O último resultado de cada objetivo para quem está tentando (por desafio). */
export const desafioProgresso = arquipelagoSchema.table(
  'desafio_progresso',
  {
    jogadorId: uuid().notNull(),
    desafioId: uuid()
      .notNull()
      .references(() => desafios.id, { onDelete: 'cascade' }),
    revisao: integer().notNull(),
    ultimosResultados: jsonb().notNull(),
    atualizadoEm: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.jogadorId, t.desafioId] })],
)

/**
 * Desafio feito. Feito continua feito: existindo a linha, a disponibilidade não é recalculada
 * (mudança nos blocos dos cursos não tira o que a pessoa fez). As moedas saem pela porta do
 * Members com chave única; `moedas_situacao` guarda o que ainda falta confirmar (`teto` = o teto
 * semanal de moedas do jogo já tinha sido alcançado: o prêmio espera e é cobrado de novo numa semana
 * seguinte, guardada em `moedas_teto_semana`).
 */
export const desafiosConcluidos = arquipelagoSchema.table(
  'desafios_concluidos',
  {
    jogadorId: uuid().notNull(),
    desafioId: uuid()
      .notNull()
      .references(() => desafios.id, { onDelete: 'cascade' }),
    publico: varchar({ length: 8 }).notNull(),
    revisao: integer().notNull(),
    concluidoEm: timestamp({ withTimezone: true }).notNull(),
    extraConcluidoEm: timestamp({ withTimezone: true }),
    recompensaVistaEm: timestamp({ withTimezone: true }),
    moedas: integer().notNull(),
    moedasSituacao: varchar({ length: 12 }).notNull(),
    moedasExtra: integer().notNull(),
    moedasExtraSituacao: varchar({ length: 12 }).notNull(),
    /** Semana (segunda, em São Paulo, `AAAA-MM-DD`) em que o prêmio bateu no teto semanal. */
    moedasTetoSemana: varchar({ length: 10 }),
    moedasExtraTetoSemana: varchar({ length: 10 }),
  },
  (t) => [
    primaryKey({ columns: [t.jogadorId, t.desafioId] }),
    index('desafios_concluidos_jogador').on(t.jogadorId),
    check('desafios_concluidos_publico_check', sql`${t.publico} in ('kids', 'adulto')`),
    check(
      'desafios_concluidos_moedas_check',
      sql`${t.moedasSituacao} in ('nenhuma', 'pendente', 'creditado', 'teto') and ${t.moedasExtraSituacao} in ('nenhuma', 'pendente', 'creditado', 'teto')`,
    ),
  ],
)

export const schema = {
  salvamentos,
  tempoDiario,
  eventosTempo,
  limitesDaFamilia,
  desafios,
  desafioPublicacoes,
  desafioProgresso,
  desafiosConcluidos,
}
