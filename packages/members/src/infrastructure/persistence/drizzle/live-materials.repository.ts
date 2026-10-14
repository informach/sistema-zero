import { eq } from 'drizzle-orm'
import type {
  LiveMaterialRecord,
  LiveMaterialsPort,
} from '../../../domain/ports/live-materials.port'
import type { Database } from './db'
import { liveMaterials } from './schema'

export class DrizzleLiveMaterialsRepository implements LiveMaterialsPort {
  constructor(private readonly db: Database) {}
  async find(id: string) {
    const [row] = await this.db
      .select()
      .from(liveMaterials)
      .where(eq(liveMaterials.id, id))
      .limit(1)
    return row ? { ...row, createdAt: row.createdAt.toISOString() } : null
  }
  async create(input: LiveMaterialRecord) {
    await this.db.insert(liveMaterials).values({ ...input, createdAt: new Date(input.createdAt) })
  }
}
