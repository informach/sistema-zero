import { NextResponse } from 'next/server'
import { resolveDownloadMedia, WATERMARK_MAX_BYTES } from '@/lib/download-mime'
import { mediaErrorResponse, requireUploadSession } from '@/server/media'
import { resolveAttachment } from '@/server/members'
import { bufferFromStream, r2GetObjectPrivate } from '@/server/r2'
import { watermarkImage, watermarkPdf } from '@/server/watermark'
import { watermarkGate } from '@/server/watermark-queue'

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
 * servidos em STREAM (sem marca e sem materializar 100MB em memória), mas só
 * por aqui (sessão + matrícula). O MIME/marca é decidido por sinais REAIS
 * (Content-Type do R2 + extensão da key — `resolveDownloadMedia`); o `fileType`
 * do anexo é texto livre do admin e não pode desligar a marca em silêncio.
 * O R2 privado é provedor externo (mesma exceção consciente do avatar) → guard
 * de sessão local ESTRITO; a AUTORIZAÇÃO real (matrícula ativa + aula
 * publicada) é do members via gateway.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string; lessonId: string; attachmentId: string }> },
) {
  const session = await requireUploadSession(req)
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
    const obj = await r2GetObjectPrivate(key)
    const media = resolveDownloadMedia({
      contentType: obj.contentType,
      key,
      fileType: resolved.body.fileType,
    })

    // Nome do download: label do anexo + extensão real do arquivo.
    const ext = extensionFromKey(key)
    const base = sanitizeFilename(label)
    const filename = ext && !base.toLowerCase().endsWith(`.${ext}`) ? `${base}.${ext}` : base
    const headers = {
      'content-type': media.mime,
      'content-disposition': `attachment; filename="${filename}"`,
      // Conteúdo é POR ALUNO (e-mail estampado) — nunca cachear compartilhado.
      'cache-control': 'private, no-store',
    }

    // Sem marca (office/zip/áudio/…) → STREAM direto, sem bufferizar.
    if (media.watermark === null) {
      return new Response(obj.body, { headers })
    }
    // Grande demais p/ marcar (materializa em memória) → original em stream
    // (mesma filosofia do fallback de falha de watermark: entregar > quebrar).
    if (obj.contentLength !== null && obj.contentLength > WATERMARK_MAX_BYTES) {
      console.warn("[anexos] arquivo excede o teto da marca d'água — servindo original", {
        key,
        contentLength: obj.contentLength,
      })
      return new Response(obj.body, { headers })
    }

    // Bufferizar+marcar dentro do GATE de concorrência: materializa ≤50MB +
    // cópias do pdf-lib/sharp — sem teto, N downloads simultâneos = OOM.
    return await watermarkGate().run(async () => {
      const original = await bufferFromStream(obj.body)
      let out: Uint8Array = original
      try {
        out =
          media.watermark === 'pdf'
            ? await watermarkPdf(original, session.email)
            : await watermarkImage(original, media.mime, session.email)
      } catch (error) {
        // PDF cifrado/imagem corrompida: melhor servir o original do que falhar.
        console.warn('[anexos] watermark falhou — servindo original', { key, error })
      }
      return new Response(new Uint8Array(out), { headers })
    })
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
