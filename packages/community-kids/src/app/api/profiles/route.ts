// Shim: a lógica vive no @sistemazero/member-shell (createShellRoutes). Criar
// perfil é gestão → atrás do portão dos pais (a listagem fica aberta: a grade
// precisa dela para a seleção de perfil).
import { requireParentGate } from '@/server/parent-gate'
import { shell } from '@/server/shell'

export const { GET } = shell.routes.profilesList
export const POST = requireParentGate(shell.routes.profileCreate.POST)
