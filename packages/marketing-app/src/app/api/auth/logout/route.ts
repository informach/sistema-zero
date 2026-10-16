import { NextResponse } from 'next/server'
import { disconnectDesktopSession, getDesktopCredential } from '@/server/desktop-session'
import { logoutRequest } from '@/server/gateway'
import { clearSessionCookies, getRefreshToken } from '@/server/session'

export async function POST() {
  const desktop = await getDesktopCredential()
  if (desktop) await disconnectDesktopSession(desktop)
  const refresh = await getRefreshToken()
  if (refresh) await logoutRequest(refresh)
  await clearSessionCookies()
  return NextResponse.json({ ok: true })
}
