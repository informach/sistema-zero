// Shim: sai do perfil para a área dos pais (gateado pela senha do responsável). O
// wrapper abre o portão dos pais no sucesso — a gestão logo em seguida não pede a
// senha de novo.
import { withParentVerifiedOnExit } from '@/server/parent-gate'
import { shell } from '@/server/shell'

export const POST = withParentVerifiedOnExit(shell.routes.profileExit.POST)
