import { shell } from '@/server/shell'

// A sala da oficina ao vivo (curso ao vivo da comunidade adulta, 14/10/2026): a mesma lista de
// rotas permitidas do Kids (`member-shell/lib/live-route-policy.ts`), com a sessão deste app.
export const GET = shell.routes.live
export const POST = shell.routes.live
export const PUT = shell.routes.live
