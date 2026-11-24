import { ptBR as editor } from './editor/pt-BR'
import { ptBR as pro } from './pro/pt-BR'
import { ptBR as shared } from './shared/pt-BR'

export const ptBR: Record<string, string> = { ...shared, ...editor, ...pro }
