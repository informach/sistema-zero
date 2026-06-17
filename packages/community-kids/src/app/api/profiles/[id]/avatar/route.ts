// Shim: foto do perfil (multipart → R2 → PATCH /auth/profiles/:id). FORA do matcher
// do proxy (multipart) — tem guard próprio (sessão estrita + anti-CSRF same-origin).
import { shell } from '@/server/shell'

export const { POST } = shell.routes.profileAvatar
