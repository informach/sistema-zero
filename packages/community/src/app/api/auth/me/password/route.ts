import { NextResponse } from 'next/server'
import { z } from 'zod'
import { changeMyPassword } from '@/server/auth'
import { clearSessionCookies } from '@/server/session'

const Body = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(1).max(200),
})

/**
 * Troca a senha logado (exige a atual). O auth revoga TODAS as sessões — limpamos
 * os cookies aqui também; o cliente redireciona ao login.
 */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })
  }
  const { status, body } = await changeMyPassword(parsed.data)
  if (status === 200) await clearSessionCookies()
  return NextResponse.json(body, { status })
}
