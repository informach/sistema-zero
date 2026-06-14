export interface ReadStateRepository {
  /** Marca o canal como visto agora (upsert por userId+channelId). */
  markSeen(userId: string, channelId: string, now: Date): Promise<void>
  /** Última visita do usuário a cada canal (ausente = nunca visto). */
  lastSeen(userId: string, channelIds: string[]): Promise<Map<string, Date>>
}
