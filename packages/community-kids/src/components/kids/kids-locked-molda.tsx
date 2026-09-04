import { KidsLockedProduct } from './kids-locked-product'

/** Gostinho do que a criança encontra no Molda quando liberar. */
const PREVIEW = [
  { emoji: '🧊', text: 'Monte modelos 3D com caixas, rampas, cilindros e bolas' },
  { emoji: '🎨', text: 'Pinte direto na superfície e crie texturas' },
  { emoji: '🌤️', text: 'Crie céus 360° que iluminam o seu jogo' },
] as const

/**
 * Tela do Molda BLOQUEADO (sem o produto): o item aparece no menu, mas a criança ainda
 * não tem acesso. Wrapper fino do `KidsLockedProduct` (prévia + CTA da Comunidade dos
 * Criadores, a assinatura que libera o Molda).
 */
export function KidsLockedMolda() {
  return (
    <KidsLockedProduct
      title="Molda"
      intro="O Molda é a oficina onde você modela personagens, texturas e céus em 3D para os seus jogos! 🧊✨"
      preview={PREVIEW}
    />
  )
}
