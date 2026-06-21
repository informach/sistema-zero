// Shim: a lógica vive no @sistemazero/member-shell (createShellRoutes). PATCH é
// dual (pais gerindo o filho NA conta + a criança editando o PRÓPRIO perfil na
// sessão de perfil) — o `requireParentGate` deixa a sessão de perfil passar e só
// exige o portão na sessão da conta. Arquivar é só dos pais.
import { requireParentGate } from '@/server/parent-gate'
import { shell } from '@/server/shell'

export const PATCH = requireParentGate(shell.routes.profileUpdate.PATCH)
export const DELETE = requireParentGate(shell.routes.profileArchive.DELETE)
