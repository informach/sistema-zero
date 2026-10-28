import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Arquipélago Vagalume: a semana de cada criança no jogo (desafios, objetos e tempo livre), para o
// cartão da Família. EXCLUSIVO dos pais (sessão da CONTA + portão de senha), como o limite.
export const GET = requireParentGateAccountOnly(shell.routes.arquipelagoSemanaDaFamilia.GET)
