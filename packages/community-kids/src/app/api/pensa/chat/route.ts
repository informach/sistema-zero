import { shell } from '@/server/shell'

// SSE: resposta em stream contínuo — nunca pré-renderizar/cachear.
export const dynamic = 'force-dynamic'

export const { POST } = shell.routes.pensaChat
