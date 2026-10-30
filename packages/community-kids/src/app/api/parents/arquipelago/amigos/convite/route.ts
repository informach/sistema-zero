import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Gerar (POST) e desligar (DELETE ?perfil=) o convite de uma criança. Só os pais.
export const POST = requireParentGateAccountOnly(shell.routes.arquipelagoConviteDeAmigo.POST)
export const DELETE = requireParentGateAccountOnly(shell.routes.arquipelagoConviteDeAmigo.DELETE)
