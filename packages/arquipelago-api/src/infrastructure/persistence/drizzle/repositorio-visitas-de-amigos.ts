import { and, count, eq, inArray } from 'drizzle-orm'
import type { RepositorioDasVisitasDeAmigos } from '../../../domain/visitas-de-amigos.port'
import type { Database } from './db'
import { casasDeAmigos, convitesDeAmigos, salvamentos } from './schema'

/** Visitas de outras crianças (N08a): convites (hash) e casas aceitas por família. */
export class DrizzleRepositorioDasVisitasDeAmigos implements RepositorioDasVisitasDeAmigos {
  constructor(private readonly db: Database) {}

  async convitesAtivos(perfis: readonly string[]) {
    if (perfis.length === 0) return new Set<string>()
    const linhas = await this.db
      .select({ id: convitesDeAmigos.perfilId })
      .from(convitesDeAmigos)
      .where(inArray(convitesDeAmigos.perfilId, [...perfis]))
    return new Set(linhas.map((l) => l.id))
  }

  async gerarConvite(perfilId: string, contaId: string, hash: string, agora: Date) {
    return this.db.transaction(async (tx) => {
      const [s] = await tx
        .select({ id: salvamentos.jogadorId })
        .from(salvamentos)
        .where(and(eq(salvamentos.jogadorId, perfilId), eq(salvamentos.publico, 'kids')))
        .for('update')
      if (!s) return false
      await tx
        .insert(convitesDeAmigos)
        .values({ perfilId, contaId, hash, criadoEm: agora })
        .onConflictDoUpdate({
          target: convitesDeAmigos.perfilId,
          set: { contaId, hash, criadoEm: agora },
        })
      return true
    })
  }

  async apagarConvite(perfilId: string, contaId: string) {
    await this.db
      .delete(convitesDeAmigos)
      .where(and(eq(convitesDeAmigos.perfilId, perfilId), eq(convitesDeAmigos.contaId, contaId)))
  }

  async conviteDoCodigo(hash: string) {
    const [r] = await this.db
      .select({ perfilId: convitesDeAmigos.perfilId, contaId: convitesDeAmigos.contaId })
      .from(convitesDeAmigos)
      .where(eq(convitesDeAmigos.hash, hash))
    return r ?? null
  }

  async aceitar(
    contaVisitante: string,
    perfilAnfitriao: string,
    apelido: string,
    agora: Date,
    maximo: number,
  ) {
    return this.db.transaction(async (tx) => {
      const [existente] = await tx
        .select({ id: casasDeAmigos.id })
        .from(casasDeAmigos)
        .where(
          and(
            eq(casasDeAmigos.contaVisitante, contaVisitante),
            eq(casasDeAmigos.perfilAnfitriao, perfilAnfitriao),
          ),
        )
        .for('update')
      if (existente) {
        await tx.update(casasDeAmigos).set({ apelido }).where(eq(casasDeAmigos.id, existente.id))
        return existente.id
      }
      const [quantas] = await tx
        .select({ n: count() })
        .from(casasDeAmigos)
        .where(eq(casasDeAmigos.contaVisitante, contaVisitante))
      if ((quantas?.n ?? 0) >= maximo) return null
      const [nova] = await tx
        .insert(casasDeAmigos)
        .values({ contaVisitante, perfilAnfitriao, apelido, criadoEm: agora })
        .returning({ id: casasDeAmigos.id })
      return nova?.id ?? null
    })
  }

  async remover(contaVisitante: string, id: string) {
    await this.db
      .delete(casasDeAmigos)
      .where(and(eq(casasDeAmigos.id, id), eq(casasDeAmigos.contaVisitante, contaVisitante)))
  }

  async casasDaConta(contaVisitante: string) {
    const linhas = await this.db
      .select({
        id: casasDeAmigos.id,
        apelido: casasDeAmigos.apelido,
        perfilAnfitriao: casasDeAmigos.perfilAnfitriao,
        contaAnfitria: convitesDeAmigos.contaId,
      })
      .from(casasDeAmigos)
      .leftJoin(convitesDeAmigos, eq(convitesDeAmigos.perfilId, casasDeAmigos.perfilAnfitriao))
      .where(eq(casasDeAmigos.contaVisitante, contaVisitante))
      .orderBy(casasDeAmigos.criadoEm)
    return linhas.map((l) => ({ ...l, conviteAtivo: l.contaAnfitria !== null }))
  }
}
