import { Readable } from 'node:stream'
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { UploadedPart } from '@sistemazero/marketing-contracts'
import type { HeadResult, MediaStore } from '../../../domain/ports/media-store.port'
import type { MultipartStore } from '../../../domain/ports/multipart-store.port'

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
export class R2MediaStore implements MediaStore, MultipartStore {
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

  async createMultipart(key: string, mime: string) {
    const result = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mime,
        ContentDisposition: 'attachment',
      }),
    )
    if (!result.UploadId) throw new Error('O armazenamento não retornou o identificador do envio')
    return result.UploadId
  }
  async signPart(input: {
    key: string
    uploadId: string
    number: number
    size: number
    md5: string
  }) {
    return getSignedUrl(
      this.client,
      new UploadPartCommand({
        Bucket: this.bucket,
        Key: input.key,
        UploadId: input.uploadId,
        PartNumber: input.number,
        ContentLength: input.size,
        ContentMD5: input.md5,
      }),
      {
        expiresIn: 900,
        signableHeaders: new Set(['content-length', 'content-md5']),
        unhoistableHeaders: new Set(['content-md5']),
      },
    )
  }
  async listParts(key: string, uploadId: string): Promise<UploadedPart[]> {
    const parts: UploadedPart[] = []
    let marker: string | undefined
    do {
      const result = await this.client.send(
        new ListPartsCommand({
          Bucket: this.bucket,
          Key: key,
          UploadId: uploadId,
          PartNumberMarker: marker,
          MaxParts: 1000,
        }),
      )
      for (const part of result.Parts ?? []) {
        if (!part.PartNumber || !part.ETag || !part.Size)
          throw new Error('O armazenamento retornou uma parte incompleta')
        parts.push({ number: part.PartNumber, size: part.Size, etag: part.ETag })
      }
      if (parts.length > 239) throw new Error('Quantidade de partes acima do limite')
      marker = result.IsTruncated ? result.NextPartNumberMarker : undefined
      if (result.IsTruncated && !marker) throw new Error('Paginação incompleta do armazenamento')
    } while (marker)
    return parts.sort((a, b) => a.number - b.number)
  }
  async completeMultipart(key: string, uploadId: string, parts: UploadedPart[]) {
    await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map((part) => ({ PartNumber: part.number, ETag: part.etag })),
        },
      }),
    )
  }
  async abortMultipart(key: string, uploadId: string) {
    await this.client.send(
      new AbortMultipartUploadCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId }),
    )
  }

  async presignGet(input: {
    key: string
    expiresInSeconds: number
    downloadName?: string
  }): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ...(input.downloadName
        ? {
            ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(input.downloadName)}`,
          }
        : {}),
    })
    return getSignedUrl(this.client, command, { expiresIn: input.expiresInSeconds })
  }

  async head(key: string, signal?: AbortSignal): Promise<HeadResult> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
        { abortSignal: signal },
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

  async getRange(input: { key: string; start: number; endInclusive: number }): Promise<Uint8Array> {
    const result = await this.transferClient.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Range: `bytes=${input.start}-${input.endInclusive}`,
      }),
    )
    if (!result.Body) throw new Error('R2 não devolveu corpo no GET por range')
    return result.Body.transformToByteArray()
  }

  async getStream(key: string, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
    const result = await this.transferClient.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { abortSignal: signal },
    )
    if (!result.Body) throw new Error('R2 não devolveu corpo no GET')
    return result.Body.transformToWebStream() as ReadableStream<Uint8Array>
  }

  async put(input: {
    key: string
    contentType: string
    sizeBytes: number
    body: ReadableStream<Uint8Array>
    signal?: AbortSignal
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
      { abortSignal: input.signal },
    )
  }
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const name = (error as { name?: unknown }).name
  const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
  return name === 'NotFound' || name === 'NoSuchKey' || status === 404
}
