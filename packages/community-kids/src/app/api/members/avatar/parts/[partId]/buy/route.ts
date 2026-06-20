import { shell } from '@/server/shell'

// Compra de uma peça paga do avatar com moedas Zappy (idempotente; sem saldo → 402).
export const { POST } = shell.routes.avatarBuy
