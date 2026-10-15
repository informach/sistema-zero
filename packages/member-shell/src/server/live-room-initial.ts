import 'server-only'
import type { LiveRoomView } from '@sistemazero/core/live'
import type { LessonDetailView } from '../lib/types'
import type { GatewayModule } from './gateway'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * O primeiro quadro da sala ao vivo (cursos ao vivo, 14/10/2026): a página lê a sala e, se o
 * conteúdo já abriu, a aula do encontro, no servidor. Sem isto a criança via "Abrindo seu
 * encontro…", depois o esqueleto da aula, depois a aula: três quadros que pulam (pedido dela:
 * "criança não tem paciência de esperar e repara tudo").
 *
 * Melhor esforço e SÓ LEITURA (`gatewayFetchReadonly`: não renova a sessão nem toca cookies, o
 * que um Server Component não pode): qualquer falha devolve `null` e o cliente busca como antes. A
 * autorização é a de sempre, no members.
 */
export async function loadLiveRoomInitial(
  gateway: Pick<GatewayModule, 'gatewayFetchReadonly'>,
  sessionId: string,
): Promise<{ room: LiveRoomView | null; lesson: LessonDetailView | null }> {
  if (!UUID.test(sessionId)) return { room: null, lesson: null }
  try {
    const roomRes = await gateway.gatewayFetchReadonly<LiveRoomView>(
      `/members/live/sessions/${sessionId}`,
    )
    const room = roomRes.status === 200 ? roomRes.body : null
    const ref = room?.lesson
    if (!room || !ref || !room.access.canOpen || !UUID.test(ref.lessonId))
      return { room, lesson: null }
    const lessonRes = await gateway.gatewayFetchReadonly<LessonDetailView>(
      `/members/courses/${encodeURIComponent(ref.courseSlug)}/lessons/${ref.lessonId}`,
    )
    return { room, lesson: lessonRes.status === 200 ? lessonRes.body : null }
  } catch {
    return { room: null, lesson: null }
  }
}
