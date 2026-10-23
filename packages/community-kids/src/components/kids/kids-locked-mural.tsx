import { KidsLockedProduct } from './kids-locked-product'

/** Gostinho do que a criança encontra no Mural quando liberar. */
const PREVIEW = [
  { emoji: '🎮', text: 'Veja os jogos que a turma criou' },
  { emoji: '❤️', text: 'Curta e comente os projetos dos colegas' },
  { emoji: '🕹️', text: 'Jogue os jogos direto no Mural' },
] as const

/**
 * Tela do Mural dos Criadores BLOQUEADO (a conta não tem o produto): o item aparece no menu,
 * mas a criança ainda não tem acesso. Wrapper fino do `KidsLockedProduct` (prévia + cartão
 * da Comunidade dos Criadores, onde o Mural abre com a assinatura).
 */
export function KidsLockedMural() {
  return (
    <KidsLockedProduct
      product="mural"
      title="Mural dos Criadores"
      intro="O Mural dos Criadores é a vitrine onde a galera mostra os jogos que criou! 🎨✨"
      preview={PREVIEW}
    />
  )
}
