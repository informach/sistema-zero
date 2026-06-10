// Shim: a lógica vive no @sistemazero/member-shell (createShellRoutes) —
// compartilhada com o community-kids; um fix pousa num lugar só.
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

export const { GET } = shell.routes.healthz
