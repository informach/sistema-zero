import { shell } from '@/server/shell'

// "Guardado na sua conta": índice das criações do perfil numa ferramenta
// (Estúdio Completo | Pinta). Só metadados; o blob vive no R2 UGC.
export const { GET } = shell.routes.creationsList
