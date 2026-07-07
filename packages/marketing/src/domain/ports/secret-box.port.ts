/**
 * Porta da cifra de segredos (tokens sociais). A implementação real é
 * AES-256-GCM versionado (`infrastructure/security/secret-box.ts`); o domínio e
 * a aplicação só conhecem selar/abrir — a chave nunca circula por aqui.
 */
export interface SecretBox {
  /** Sela um texto em claro no formato versionado `v1.<iv>.<tag>.<ct>`. */
  seal(plain: string): string
  /** Abre um selo; formato/versão/tag inválidos lançam `SecretBoxError`. */
  open(sealed: string): string
}
