import type { JSStatement } from './schema'

type EventStatement = Extract<JSStatement, { type: 'event' | 'eventHandler' }>

export type EventTargetKind = NonNullable<EventStatement['targetKind']>

/**
 * Resolve o destino real de um listener. IR atual sempre declara `targetKind`,
 * mas projetos antigos usavam apenas os nomes reservados `window`/`document`.
 * Um `targetKind` explícito vence essa compatibilidade e permite, por exemplo,
 * um elemento cujo id seja literalmente "window".
 */
export function resolveEventTargetKind(
  target: string,
  targetKind: EventTargetKind | undefined,
): EventTargetKind {
  if (targetKind) return targetKind
  if (target === 'window' || target === 'document') return target
  return 'id'
}
