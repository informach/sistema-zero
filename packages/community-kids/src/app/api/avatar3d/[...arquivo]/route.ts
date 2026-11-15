import { shell } from '@/server/shell'

// Arquivos do avatar (bucket privado): sessão + arquivo do catálogo → link assinado. A lógica
// mora no member-shell (`routes/avatar-files.ts`).
export const { GET } = shell.routes.avatarFile
