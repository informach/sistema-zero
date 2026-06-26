// Shim: a lógica vive no @sistemazero/member-shell (createShellRoutes) —
// compartilhada com o community; um fix pousa num lugar só.
import { shell } from '@/server/shell'

export const { POST } = shell.routes.studioSubmit
export const { GET } = shell.routes.studioSubmissionGet
