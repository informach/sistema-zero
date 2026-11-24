import { shell } from '@/server/shell'

// Quanto resta de créditos do Zappy e do Pensa. O painel do Zappy no Estúdio lê daqui (o mesmo
// caminho do Kids); o handler nunca erra: indisponível vira `{credits: null}`.
export const { GET } = shell.routes.aiCredits
