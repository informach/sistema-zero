import {
  extForMime,
  isHubAttachmentKind,
  isInlineKind,
  sanitizeFilename,
} from '@sistemazero/member-shell/lib/hub-attachments'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { forwardUpstream } from '@/server/forward'
import { resolveAttachment } from '@/server/hub'
import { mediaErrorResponse } from '@/server/media'
import { r2PresignGetUgc } from '@/server/r2'

const R2_UGC_PREFIX = 'r2ugc:'

/** O Hub autoriza o operador; a referência privada nunca é enviada ao browser. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Anexo inválido.' } },
      { status: 400 },
    )
  }
  const resolved = await resolveAttachment(id)
  if (resolved.status !== 200 || !resolved.body) {
    return forwardUpstream({
      status: resolved.status === 200 ? 502 : resolved.status,
      body: resolved.body ?? {
        error: { code: 'UPSTREAM_ERROR', message: 'Não foi possível abrir o anexo.' },
      },
    })
  }

  const { storageRef, mime, kind, originalName } = resolved.body
  if (!storageRef.startsWith(R2_UGC_PREFIX)) {
    return NextResponse.json(
      { error: { code: 'INVALID_ATTACHMENT', message: 'Referência de anexo inválida.' } },
      { status: 502 },
    )
  }
  try {
    const safeKind = isHubAttachmentKind(kind) ? kind : 'document'
    const base = sanitizeFilename(originalName)
    const ext = extForMime(mime)
    const filename = base.toLowerCase().endsWith(`.${ext}`) ? base : `${base}.${ext}`
    const disposition = isInlineKind(safeKind)
      ? `inline; filename="${filename}"`
      : `attachment; filename="${filename}"`
    const url = await r2PresignGetUgc(storageRef.slice(R2_UGC_PREFIX.length), {
      responseContentDisposition: disposition,
      responseContentType: mime,
    })
    return NextResponse.redirect(url, 302)
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
