import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Aceitar o código de outra família, com um apelido para a casa. Só os pais.
export const POST = requireParentGateAccountOnly(shell.routes.arquipelagoAceitarAmigo.POST)
