import type { JourneyLevelSlug } from '@sistemazero/core/journey'
import { KidsLockedProduct } from './kids-locked-product'

/**
 * O que a criança faz no Pensa, na ordem (Canvas "Estados", 20/10/2026). A prévia antiga
 * prometia "desenhar as telas e o fluxo do jogo", que o Pensa de hoje não faz.
 */
const PREVIEW = [
  { emoji: '1', text: 'Conte a ideia do jogo, escrevendo ou falando' },
  { emoji: '2', text: 'Confira o plano que o Zappy monta com você' },
  { emoji: '3', text: 'Construa uma missão de cada vez no Estúdio, no Pinta e no Molda' },
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
      intro={
        earned
          ? 'Você já conquistou o Pensa. Os seus jogos e os planos estão guardados, e eles voltam a abrir junto com o acesso à Comunidade.'
          : 'No Pensa você conta a ideia de um jogo e o Zappy ajuda a dividir em missões. Depois, cada missão vira uma parte do jogo.'
      }
      preview={PREVIEW}
      numbered
    />
  )
}
