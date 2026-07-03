import { shell } from '@/server/shell'

// POST = APPEND (autoria manual "+ Nova missão"). O REPLACE/geração vive na rota de IA.
export const { POST } = shell.routes.pensaTaskCreate
