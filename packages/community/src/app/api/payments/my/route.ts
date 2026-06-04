import { NextResponse } from 'next/server'
import { listMyPayments } from '@/server/payments'

/** Lista paginada das compras do aluno logado (filtro por e-mail é do backend). */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = clampInt(url.searchParams.get('limit'), 20, 1, 100)
  const offset = clampInt(url.searchParams.get('offset'), 0, 0, 1_000_000)
  const { status, body } = await listMyPayments({ limit, offset })
  return NextResponse.json(body, { status })
}

function clampInt(raw: string | null, def: number, min: number, max: number): number {
  const n = Number(raw)
  if (!Number.isInteger(n)) return def
  return Math.min(Math.max(n, min), max)
}
