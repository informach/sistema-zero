import { NextResponse } from 'next/server'
import { z } from 'zod'
import { updateMe } from '@/server/auth'

const Body = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
})

/** Edita o perfil do PRÓPRIO aluno (nome/telefone — e-mail não é editável). */
export async function PATCH(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })
  }
  const { status, body } = await updateMe(parsed.data)
  return NextResponse.json(body, { status })
}
