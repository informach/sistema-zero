import { shell } from '@/server/shell'

// PÚBLICA (sem login): stream do projeto jogável do R2, mesma origem (sem CORS).
export const { GET } = shell.routes.studioPlay
