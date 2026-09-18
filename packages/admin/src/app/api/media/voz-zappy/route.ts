import {
  isZappySpeechText,
  normalizarRoteiroDoZappy,
  textoFalado,
} from '@sistemazero/core/learning/scene'
import { NextResponse } from 'next/server'
import type { FalaParaGerarVozDoZappy } from '@/lib/voz-zappy-limites'
import { mediaErrorResponse, requireMediaSession } from '@/server/media'
import { gerarVozes, MAX_CARACTERES_POR_TEXTO, MAX_TEXTOS_POR_PEDIDO } from '@/server/voz-zappy'

/**
 * Gera a voz do Zappy para as falas de um bloco (ou de uma aula inteira): recebe a frase que a
 * criança lê e o roteiro efetivo que o Zappy fala; devolve `chave do roteiro → URL do MP3`.
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

  const body = (await req.json().catch(() => null)) as { falas?: unknown } | null
  const falas = body?.falas
  if (!Array.isArray(falas) || !falas.length) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Envie as falas em "falas".' } },
      { status: 400 },
    )
  }
  if (falas.length > MAX_TEXTOS_POR_PEDIDO) {
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
    !falas.every(
      (fala): fala is FalaParaGerarVozDoZappy =>
        typeof fala === 'object' &&
        fala !== null &&
        typeof (fala as FalaParaGerarVozDoZappy).visibleText === 'string' &&
        textoFalado((fala as FalaParaGerarVozDoZappy).visibleText).length > 0 &&
        isZappySpeechText((fala as FalaParaGerarVozDoZappy).speechText) &&
        (fala as FalaParaGerarVozDoZappy).speechText ===
          normalizarRoteiroDoZappy((fala as FalaParaGerarVozDoZappy).speechText) &&
        (fala as FalaParaGerarVozDoZappy).speechText.length <= MAX_CARACTERES_POR_TEXTO,
    )
  ) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: `Cada roteiro precisa ser um texto válido de até ${MAX_CARACTERES_POR_TEXTO} caracteres.`,
        },
      },
      { status: 400 },
    )
  }

  try {
    return NextResponse.json(await gerarVozes(falas))
  } catch (error) {
    return mediaErrorResponse(error)
  }
}
