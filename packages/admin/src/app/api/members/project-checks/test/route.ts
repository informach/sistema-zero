import { NextResponse } from 'next/server'
import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'

/**
 * "Testar agora" dos objetivos que RODAM o jogo (etapa 3, 18/10/2026): o projeto inicial ou o
 * gabarito vai ao members, que o roda no studio-runtime. Nada é guardado.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Pedido inválido.' } },
      { status: 400 },
    )
  try {
    return forwardUpstream(
      await gatewayFetch('/members/admin/project-checks/test', {
        method: 'POST',
        body,
        timeoutMs: 165_000,
      }),
    )
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'PROJECT_CHECK_UNAVAILABLE',
          message: 'O teste demorou demais. Tente de novo.',
        },
      },
      { status: 504 },
    )
  }
}
