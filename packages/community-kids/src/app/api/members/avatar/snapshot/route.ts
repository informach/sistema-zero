import { shell } from '@/server/shell'

// Sobe a FOTO (snapshot) do avatar 3D (multipart) — sharp→WebP→R2→members. Toda a
// lógica vive no member-shell (sessão estrita + anti-CSRF same-origin). FORA do matcher
// do proxy (multipart) — guard próprio no `requireUploadSession`.
export const { POST } = shell.routes.avatarSnapshot
