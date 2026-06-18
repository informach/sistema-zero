// Shim: troca a senha da CONTA (só na sessão da conta — o auth recusa sessão de
// perfil). No Kids fica atrás do portão dos pais: a criança numa sessão de conta
// não troca a senha sem provar a senha atual antes.
import { requireParentGate } from '@/server/parent-gate'
import { shell } from '@/server/shell'

export const POST = requireParentGate(shell.routes.authMePassword.POST)
