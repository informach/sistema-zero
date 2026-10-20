import type { JourneyLevelSlug } from '@sistemazero/core/journey'
import { KidsLockedProduct } from './kids-locked-product'

/** Gostinho do que a criança encontra no Molda quando liberar. */
const PREVIEW = [
  { emoji: '🧊', text: 'Monte modelos 3D com caixas, rampas, cilindros e bolas' },
  { emoji: '🎨', text: 'Pinte direto na superfície e crie texturas' },
  { emoji: '🌤️', text: 'Crie céus 360° que iluminam o seu jogo' },
] as const

/**
 * Tela do Molda BLOQUEADO (a conta não tem o produto): o item aparece no menu,
 * mas a criança ainda não tem acesso. Wrapper fino do `KidsLockedProduct` (prévia + cartão
 * da Comunidade dos Criadores, onde o Molda abre no posto que a política diz, `opensAt`).
 */
export function KidsLockedMolda({
  opensAt = null,
  earned = false,
}: {
  opensAt?: JourneyLevelSlug | null
  /** A criança já conquistou a ferramenta na Jornada: a frase diz que ela volta a abrir. */
  earned?: boolean
}) {
  return (
    <KidsLockedProduct
      product="molda"
      opensAt={opensAt}
      earned={earned}
      title="Molda"
      intro="O Molda é a oficina onde você modela personagens, texturas e céus em 3D para os seus jogos! 🧊✨"
      preview={PREVIEW}
    />
  )
}
