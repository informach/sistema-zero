/**
 * Notificação ao HUB (comunidade) de que o acesso de um usuário MUDOU — para o hub
 * invalidar o micro-cache de acesso NA HORA, sem esperar o TTL. É um efeito
 * **best-effort**: a concessão/revogação NUNCA pode falhar por causa do hub (o TTL
 * do hub, ~30s, cobre como rede de segurança se a notificação falhar).
 */
export interface HubGateway {
  /**
   * Sinaliza ao hub que o acesso do `userId` mudou (`event` = `grant`/`revoke`/…,
   * só para log/dedupe). **NUNCA lança** (implementações engolem erro/timeout).
   */
  notifyAccessChanged(userId: string, event: string): Promise<void>
}
