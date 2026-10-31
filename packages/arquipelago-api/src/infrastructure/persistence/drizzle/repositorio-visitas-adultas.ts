import { and, eq } from 'drizzle-orm'
import type { RepositorioDasVisitasAdultas } from '../../../domain/visitas-adultas.port'
import type { Database } from './db'
import { convitesAdultos, salvamentos } from './schema'

export class DrizzleRepositorioDasVisitasAdultas implements RepositorioDasVisitasAdultas {
  constructor(private readonly db: Database) {}
  async ativo(jogadorId: string) {
    const [r] = await this.db
      .select({ id: convitesAdultos.jogadorId })
      .from(convitesAdultos)
      .innerJoin(salvamentos, eq(salvamentos.jogadorId, convitesAdultos.jogadorId))
      .where(and(eq(convitesAdultos.jogadorId, jogadorId), eq(salvamentos.publico, 'adulto')))
    return Boolean(r)
  }
  async gerar(jogadorId: string, hash: string, agora: Date) {
    return this.db.transaction(async (tx) => {
      const [s] = await tx
        .select({ id: salvamentos.jogadorId })
        .from(salvamentos)
        .where(and(eq(salvamentos.jogadorId, jogadorId), eq(salvamentos.publico, 'adulto')))
        .for('update')
      if (!s) return false
      await tx
        .insert(convitesAdultos)
        .values({ jogadorId, hash, criadoEm: agora })
        .onConflictDoUpdate({ target: convitesAdultos.jogadorId, set: { hash, criadoEm: agora } })
      return true
    })
  }
  async desligar(jogadorId: string) {
    await this.db.delete(convitesAdultos).where(eq(convitesAdultos.jogadorId, jogadorId))
  }
  async encontrar(hash: string) {
    const [r] = await this.db
      .select({ jogadorId: convitesAdultos.jogadorId, salvamento: salvamentos.dados })
      .from(convitesAdultos)
      .innerJoin(salvamentos, eq(salvamentos.jogadorId, convitesAdultos.jogadorId))
      .where(and(eq(convitesAdultos.hash, hash), eq(salvamentos.publico, 'adulto')))
    return r ?? null
  }
  async confirmar(hash: string, jogadorId: string) {
    const [r] = await this.db
      .select({ id: convitesAdultos.jogadorId })
      .from(convitesAdultos)
      .innerJoin(salvamentos, eq(salvamentos.jogadorId, convitesAdultos.jogadorId))
      .where(
        and(
          eq(convitesAdultos.hash, hash),
          eq(convitesAdultos.jogadorId, jogadorId),
          eq(salvamentos.publico, 'adulto'),
        ),
      )
    return Boolean(r)
  }
  async dono(hash: string) {
    const [r] = await this.db
      .select({ id: convitesAdultos.jogadorId })
      .from(convitesAdultos)
      .innerJoin(salvamentos, eq(salvamentos.jogadorId, convitesAdultos.jogadorId))
      .where(and(eq(convitesAdultos.hash, hash), eq(salvamentos.publico, 'adulto')))
    return r?.id ?? null
  }
}
