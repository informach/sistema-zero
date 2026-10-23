import type { PintaTaskSession } from '../core/types'

export const FRASE_DE_GRAVAR_NO_APARELHO =
  'Não consegui guardar seu desenho neste aparelho. Tente de novo.'
export function erroParaCrianca(frase: string, cause?: unknown): Error & { childMessage: string } {
  return Object.assign(new Error(frase), { childMessage: frase, cause })
}
export function withSaveBeforeTaskActions(
  session: PintaTaskSession,
  save: () => Promise<boolean>,
): PintaTaskSession {
  const before = (action: () => void | Promise<void>) => async () => {
    let saved = false
    try {
      saved = await save()
    } catch (cause) {
      throw erroParaCrianca(FRASE_DE_GRAVAR_NO_APARELHO, cause)
    }
    if (!saved) throw erroParaCrianca(FRASE_DE_GRAVAR_NO_APARELHO)
    await action()
  }
  return {
    ...session,
    onComplete: before(session.onComplete),
    onNextMission: before(session.onNextMission),
    onNeedHelp: before(session.onNeedHelp),
    onReturnToPlan: before(session.onReturnToPlan),
    onBindCreation: async (input) => {
      let saved = false
      try {
        saved = await save()
      } catch (cause) {
        throw erroParaCrianca(FRASE_DE_GRAVAR_NO_APARELHO, cause)
      }
      if (!saved) throw erroParaCrianca(FRASE_DE_GRAVAR_NO_APARELHO)
      await session.onBindCreation(input)
    },
  }
}
