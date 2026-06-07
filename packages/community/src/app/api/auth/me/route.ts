import { NextResponse } from 'next/server'
import { z } from 'zod'
import { updateMe } from '@/server/auth'
import { getSession } from '@/server/session'

const Body = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
})

/** Edita o perfil do PRÓPRIO aluno (nome/telefone — e-mail não é editável). */
export async function PATCH(req: Request) {
  // Sessão de IMPERSONAÇÃO (claim `act`) é SOMENTE-LEITURA p/ dados do aluno:
  // suporte não altera perfil/credenciais de quem está sendo atendido.
  const session = await getSession()
  if (session?.act) {
    return NextResponse.json({ error: { code: 'IMPERSONATION_READONLY' } }, { status: 403 })
  }
  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })
  }
  const { status, body } = await updateMe(parsed.data)
  return NextResponse.json(body, { status })
}
