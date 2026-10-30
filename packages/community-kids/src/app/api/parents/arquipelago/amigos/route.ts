import { requireParentGateAccountOnly } from '@/server/parent-gate'
import { shell } from '@/server/shell'

// Arquipélago Vagalume: convites e casas de amigos (visitas de outras crianças). EXCLUSIVO dos pais
// (sessão da CONTA + portão de senha), como as permissões.
export const GET = requireParentGateAccountOnly(shell.routes.arquipelagoAmigosDaFamilia.GET)
