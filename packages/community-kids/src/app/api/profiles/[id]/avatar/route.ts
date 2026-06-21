// Shim: foto do perfil (multipart → R2 → PATCH /auth/profiles/:id). FORA do matcher
// do proxy (multipart) — tem guard próprio (sessão estrita + anti-CSRF same-origin).
// Dual como o PATCH: criança troca a PRÓPRIA foto (sessão de perfil, passa) / pais
// trocam a foto do filho (sessão da conta, exige o portão dos pais).
import { requireParentGate } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// sharp (otimização → WebP) é binário nativo → runtime Node (igual ao /api/me/avatar).
export const runtime = 'nodejs'

export const POST = requireParentGate(shell.routes.profileAvatar.POST)
