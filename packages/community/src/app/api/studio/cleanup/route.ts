import { shell } from '@/server/shell'

// S2S do hub (rede interna, HMAC — FORA do matcher do proxy): limpa os artefatos R2
// de um post do Mural apagado pela moderação. Ver `createStudioRoutes` no member-shell.
export const { POST } = shell.routes.studioCleanup
