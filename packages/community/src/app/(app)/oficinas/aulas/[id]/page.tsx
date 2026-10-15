import { loadLiveRoomInitial } from '@sistemazero/member-shell/server/live-room-initial'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'
import { LiveRoomClient } from './live-room-client'

export const dynamic = 'force-dynamic'

/**
 * A sala da oficina ao vivo da comunidade adulta (curso ao vivo, 14/10/2026): a aula do encontro
 * com a transmissão. ⚠️ Chega-se e sai-se por navegação COMPLETA (`<a>`): câmera, microfone e o
 * quadro da prévia são liberados pelos cabeçalhos DESTA rota (`next.config.ts`).
 */
export default async function LiveLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // A sala e a aula já no primeiro quadro (sem "Abrindo…" pulando para a aula).
  const [session, initial] = await Promise.all([
    getSession(),
    loadLiveRoomInitial(shell.gateway, id),
  ])
  return (
    <LiveRoomClient
      sessionId={id}
      initialRoom={initial.room}
      initialLesson={initial.lesson}
      viewerId={session?.id ?? null}
      viewerWatermark={session?.email ?? null}
    />
  )
}
