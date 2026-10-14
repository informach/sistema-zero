import type { StudioTaskSession } from './types'

/**
 * A frase da falha de GRAVAR NESTE APARELHO antes de concluir, continuar ou pedir ajuda.
 * ⚠️ Não é falha de rede: sem `childMessage` o painel diria "Confira a internet", e a internet
 * não tem nada a ver com um IndexedDB cheio ou um projeto em observação.
 */
export const FRASE_DE_GRAVAR_NO_APARELHO =
  'Não consegui guardar seu jogo neste aparelho. Tente de novo.'

/** Um erro com a frase escrita para a criança (a convenção do guia v2, ver `types.ts`). */
export function erroParaCrianca(frase: string, cause?: unknown): Error & { childMessage: string } {
  return Object.assign(new Error(frase), { childMessage: frase, cause })
}

/**
 * Os três callbacks do guia v2 GRAVAM o jogo antes de chamar o host (14/10/2026): concluir
 * pede uma criação salva, continuar troca de missão e a ajuda pode trocar de tela. O guia
 * antigo (sem `contractVersion`) segue intocado, pela mesma referência.
 *
 * ⚠️ Só a conclusão grava antes: marcar passo (`in_progress`) não é limite de snapshot.
 * ⚠️ Gravar que FALHA não chama o host e rejeita com `childMessage` — o painel mostra a frase.
 */
export function withSaveBeforeTaskActions(
  session: StudioTaskSession,
  save: () => Promise<void>,
): StudioTaskSession {
  if (session.guide.contractVersion !== 2) return session
  async function gravar(): Promise<void> {
    try {
      await save()
    } catch (cause) {
      throw erroParaCrianca(FRASE_DE_GRAVAR_NO_APARELHO, cause)
    }
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
