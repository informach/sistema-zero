// Shim: entra/troca de perfil (emite a sessão de perfil; o handler troca os cookies).
import { shell } from '@/server/shell'

export const { POST } = shell.routes.profileSelect
