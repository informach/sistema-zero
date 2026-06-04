import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resetPassword } from '@/server/auth'

const Body = z.object({
  token: z.string().min(10).max(512),
  newPassword: z.string().min(1).max(200),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })
  }
  const { status, body } = await resetPassword(parsed.data.token, parsed.data.newPassword)
  return NextResponse.json(body ?? { ok: status === 200 }, { status })
}
