import { shell } from '@/server/shell'

/** Recupera registros pendentes de versões anteriores antes de iniciar a sessão nova. */
export const { POST } = shell.routes.arquipelagoRecuperarTempo
