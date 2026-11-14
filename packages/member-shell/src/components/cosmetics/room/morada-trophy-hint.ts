import { TROPHY_HINT } from '../../../lib/room-catalog'
import { ADULT_ROOM_COPY } from '../skin'

/** A voz adulta nunca recebe a dica infantil quando o app não forneceu a sua. */
export function moradaTrophyHint(
  pieceId: string,
  adult: boolean,
  hints?: Readonly<Record<string, string>>,
): string {
  const id = pieceId.replace(/^trophy\//, '')
  return (
    hints?.[id] ?? (adult ? ADULT_ROOM_COPY.trophyFallback : (TROPHY_HINT[id] ?? 'Por conquistar'))
  )
}
