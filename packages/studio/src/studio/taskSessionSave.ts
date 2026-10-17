import type { StudioTaskSession } from './types'

export const FRASE_DE_GRAVAR_NO_APARELHO =
  'Não consegui guardar seu jogo neste aparelho. Tente de novo.'
export function erroParaCrianca(frase: string, cause?: unknown): Error & { childMessage: string } {
  return Object.assign(new Error(frase), { childMessage: frase, cause })
}

/** Flush editor buffers before an action that confirms evidence or leaves the workshop. */
export function withSaveBeforeTaskActions(
  session: StudioTaskSession,
  save: () => Promise<void>,
): StudioTaskSession {
  const before = (action: () => void | Promise<void>) => async () => {
    try {
      await save()
    } catch (cause) {
      throw erroParaCrianca(FRASE_DE_GRAVAR_NO_APARELHO, cause)
    }
    await action()
  }
  return {
    ...session,
    onComplete: before(session.onComplete),
    onNextMission: before(session.onNextMission),
    onNeedHelp: before(session.onNeedHelp),
    onReturnToPlan: before(session.onReturnToPlan),
  }
}
