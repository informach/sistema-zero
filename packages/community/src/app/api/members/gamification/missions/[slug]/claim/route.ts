import { shell } from '@/server/shell'

// Resgata o prêmio (XP + moedas) de uma missão concluída (idempotente).
export const { POST } = shell.routes.missionClaim
