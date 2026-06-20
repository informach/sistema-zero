import type { CourseAudience } from '../course/course'
import type { RoomState } from '../room/room-catalog'

/**
 * Persistência do quarto virtual (estado decorado + inventário de itens/temas PAGOS),
 * por perfil POR VITRINE. Espelha o `AvatarRepository`: chaves (userId, audience);
 * `accountId` IMUTÁVEL (só no INSERT do estado). Last-write-wins (sem version — o dono
 * é único; concorrência improvável).
 */
export interface RoomRepository {
  /** Estado do quarto do perfil (`null` = nunca montou → o serviço cai no vazio). */
  getState(userId: string, audience: CourseAudience): Promise<RoomState | null>
  /** Upsert do estado (canonicalizado pelo serviço). `accountId` gravado só no INSERT. */
  upsertState(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    state: RoomState,
    now: Date,
  ): Promise<void>
  /** Ids dos itens/temas PAGOS possuídos (grátis não entram — são implícitos). */
  listInventory(userId: string, audience: CourseAudience): Promise<string[]>
  /** Adiciona ao inventário (idempotente): `added=false` = já possuía. */
  addToInventory(
    userId: string,
    audience: CourseAudience,
    itemId: string,
    now: Date,
  ): Promise<{ added: boolean }>
}
