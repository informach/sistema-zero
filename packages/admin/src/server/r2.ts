import 'server-only'
import {
  GetObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getEnv } from '@/lib/env'

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

/** Bucket PRIVADO (materiais didáticos) — sem URL pública; leitura só via S3 API. */
interface R2PrivateConfig {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
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
      'Upload indisponível: configure R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_PRIVATE_BUCKET.',
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
    // Sem teto, R2 pendurado = handler pendurado. O requestTimeout é generoso
    // porque anexos chegam a 200MB (upload single-part).
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
  contentDisposition?: string
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
    ContentDisposition: input.contentDisposition,
  }
  try {
    await getClient(cfg).send(new PutObjectCommand(command))
  } catch (error) {
    console.error('[r2] putObject falhou', { key, error })
    // Preserva o erro do S3 como `cause` → o Sentry (via mediaErrorResponse)
    // captura a causa real, não só a mensagem amigável.
    throw new Error('Falha ao enviar o arquivo para o armazenamento.', { cause: error })
  }
  return { key, url: r2PublicUrl(key) }
}

export interface R2PutObjectPrivateInput {
  key: string
  body: Buffer | Uint8Array
  contentType: string
}

/**
 * Sobe um objeto no bucket PRIVADO (materiais didáticos). Devolve só a key —
 * NUNCA existe URL pública; o download é servido pelo community (com marca d'água).
 */
export async function r2PutObjectPrivate(input: R2PutObjectPrivateInput): Promise<{ key: string }> {
  const cfg = requirePrivateR2Config()
  const key = normalizeKey(input.key)
  try {
    await getClient(cfg).send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    )
  } catch (error) {
    console.error('[r2] putObjectPrivate falhou', { key, error })
    throw new Error('Falha ao enviar o arquivo para o armazenamento.', { cause: error })
  }
  return { key }
}

const MAX_KNOWLEDGE_PDF_BYTES = 50 * 1024 * 1024

/** Lê um PDF privado para a ingestão didática; nunca devolve URL pública. */
export async function r2ReadPrivateObject(reference: string): Promise<Uint8Array> {
  if (!reference.startsWith('r2priv:')) throw new Error('Referência privada inválida')
  const cfg = requirePrivateR2Config()
  const key = normalizeKey(reference.slice('r2priv:'.length))
  const result = await getClient(cfg).send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }))
  if ((result.ContentLength ?? 0) > MAX_KNOWLEDGE_PDF_BYTES) {
    throw new Error('PDF excede 50 MB para extração de texto')
  }
  if (!result.Body) throw new Error('PDF privado sem conteúdo')
  const bytes = await result.Body.transformToByteArray()
  if (bytes.byteLength > MAX_KNOWLEDGE_PDF_BYTES) {
    throw new Error('PDF excede 50 MB para extração de texto')
  }
  return bytes
}

export interface R2PresignPrivatePutInput {
  key: string
  contentType: string
  /**
   * Tamanho exato (bytes). Quando presente, entra na ASSINATURA (`content-length`
   * em `signableHeaders`): o R2 recusa um PUT cujo corpo tenha tamanho diferente.
   * Sem isso o teto de 200MB checado na rota é só consultivo — o upload vai DIRETO
   * pro R2, então só a assinatura prende o tamanho de verdade (achado do review).
   */
  contentLength?: number
  /**
   * Validade do link (segundos). Default 1h — um PDF de 200MB em uplink lento
   * (BR) leva dezenas de minutos; janela curta demais faria o PUT falhar no meio.
   */
  expiresInSeconds?: number
}

/**
 * Gera uma URL PUT pré-assinada p/ o bucket PRIVADO: o browser sobe o arquivo
 * DIRETO no R2, sem passar pelo admin nem pela borda do Cloudflare (que no plano
 * Free corta o corpo em 100MB) — mesmo modelo do upload direto de vídeo (Vimeo
 * TUS). A `key` é SEMPRE gerada no servidor (o cliente não escolhe onde grava) e
 * o `content-type` entra na assinatura (`signableHeaders`): o PUT do browser
 * PRECISA mandar exatamente o mesmo valor, senão o R2 recusa. O objeto continua
 * sem URL pública — o download é servido pelo community (com marca d'água).
 */
export async function r2PresignPrivatePut(
  input: R2PresignPrivatePutInput,
): Promise<{ key: string; uploadUrl: string }> {
  const cfg = requirePrivateR2Config()
  const key = normalizeKey(input.key)
  const pinLength = typeof input.contentLength === 'number' && input.contentLength > 0
  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ContentType: input.contentType,
    ...(pinLength ? { ContentLength: input.contentLength } : {}),
  })
  const uploadUrl = await getSignedUrl(getClient(cfg), command, {
    expiresIn: input.expiresInSeconds ?? 3600,
    // `content-length` assinado só quando temos o tamanho → o browser SEMPRE manda
    // o Content-Length casando com o arquivo, então o R2 prende o teto de verdade.
    signableHeaders: new Set(pinLength ? ['content-type', 'content-length'] : ['content-type']),
  })
  return { key, uploadUrl }
}

export function r2PublicUrl(key: string): string {
  return `${requireR2Config().publicBaseUrl}/${normalizeKey(key)}`
}
