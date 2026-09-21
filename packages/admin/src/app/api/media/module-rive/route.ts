import { NextResponse } from 'next/server'
import { InvalidRivFileError } from '@/lib/riv-file'
import {
  MAX_MODULE_RIVE_BYTES,
  mediaErrorResponse,
  rejectOversizedRequest,
  requireMediaSession,
  storeModuleRive,
} from '@/server/media'

const erro = (message: string) =>
  NextResponse.json({ error: { code: 'VALIDATION_ERROR', message } }, { status: 400 })

/** Upload da animação Rive (.riv) para o R2 público, usada na trilha infantil. */
export async function POST(req: Request) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session

  const oversized = rejectOversizedRequest(req, MAX_MODULE_RIVE_BYTES)
  if (oversized) return oversized

  try {
    const file = (await req.formData()).get('file')
    if (!(file instanceof File)) return erro('Envie a animação no campo "file".')
    // ⚠️ NÃO olhamos `file.type`: não há MIME registrado para `.riv`, então o
    // navegador manda `application/octet-stream` ou string vazia. Checar o tipo
    // só recusaria arquivos certos. O portão real é a extensão + os BYTES
    // (`assertRivFile`, dentro do `storeModuleRive`).
    if (!file.name.toLowerCase().endsWith('.riv')) {
      return erro('Formato inválido. Envie um arquivo .riv exportado do Rive.')
    }
    if (file.size === 0 || file.size > MAX_MODULE_RIVE_BYTES) {
      return erro('Animação vazia ou maior que 5 MB.')
    }
    // Lido UMA vez e repassado: o caminho do SVG lia o corpo duas vezes.
    return NextResponse.json(await storeModuleRive(new Uint8Array(await file.arrayBuffer())))
  } catch (error) {
    if (error instanceof InvalidRivFileError) return erro(error.message)
    return mediaErrorResponse(error)
  }
}
