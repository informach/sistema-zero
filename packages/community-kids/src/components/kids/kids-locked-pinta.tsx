import type { JourneyLevelSlug } from '@sistemazero/core/journey'
import { KidsLockedProduct } from './kids-locked-product'

/** Gostinho do que a criança encontra no Pinta quando liberar. */
const PREVIEW = [
  { emoji: '🖼️', text: 'Desenhe personagens, cenários e peças' },
  { emoji: '✨', text: 'Crie animações pixel a pixel' },
  { emoji: '🚀', text: 'Use os seus desenhos no Estúdio' },
] as const

/**
 * Tela do Pinta BLOQUEADO (a conta não tem o produto): o item aparece no menu,
 * mas a criança ainda não tem acesso. Wrapper fino do `KidsLockedProduct` (prévia + cartão
 * da Comunidade dos Criadores, onde o Pinta abre no posto que a política diz, `opensAt`).
 */
export function KidsLockedPinta({
  opensAt = null,
  earned = false,
}: {
  opensAt?: JourneyLevelSlug | null
  /** A criança já conquistou a ferramenta na Jornada: a frase diz que ela volta a abrir. */
  earned?: boolean
}) {
  return (
    <KidsLockedProduct
      product="pinta"
      opensAt={opensAt}
      earned={earned}
      title="Pinta"
      intro="O Pinta é o ateliê onde você desenha os personagens, cenários e peças dos seus jogos! 🎨✨"
      preview={PREVIEW}
    />
  )
}
