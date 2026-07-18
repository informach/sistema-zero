import { KidsLockedProduct } from './kids-locked-product'

/** Gostinho do que a criança encontra no Pinta quando liberar. */
const PREVIEW = [
  { emoji: '🖼️', text: 'Desenhe personagens, cenários e peças' },
  { emoji: '✨', text: 'Crie animações pixel a pixel' },
  { emoji: '🚀', text: 'Use os seus desenhos no Estúdio' },
] as const

/**
 * Tela do Pinta BLOQUEADO (sem o produto): o item aparece no menu, mas a criança ainda
 * não tem acesso. Wrapper fino do `KidsLockedProduct` (prévia + CTA da Comunidade dos
 * Criadores, a assinatura que libera o Pinta).
 */
export function KidsLockedPinta() {
  return (
    <KidsLockedProduct
      title="Pinta"
      intro="O Pinta é o ateliê onde você desenha os personagens, cenários e peças dos seus jogos! 🎨✨"
      preview={PREVIEW}
    />
  )
}
