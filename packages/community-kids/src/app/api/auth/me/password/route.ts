// Shim: troca a senha da CONTA (só na sessão da conta — o auth recusa sessão de
// perfil). No Kids fica atrás do portão dos pais (provar a senha atual antes) E
// FECHA o portão no sucesso: o auth revoga todas as sessões, mas o cookie do portão
// sobreviveria 15 min — a mesma conta reentrada herdaria a gestão sem reprovar a
// senha NOVA. Ver withParentClearedOnPasswordChange.
import { requireParentGate, withParentClearedOnPasswordChange } from '@/server/parent-gate'
import { shell } from '@/server/shell'

export const POST = withParentClearedOnPasswordChange(
  requireParentGate(shell.routes.authMePassword.POST),
)
