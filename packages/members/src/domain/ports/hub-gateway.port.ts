/** Post de vitrine de um filho na janela (report dos pais). */
export interface ShowcaseByAuthorItem {
  authorId: string
  title: string
  playId: string | null
  createdAt: string
}

/** Jogo publicado no Mural — vitrine do perfil público kids (com capa). */
export interface PublicGameItem {
  title: string
  /** Link público de jogar (`/jogar/<playId>`); `null` em snapshot legado sem play. */
  playId: string | null
  /**
   * Capa pública do jogo; `null` se não houver. ⚠️ No WIRE do hub o campo chama
   * `coverImageUrl` — o `hub-http.gateway` faz o renomeio (pinado por teste em
   * `tests/unit/hub-http.gateway.test.ts`); o hub renomear lá sem ajuste aqui
   * viraria capa `null` silenciosa no perfil público.
   */
  coverUrl: string | null
  publishedAt: string
}

/** Resultado do play-check S2S (validação do REMIX): o post existe/está visível? */
export interface PlayCheckResult {
  visible: boolean
  /** PERFIL autor do post (p/ recusar self-remix). `null` quando `visible: false`. */
  authorId: string | null
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
  /**
   * TODOS os jogos de vitrine visíveis de UM perfil (com capa, sem janela) — seção
   * "Jogos publicados" do perfil público kids. S2S HMAC direto members→hub (rota
   * NUNCA exposta no gateway). **Best-effort**: erro/timeout → `null` (o perfil
   * degrada sem a seção). O members só monta a seção num perfil PÚBLICO; os jogos já
   * são públicos na página `/jogar`.
   */
  listShowcaseByAuthor(profileId: string, limit: number): Promise<PublicGameItem[] | null>
  /**
   * Valida um `playId` no hub (S2S HMAC direto) — anti-farm do marco de REMIX: sem
   * isso, um POST direto com uuids aleatórios farmaria a missão semanal. `null` =
   * hub indisponível (o chamador NÃO grava o marco — melhor perder um marco de
   * missão que aceitar id não-verificado).
   */
  checkPlay(playId: string): Promise<PlayCheckResult | null>
}
