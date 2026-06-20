import type { AvatarConfig } from '../avatar/avatar-config'
import type { CourseAudience } from '../course/course'

/**
 * Persistência do avatar (config equipada + inventário de peças PAGAS possuídas),
 * por perfil POR VITRINE. Espelha o estilo do `GamificationRepository`: chaves
 * (userId, audience); `accountId` IMUTÁVEL (só no INSERT da config).
 */
export interface AvatarRepository {
  /** Config equipada do perfil (`null` = nunca salvou → o serviço cai no default). */
  getConfig(userId: string, audience: CourseAudience): Promise<AvatarConfig | null>
  /** Upsert da config equipada (`accountId` gravado só no INSERT). */
  upsertConfig(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    config: AvatarConfig,
    now: Date,
  ): Promise<void>
  /** Ids das peças PAGAS possuídas (grátis não entram aqui — são implícitas). */
  listInventory(userId: string, audience: CourseAudience): Promise<string[]>
  /** Adiciona ao inventário (idempotente): `added=false` = já possuía. */
  addToInventory(
    userId: string,
    audience: CourseAudience,
    partId: string,
    now: Date,
  ): Promise<{ added: boolean }>
}
