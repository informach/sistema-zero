export interface CleanupShowcaseArtifactsArgs {
  /** Id público do artefato jogável (UUID) → key `studio/play/<playId>.json` no R2 privado. */
  playId: string
  /** URL pública da capa (R2 público) OU `null` quando o post não tinha capa. */
  coverUrl: string | null
}

/**
 * Saída S2S hub → BFF do kids p/ APAGAR os artefatos R2 de um post do Mural quando ele
 * é APAGADO pela moderação (o `deleted` é terminal; `hide` é reversível e NÃO limpa).
 * O R2 é do BFF (member-shell) — o hub, dono do ciclo de vida do post, só AVISA.
 * Best-effort: as implementações NUNCA lançam (o chamador dispara em fire-and-forget).
 */
export interface StudioArtifactGateway {
  cleanupShowcaseArtifacts(args: CleanupShowcaseArtifactsArgs): Promise<void>
}

/** No-op p/ dev/local/testes (sem `KIDS_BFF_BASE_URL`) — não limpa nada. */
export const noopStudioArtifactGateway: StudioArtifactGateway = {
  async cleanupShowcaseArtifacts() {},
}
