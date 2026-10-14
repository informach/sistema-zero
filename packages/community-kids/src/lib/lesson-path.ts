export { isLessonPath, LESSON_PATH } from '@sistemazero/member-shell/lib/lesson-path'

/**
 * A sala da oficina ao vivo (curso ao vivo, 14/10/2026). Desde que ela virou o layout da aula
 * gravada, ela mora no regime da AULA (`kids-aula`: o fundo azul-claro, as cartas e a reserva do
 * rodapé), não no das faixas.
 */
export const LIVE_ROOM_PATH = /^\/oficinas\/aulas\/[^/]+\/?$/

export function isLiveRoomPath(pathname: string | null | undefined): boolean {
  return LIVE_ROOM_PATH.test(pathname ?? '')
}
