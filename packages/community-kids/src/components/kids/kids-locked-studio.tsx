import { KidsLockedProduct } from './kids-locked-product'

/** Gostinho do que a criança encontra no Estúdio quando liberar. */
const PREVIEW = [
  { emoji: '🧩', text: 'Monte jogos com blocos que viram código' },
  { emoji: '🎮', text: 'Teste e jogue o que você criou' },
  { emoji: '🚀', text: 'Compartilhe as suas criações' },
] as const

/**
 * Tela do Estúdio Completo BLOQUEADO (sem o produto): o item aparece no menu, mas a
 * criança ainda não tem acesso. Wrapper fino do `KidsLockedProduct` (prévia + CTA da
 * Comunidade dos Criadores, a assinatura que libera o Estúdio).
 */
export function KidsLockedStudio() {
  return (
    <KidsLockedProduct
      title="Estúdio Completo"
      intro="O Estúdio Completo é onde você cria os seus próprios jogos e apps, do seu jeito! 🎮✨"
      preview={PREVIEW}
    />
  )
}
