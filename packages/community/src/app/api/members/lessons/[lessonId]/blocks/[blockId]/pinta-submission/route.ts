// Shim: a lógica vive no @sistemazero/member-shell (createShellRoutes) —
// compartilhada com o community-kids; um fix pousa num lugar só.
//
// ⚠️ Existe TAMBÉM no adulto porque o `BlockRenderer` do shell é compartilhado: uma aula com
// bloco de Pinta renderiza aqui do mesmo jeito, e sem o shim o envio bateria em 404 do Next.
import { shell } from '@/server/shell'

export const { POST } = shell.routes.pintaSubmit
export const { GET } = shell.routes.pintaSubmissionGet
