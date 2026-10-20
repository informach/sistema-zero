import type { JourneyLevelSlug } from '@sistemazero/core/journey'
import { KidsLockedProduct } from './kids-locked-product'

/** Gostinho do que a criança encontra no Estúdio quando liberar. */
const PREVIEW = [
  { emoji: '🧩', text: 'Monte jogos com blocos que viram código' },
  { emoji: '🎮', text: 'Teste e jogue o que você criou' },
  { emoji: '🚀', text: 'Compartilhe as suas criações' },
] as const

/**
 * Tela do Estúdio Completo BLOQUEADO (a conta não tem o produto): o item aparece no menu,
 * mas a criança ainda não tem acesso. Wrapper fino do `KidsLockedProduct` (prévia + cartão
 * da Comunidade dos Criadores, onde o Estúdio abre no posto que a política diz, `opensAt`).
 */
export function KidsLockedStudio({
  opensAt = null,
  earned = false,
}: {
  opensAt?: JourneyLevelSlug | null
  /** A criança já conquistou a ferramenta na Jornada: a frase diz que ela volta a abrir. */
  earned?: boolean
}) {
  return (
    <KidsLockedProduct
      product="estudio"
      opensAt={opensAt}
      earned={earned}
      title="Estúdio Completo"
      intro="O Estúdio Completo é onde você cria os seus próprios jogos e apps, do seu jeito! 🎮✨"
      preview={PREVIEW}
    />
  )
}
