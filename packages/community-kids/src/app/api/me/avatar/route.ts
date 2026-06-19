// Shim: a lógica vive no @sistemazero/member-shell (createShellRoutes) —
// compartilhada com o community-kids; um fix pousa num lugar só.
// No Kids fica atrás do PORTÃO DOS PAIS: a FOTO é da CONTA do responsável — uma
// criança em sessão de conta não a troca sem provar a senha. Sessão de PERFIL é
// recusada pelo auth; requireParentGate deixa o perfil passar e gateia a conta.
import { requireParentGate } from '@/server/parent-gate'
import { shell } from '@/server/shell'

export const runtime = 'nodejs'

export const POST = requireParentGate(shell.routes.meAvatar.POST)
