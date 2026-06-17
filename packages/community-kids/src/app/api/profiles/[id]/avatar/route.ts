// Shim: foto do perfil (multipart → R2 → PATCH /auth/profiles/:id). FORA do matcher
// do proxy (multipart) — tem guard próprio (sessão estrita + anti-CSRF same-origin).
import { shell } from '@/server/shell'

// sharp (otimização → WebP) é binário nativo → runtime Node (igual ao /api/me/avatar).
export const runtime = 'nodejs'

export const { POST } = shell.routes.profileAvatar
