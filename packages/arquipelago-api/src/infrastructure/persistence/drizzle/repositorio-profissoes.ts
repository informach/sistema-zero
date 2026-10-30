import type { PublicoJogo } from '@sistemazero/arquipelago-contracts'
import { and, asc, eq, isNotNull, ne, or, sql } from 'drizzle-orm'
import type { RepositorioDasProfissoes, TurnoGuardado } from '../../../domain/profissoes.port'
import type { Database } from './db'
import { turnosRemunerados as t } from './schema'

export class DrizzleRepositorioDasProfissoes implements RepositorioDasProfissoes {
  constructor(private readonly db: Database) {}

  async reservar(
    entrada: Omit<TurnoGuardado, 'concluidoEm' | 'pagamento' | 'tetoSemana'>,
    agora: Date,
  ) {
    await this.db
      .insert(t)
      .values({ ...entrada, criadoEm: agora, pagamento: 'aguardando' })
      .onConflictDoNothing({ target: [t.jogadorId, t.publico, t.posto, t.dia] })
    const [r] = await this.db
      .select()
      .from(t)
      .where(
        and(
          eq(t.jogadorId, entrada.jogadorId),
          eq(t.publico, entrada.publico),
          eq(t.posto, entrada.posto),
          eq(t.dia, entrada.dia),
        ),
      )
      .limit(1)
    if (!r) throw new Error('Reserva de turno ausente')
    return r
  }

  async ler(id: string, jogadorId: string, publico: PublicoJogo) {
    const [r] = await this.db
      .select()
      .from(t)
      .where(and(eq(t.id, id), eq(t.jogadorId, jogadorId), eq(t.publico, publico)))
      .limit(1)
    return r ?? null
  }

  async concluir(id: string, jogadorId: string, publico: PublicoJogo, agora: Date) {
    const [r] = await this.db
      .update(t)
      .set({
        concluidoEm: sql`coalesce(${t.concluidoEm},${agora.toISOString()}::timestamptz)`,
        pagamento: sql`case when ${t.concluidoEm} is null then 'pendente' else ${t.pagamento} end`,
      })
      .where(and(eq(t.id, id), eq(t.jogadorId, jogadorId), eq(t.publico, publico)))
      .returning()
    if (!r) throw new Error('Turno para conclusão ausente')
    return r
  }

  async marcarPagamento(id: string, situacao: 'creditado' | 'teto', semana: string) {
    await this.db
      .update(t)
      .set({ pagamento: situacao, tetoSemana: situacao === 'teto' ? semana : null })
      .where(and(eq(t.id, id), isNotNull(t.concluidoEm), ne(t.pagamento, 'creditado')))
  }

  async pendentes(jogadorId: string, publico: PublicoJogo, semana: string, limite: number) {
    return this.db
      .select()
      .from(t)
      .where(
        and(
          eq(t.jogadorId, jogadorId),
          eq(t.publico, publico),
          or(eq(t.pagamento, 'pendente'), and(eq(t.pagamento, 'teto'), ne(t.tetoSemana, semana))),
        ),
      )
      .orderBy(asc(t.criadoEm), asc(t.id))
      .limit(limite)
  }
}
