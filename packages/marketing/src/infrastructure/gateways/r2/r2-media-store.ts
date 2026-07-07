import { Readable } from 'node:stream'
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
  /** Timeout do PUT streaming (vídeo de até 2GB — o teto de 30s do client normal o mataria). */
  transferTimeoutMs?: number
}

/**
 * MediaStore no Cloudflare R2 (bucket PRIVADO de marketing). Presign PUT prende
 * content-type e content-length na assinatura (padrão validado no admin — sem
 * isso o teto de upload seria só consultivo, pois os bytes vão DIRETO ao R2).
 */
export class R2MediaStore implements MediaStore {
  private readonly client: S3Client
  /** Client dedicado às TRANSFERÊNCIAS (put streaming): timeout longo próprio. */
  private readonly transferClient: S3Client
  private readonly bucket: string

  constructor(config: R2MediaStoreConfig) {
    this.bucket = config.bucket
    const base = {
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }
    this.client = new S3Client({
      ...base,
      // Sem teto, R2 pendurado = handler pendurado (presign é CPU-only, mas o
      // HEAD/DELETE falam com a rede).
      requestHandler: { connectionTimeout: 5_000, requestTimeout: 30_000 },
    })
    this.transferClient = new S3Client({
      ...base,
      requestHandler: {
        connectionTimeout: 5_000,
        requestTimeout: config.transferTimeoutMs ?? 30 * 60_000,
      },
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

  async put(input: {
    key: string
    contentType: string
    sizeBytes: number
    body: ReadableStream<Uint8Array>
  }): Promise<void> {
    // PUT único em streaming (Readable.fromWeb + ContentLength conhecido do
    // metadado do Drive). Teto de upload 2GB < limite de 5GB do PUT do R2 —
    // multipart (@aws-sdk/lib-storage) fica como fallback documentado se o PUT
    // único se provar instável no Bun.
    await this.transferClient.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        ContentType: input.contentType,
        ContentLength: input.sizeBytes,
        Body: Readable.fromWeb(input.body as import('node:stream/web').ReadableStream<Uint8Array>),
      }),
    )
  }
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const name = (error as { name?: unknown }).name
  const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
  return name === 'NotFound' || name === 'NoSuchKey' || status === 404
}
