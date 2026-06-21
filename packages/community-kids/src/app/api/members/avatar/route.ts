import { shell } from '@/server/shell'

// Estado do avatar (GET) + salvar a config equipada (PUT). Toda a lógica vive no
// member-shell; a validação estrita (posse/camada) é do members.
export const { GET } = shell.routes.avatarGet
export const { PUT } = shell.routes.avatarEquip
