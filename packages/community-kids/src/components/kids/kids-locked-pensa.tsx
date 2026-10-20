import type { JourneyLevelSlug } from '@sistemazero/core/journey'
import { KidsLockedProduct } from './kids-locked-product'

/** Gostinho do que a criança encontra no Pensa quando liberar. */
const PREVIEW = [
  { emoji: '💡', text: 'Transforme a sua ideia num plano' },
  { emoji: '🗺️', text: 'Desenhe as telas e o fluxo do jogo' },
  { emoji: '✅', text: 'Organize as missões pra construir' },
] as const

/**
 * Tela do Pensa BLOQUEADO (a conta não tem o produto): o item aparece no menu,
 * mas a criança ainda não tem acesso. Wrapper fino do `KidsLockedProduct` (prévia + cartão
 * da Comunidade dos Criadores, onde o Pensa abre no posto que a política diz, `opensAt`).
 */
export function KidsLockedPensa({
  opensAt = null,
  earned = false,
}: {
  opensAt?: JourneyLevelSlug | null
  /** A criança já conquistou a ferramenta na Jornada: a frase diz que ela volta a abrir. */
  earned?: boolean
}) {
  return (
    <KidsLockedProduct
      product="pensa"
      opensAt={opensAt}
      earned={earned}
      title="Pensa"
      intro="O Pensa é onde você planeja o seu jogo antes de construir: a ideia, as telas e as missões! 💡✨"
      preview={PREVIEW}
    />
  )
}
