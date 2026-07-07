import { NextResponse } from 'next/server'
import { logoutRequest } from '@/server/gateway'
import { clearSessionCookies, getRefreshToken } from '@/server/session'

export async function POST() {
  const refresh = await getRefreshToken()
  if (refresh) await logoutRequest(refresh)
  await clearSessionCookies()
  return NextResponse.json({ ok: true })
}
