import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { HeadResult, MediaStore } from '../../../domain/ports/media-store.port'

export interface R2MediaStoreConfig {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

/**
 * MediaStore no Cloudflare R2 (bucket PRIVADO de marketing). Presign PUT prende
 * content-type e content-length na assinatura (padrão validado no admin — sem
 * isso o teto de upload seria só consultivo, pois os bytes vão DIRETO ao R2).
 */
export class R2MediaStore implements MediaStore {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(config: R2MediaStoreConfig) {
    this.bucket = config.bucket
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // Sem teto, R2 pendurado = handler pendurado (presign é CPU-only, mas o
      // HEAD/DELETE falam com a rede).
      requestHandler: { connectionTimeout: 5_000, requestTimeout: 30_000 },
    })
  }

  async presignPut(input: {
    key: string
    contentType: string
    sizeBytes: number
    expiresInSeconds: number
  }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.sizeBytes,
    })
    return getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds,
      // Assinados: o PUT do browser PRECISA mandar exatamente estes valores,
      // senão o R2 recusa — prende MIME e teto de verdade.
      signableHeaders: new Set(['content-type', 'content-length']),
    })
  }

  async presignGet(input: { key: string; expiresInSeconds: number }): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: input.key })
    return getSignedUrl(this.client, command, { expiresIn: input.expiresInSeconds })
  }

  async head(key: string): Promise<HeadResult> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      )
      return {
        exists: true,
        sizeBytes: typeof result.ContentLength === 'number' ? result.ContentLength : null,
        contentType: result.ContentType ?? null,
      }
    } catch (error) {
      if (isNotFound(error)) return { exists: false, sizeBytes: null, contentType: null }
      throw new Error('Falha ao verificar o arquivo no armazenamento.', { cause: error })
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const name = (error as { name?: unknown }).name
  const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
  return name === 'NotFound' || name === 'NoSuchKey' || status === 404
}
