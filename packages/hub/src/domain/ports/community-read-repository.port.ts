import type { Audience, Channel, Space } from '../space/space'

/**
 * Leitura STUDENT-facing da estrutura (só `status='active'`). Distinta da
 * `CommunityAdminRepository` (que enxerga tudo). O FILTRO DE ACESSO (matrícula/
 * cargo) é aplicado pela `AccessResolutionService` sobre o que isto devolve.
 */
export interface CommunityReadRepository {
  /** Servidores ativos de uma vitrine (ordenados). */
  listActiveSpaces(audience: Audience): Promise<Space[]>
  findActiveSpaceById(id: string): Promise<Space | null>
  findActiveSpaceBySlug(slug: string): Promise<Space | null>
  /** Canais ativos de um servidor (ordenados). */
  listActiveChannels(spaceId: string): Promise<Channel[]>
  findActiveChannelById(id: string): Promise<Channel | null>
}
