import type { JSX } from 'react'
import { IconArrowLeft } from '#ui'

/**
 * A marca escrita (nome próprio, não traduzido). O logo saiu de propósito: com
 * ele o Estúdio parecia outro produto dentro da comunidade.
 */
export const BRAND_NAME = 'Sistema Zero Studio'

/**
 * O canto esquerdo da barra (11/09/2026, a tela-modelo do Estúdio): UM botão com o CÍRCULO da
 * seta de voltar e a marca escrita ao lado. O nome acessível segue "Sistema Zero Studio" e o
 * `title` segue "Voltar à lista de projetos" (os e2e clicam por eles). ⚠️ O círculo com a seta
 * é o que faz o canto LER como botão: quando a marca virou texto puro (08/2026), ninguém mais
 * clicava ali para voltar.
 *
 * Quando a barra aperta, a marca vira `sr-only` e sobra o círculo (o nome acessível não muda).
 * Sem `onExit` (bloco de aula, admin) não há para onde voltar: sobra a marca estática, e só
 * quando cabe.
 */
export function BackBrand({
  onExit,
  showName,
}: {
  onExit?: () => void
  showName: boolean
}): JSX.Element | null {
  if (!onExit) return showName ? <span className="sz-bar-brand">{BRAND_NAME}</span> : null
  return (
    <button
      type="button"
      onClick={onExit}
      className="sz-bar-back"
      title="Voltar à lista de projetos"
    >
      <span className="sz-bar-back__circle" aria-hidden="true">
        <IconArrowLeft size={20} />
      </span>
      <span className={showName ? 'sz-bar-brand' : 'sr-only'}>{BRAND_NAME}</span>
    </button>
  )
}
