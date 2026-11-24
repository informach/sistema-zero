import { shell } from '@/server/shell'

export const runtime = 'nodejs'
// O histórico da conversa (GET), apagar (DELETE) e as operações contextuais (POST): o mesmo
// mapa do Kids e do adaptador do Estúdio (`studio-zappy-adapter.ts`). O envio de mensagem é
// `messages/` (as duas rotas estavam trocadas, e o Zappy adulto não abria nem enviava).
export const { GET, DELETE, POST } = shell.routes.studioZappyHistory
