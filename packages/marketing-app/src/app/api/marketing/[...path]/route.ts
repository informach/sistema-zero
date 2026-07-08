import { NextResponse } from 'next/server'
import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'

/**
 * Catch-all do BFF p/ o @sistemazero/marketing: encaminha `/api/marketing/<path>`
 * → gateway `/marketing/<path>` com o Bearer do cookie (refresh-on-401 no
 * `gatewayFetch`). O gateway re-verifica JWT + RBAC (staff+) em toda chamada —
 * aqui só existe a ALLOWLIST de 1º segmento (rota fora do domínio da ferramenta
 * não sai deste app) e o repasse fiel de status/corpo via `forwardUpstream`.
 */

// 1º segmento permitido (espelha as famílias de rotas do serviço; o gateway
// decide o RBAC fino — ex.: oauth/start e accounts-write são admin+ lá).
// `oauth` cobre só o START (o callback é navegação do Google direto no gateway,
// nunca passa por aqui); `drive` é o picker de importação.
const ALLOWED_ROOTS = new Set([
  'ideas',
  'contents',
  'publications',
  'media',
  'checklist',
  'accounts',
  'metrics',
  'oauth',
  'drive',
  'ai',
])

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

async function handle(req: Request, params: Promise<{ path: string[] }>): Promise<NextResponse> {
  const { path } = await params
  const root = path[0]
  if (!root || !ALLOWED_ROOTS.has(root)) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } },
      { status: 404 },
    )
  }

  // Re-encode segmento a segmento: o Next entrega os segmentos DECODIFICADOS —
  // sem isso um `..%2F` viraria path traversal no caminho montado p/ o gateway.
  const upstreamPath = `/marketing/${path.map(encodeURIComponent).join('/')}`
  const { search } = new URL(req.url)

  const method = req.method as Method
  // Corpo é JSON em todas as mutações do serviço; POST sem corpo (ex.: /cancel,
  // /confirm) segue sem body — o `.catch` cobre o parse de corpo vazio.
  const body = method === 'GET' ? undefined : await req.json().catch(() => undefined)

  const { status, body: upstreamBody } = await gatewayFetch(`${upstreamPath}${search}`, {
    method,
    body,
  })
  return forwardUpstream({ status, body: upstreamBody })
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, ctx.params)
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, ctx.params)
}

export async function PUT(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, ctx.params)
}

export async function PATCH(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, ctx.params)
}

export async function DELETE(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return handle(req, ctx.params)
}
