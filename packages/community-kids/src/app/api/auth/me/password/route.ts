// Shim: troca a senha da CONTA (só na sessão da conta; o auth recusa sessão de perfil). Exige
// a senha atual. Quem nunca criou senha (opcional desde 15/11/2026) cria pelo código do
// e-mail, em "Esqueci minha senha". No sucesso o auth revoga todas as sessões e o cookie
// antigo do portão é limpo junto.
import { requireParentGate, withParentClearedOnPasswordChange } from '@/server/parent-gate'
import { shell } from '@/server/shell'

export const POST = withParentClearedOnPasswordChange(
  requireParentGate(shell.routes.authMePassword.POST),
)
