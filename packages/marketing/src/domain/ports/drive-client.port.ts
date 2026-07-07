/**
 * Porta do Google Drive (importação de mídia Drive→R2). Implementação com fetch
 * nativo em `infrastructure/gateways/google/google-drive-client.ts`.
 */
export interface DriveFile {
  id: string
  name: string
  mimeType: string
  sizeBytes: number | null
  modifiedTime: string | null
}

/** Erro do Drive: `permanent` (403/404 — sem acesso/apagado) não vale retry. */
export class DriveClientError extends Error {
  constructor(
    message: string,
    readonly permanent: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'DriveClientError'
  }
}

export interface DriveClient {
  /** Lista/busca arquivos (picker do app). `q` filtra por nome. */
  listFiles(
    accessToken: string,
    input: { q?: string; pageToken?: string; pageSize?: number },
  ): Promise<{ files: DriveFile[]; nextPageToken: string | null }>
  getFileMetadata(accessToken: string, fileId: string): Promise<DriveFile>
  /** Stream do conteúdo (`files.get?alt=media`) — nunca materializa em memória. */
  downloadStream(accessToken: string, fileId: string): Promise<ReadableStream<Uint8Array>>
}
