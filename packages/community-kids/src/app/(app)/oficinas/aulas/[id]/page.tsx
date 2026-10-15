import { loadLiveRoomInitial } from '@sistemazero/member-shell/server/live-room-initial'
import { isVoiceInputConfigured } from '@sistemazero/member-shell/server/openrouter-transcribe'
import { getEnv } from '@/lib/env'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'
import { LiveRoomClient } from './live-room-client'

export const dynamic = 'force-dynamic'

/**
 * A sala da oficina ao vivo (curso ao vivo, 14/10/2026): o layout da aula gravada com a
 * transmissão. ⚠️ Chega-se e sai-se por navegação COMPLETA (`<a>`): a câmera, o microfone e o
 * quadro da prévia são liberados pelos cabeçalhos DESTA rota (`next.config.ts`).
 */
export default async function LiveLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // A sala e a fase já no primeiro quadro (sem "Abrindo…" pulando para a aula).
  const [session, profileRes, initial] = await Promise.all([
    getSession(),
    shell.auth.getMyProfileReadonly(),
    loadLiveRoomInitial(shell.gateway, id),
  ])
  const mine = profileRes.status === 200 ? profileRes.body.profile : null
  const activeProfile = mine && mine.id === session?.id ? mine : undefined
  return (
    <LiveRoomClient
      sessionId={id}
      initialRoom={initial.room}
      initialLesson={initial.lesson}
      viewerId={session?.id ?? null}
      viewerWatermark={session?.id ? `Perfil ${session.id.slice(0, 8)}` : null}
      lessonDraftsEnabled={
        getEnv().LESSON_DRAFTS_ENABLED && session?.act?.mode !== 'readonly' && Boolean(session?.id)
      }
      voiceInput={
        activeProfile?.voiceInputEnabled === true &&
        session?.kids?.kind === 'student' &&
        !session.act &&
        isVoiceInputConfigured()
      }
    />
  )
}
