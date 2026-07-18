import { KidsLockedProduct } from './kids-locked-product'

/** Gostinho do que a criança encontra no Mural quando liberar. */
const PREVIEW = [
  { emoji: '🎮', text: 'Veja os jogos que a turma criou' },
  { emoji: '❤️', text: 'Curta e comente os projetos dos colegas' },
  { emoji: '🕹️', text: 'Jogue os jogos direto no Mural' },
] as const

/**
 * Tela do Mural dos Criadores BLOQUEADO (sem o produto): o item aparece no menu, mas a
 * criança ainda não tem acesso. Wrapper fino do `KidsLockedProduct` (prévia + CTA da
 * Comunidade dos Criadores, a assinatura que libera o Mural).
 */
export function KidsLockedMural() {
  return (
    <KidsLockedProduct
      title="Mural dos Criadores"
      intro="O Mural dos Criadores é a vitrine onde a galera mostra os jogos que criou! 🎨✨"
      preview={PREVIEW}
    />
  )
}
