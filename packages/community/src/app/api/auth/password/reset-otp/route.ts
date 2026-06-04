import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resetPasswordWithOtp } from '@/server/auth'

const Body = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(12),
  newPassword: z.string().min(1).max(200),
})

/** Recuperação de senha por OTP: consome o código e define a nova senha. */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })
  }
  const { status, body } = await resetPasswordWithOtp(
    parsed.data.email,
    parsed.data.code,
    parsed.data.newPassword,
  )
  return NextResponse.json(body ?? { ok: status === 200 }, { status })
}
