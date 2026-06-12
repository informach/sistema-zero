export interface FetchedAttachment {
  contentBase64: string
  /** Content-Type reportado pela origem (null quando ausente). */
  contentType: string | null
}

/**
 * Port de busca do CONTEÚDO de um anexo por URL no momento do envio — os bytes
 * nunca viajam no corpo do `POST /messaging/send` (teto de 64KB) nem são
 * persistidos; só os METADADOS ficam na mensagem. Em falha lança
 * `ProviderSendError`: transitória (timeout/4xx/5xx/tamanho) → mesmo caminho de
 * retry/backoff de um erro do provedor; permanente (URL inválida/host fora da
 * allowlist) → FAILED.
 */
export interface AttachmentFetcher {
  fetch(url: string): Promise<FetchedAttachment>
}
