import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Painel de progresso dos filhos — EXCLUSIVO dos pais (sessão da CONTA + portão de
// senha). `requireParentGateAccountOnly` RECUSA a sessão de perfil: a criança não
// alcança a grade de identidade dos irmãos por esta rota (os stats já viriam zerados,
// mas é tela dos pais — mesma régua de `/api/payments/my`).
export const GET = requireParentGateAccountOnly(shell.routes.childrenStats.GET)
