import { shell } from '@/server/shell'

// Compra de um item/tema pago do quarto com moedas Zappy (idempotente; sem saldo → 402).
export const { POST } = shell.routes.roomBuy
