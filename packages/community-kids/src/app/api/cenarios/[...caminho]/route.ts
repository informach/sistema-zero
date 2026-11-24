import { shell } from '@/server/shell'

// Molda Cenários (a oficina de cenários 3D): bibliotecas, mundos e cenários guardados na conta.
// Um handler só para todos os caminhos; quem pode usar e de quem é cada coisa é o members.
export const { GET, POST, PATCH, DELETE } = shell.routes.cenarios
