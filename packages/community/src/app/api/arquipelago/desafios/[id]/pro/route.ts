import { shell } from '@/server/shell'

// Arquipélago Vagalume: compilar o Pro do Estúdio de desafio no executor (C02b).
export const runtime = 'nodejs'
export const maxDuration = 60
export const { POST } = shell.routes.arquipelagoDesafioPro
