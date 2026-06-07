import { NextResponse } from 'next/server'
import {
  FILE_MIME_TYPES,
  MAX_FILE_BYTES,
  mediaErrorResponse,
  rejectOversizedRequest,
  requireMediaSession,
  storeGenericFile,
} from '@/server/media'

/**
 * Upload de ARQUIVO genérico (anexos de aula / áudio): multipart `file` → R2 com
 * Content-Disposition de download. Allowlist de MIME + limite de 200 MB. Guard de
 * sessão obrigatório (rota fora do gateway).
 */
export async function POST(req: Request) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session

  // ANTES do formData(): o parse materializa o corpo inteiro em memória.
  const oversized = rejectOversizedRequest(req, MAX_FILE_BYTES)
  if (oversized) return oversized

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Envie o arquivo no campo "file".' } },
        { status: 400 },
      )
    }
    if (!FILE_MIME_TYPES.has(file.type)) {
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
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Arquivo excede o limite de 200 MB.' } },
        { status: 400 },
      )
    }
    const stored = await storeGenericFile(file)
    return NextResponse.json(stored)
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
