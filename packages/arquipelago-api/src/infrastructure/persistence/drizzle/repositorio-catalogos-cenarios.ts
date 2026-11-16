import { and, desc, eq } from 'drizzle-orm'
import type {
  CatalogoGuardado,
  RepositorioDeCatalogos,
} from '../../../application/catalogo-de-cenarios'
import type { Database } from './db'
import { cenarioCatalogos as catalogos } from './schema'

export class DrizzleRepositorioDeCatalogos implements RepositorioDeCatalogos {
  constructor(private readonly db: Database) {}
  async registrar(c: CatalogoGuardado) {
    await this.db.insert(catalogos).values(c).onConflictDoNothing()
  }
  async obter(id: string, digest: string) {
    const [c] = await this.db
      .select()
      .from(catalogos)
      .where(and(eq(catalogos.id, id), eq(catalogos.digest, digest)))
    return c ? { ...c, criadoEm: new Date(c.criadoEm).toISOString() } : null
  }
  async listar() {
    const lista = await this.db
      .select({
        id: catalogos.id,
        digest: catalogos.digest,
        autorId: catalogos.autorId,
        criadoEm: catalogos.criadoEm,
      })
      .from(catalogos)
      .orderBy(desc(catalogos.criadoEm))
      .limit(200)
    return lista.map((c) => ({ ...c, criadoEm: new Date(c.criadoEm).toISOString() }))
  }
}
