import 'server-only'
import { watermarkCacheKey } from '@/lib/download-mime'
import {
  bufferFromStream,
  r2GetObjectPrivate,
  r2HeadObjectPrivate,
  r2PresignGetPrivate,
  r2PutObjectPrivate,
} from '@/server/r2'
import { watermarkPdf } from '@/server/watermark'
import { watermarkGate } from '@/server/watermark-queue'

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
  email: string
  userId: string
  /** Content-Disposition da resposta do R2 (inline p/ o livro 3D; attachment p/ download). */
  responseContentDisposition: string
}): Promise<string> {
  const cacheKey = watermarkCacheKey(opts.srcKey, opts.userId)
  const cached = await r2HeadObjectPrivate(cacheKey)
  if (!cached) {
    const obj = await r2GetObjectPrivate(opts.srcKey)
    const stored = await watermarkGate().run(async () => {
      const original = await bufferFromStream(obj.body)
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
    })
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
