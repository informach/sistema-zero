// Shim: a lógica vive no @sistemazero/member-shell (createShellRoutes).
import { shell } from '@/server/shell'

export const { GET } = shell.routes.profilesList
export const { POST } = shell.routes.profileCreate
