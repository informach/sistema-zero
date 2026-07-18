import { KidsLockedProduct } from './kids-locked-product'

/** Gostinho do que a criança encontra no Pensa quando liberar. */
const PREVIEW = [
  { emoji: '💡', text: 'Transforme a sua ideia num plano' },
  { emoji: '🗺️', text: 'Desenhe as telas e o fluxo do jogo' },
  { emoji: '✅', text: 'Organize as missões pra construir' },
] as const

/**
 * Tela do Pensa BLOQUEADO (sem o produto): o item aparece no menu, mas a criança ainda
 * não tem acesso. Wrapper fino do `KidsLockedProduct` (prévia + CTA da Comunidade dos
 * Criadores, a assinatura que libera o Pensa).
 */
export function KidsLockedPensa() {
  return (
    <KidsLockedProduct
      title="Pensa"
      intro="O Pensa é onde você planeja o seu jogo antes de construir: a ideia, as telas e as missões! 💡✨"
      preview={PREVIEW}
    />
  )
}
