import 'server-only'
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getEnv } from '../lib/env'

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

/**
 * Materializa um stream em Buffer (SÓ p/ aplicar marca d'água). `maxBytes` é um
 * teto DEFENSIVO: o caller já escolhe pelo Content-Length do HEAD, mas um HEAD
 * sem `Content-Length` (ou que MENTE) faria bufferizar um objeto sem limite na
 * memória da réplica única (OOM). Com o teto, o excedente ABORTA o stream e lança
 * — o caller cai no `mediaErrorResponse` (503) em vez de derrubar o host.
 */
export async function bufferFromStream(
  stream: ReadableStream<Uint8Array>,
  maxBytes?: number,
): Promise<Buffer> {
  if (maxBytes === undefined) {
    return Buffer.from(await new Response(stream).arrayBuffer())
  }
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw new Error(`Objeto excede o teto de ${maxBytes} bytes para marca d'água.`)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks)
}

/** Metadados de um objeto do bucket PRIVADO sem abrir o corpo (HEAD). */
export interface R2PrivateHead {
  contentType: string | null
  contentLength: number | null
}

/** HEAD no bucket privado — null se o objeto não existe (decide cache/caminho). */
export async function r2HeadObjectPrivate(key: string): Promise<R2PrivateHead | null> {
  const cfg = requirePrivateR2Config()
  const normalized = normalizeKey(key)
  try {
    const res = await getClient(cfg).send(
      new HeadObjectCommand({ Bucket: cfg.bucket, Key: normalized }),
    )
    return {
      contentType: res.ContentType ?? null,
      contentLength: typeof res.ContentLength === 'number' ? res.ContentLength : null,
    }
  } catch (error) {
    const name = (error as { name?: string }).name
    if (name === 'NotFound' || name === 'NoSuchKey' || name === '404') return null
    console.error('[r2] headObjectPrivate falhou', { key: normalized, error })
    throw new Error('Falha ao consultar o arquivo no armazenamento.', { cause: error })
  }
}

/** Sobe um objeto no bucket PRIVADO (cache de PDFs com marca d'água por aluno). */
export async function r2PutObjectPrivate(input: R2PutObjectInput): Promise<void> {
  const cfg = requirePrivateR2Config()
  const key = normalizeKey(input.key)
  try {
    await getClient(cfg).send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
        // Cache HTTP é irrelevante aqui (bucket sem acesso público; a entrega é
        // por URL pré-assinada de TTL curto) — não usar o default público/imutável.
        CacheControl: input.cacheControl ?? 'private, no-store',
      }),
    )
  } catch (error) {
    console.error('[r2] putObjectPrivate falhou', { key, error })
    throw new Error('Falha ao gravar o arquivo no armazenamento.', { cause: error })
  }
}

/**
 * URL pré-assinada de GET no bucket PRIVADO (TTL curto). É como arquivos GRANDES
 * chegam ao aluno: o browser baixa DIRETO do R2 (rápido, com Range), em vez de
 * arrastar 100MB+ por Next→Railway→Cloudflare — cadeia que segura o arquivo
 * inteiro na memória do servidor enquanto escoa (era a causa do community
 * degradar com poucos downloads simultâneos).
 */
export async function r2PresignGetPrivate(
  key: string,
  opts: { expiresInSeconds?: number; responseContentDisposition?: string } = {},
): Promise<string> {
  const cfg = requirePrivateR2Config()
  return getSignedUrl(
    getClient(cfg),
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: normalizeKey(key),
      ResponseContentDisposition: opts.responseContentDisposition,
    }),
    { expiresIn: opts.expiresInSeconds ?? 300 },
  )
}

// ── UGC (anexos da comunidade/fórum) ─────────────────────────────────────────
// Bucket PRIVADO próprio. Diferente dos materiais didáticos: NÃO leva marca
// d'água (é conteúdo do próprio aluno) e o upload/download é DIRETO browser↔R2
// (presigned PUT/GET com CORS) — o BFF só assina, o hub autoriza.

interface R2UgcConfig {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

function requireUgcR2Config(): R2UgcConfig {
  const env = getEnv()
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_UGC_BUCKET
  ) {
    throw new MediaNotConfiguredError(
      'Anexos indisponíveis: configure R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_UGC_BUCKET.',
    )
  }
  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_UGC_BUCKET,
  }
}

/**
 * URL pré-assinada de PUT no bucket UGC. ASSINA `Content-Length` e `Content-Type`
 * exatos: o browser PUTa DIRETO no R2 e não consegue subir mais bytes nem outro
 * tipo do que foi autorizado (o tamanho deixa de ser "confiança no cliente"). TTL
 * curto. O arquivo grande nunca toca o Next/gateway (teto de 2MB da borda intacto).
 */
export async function r2PresignPutUgc(input: {
  key: string
  contentType: string
  contentLength: number
  expiresInSeconds?: number
}): Promise<string> {
  const cfg = requireUgcR2Config()
  return getSignedUrl(
    getClient(cfg),
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: normalizeKey(input.key),
      ContentType: input.contentType,
      ContentLength: input.contentLength,
    }),
    { expiresIn: input.expiresInSeconds ?? 300 },
  )
}

/** URL pré-assinada de GET no bucket UGC (TTL curto) — entrega direta browser←R2. */
export async function r2PresignGetUgc(
  key: string,
  opts: {
    expiresInSeconds?: number
    responseContentDisposition?: string
    responseContentType?: string
  } = {},
): Promise<string> {
  const cfg = requireUgcR2Config()
  return getSignedUrl(
    getClient(cfg),
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: normalizeKey(key),
      ResponseContentDisposition: opts.responseContentDisposition,
      ResponseContentType: opts.responseContentType,
    }),
    { expiresIn: opts.expiresInSeconds ?? 300 },
  )
}

/** Sobe um objeto no bucket UGC (caminho de IMAGEM: o BFF re-encoda antes de subir). */
export async function r2PutObjectUgc(input: R2PutObjectInput): Promise<void> {
  const cfg = requireUgcR2Config()
  const key = normalizeKey(input.key)
  try {
    await getClient(cfg).send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: input.cacheControl ?? 'private, max-age=86400',
      }),
    )
  } catch (error) {
    console.error('[r2] putObjectUgc falhou', { key, error })
    throw new Error('Falha ao enviar o anexo para o armazenamento.', { cause: error })
  }
}
