// Shim: PATCH do perfil da CONTA (nome/telefone). No Kids fica atrás do PORTÃO DOS
// PAIS: uma criança numa sessão de CONTA (ex.: OTP no e-mail do responsável, ou pai
// que ficou logado num aparelho compartilhado) não desfigura a identidade do
// responsável sem provar a senha. Em sessão de PERFIL o auth recusa (claim `pfl`) e o
// requireParentGate deixa o perfil passar — o gate só vale p/ a sessão da conta.
import { requireParentGate } from '@/server/parent-gate'
import { shell } from '@/server/shell'

export const PATCH = requireParentGate(shell.routes.authMe.PATCH)
