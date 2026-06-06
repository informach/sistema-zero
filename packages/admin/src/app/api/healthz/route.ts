import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Liveness p/ o healthcheck do Railway: sem auth e sem tocar upstream — responde
 * "estou de pé" (o gateway/serviços têm os próprios `/readyz`; acoplar aqui
 * transformaria degradação deles em outage do painel).
 */
export function GET() {
  return NextResponse.json({ status: 'ok' })
}
