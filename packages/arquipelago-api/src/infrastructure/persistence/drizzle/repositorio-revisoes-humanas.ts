import {
  type ItemDaFilaDeRevisao,
  ItemDaFilaDeRevisaoSchema,
  type RevisaoHumana,
  RevisaoHumanaSchema,
} from '@sistemazero/arquipelago-contracts'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import type { RepositorioDasRevisoesHumanas } from '../../../domain/revisoes-humanas.port'
import type { Database } from './db'
import { revisoesHumanas } from './schema'

type Linha = typeof revisoesHumanas.$inferSelect

function revisao(l: Linha): RevisaoHumana {
  return RevisaoHumanaSchema.parse({
    estado: l.estado,
    envio: l.envio,
    enviadoEm: l.enviadoEm.toISOString(),
    ...(l.retorno ? { retorno: l.retorno } : {}),
    ...(l.revisadoEm ? { revisadoEm: l.revisadoEm.toISOString() } : {}),
  })
}
function item(l: Linha): ItemDaFilaDeRevisao {
  return ItemDaFilaDeRevisaoSchema.parse({
    ...revisao(l),
    jogadorId: l.jogadorId,
    desafioId: l.desafioId,
    publico: l.publico,
    titulo: l.titulo,
  })
}

export class DrizzleRepositorioDasRevisoesHumanas implements RepositorioDasRevisoesHumanas {
  constructor(private readonly db: Database) {}

  async enviar(e: Parameters<RepositorioDasRevisoesHumanas['enviar']>[0]) {
    await this.db
      .insert(revisoesHumanas)
      .values({
        jogadorId: e.jogadorId,
        desafioId: e.desafioId,
        publico: e.publico,
        titulo: e.titulo,
        estado: 'aguardando',
        enviadoEm: e.agora,
      })
      .onConflictDoUpdate({
        target: [revisoesHumanas.jogadorId, revisoesHumanas.desafioId],
        // O retorno anterior fica até a resposta nova; o envio muda e trava a resposta velha.
        set: {
          estado: 'aguardando',
          titulo: e.titulo,
          envio: sql`${revisoesHumanas.envio} + 1`,
          enviadoEm: e.agora,
        },
      })
  }

  async daPessoa(jogadorId: string) {
    const linhas = await this.db
      .select()
      .from(revisoesHumanas)
      .where(eq(revisoesHumanas.jogadorId, jogadorId))
    return new Map(linhas.map((l) => [l.desafioId, revisao(l)]))
  }

  async fila(filtro: Parameters<RepositorioDasRevisoesHumanas['fila']>[0]) {
    const linhas = await this.db
      .select()
      .from(revisoesHumanas)
      .where(filtro.estado ? eq(revisoesHumanas.estado, filtro.estado) : undefined)
      // Quem espera há mais tempo primeiro; as respondidas, das mais novas para as mais velhas.
      .orderBy(
        filtro.estado === 'aguardando'
          ? asc(revisoesHumanas.enviadoEm)
          : desc(revisoesHumanas.enviadoEm),
        revisoesHumanas.jogadorId,
      )
      .limit(filtro.limite)
    return linhas.map(item)
  }

  async ler(jogadorId: string, desafioId: string) {
    const [l] = await this.db
      .select()
      .from(revisoesHumanas)
      .where(
        and(eq(revisoesHumanas.jogadorId, jogadorId), eq(revisoesHumanas.desafioId, desafioId)),
      )
    return l ? item(l) : null
  }

  async responder(e: Parameters<RepositorioDasRevisoesHumanas['responder']>[0]) {
    const feitas = await this.db
      .update(revisoesHumanas)
      .set({
        estado: e.estado,
        retorno: e.retorno,
        revisadoPor: e.revisadoPor,
        revisadoEm: e.agora,
      })
      .where(
        and(
          eq(revisoesHumanas.jogadorId, e.jogadorId),
          eq(revisoesHumanas.desafioId, e.desafioId),
          eq(revisoesHumanas.envio, e.envio),
        ),
      )
      .returning({ envio: revisoesHumanas.envio })
    return feitas.length > 0
  }
}
