import { shell } from '@/server/shell'

// Estado do quarto (GET) + salvar o quarto montado (PUT). O members canonicaliza
// contra o inventário (só itens/temas possuídos sobrevivem).
export const { GET } = shell.routes.roomGet
export const { PUT } = shell.routes.roomSave
