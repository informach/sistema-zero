'use client'

import type { TomDoControle } from '../exploration-stage'
import { SceneButton } from '../scene-discovery-frame'

/**
 * O que as sete telas do ateliê de O Jogo do Meu Jeito em exploração livre dividem (Construtor,
 * 02/11/2026): `pixel-vector`, `symmetry`, `shading`, `fill-stroke`, `frames`, `onion-skin` e
 * `motion-amount`. O palco é o de sempre (`ExplorationStage`); o que muda é o convite.
 */

/** Um caso da figura embaixo do palco: o que se testa e o que ele faz, revelado só depois do teste. */
export interface CasoDoAtelie {
  rotulo: string
  /** A criança JÁ testou este caso? É a meta do motor (o Desfazer volta a revelação junto). */
  visto: boolean
  resposta: string
}

/**
 * A figura "o que acontece" embaixo do palco, no molde da `IdeiaDasMoedas`: cada caso fica com
 * "Teste para descobrir" até a criança testá-lo, e só então mostra o que ele faz.
 */
export function IdeiaDoAtelie({ titulo, casos }: { titulo: string; casos: CasoDoAtelie[] }) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">{titulo}</figcaption>
      <div className="memory-actions">
        {casos.map((caso) => (
          <div key={caso.rotulo} data-lit={caso.visto}>
            <span>
              {caso.rotulo}
              <small>{caso.visto ? caso.resposta : 'Teste para descobrir'}</small>
            </span>
          </div>
        ))}
      </div>
    </figure>
  )
}

/** O convite de sempre embaixo dos controles: o destaque sugere, a criança escolhe a ordem. */
export function DicaLivre() {
  return (
    <p className="sz-discovery-free-hint">
      Experimente à vontade. Os destaques mostram o próximo teste, e você pode repetir quando
      quiser.
    </p>
  )
}

/**
 * Uma fileira de números (Velocidade, o tanto que anda): o valor de agora fica `ligado`, e o número
 * que a fala do Zappy pede fica em destaque. ⚠️ Sem `aria-pressed` nas escolhas (a régua do
 * `scene-bench`): o atual leva `aria-current`.
 */
export function FileiraDeNumeros({
  legenda,
  valor,
  opcoes,
  destaque,
  fechado = false,
  nota,
  onChange,
}: {
  legenda: string
  valor: number
  opcoes: readonly number[]
  destaque: number | null
  fechado?: boolean
  nota?: string
  onChange: (valor: number) => void
}) {
  const tom = (n: number): TomDoControle =>
    n === destaque && n !== valor ? 'gesto' : n === valor ? 'ligado' : 'ferramenta'
  return (
    <fieldset className="rounded-2xl border border-border px-2.5 py-2 text-sm font-semibold">
      <legend className="px-1">{legenda}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((n) => (
          <SceneButton
            key={n}
            className="min-w-11"
            aria-current={n === valor ? 'true' : undefined}
            tom={tom(n)}
            fechado={fechado}
            onClick={() => onChange(n)}
          >
            {n}
          </SceneButton>
        ))}
      </div>
      {nota ? <p className="mt-2 font-normal text-muted-foreground">{nota}</p> : null}
    </fieldset>
  )
}
