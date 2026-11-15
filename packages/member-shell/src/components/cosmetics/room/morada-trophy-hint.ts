import { LEGACY_TROPHY_SHELF, MORADA_TROPHY_SHELF } from '@sistemazero/core/morada'
import { TROPHY_HINT } from '../../../lib/room-catalog'
import { ADULT_ROOM_COPY } from '../skin'

/** A voz adulta nunca recebe a dica infantil quando o app não forneceu a sua. */
export function moradaTrophyHint(
  pieceId: string,
  adult: boolean,
  hints?: Readonly<Record<string, string>>,
): string {
  // A estante de troféus é a `estante-trofeus` do quarto antigo: a mesma dica.
  const id =
    pieceId === MORADA_TROPHY_SHELF ? LEGACY_TROPHY_SHELF : pieceId.replace(/^trophy\//, '')
  return (
    hints?.[id] ?? (adult ? ADULT_ROOM_COPY.trophyFallback : (TROPHY_HINT[id] ?? 'Por conquistar'))
  )
}
