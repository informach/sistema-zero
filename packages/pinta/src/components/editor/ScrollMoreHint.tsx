import type { JSX } from 'react'

/**
 * Degradê no pé de uma área que rola com a barra ESCONDIDA (`.pin-scroll-y`): "tem mais
 * embaixo". Fora do container rolável (irmão absoluto, dentro de um pai `relative`), para não
 * entrar na conta do `scrollHeight` que a régua da coluna do vetor mede. Serve as colunas
 * direitas e o miolo das caixas de ferramentas (`useScrollMore` diz quando mostrar); some no
 * branco das colunas da tela-modelo (11/09/2026).
 */
export function ScrollMoreHint(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      data-pin-scroll-more=""
      className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
      style={{ background: 'linear-gradient(to top, var(--color-pin-surface), transparent)' }}
    />
  )
}
