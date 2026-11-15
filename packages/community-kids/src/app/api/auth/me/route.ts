// Shim: PATCH do perfil da CONTA (nome/telefone). Desde 10/10/2026 a criança tem o próprio
// acesso (o aparelho autorizado) e a sessão da conta só nasce da senha ou do código do e-mail
// do responsável (a senha é opcional desde 15/11/2026). Em sessão de PERFIL o auth recusa
// (claim `pfl`).
import { requireParentGate } from '@/server/parent-gate'
import { shell } from '@/server/shell'

export const PATCH = requireParentGate(shell.routes.authMe.PATCH)
