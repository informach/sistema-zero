import {
  type Fantasma,
  FantasmaSchema,
  type GuardarFantasma,
  melhorTempoDoPercurso,
  migrarSalvamento,
  type PercursoId,
  type PublicoJogo,
} from '@sistemazero/arquipelago-contracts'
import { and, eq } from 'drizzle-orm'
import type { RepositorioDosFantasmas } from '../../../domain/fantasmas.port'
import type { Database } from './db'
import { fantasmas, salvamentos } from './schema'

export class DrizzleRepositorioDosFantasmas implements RepositorioDosFantasmas {
  constructor(private readonly db: Database) {}

  async guardar(
    jogadorId: string,
    publico: PublicoJogo,
    pedido: GuardarFantasma,
    agora: Date,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [linha] = await tx
        .select()
        .from(salvamentos)
        .where(and(eq(salvamentos.jogadorId, jogadorId), eq(salvamentos.publico, publico)))
        .for('update')
      const save = migrarSalvamento(linha?.dados)
      if (
        !save ||
        !linha ||
        linha.revisao !== pedido.revisaoBase ||
        melhorTempoDoPercurso(save.percursos, pedido.fantasma.percurso) !== pedido.fantasma.tempoMs
      )
        return false
      await tx
        .insert(fantasmas)
        .values({
          jogadorId,
          publico,
          percurso: pedido.fantasma.percurso,
          dados: pedido.fantasma,
          atualizadoEm: agora,
        })
        .onConflictDoUpdate({
          target: [fantasmas.jogadorId, fantasmas.percurso],
          set: { dados: pedido.fantasma, publico, atualizadoEm: agora },
        })
      return true
    })
  }

  async ler(
    jogadorId: string,
    publico: PublicoJogo,
    percurso: PercursoId,
  ): Promise<Fantasma | null> {
    const [linha] = await this.db
      .select({ dados: fantasmas.dados, save: salvamentos.dados })
      .from(fantasmas)
      .innerJoin(salvamentos, eq(fantasmas.jogadorId, salvamentos.jogadorId))
      .where(
        and(
          eq(fantasmas.jogadorId, jogadorId),
          eq(fantasmas.publico, publico),
          eq(salvamentos.publico, publico),
          eq(fantasmas.percurso, percurso),
        ),
      )
    if (!linha) return null
    const f = FantasmaSchema.safeParse(linha.dados)
    if (
      !f.success ||
      f.data.percurso !== percurso ||
      melhorTempoDoPercurso(migrarSalvamento(linha.save)?.percursos, percurso) !== f.data.tempoMs
    )
      return null
    return f.data
  }
}
