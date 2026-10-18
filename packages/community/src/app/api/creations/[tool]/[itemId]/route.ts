import { shell } from '@/server/shell'

// Lixeira lógica de uma criação (idempotente; o BFF apaga o blob do R2 — só a linha do índice fica).
export const { DELETE } = shell.routes.creationsDelete
