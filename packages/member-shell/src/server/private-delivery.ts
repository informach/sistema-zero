import 'server-only'
import { WATERMARK_MAX_BYTES, watermarkCacheKey } from '../lib/download-mime'
import {
  bufferFromStream,
  r2GetObjectPrivate,
  r2HeadObjectPrivate,
  r2PresignGetPrivate,
  r2PutObjectPrivate,
} from './r2'
import { watermarkPdf } from './watermark'
import { type ConcurrencyGate, WATERMARK_WAIT_TIMEOUT_MS, watermarkGate } from './watermark-queue'

/**
 * Entrega DIRETA de PDF grande com marca d'água: gera (uma vez) o PDF marcado
 * com o e-mail do aluno, grava no bucket privado sob `watermarked/…` e devolve
 * uma URL pré-assinada de TTL curto — o browser baixa direto do R2, sem segurar
 * 100MB+ na memória do servidor nem arrastar pela cadeia de proxies (incidente
 * 10/06: poucos downloads simultâneos degradavam o community inteiro). Falha de
 * marcação cai p/ o ORIGINAL pré-assinado (entregar > quebrar, mesmo fallback
 * do caminho inline).
 */
export async function presignWatermarkedPdf(opts: {
  srcKey: string
  /** ETag da origem (HEAD): entra na key do cache para o arquivo substituído não servir a versão velha. */
  srcEtag?: string | null
  email: string
  userId: string
  /** Content-Disposition da resposta do R2 (inline p/ o livro 3D; attachment p/ download). */
  responseContentDisposition: string
  /** Request do cliente: aborta a espera na fila se ele for embora. */
  signal?: AbortSignal
}): Promise<string> {
  const cacheKey = watermarkCacheKey(opts.srcKey, opts.userId, opts.srcEtag)
  const cached = await r2HeadObjectPrivate(cacheKey)
  if (!cached) {
    const obj = await r2GetObjectPrivate(opts.srcKey)
    const stored = await watermarkGate().run(
      async () => {
        const original = await bufferFromStream(obj.body, WATERMARK_MAX_BYTES)
        try {
          const marked = await watermarkPdf(original, opts.email)
          await r2PutObjectPrivate({
            key: cacheKey,
            body: new Uint8Array(marked),
            contentType: 'application/pdf',
          })
          return true
        } catch (error) {
          // PDF cifrado/corrompido: serve o ORIGINAL direto do R2 (sem cache —
          // um problema transitório de marcação não pode "grudar" no aluno).
          console.warn('[delivery] watermark de PDF falhou — pré-assinando o original', {
            key: opts.srcKey,
            error,
          })
          return false
        }
      },
      { signal: opts.signal, waitTimeoutMs: WATERMARK_WAIT_TIMEOUT_MS },
    )
    if (!stored) {
      return r2PresignGetPrivate(opts.srcKey, {
        responseContentDisposition: opts.responseContentDisposition,
      })
    }
  }
  return r2PresignGetPrivate(cacheKey, {
    responseContentDisposition: opts.responseContentDisposition,
  })
}

/** Portas de I/O da entrega inline (injetáveis nos testes; o default é o R2 real). */
export interface InlineWatermarkIo {
  head: (key: string) => Promise<{ contentLength: number | null } | null>
  get: (key: string) => Promise<{ body: ReadableStream<Uint8Array> }>
  put: (input: { key: string; body: Uint8Array; contentType: string }) => Promise<void>
  watermark: (bytes: Uint8Array, email: string) => Promise<Uint8Array>
  gate: ConcurrencyGate
  /** Prazo esperando a vaga do gate (default `WATERMARK_WAIT_TIMEOUT_MS`). */
  waitTimeoutMs?: number
}

const defaultInlineIo = (): InlineWatermarkIo => ({
  head: r2HeadObjectPrivate,
  get: r2GetObjectPrivate,
  put: r2PutObjectPrivate,
  watermark: watermarkPdf,
  gate: watermarkGate(),
})

export interface InlineWatermarkedPdf {
  /** Stream do cache por aluno (já marcado) OU os bytes recém-marcados. */
  body: ReadableStream<Uint8Array> | Uint8Array
  /** Veio do cache: nem passou pelo gate nem pelo pdf-lib. */
  cached: boolean
}

/**
 * PDF INLINE (≤20MB) com marca d'água por aluno, com CACHE. Antes do incidente
 * 07/09 o caminho inline re-marcava o PDF a CADA abertura (só o caminho de
 * arquivo grande cacheava): 6–15s de pdf-lib por abertura, atrás de um gate de
 * concorrência 1, sem prazo — uma turma abrindo cadernos travava todos os
 * e-books do serviço. Agora: (1) o PDF marcado é gerado UMA vez por (arquivo,
 * versão, aluno) e servido do bucket nas próximas; (2) a espera na fila tem
 * prazo (`WatermarkQueueBusyError` → 503 + Retry-After) e some quando o cliente
 * vai embora (`signal`); (3) falha ao gravar o cache não falha a entrega.
 */
export async function watermarkedPdfInline(
  opts: {
    srcKey: string
    /** ETag da origem (HEAD): versão do arquivo na key do cache (regravação na mesma key). */
    srcEtag: string | null
    email: string
    userId: string
    signal?: AbortSignal
  },
  io: InlineWatermarkIo = defaultInlineIo(),
): Promise<InlineWatermarkedPdf> {
  const cacheKey = watermarkCacheKey(opts.srcKey, opts.userId, opts.srcEtag)
  if (await io.head(cacheKey)) {
    const cached = await io.get(cacheKey)
    return { body: cached.body, cached: true }
  }

  // A origem é aberta ANTES da fila (stream ainda não consumido: custo zero), mas
  // só é materializada dentro dela.
  const obj = await io.get(opts.srcKey)
  const marked = await io.gate.run(
    async () => {
      const original = await bufferFromStream(obj.body, WATERMARK_MAX_BYTES)
      let out: Uint8Array = original
      try {
        out = await io.watermark(original, opts.email)
      } catch (error) {
        // PDF cifrado/corrompido: melhor servir o original do que quebrar o livro.
        // Sem cache: um problema transitório de marcação não pode "grudar" no aluno.
        console.warn('[delivery] watermark de PDF inline falhou — servindo original', {
          key: opts.srcKey,
          error,
        })
        return { out, cacheable: false }
      }
      return { out, cacheable: true }
    },
    { signal: opts.signal, waitTimeoutMs: io.waitTimeoutMs ?? WATERMARK_WAIT_TIMEOUT_MS },
  )

  if (marked.cacheable) {
    try {
      await io.put({ key: cacheKey, body: marked.out, contentType: 'application/pdf' })
    } catch (error) {
      // O aluno recebe o PDF do mesmo jeito; só a PRÓXIMA abertura paga o pdf-lib de novo.
      console.warn('[delivery] cache do PDF marcado falhou — entregando sem cachear', {
        key: cacheKey,
        error,
      })
    }
  }
  return { body: marked.out, cached: false }
}
