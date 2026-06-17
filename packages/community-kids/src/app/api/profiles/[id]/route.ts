// Shim: a lógica vive no @sistemazero/member-shell (createShellRoutes).
import { shell } from '@/server/shell'

export const { PATCH } = shell.routes.profileUpdate
export const { DELETE } = shell.routes.profileArchive
