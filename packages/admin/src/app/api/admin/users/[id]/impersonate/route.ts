import { NextResponse } from 'next/server'
import { impersonateUser } from '@/server/users'

/** "Entrar como" (suporte): emite o token de handoff de impersonação via gateway. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await impersonateUser(id)
  return NextResponse.json(body, { status })
}
