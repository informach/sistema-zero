import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Remover uma casa de amigo aceita. Só os pais.
export const DELETE = requireParentGateAccountOnly(shell.routes.arquipelagoRemoverAmigo.DELETE)
