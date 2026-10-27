import { shell } from '@/server/shell'

/** Sessão de tempo calculada pelo serviço, sempre vinculada ao perfil autenticado. */
export const { POST } = shell.routes.arquipelagoSessaoTempo
