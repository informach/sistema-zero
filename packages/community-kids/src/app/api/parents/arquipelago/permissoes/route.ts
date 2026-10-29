import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Arquipélago Vagalume: as permissões de visita da família (irmãos, outras crianças e fotos no
// Clube). EXCLUSIVO dos pais (sessão da CONTA + portão de senha), como o limite.
export const GET = requireParentGateAccountOnly(shell.routes.arquipelagoPermissoesDaFamilia.GET)
export const PUT = requireParentGateAccountOnly(shell.routes.arquipelagoPermissoesDaFamilia.PUT)
