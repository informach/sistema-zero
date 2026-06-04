import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requestOtp } from '@/server/auth'

const Body = z.object({
  email: z.string().email(),
  purpose: z.enum(['sign_in', 'password_reset']),
})

/** Pede um código OTP. Sempre 200 genérico (anti-enumeração) — espelha o auth. */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })
  }
  try {
    await requestOtp(parsed.data.email, parsed.data.purpose)
  } catch {
    // best-effort: a UI segue para o passo do código de qualquer forma
  }
  return NextResponse.json({ ok: true })
}
