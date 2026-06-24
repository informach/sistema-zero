// Shim: a lógica vive no @sistemazero/member-shell — GET = estado (emitir/baixar),
// POST = emite (idempotente) e devolve o PDF em stream.
import { shell } from '@/server/shell'

export const { GET } = shell.routes.certificateState
export const { POST } = shell.routes.certificateIssue
