/**
 * Porta do storage de mídia (R2). O serviço é o DONO do bucket de marketing:
 * presigna PUT (upload direto do browser), presigna GET (preview no app e a URL
 * pública temporária que a Meta baixa na publicação) e confere uploads via HEAD.
 */
export interface HeadResult {
  exists: boolean
  sizeBytes: number | null
  contentType: string | null
}

export interface MediaStore {
  /** URL PUT pré-assinada (content-type e content-length ENTRAM na assinatura). */
  presignPut(input: {
    key: string
    contentType: string
    sizeBytes: number
    expiresInSeconds: number
  }): Promise<string>
  /** URL GET pré-assinada (preview/download; também alimenta a Meta na publicação). */
  presignGet(input: { key: string; expiresInSeconds: number }): Promise<string>
  head(key: string): Promise<HeadResult>
  delete(key: string): Promise<void>
  /**
   * Grava um objeto em STREAMING (import Drive→R2 do media-transfer-worker).
   * `sizeBytes` é o ContentLength declarado (metadado do Drive) — PUT único
   * (teto de upload 2GB < limite de 5GB do R2), nunca materializa em memória.
   */
  put(input: {
    key: string
    contentType: string
    sizeBytes: number
    body: ReadableStream<Uint8Array>
  }): Promise<void>
}
