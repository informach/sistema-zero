// Shim: o perfil da CONTA do responsável. Desde 10/10/2026 a criança tem o próprio acesso (o
// aparelho autorizado) e a sessão da conta só nasce da senha ou do código do e-mail do
// responsável; por isso a senha é opcional (15/11/2026). Em sessão de PERFIL o auth recusa
// (claim `pfl`).
import { requireParentGate, requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

/** Só `{ passwordSet }`: a tela de senha oferece "Criar senha" a quem ainda não tem uma. */
export const GET = requireParentGateAccountOnly(shell.routes.authMe.GET)
export const PATCH = requireParentGate(shell.routes.authMe.PATCH)
