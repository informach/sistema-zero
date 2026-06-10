import { NextResponse } from 'next/server'
import {
  DIRECT_DELIVERY_MIN_BYTES,
  resolveDownloadMedia,
  WATERMARK_MAX_BYTES,
} from '@/lib/download-mime'
import { mediaErrorResponse, requireUploadSession } from '@/server/media'
import { resolveAttachment } from '@/server/members'
import { presignWatermarkedPdf } from '@/server/private-delivery'
import {
  bufferFromStream,
  r2GetObjectPrivate,
  r2HeadObjectPrivate,
  r2PresignGetPrivate,
} from '@/server/r2'
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
    // HEAD primeiro: arquivo GRANDE nem passa pela rota (302 p/ o R2 direto) —
    // servir 100MB+ por aqui segura buffer/stream na memória do servidor
    // enquanto a conexão do aluno escoa (incidente 10/06).
    const head = await r2HeadObjectPrivate(key)
    if (!head) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Arquivo do material não encontrado' } },
        { status: 404 },
      )
    }
    const media = resolveDownloadMedia({
      contentType: head.contentType,
      key,
      fileType: resolved.body.fileType,
    })

    // Nome do download: label do anexo + extensão real do arquivo.
    const ext = extensionFromKey(key)
    const base = sanitizeFilename(label)
    const filename = ext && !base.toLowerCase().endsWith(`.${ext}`) ? `${base}.${ext}` : base
    const disposition = `attachment; filename="${filename}"`
    const len = head.contentLength

    if (len !== null && len > DIRECT_DELIVERY_MIN_BYTES) {
      // PDF marcável dentro do teto → cache do PDF marcado + 302 direto do R2.
      if (media.watermark === 'pdf' && len <= WATERMARK_MAX_BYTES) {
        const url = await presignWatermarkedPdf({
          srcKey: key,
          email: session.email,
          userId: session.id,
          responseContentDisposition: disposition,
        })
        return NextResponse.redirect(url, 302)
      }
      // Sem marca (office/zip/…), imagem gigante (não realista) ou acima do
      // teto da marca → original direto do R2 (mesma filosofia do fallback).
      if (len > WATERMARK_MAX_BYTES && media.watermark !== null) {
        console.warn("[anexos] arquivo excede o teto da marca d'água — pré-assinando original", {
          key,
          contentLength: len,
        })
      }
      const url = await r2PresignGetPrivate(key, { responseContentDisposition: disposition })
      return NextResponse.redirect(url, 302)
    }

    const obj = await r2GetObjectPrivate(key)
    const headers = {
      'content-type': media.mime,
      'content-disposition': disposition,
      // Conteúdo é POR ALUNO (e-mail estampado) — nunca cachear compartilhado.
      'cache-control': 'private, no-store',
    }

    // Sem marca (office/zip/áudio/…) → STREAM direto, sem bufferizar.
    if (media.watermark === null) {
      return new Response(obj.body, { headers })
    }

    // Bufferizar+marcar dentro do GATE de concorrência: materializa ≤20MB +
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
