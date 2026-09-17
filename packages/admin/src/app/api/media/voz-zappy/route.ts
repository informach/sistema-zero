import { NextResponse } from 'next/server'
import { mediaErrorResponse, requireMediaSession } from '@/server/media'
import { gerarVozes, MAX_CARACTERES_POR_TEXTO, MAX_TEXTOS_POR_PEDIDO } from '@/server/voz-zappy'

/**
 * Gera a voz do Zappy para as falas de um bloco (ou de uma aula inteira): recebe os TEXTOS e
 * devolve o dicionário `texto falado → URL do MP3` para gravar no bloco.
 *
 * ⚠️ NÃO passa pelo gateway → guard de sessão obrigatório, como as outras rotas de mídia. É uma
 * rota que gasta crédito de um serviço pago: sem sessão de admin, ela seria uma torneira aberta.
 *
 * ⚠️⚠️ O cliente manda TEXTO, nunca a key nem a URL. Quem calcula onde o arquivo mora é o servidor
 * (`keyDaVoz`), senão o painel escolheria onde gravar no bucket público.
 */
export async function POST(req: Request) {
  const session = await requireMediaSession()
  if (session instanceof NextResponse) return session

  const body = (await req.json().catch(() => null)) as { textos?: unknown } | null
  const textos = body?.textos
  if (!Array.isArray(textos) || !textos.length) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Envie as falas em "textos".' } },
      { status: 400 },
    )
  }
  if (textos.length > MAX_TEXTOS_POR_PEDIDO) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: `Gere no máximo ${MAX_TEXTOS_POR_PEDIDO} falas por vez.`,
        },
      },
      { status: 400 },
    )
  }
  if (
    !textos.every((t) => typeof t === 'string' && t.trim() && t.length <= MAX_CARACTERES_POR_TEXTO)
  ) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: `Cada fala precisa ser um texto de até ${MAX_CARACTERES_POR_TEXTO} caracteres.`,
        },
      },
      { status: 400 },
    )
  }

  try {
    return NextResponse.json(await gerarVozes(textos as string[]))
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
