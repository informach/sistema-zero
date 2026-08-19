import { shell } from '@/server/shell'

// Confirma a revisão reservada depois do PUT no R2 (só a revisão reservada confirma).
export const { POST } = shell.routes.creationsCommit
