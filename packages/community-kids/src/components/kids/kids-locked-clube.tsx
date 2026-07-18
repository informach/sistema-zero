import { KidsLockedProduct } from './kids-locked-product'

/** Gostinho do que a criança encontra no Clube quando liberar. */
const PREVIEW = [
  { emoji: '💬', text: 'Converse com a turma e faça amizades' },
  { emoji: '🎨', text: 'Mostre as suas criações e descobertas' },
  { emoji: '📣', text: 'Veja os recados e novidades dos professores' },
] as const

/**
 * Tela do Clube dos Criadores BLOQUEADO (sem o produto): o item aparece no menu, mas a
 * criança ainda não tem acesso. Wrapper fino do `KidsLockedProduct` (prévia + CTA da
 * Comunidade dos Criadores, a assinatura que libera o Clube).
 */
export function KidsLockedClube() {
  return (
    <KidsLockedProduct
      title="Clube dos Criadores"
      intro="O Clube dos Criadores é onde a galera troca ideia, mostra os projetos e faz amizade! 💬✨"
      preview={PREVIEW}
    />
  )
}
