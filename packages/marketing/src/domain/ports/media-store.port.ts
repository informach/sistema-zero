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
}
