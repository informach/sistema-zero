import { NextResponse } from 'next/server'
import {
  AUDIO_MIME_TYPES,
  MAX_AUDIO_BYTES,
  mediaErrorResponse,
  requireMediaSession,
  storeAudioFile,
} from '@/server/media'

/**
 * Upload de ÁUDIO de aula (bloco de áudio): multipart `file` → bucket R2 PÚBLICO
 * (o `<audio>` do aluno toca a URL direto; privado quebraria a reprodução).
 * NÃO passa pelo gateway → guard de sessão obrigatório.
 */
export async function POST(req: Request) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Envie o arquivo no campo "file".' } },
        { status: 400 },
      )
    }
    if (!AUDIO_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Formato inválido. Envie MP3, M4A, OGG ou WAV.',
          },
        },
        { status: 400 },
      )
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Áudio excede o limite de 50 MB.' } },
        { status: 400 },
      )
    }
    return NextResponse.json(await storeAudioFile(file))
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
