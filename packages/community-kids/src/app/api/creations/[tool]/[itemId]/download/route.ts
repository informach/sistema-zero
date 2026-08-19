import { shell } from '@/server/shell'

// GET pré-assinado do blob corrente (o navegador baixa direto do R2).
export const { GET } = shell.routes.creationsDownloadUrl
