import { shell } from '@/server/shell'

// Quanta ajuda de IA resta para a família. Criança E pais leem (o bolso é da
// conta); o handler nunca erra — indisponível vira `{credits: null}` e o medidor
// simplesmente some.
export const { GET } = shell.routes.aiCredits
