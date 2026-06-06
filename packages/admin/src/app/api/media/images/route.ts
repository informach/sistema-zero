import { NextResponse } from 'next/server'
import {
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  mediaErrorResponse,
  optimizeAndStoreImage,
  rejectOversizedRequest,
  requireMediaSession,
} from '@/server/media'

/**
 * Upload de IMAGEM (capa de curso / bloco de imagem): multipart `file` (+ `scope`),
 * otimiza p/ WebP (sharp) e armazena no R2. NÃO passa pelo gateway → guard de
 * sessão obrigatório (ver `requireMediaSession`).
 */
export async function POST(req: Request) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session

  // ANTES do formData(): o parse materializa o corpo inteiro em memória.
  const oversized = rejectOversizedRequest(req, MAX_IMAGE_BYTES)
  if (oversized) return oversized

  try {
    const form = await req.formData()
    const file = form.get('file')
    const scope = form.get('scope')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Envie o arquivo no campo "file".' } },
        { status: 400 },
      )
    }
    if (!IMAGE_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: { code: 'VALIDATION_ERROR', message: 'Formato inválido. Envie PNG, JPG ou WebP.' },
        },
        { status: 400 },
      )
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Imagem excede o limite de 5 MB.' } },
        { status: 400 },
      )
    }
    const preset = scope === 'course' ? 'course-thumb' : 'block-image'
    const stored = await optimizeAndStoreImage(file, preset)
    return NextResponse.json(stored)
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
