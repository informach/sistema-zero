import { shell } from '@/server/shell'

// Registra o REMIX de um jogo do Mural ("Fazer a minha versão") — marco da missão
// gated por estudio-completo (retenção pós-cursos). Best-effort do cliente; os
// guards anti-farm (posse + playId real no hub + não-self) são do members.
export const { POST } = shell.routes.studioRemix
