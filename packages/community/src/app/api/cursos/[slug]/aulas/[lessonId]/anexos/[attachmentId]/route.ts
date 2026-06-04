import { NextResponse } from 'next/server'
import { mediaErrorResponse, requireUploadSession } from '@/server/media'
import { resolveAttachment } from '@/server/members'
import { r2GetObjectPrivate } from '@/server/r2'
import {
  isWatermarkableImage,
  isWatermarkablePdf,
  watermarkImage,
  watermarkPdf,
} from '@/server/watermark'

export const runtime = 'nodejs'

const R2_PRIVATE_PREFIX = 'r2priv:'

/** Extensão segura derivada da key do bucket (fallback: sem extensão). */
function extensionFromKey(key: string): string | null {
  const ext = key.split('.').pop()?.toLowerCase() ?? ''
  return /^[a-z0-9]{1,8}$/.test(ext) && key.includes('.') ? ext : null
}

/** Nome ASCII-seguro p/ o Content-Disposition (espelha o admin media.ts). */
function sanitizeFilename(filename: string): string {
  return (
    filename
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // remove diacríticos combinantes (ã → a)
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .slice(0, 120) || 'material'
  )
}

/**
 * Download de material da aula com MARCA D'ÁGUA por aluno: PDFs ganham o e-mail
 * no rodapé de todas as páginas; imagens, o selo no canto. Demais formatos são
 * servidos sem marca, mas só por aqui (sessão + matrícula). O R2 privado é
 * provedor externo (mesma exceção consciente do avatar) → guard de sessão local;
 * a AUTORIZAÇÃO real (matrícula ativa + aula publicada) é do members via gateway.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string; lessonId: string; attachmentId: string }> },
) {
  const session = await requireUploadSession()
  if (session instanceof NextResponse) return session

  const { slug, lessonId, attachmentId } = await ctx.params
  const resolved = await resolveAttachment(slug, lessonId, attachmentId)
  if (resolved.status !== 200 || !resolved.body) {
    return NextResponse.json(
      resolved.body ?? { error: { code: 'NOT_FOUND', message: 'Material não encontrado' } },
      { status: resolved.status === 200 ? 502 : resolved.status },
    )
  }

  const { label, storageRef } = resolved.body

  // Anexo externo (URL colada pelo admin) ou legado público → passthrough.
  if (!storageRef.startsWith(R2_PRIVATE_PREFIX)) {
    if (!/^https?:\/\//.test(storageRef)) {
      return NextResponse.json(
        { error: { code: 'INVALID_ATTACHMENT', message: 'Referência de material inválida' } },
        { status: 502 },
      )
    }
    return NextResponse.redirect(storageRef, 302)
  }

  try {
    const key = storageRef.slice(R2_PRIVATE_PREFIX.length)
    const { body, contentType } = await r2GetObjectPrivate(key)
    const mime = resolved.body.fileType ?? contentType

    let out: Buffer | Uint8Array = body
    if (isWatermarkablePdf(mime)) {
      try {
        out = await watermarkPdf(body, session.email)
      } catch (error) {
        // PDF cifrado/corrompido: melhor servir o original do que falhar o download.
        console.warn('[anexos] watermark de PDF falhou — servindo original', { key, error })
      }
    } else if (isWatermarkableImage(mime)) {
      try {
        out = await watermarkImage(body, mime, session.email)
      } catch (error) {
        console.warn('[anexos] watermark de imagem falhou — servindo original', { key, error })
      }
    }

    // Nome do download: label do anexo + extensão real do arquivo.
    const ext = extensionFromKey(key)
    const base = sanitizeFilename(label)
    const filename = ext && !base.toLowerCase().endsWith(`.${ext}`) ? `${base}.${ext}` : base

    return new Response(new Uint8Array(out), {
      headers: {
        'content-type': mime,
        'content-disposition': `attachment; filename="${filename}"`,
        // Conteúdo é POR ALUNO (e-mail estampado) — nunca cachear compartilhado.
        'cache-control': 'private, no-store',
      },
    })
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
