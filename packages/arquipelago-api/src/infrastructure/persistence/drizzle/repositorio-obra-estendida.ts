import {
  type GravarObraEstendida,
  type LeituraDaObraEstendida,
  ObraEstendidaSchema,
  type PublicoJogo,
} from '@sistemazero/arquipelago-contracts'
import { and, eq, sql } from 'drizzle-orm'
import {
  ObraEstendidaIlegivelError,
  ObraSemSalvamentoError,
  type RepositorioDaObraEstendida,
  type ResultadoDaObraEstendida,
} from '../../../domain/obra-estendida.port'
import type { Database } from './db'
import { obrasEstendidas, salvamentos } from './schema'

function leitura(linha: { revisao: number; documento: unknown } | undefined) {
  if (!linha) return { revisao: 0, obra: null } satisfies LeituraDaObraEstendida
  const obra = ObraEstendidaSchema.safeParse(linha.documento)
  if (!obra.success) throw new ObraEstendidaIlegivelError()
  return { revisao: linha.revisao, obra: obra.data } satisfies LeituraDaObraEstendida
}

export class DrizzleRepositorioDaObraEstendida implements RepositorioDaObraEstendida {
  constructor(private readonly db: Database) {}

  async ler(jogadorId: string, publico: PublicoJogo): Promise<LeituraDaObraEstendida> {
    const [linha] = await this.db
      .select({ revisao: obrasEstendidas.revisao, documento: obrasEstendidas.documento })
      .from(obrasEstendidas)
      .where(and(eq(obrasEstendidas.jogadorId, jogadorId), eq(obrasEstendidas.publico, publico)))
    return leitura(linha)
  }

  async gravar(
    jogadorId: string,
    publico: PublicoJogo,
    pedido: GravarObraEstendida,
    agora: Date,
  ): Promise<ResultadoDaObraEstendida> {
    return this.db.transaction(async (tx) => {
      // Trava o salvamento (só para ler): apagar o jogo no meio não deixa a obra órfã.
      const [save] = await tx
        .select({ publico: salvamentos.publico })
        .from(salvamentos)
        .where(eq(salvamentos.jogadorId, jogadorId))
        .for('share')
      if (save?.publico !== publico) throw new ObraSemSalvamentoError()
      const colunas = { revisao: obrasEstendidas.revisao, documento: obrasEstendidas.documento }
      const onde = and(
        eq(obrasEstendidas.jogadorId, jogadorId),
        eq(obrasEstendidas.publico, publico),
      )
      const [guardada] =
        pedido.revisaoBase === 0
          ? await tx
              .insert(obrasEstendidas)
              .values({
                jogadorId,
                publico,
                revisao: 1,
                documento: pedido.obra,
                atualizadoEm: agora,
              })
              .onConflictDoNothing({ target: [obrasEstendidas.jogadorId, obrasEstendidas.publico] })
              .returning(colunas)
          : await tx
              .update(obrasEstendidas)
              .set({
                revisao: sql`${obrasEstendidas.revisao} + 1`,
                documento: pedido.obra,
                atualizadoEm: agora,
              })
              .where(and(onde, eq(obrasEstendidas.revisao, pedido.revisaoBase)))
              .returning(colunas)
      if (guardada) return { ok: true, guardada: { revisao: guardada.revisao, obra: pedido.obra } }
      const [atual] = await tx.select(colunas).from(obrasEstendidas).where(onde)
      return { ok: false, atual: leitura(atual) }
    })
  }
}
