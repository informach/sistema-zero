import 'server-only'
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3'
import { getEnv } from '@/lib/env'

// Espelha o @sistemazero/admin (src/server/r2.ts) — mesmo bucket R2, prefixo próprio.
const DEFAULT_CACHE_CONTROL = 'public, max-age=31536000, immutable'

/** Lançado quando a feature não está configurada (env ausente) — vira 503 amigável. */
export class MediaNotConfiguredError extends Error {
  readonly code = 'MEDIA_NOT_CONFIGURED'
}

interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicBaseUrl: string
}

/** Config completa ou erro amigável (as envs são opcionais no schema). */
function requireR2Config(): R2Config {
  const env = getEnv()
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET ||
    !env.R2_PUBLIC_URL
  ) {
    throw new MediaNotConfiguredError(
      'Upload indisponível: configure R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET/R2_PUBLIC_URL.',
    )
  }
  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET,
    publicBaseUrl: env.R2_PUBLIC_URL.replace(/\/+$/, ''),
  }
}

/** Bucket PRIVADO (materiais didáticos) — sem URL pública; leitura só via S3 API. */
interface R2PrivateConfig {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

/** Config do bucket privado ou erro amigável (mesmas credenciais; bucket próprio). */
function requirePrivateR2Config(): R2PrivateConfig {
  const env = getEnv()
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_PRIVATE_BUCKET
  ) {
    throw new MediaNotConfiguredError(
      'Download indisponível: configure R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_PRIVATE_BUCKET.',
    )
  }
  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_PRIVATE_BUCKET,
  }
}

let cachedClient: S3Client | null = null

// O client S3 é por CONTA (endpoint+credenciais) — o bucket é parâmetro do comando,
// então público e privado compartilham a mesma instância cacheada.
function getClient(cfg: {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
}): S3Client {
  if (cachedClient) return cachedClient
  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    // Sem teto, R2 pendurado = request do aluno pendurada. O requestTimeout é
    // generoso porque materiais didáticos chegam a 200MB (stream). Espelha o admin.
    requestHandler: { connectionTimeout: 5_000, requestTimeout: 120_000 },
  })
  return cachedClient
}

function normalizeKey(key: string): string {
  return key.replace(/^\/+/, '')
}

export interface R2PutObjectInput {
  key: string
  body: Buffer | Uint8Array
  contentType: string
  cacheControl?: string
}

/** Sobe um objeto no R2 e devolve a URL pública (cache imutável por padrão). */
export async function r2PutObject(input: R2PutObjectInput): Promise<{ key: string; url: string }> {
  const cfg = requireR2Config()
  const key = normalizeKey(input.key)
  const command: PutObjectCommandInput = {
    Bucket: cfg.bucket,
    Key: key,
    Body: input.body,
    ContentType: input.contentType,
    CacheControl: input.cacheControl ?? DEFAULT_CACHE_CONTROL,
  }
  try {
    await getClient(cfg).send(new PutObjectCommand(command))
  } catch (error) {
    console.error('[r2] putObject falhou', { key, error })
    // `cause` preservada: o Sentry (mediaErrorResponse) enxerga o erro real do S3.
    throw new Error('Falha ao enviar o arquivo para o armazenamento.', { cause: error })
  }
  return { key, url: `${cfg.publicBaseUrl}/${key}` }
}

/** Lista as keys sob um prefixo do bucket PÚBLICO (limpeza de avatares antigos). */
export async function r2ListKeys(prefix: string): Promise<string[]> {
  const cfg = requireR2Config()
  const res = await getClient(cfg).send(
    new ListObjectsV2Command({ Bucket: cfg.bucket, Prefix: normalizeKey(prefix), MaxKeys: 100 }),
  )
  return (res.Contents ?? [])
    .map((o) => o.Key)
    .filter((k): k is string => typeof k === 'string' && k.length > 0)
}

/** Apaga objetos do bucket PÚBLICO em lote (limpeza de avatares antigos). */
export async function r2DeleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const cfg = requireR2Config()
  await getClient(cfg).send(
    new DeleteObjectsCommand({
      Bucket: cfg.bucket,
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    }),
  )
}

/** Objeto do bucket privado em STREAM — consuma OU bufferize (`bufferFromStream`). */
export interface R2PrivateObject {
  body: ReadableStream<Uint8Array>
  contentType: string | null
  /** Tamanho declarado — decide buffer (marca d'água) vs stream direto. */
  contentLength: number | null
}

/**
 * Abre um objeto do bucket PRIVADO (materiais didáticos) como STREAM para a
 * rota autenticada de download. Quem decide bufferizar é o caller (só os
 * formatos marcáveis precisam — office/zip de até 100MB seguem em stream,
 * sem materializar o arquivo inteiro em memória).
 */
export async function r2GetObjectPrivate(key: string): Promise<R2PrivateObject> {
  const cfg = requirePrivateR2Config()
  const normalized = normalizeKey(key)
  try {
    const res = await getClient(cfg).send(
      new GetObjectCommand({ Bucket: cfg.bucket, Key: normalized }),
    )
    if (!res.Body) throw new Error('Objeto sem corpo')
    return {
      body: res.Body.transformToWebStream() as ReadableStream<Uint8Array>,
      contentType: res.ContentType ?? null,
      contentLength: typeof res.ContentLength === 'number' ? res.ContentLength : null,
    }
  } catch (error) {
    console.error('[r2] getObjectPrivate falhou', { key: normalized, error })
    // `cause` preservada: o Sentry (mediaErrorResponse) enxerga o erro real do S3.
    throw new Error('Falha ao buscar o arquivo no armazenamento.', { cause: error })
  }
}

/** Materializa um stream em Buffer (SÓ p/ aplicar marca d'água — tem teto no caller). */
export async function bufferFromStream(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  return Buffer.from(await new Response(stream).arrayBuffer())
}
