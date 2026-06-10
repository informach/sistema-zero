import { NextResponse } from 'next/server'
import {
  DIRECT_DELIVERY_MIN_BYTES,
  resolveDownloadMedia,
  WATERMARK_MAX_BYTES,
} from '@/lib/download-mime'
import { mediaErrorResponse, requireUploadSession } from '@/server/media'
import { resolveEbook } from '@/server/members'
import { presignWatermarkedPdf } from '@/server/private-delivery'
import {
  bufferFromStream,
  r2GetObjectPrivate,
  r2HeadObjectPrivate,
  r2PresignGetPrivate,
} from '@/server/r2'
import { watermarkPdf } from '@/server/watermark'
import { watermarkGate } from '@/server/watermark-queue'

export const runtime = 'nodejs'

const R2_PRIVATE_PREFIX = 'r2priv:'

/**
 * PDF do bloco e-book com MARCA D'ÁGUA por aluno (e-mail no rodapé de todas as
 * páginas — mesma pipeline dos anexos). Servido INLINE: o livro 3D busca este
 * PDF, renderiza as páginas com pdf.js e usa como texturas — a marca d'água já
 * vai estampada nas páginas. O R2 privado é provedor externo (mesma exceção
 * consciente do avatar/anexos) → guard de sessão local ESTRITO; a AUTORIZAÇÃO
 * real (matrícula ativa + aula publicada + bloco e-book) é do members via
 * gateway.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string; lessonId: string; blockId: string }> },
) {
  const session = await requireUploadSession(req)
  if (session instanceof NextResponse) return session

  const { slug, lessonId, blockId } = await ctx.params
  const resolved = await resolveEbook(slug, lessonId, blockId)
  if (resolved.status !== 200 || !resolved.body) {
    return NextResponse.json(
      resolved.body ?? { error: { code: 'NOT_FOUND', message: 'E-book não encontrado' } },
      { status: resolved.status === 200 ? 502 : resolved.status },
    )
  }

  const { storageRef } = resolved.body

  // URL externa/legada → passthrough (sem marca; o pdf.js busca de lá direto).
  if (!storageRef.startsWith(R2_PRIVATE_PREFIX)) {
    if (!/^https?:\/\//.test(storageRef)) {
      return NextResponse.json(
        { error: { code: 'INVALID_EBOOK', message: 'Referência de e-book inválida' } },
        { status: 502 },
      )
    }
    return NextResponse.redirect(storageRef, 302)
  }

  try {
    const key = storageRef.slice(R2_PRIVATE_PREFIX.length)
    // HEAD primeiro: arquivo GRANDE nem passa pela rota (302 p/ o R2 direto) —
    // servir 100MB+ por aqui segura o buffer inteiro na memória do servidor
    // enquanto a conexão do aluno escoa (incidente 10/06).
    const head = await r2HeadObjectPrivate(key)
    if (!head) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Arquivo do e-book não encontrado' } },
        { status: 404 },
      )
    }
    // Sinais reais (Content-Type do R2 + extensão .pdf) decidem a marca.
    const media = resolveDownloadMedia({ contentType: head.contentType, key, fileType: null })
    const len = head.contentLength

    if (len !== null && len > DIRECT_DELIVERY_MIN_BYTES) {
      if (media.watermark !== 'pdf' || len > WATERMARK_MAX_BYTES) {
        // Sem marca possível (legado raro / acima do teto) → original direto.
        if (len > WATERMARK_MAX_BYTES) {
          console.warn("[ebook] PDF excede o teto da marca d'água — pré-assinando original", {
            key,
            contentLength: len,
          })
        }
        const url = await r2PresignGetPrivate(key, { responseContentDisposition: 'inline' })
        return NextResponse.redirect(url, 302)
      }
      const url = await presignWatermarkedPdf({
        srcKey: key,
        email: session.email,
        userId: session.id,
        responseContentDisposition: 'inline',
      })
      return NextResponse.redirect(url, 302)
    }

    const obj = await r2GetObjectPrivate(key)
    const headers = {
      'content-type': 'application/pdf',
      // INLINE: é consumido pelo pdf.js do livro 3D, não baixado pelo usuário.
      'content-disposition': 'inline',
      // Conteúdo é POR ALUNO (e-mail estampado) — nunca cachear compartilhado.
      'cache-control': 'private, no-store',
    }

    // Sem sinal de PDF (legado raro) → serve cru em stream, como antes.
    if (media.watermark !== 'pdf') {
      return new Response(obj.body, { headers })
    }

    // Bufferizar+marcar dentro do GATE de concorrência: materializa ≤20MB +
    // cópias do pdf-lib — sem teto, N livros abertos ao mesmo tempo = OOM.
    return await watermarkGate().run(async () => {
      const original = await bufferFromStream(obj.body)
      let out: Uint8Array = original
      try {
        out = await watermarkPdf(original, session.email)
      } catch (error) {
        // PDF cifrado/corrompido: melhor servir o original do que quebrar o livro.
        console.warn('[ebook] watermark de PDF falhou — servindo original', { key, error })
      }
      return new Response(new Uint8Array(out), { headers })
    })
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
