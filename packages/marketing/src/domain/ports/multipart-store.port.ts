import type { UploadedPart } from '@sistemazero/marketing-contracts'
import type { MediaStore } from './media-store.port'
/** The upload session is absent; this alone does not prove whether its object completed. */
export class MultipartUploadMissingError extends Error {
  constructor(options?: ErrorOptions) {
    super('A sessão temporária de envio não existe mais no armazenamento', options)
    this.name = 'MultipartUploadMissingError'
  }
}
export interface MultipartStore extends Pick<MediaStore, 'head' | 'presignGet'> {
  getStream(key: string, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>>
  createMultipart(key: string, mime: string): Promise<string>
  signPart(input: {
    key: string
    uploadId: string
    number: number
    size: number
    md5: string
  }): Promise<string>
  listParts(key: string, uploadId: string): Promise<UploadedPart[]>
  completeMultipart(key: string, uploadId: string, parts: UploadedPart[]): Promise<void>
  abortMultipart(key: string, uploadId: string): Promise<void>
}
