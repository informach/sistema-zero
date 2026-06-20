import { shell } from '@/server/shell'

// Compra 1 protetor de sequência com moedas Zappy (sem saldo → 402; no máximo → 409).
export const { POST } = shell.routes.streakFreezeBuy
