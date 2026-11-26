import { NextResponse } from 'next/server'
import { forwardUpstream } from '@/server/forward'
import { listAcquisitions } from '@/server/referrals'

/** As aquisições de um e-mail (ficha da conta, "Compras e origem"). */
export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get('email')?.trim() ?? ''
  if (!email || email.length > 254 || !email.includes('@'))
    return NextResponse.json(
      { error: { code: 'INVALID_EMAIL', message: 'Informe o e-mail da conta.' } },
      { status: 400 },
    )
  return forwardUpstream(await listAcquisitions(email))
}
