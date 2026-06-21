/**
 * Resolução de MIME + decisão de marca d'água dos downloads de material. Pura e
 * testada (bun test). A regra de ouro: a marca d'água é decidida por sinais
 * REAIS (Content-Type do objeto no R2, extensão da key) — o `fileType` do
 * anexo é TEXTO LIVRE no dialog do admin (rótulo de exibição) e vale só como
 * último recurso: um "PDF" digitado à mão não pode desligar a marca d'água em
 * silêncio nem virar um header `content-type` inválido.
 */

import { createHash } from 'node:crypto'

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
 * quebrar o download). Casado com o teto de upload do admin (200MB) — sem isso
 * um e-book grande perderia a marca d'água por aluno (anti-pirataria). ⚠️ marcar
 * 200MB carrega tudo em memória (ver `watermark-queue` p/ o gate de concorrência
 * e o requisito de RAM do serviço).
 */
export const WATERMARK_MAX_BYTES = 200 * 1024 * 1024 // 200MB

/**
 * A partir deste tamanho o arquivo NÃO é servido pela rota (Next→Railway→
 * Cloudflare): o aluno recebe 302 p/ uma URL pré-assinada do R2 e baixa DIRETO.
 * Servir um e-book de 119MB pela rota segurava o buffer inteiro na memória do
 * servidor enquanto a conexão do aluno escoava (minutos) — poucos downloads
 * simultâneos degradavam o community inteiro (incidente 10/06). A marca d'água
 * é preservada via CACHE do PDF marcado por aluno no bucket privado
 * (`watermarkCacheKey`), gerado uma vez e pré-assinado nas vezes seguintes.
 */
export const DIRECT_DELIVERY_MIN_BYTES = 20 * 1024 * 1024 // 20MB

/**
 * Key do cache do PDF marcado por (arquivo, aluno) no bucket privado. A origem entra
 * como **sha256 da key inteira** (INJETIVO): a substituição lossy anterior
 * (`[^a-zA-Z0-9._-]+ → _`) podia COLIDIR duas keys distintas (ex.: `report v1.pdf` e
 * `report-v1.pdf`) → a mesma key de cache, e o serve fazia HEAD e devolvia o objeto
 * cacheado sem reconferir a origem (mesmo aluno, arquivo ERRADO — o admin controla o
 * nome). O hash elimina a colisão na raiz. Trocar o PDF do bloco gera key de origem
 * nova → hash novo → cache antigo nunca é servido por engano. O prefixo
 * `watermarked/` tem regra de lifecycle no bucket (expira sozinho — re-gerar é barato).
 */
export function watermarkCacheKey(srcKey: string, userId: string): string {
  const srcHash = createHash('sha256').update(srcKey).digest('hex')
  const safeUser = userId.replace(/[^a-zA-Z0-9-]+/g, '_')
  return `watermarked/${srcHash}/${safeUser}.pdf`
}

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
