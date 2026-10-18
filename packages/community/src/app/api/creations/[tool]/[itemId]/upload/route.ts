import { shell } from '@/server/shell'

// Reserva a próxima revisão no members (posse + quota) e assina o PUT direto no R2 UGC —
// o blob nunca passa pelo Next nem pelo gateway (teto de 2 MB da borda intacto).
export const { POST } = shell.routes.creationsUploadUrl
