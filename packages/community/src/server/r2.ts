import 'server-only'
import {
  GetObjectCommand,
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
    throw new Error('Falha ao enviar o arquivo para o armazenamento.')
  }
  return { key, url: `${cfg.publicBaseUrl}/${key}` }
}

/**
 * Baixa um objeto do bucket PRIVADO (materiais didáticos) para a rota autenticada
 * de download — onde a marca d'água com o e-mail do aluno é aplicada.
 */
export async function r2GetObjectPrivate(
  key: string,
): Promise<{ body: Buffer; contentType: string }> {
  const cfg = requirePrivateR2Config()
  const normalized = normalizeKey(key)
  try {
    const res = await getClient(cfg).send(
      new GetObjectCommand({ Bucket: cfg.bucket, Key: normalized }),
    )
    if (!res.Body) throw new Error('Objeto sem corpo')
    const body = Buffer.from(await res.Body.transformToByteArray())
    return { body, contentType: res.ContentType ?? 'application/octet-stream' }
  } catch (error) {
    console.error('[r2] getObjectPrivate falhou', { key: normalized, error })
    throw new Error('Falha ao buscar o arquivo no armazenamento.')
  }
}
