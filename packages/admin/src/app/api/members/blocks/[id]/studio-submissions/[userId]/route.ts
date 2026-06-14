import { NextResponse } from 'next/server'
import { getStudioSubmission } from '@/server/members'

type Ctx = { params: Promise<{ id: string; userId: string }> }

/** Projeto enviado por um aluno — abre no Estúdio embutido do admin. */
export async function GET(_req: Request, { params }: Ctx) {
  const { id, userId } = await params
  const { status, body } = await getStudioSubmission(id, userId)
  if (status !== 200 || !body) {
    // Normaliza erro fora do envelope `{ error }` p/ a UI mostrar mensagem real.
    const envelope = body as { error?: { code?: string; message?: string } } | null
    const normalized = envelope?.error?.message
      ? body
      : { error: { code: 'UPSTREAM_ERROR', message: 'Não foi possível abrir a entrega.' } }
    return NextResponse.json(normalized, { status: status === 200 ? 502 : status })
  }
  return NextResponse.json(body, { status })
}
