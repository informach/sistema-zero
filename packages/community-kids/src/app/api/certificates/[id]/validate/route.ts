// Shim PÚBLICO (sem login): validação do certificado pelo id (lido do QR).
import { shell } from '@/server/shell'

export const { GET } = shell.routes.certificateValidate
