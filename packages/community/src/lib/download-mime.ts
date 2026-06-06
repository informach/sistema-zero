/**
 * Resolução de MIME + decisão de marca d'água dos downloads de material. Pura e
 * testada (bun test). A regra de ouro: a marca d'água é decidida por sinais
 * REAIS (Content-Type do objeto no R2, extensão da key) — o `fileType` do
 * anexo é TEXTO LIVRE no dialog do admin (rótulo de exibição) e vale só como
 * último recurso: um "PDF" digitado à mão não pode desligar a marca d'água em
 * silêncio nem virar um header `content-type` inválido.
 */

export type WatermarkKind = 'pdf' | 'image' | null

export interface DownloadMedia {
  /** MIME do header `content-type` da resposta (sempre um MIME válido). */
  mime: string
  /** Pipeline de marca d'água a aplicar (`null` = servir em stream, sem marca). */
  watermark: WatermarkKind
}

/**
 * Teto p/ APLICAR a marca d'água: marcar exige materializar o arquivo em
 * memória (pdf-lib/sharp); acima disso serve o original em stream + warn
 * (mesma filosofia do fallback de falha de watermark — melhor entregar do que
 * quebrar o download). Anexos do admin chegam a 100MB.
 */
export const WATERMARK_MAX_BYTES = 50 * 1024 * 1024 // 50MB

const WATERMARKABLE_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

const EXTENSION_MIMES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

/** Formato de um MIME plausível (sem parâmetros — `; charset=` é descartado antes). */
const MIME_RE = /^[\w.+-]+\/[\w.+-]+$/

/** Normaliza um candidato a MIME: minúsculo, sem parâmetros; inválido → null. */
function normalizeMime(value: string | null | undefined): string | null {
  const bare = value?.split(';')[0]?.trim().toLowerCase() ?? ''
  return MIME_RE.test(bare) ? bare : null
}

/** MIME derivado da extensão da key (só os formatos marcáveis interessam). */
function extensionMime(key: string): string | null {
  if (!key.includes('.')) return null
  const ext = key.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_MIMES[ext] ?? null
}

export interface ResolveDownloadMediaInput {
  /** Content-Type real do objeto no R2 (o admin grava o MIME do upload). */
  contentType: string | null
  /** Key do objeto no bucket (extensão é um sinal confiável). */
  key: string
  /** `fileType` do anexo no members — texto livre do admin (último recurso). */
  fileType: string | null
}

/**
 * Decide o MIME da resposta e a pipeline de marca d'água. Qualquer sinal de PDF
 * (Content-Type, extensão ou fileType) liga a marca de PDF; idem p/ imagem —
 * e o MIME da resposta acompanha a decisão (um sinal divergente, ex.:
 * Content-Type text/plain numa key .pdf, não produz um header mentiroso).
 */
export function resolveDownloadMedia(input: ResolveDownloadMediaInput): DownloadMedia {
  const fromR2 = normalizeMime(input.contentType)
  const fromExt = extensionMime(input.key)
  const fromLabel = normalizeMime(input.fileType)
  // octet-stream não decide nada (é o fallback de upload sem type do browser).
  const signals = [fromR2, fromExt, fromLabel].filter(
    (s): s is string => s !== null && s !== 'application/octet-stream',
  )

  if (signals.includes('application/pdf')) {
    return { mime: 'application/pdf', watermark: 'pdf' }
  }
  const imageSignal = signals.find((s) => WATERMARKABLE_IMAGE_MIMES.has(s))
  if (imageSignal) {
    return { mime: imageSignal, watermark: 'image' }
  }
  return { mime: signals[0] ?? fromR2 ?? 'application/octet-stream', watermark: null }
}
