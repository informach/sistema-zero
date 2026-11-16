import { isDeepStrictEqual } from 'node:util'
import type {
  EstadoDeSessao,
  ResultadoDeViewport,
  SessaoDeCenario,
  TarefaDeViewport,
} from '@sistemazero/molda-cenarios-core'
import { and, asc, eq, gt, inArray, lt } from 'drizzle-orm'
import type { RepositorioDeSessoesDeCenario } from '../../../application/sessoes-de-cenarios'
import type { Database } from './db'
import { cenarioSessoes as sessoes, cenarioTarefas as tarefas } from './schema'

export class DrizzleSessoesDeCenarios implements RepositorioDeSessoesDeCenario {
  constructor(private readonly db: Database) {}
  async limpar(antes: string) {
    // Capturas e filas são efêmeras. Remove por lotes para não monopolizar o banco.
    await this.db
      .delete(tarefas)
      .where(
        inArray(
          tarefas.id,
          this.db
            .select({ id: tarefas.id })
            .from(tarefas)
            .where(lt(tarefas.expiraEm, antes))
            .limit(200),
        ),
      )
    await this.db
      .delete(sessoes)
      .where(
        inArray(
          sessoes.id,
          this.db
            .select({ id: sessoes.id })
            .from(sessoes)
            .where(lt(sessoes.expiraEm, antes))
            .limit(200),
        ),
      )
  }
  async listar(agora: string) {
    return this.db.select().from(sessoes).where(gt(sessoes.expiraEm, agora)).limit(200)
  }
  async criar(s: SessaoDeCenario) {
    await this.db.insert(sessoes).values(s)
  }
  async ler(id: string) {
    return (await this.db.select().from(sessoes).where(eq(sessoes.id, id)))[0] ?? null
  }
  async pulso(id: string, autor: string, estado: EstadoDeSessao, expiraEm: string) {
    const r = await this.db
      .update(sessoes)
      .set({ estado, expiraEm })
      .where(and(eq(sessoes.id, id), eq(sessoes.autorId, autor)))
      .returning({ id: sessoes.id })
    return r.length === 1
  }
  async pedir(t: TarefaDeViewport) {
    await this.db.insert(tarefas).values(t).onConflictDoNothing()
    const r = await this.lerTarefa(t.id)
    if (
      !r ||
      r.sessaoId !== t.sessaoId ||
      r.autorId !== t.autorId ||
      !isDeepStrictEqual(r.pedido, t.pedido)
    )
      throw Error('Identificador de pedido reutilizado')
    return r
  }
  async lerTarefa(id: string) {
    return (await this.db.select().from(tarefas).where(eq(tarefas.id, id)))[0] ?? null
  }
  async reivindicar(sessaoId: string, agora: string) {
    return this.db.transaction(async (tx) => {
      await tx
        .select({ id: sessoes.id })
        .from(sessoes)
        .where(eq(sessoes.id, sessaoId))
        .for('update')
      const atual = await tx
        .select({ id: tarefas.id })
        .from(tarefas)
        .where(
          and(
            eq(tarefas.sessaoId, sessaoId),
            eq(tarefas.estado, 'executando'),
            gt(tarefas.expiraEm, agora),
          ),
        )
        .limit(1)
      if (atual.length) return null
      const [proxima] = await tx
        .select()
        .from(tarefas)
        .where(
          and(
            eq(tarefas.sessaoId, sessaoId),
            eq(tarefas.estado, 'pendente'),
            gt(tarefas.expiraEm, agora),
          ),
        )
        .orderBy(asc(tarefas.expiraEm))
        .limit(1)
      if (!proxima) return null
      return (
        (
          await tx
            .update(tarefas)
            .set({ estado: 'executando' })
            .where(and(eq(tarefas.id, proxima.id), eq(tarefas.estado, 'pendente')))
            .returning()
        )[0] ?? null
      )
    })
  }
  async concluir(id: string, sessaoId: string, resultado: ResultadoDeViewport) {
    const r = await this.db
      .update(tarefas)
      .set({ estado: 'concluido', resultado })
      .where(
        and(eq(tarefas.id, id), eq(tarefas.sessaoId, sessaoId), eq(tarefas.estado, 'executando')),
      )
      .returning({ id: tarefas.id })
    if (r.length === 1) return true
    const existente = await this.lerTarefa(id)
    return (
      existente?.sessaoId === sessaoId &&
      existente.estado === 'concluido' &&
      isDeepStrictEqual(existente.resultado, resultado)
    )
  }
}
