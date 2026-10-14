import type { PintaTaskSession } from '../core/types'

/**
 * A frase da falha de GRAVAR NESTE APARELHO antes de concluir, continuar ou pedir ajuda.
 * ⚠️ Não é falha de rede: sem `childMessage` o painel diria "Confira a internet", e a internet
 * não tem nada a ver com um IndexedDB cheio.
 */
export const FRASE_DE_GRAVAR_NO_APARELHO =
  'Não consegui guardar seu desenho neste aparelho. Tente de novo.'

/** Um erro com a frase escrita para a criança (a convenção do guia v2, ver `core/types.ts`). */
export function erroParaCrianca(frase: string, cause?: unknown): Error & { childMessage: string } {
  return Object.assign(new Error(frase), { childMessage: frase, cause })
}

/**
 * Os três callbacks do guia v2 GRAVAM o desenho aberto antes de chamar o host (14/10/2026), a
 * mesma disciplina do "Voltar ao plano": concluir pede um desenho salvo, continuar e pedir
 * ajuda trocam de tela, e o flush do desmonte é `void` (não serve de garantia). O guia antigo
 * (sem `contractVersion`) segue intocado, pela mesma referência.
 *
 * `save` resolve `false` quando a gravação falhou; aí o host NÃO é chamado e a rejeição traz
 * `childMessage` — o painel mostra a frase.
 */
export function withSaveBeforeTaskActions(
  session: PintaTaskSession,
  save: () => Promise<boolean>,
): PintaTaskSession {
  if (session.guide.contractVersion !== 2) return session
  async function gravar(): Promise<void> {
    let ok = false
    try {
      ok = await save()
    } catch (cause) {
      throw erroParaCrianca(FRASE_DE_GRAVAR_NO_APARELHO, cause)
    }
    if (!ok) throw erroParaCrianca(FRASE_DE_GRAVAR_NO_APARELHO)
  }
  const { onNeedHelp, onNextMission } = session
  return {
    ...session,
    onProgress: async (input) => {
      if (input.status === 'completed') await gravar()
      await session.onProgress(input)
    },
    onNextMission: onNextMission
      ? async () => {
          await gravar()
          await onNextMission()
        }
      : undefined,
    onNeedHelp: onNeedHelp
      ? async () => {
          await gravar()
          await onNeedHelp()
        }
      : undefined,
  }
}
