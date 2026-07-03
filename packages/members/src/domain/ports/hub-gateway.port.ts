/** Post de vitrine de um filho na janela (report dos pais). */
export interface ShowcaseByAuthorItem {
  authorId: string
  title: string
  playId: string | null
  createdAt: string
}

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
  /**
   * Posts de vitrine dos PERFIS dados em `[from, to)` — report dos pais (S2S HMAC
   * direto members→hub; a rota do hub NUNCA vai ao gateway). **Best-effort**: erro/
   * timeout → `null` (o report degrada sem a lista de jogos). O CHAMADOR garante
   * que os authorIds são os filhos da conta.
   */
  listShowcaseByAuthors(
    authorIds: string[],
    from: Date,
    to: Date,
  ): Promise<ShowcaseByAuthorItem[] | null>
}
