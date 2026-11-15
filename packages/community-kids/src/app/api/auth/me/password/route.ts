// Shim: cria ou troca a senha da CONTA (só na sessão da conta; o auth recusa sessão de
// perfil). A senha é opcional (15/11/2026): quem nunca criou uma cria sem a atual. No
// sucesso o auth revoga todas as sessões e o cookie antigo do portão é limpo junto.
import { requireParentGate, withParentClearedOnPasswordChange } from '@/server/parent-gate'
import { shell } from '@/server/shell'

export const POST = withParentClearedOnPasswordChange(
  requireParentGate(shell.routes.authMePassword.POST),
)
