import { NextResponse } from 'next/server'
import { grantEntitlement } from '@/server/members'

/** Concessão manual de acesso (oferta ou curso) → `POST /members/admin/entitlements`. */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const { status, body } = await grantEntitlement(json)
  return NextResponse.json(body, { status })
}
