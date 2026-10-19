export interface CleanupShowcaseArtifactsArgs {
  /** Canonical post author, captured from the thread in the terminal transaction. */
  authorId: string
  audience?: 'adult' | 'kids'
  /** Id público do artefato jogável (UUID) → key `studio/play/<playId>.json` no R2 privado. */
  playId: string
  /** URL pública da capa (R2 público) OU `null` quando o post não tinha capa. */
  coverUrl: string | null
}

/**
 * Saída S2S hub → BFF do kids p/ APAGAR os artefatos R2 de um post do Mural quando ele
 * é apagado ou recusado (deleted/rejected terminais; hidden/pending NÃO limpam).
 * O R2 é do BFF (member-shell) — o hub, dono do ciclo de vida do post, só AVISA.
 * True confirma recebimento durável no BFF. Falhas retornam false para retry da outbox.
 */
export interface StudioArtifactGateway {
  cleanupShowcaseArtifacts(args: CleanupShowcaseArtifactsArgs): Promise<boolean>
}

/** No-op p/ dev/local/testes (sem `KIDS_BFF_BASE_URL`) — não limpa nada. */
export const noopStudioArtifactGateway: StudioArtifactGateway = {
  async cleanupShowcaseArtifacts() {
    return false
  },
}
