import { NextResponse } from 'next/server'
import {
  createPrivateUploadTarget,
  FILE_MIME_TYPES,
  MAX_FILE_BYTES,
  mediaErrorResponse,
  requireMediaSession,
} from '@/server/media'

interface PresignBody {
  filename?: unknown
  contentType?: unknown
  sizeBytes?: unknown
}

/**
 * Prepara o upload DIRETO de um anexo/e-book pro bucket R2 PRIVADO: valida
 * sessão/MIME/tamanho e devolve uma URL PUT pré-assinada (`{uploadUrl,url,contentType}`).
 * O browser sobe o arquivo direto no R2 — sem bufferizar no admin nem passar pelo
 * teto de 100MB do Cloudflare Free na frente do painel. Guard de sessão obrigatório
 * (rota fora do gateway).
 */
export async function POST(req: Request) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session

  let body: PresignBody
  try {
    body = (await req.json()) as PresignBody
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Corpo JSON inválido.' } },
      { status: 400 },
    )
  }

  const filename = typeof body.filename === 'string' ? body.filename.trim() : ''
  const contentType = typeof body.contentType === 'string' ? body.contentType : ''
  const sizeBytes = typeof body.sizeBytes === 'number' ? body.sizeBytes : Number.NaN

  if (!filename) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Informe o nome do arquivo.' } },
      { status: 400 },
    )
  }
  if (!FILE_MIME_TYPES.has(contentType)) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Tipo de arquivo não permitido (PDF, ZIP, Office, TXT/CSV, imagem ou áudio).',
        },
      },
      { status: 400 },
    )
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Tamanho do arquivo inválido.' } },
      { status: 400 },
    )
  }
  if (sizeBytes > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Arquivo excede o limite de 200 MB.' } },
      { status: 400 },
    )
  }

  try {
    const target = await createPrivateUploadTarget({ filename, contentType })
    return NextResponse.json(target)
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
