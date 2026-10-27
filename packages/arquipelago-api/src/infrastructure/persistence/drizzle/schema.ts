import { sql } from 'drizzle-orm'
import {
  check,
  date,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  timestamp,
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

export const schema = { salvamentos, tempoDiario, eventosTempo, limitesDaFamilia }
