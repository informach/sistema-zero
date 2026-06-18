// Shim: a lógica vive no @sistemazero/member-shell (createShellRoutes) —
// compartilhada com o community-kids; um fix pousa num lugar só. O wrapper REVOGA
// o portão dos pais no logout (o cookie `sz_kids_parent` sobreviveria à saída).
import { withParentClearedOnLogout } from '@/server/parent-gate'
import { shell } from '@/server/shell'

export const POST = withParentClearedOnLogout(shell.routes.authLogout.POST)
