import { NextResponse } from 'next/server'
import { mediaErrorResponse, requireUploadSession } from '@/server/media'
import { resolveEbook } from '@/server/members'
import { r2GetObjectPrivate } from '@/server/r2'
import { isWatermarkablePdf, watermarkPdf } from '@/server/watermark'

export const runtime = 'nodejs'

const R2_PRIVATE_PREFIX = 'r2priv:'

/**
 * PDF do bloco e-book com MARCA D'ÁGUA por aluno (e-mail no rodapé de todas as
 * páginas — mesma pipeline dos anexos). Servido INLINE: o livro 3D busca este
 * PDF, renderiza as páginas com pdf.js e usa como texturas — a marca d'água já
 * vai estampada nas páginas. O R2 privado é provedor externo (mesma exceção
 * consciente do avatar/anexos) → guard de sessão local; a AUTORIZAÇÃO real
 * (matrícula ativa + aula publicada + bloco e-book) é do members via gateway.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string; lessonId: string; blockId: string }> },
) {
  const session = await requireUploadSession()
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
    const { body, contentType } = await r2GetObjectPrivate(key)

    let out: Buffer | Uint8Array = body
    if (isWatermarkablePdf(contentType) || key.toLowerCase().endsWith('.pdf')) {
      try {
        out = await watermarkPdf(body, session.email)
      } catch (error) {
        // PDF cifrado/corrompido: melhor servir o original do que quebrar o livro.
        console.warn('[ebook] watermark de PDF falhou — servindo original', { key, error })
      }
    }

    return new Response(new Uint8Array(out), {
      headers: {
        'content-type': 'application/pdf',
        // INLINE: é consumido pelo pdf.js do livro 3D, não baixado pelo usuário.
        'content-disposition': 'inline',
        // Conteúdo é POR ALUNO (e-mail estampado) — nunca cachear compartilhado.
        'cache-control': 'private, no-store',
      },
    })
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
