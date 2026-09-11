/**
 * As três abas do topo: Modelar, Pintar e Animar. Cada uma troca a caixa de ferramentas
 * inteira, e é essa troca que deixa a oficina mais fácil: o que não é da aba não aparece.
 *
 * As abas nunca somem por nível de carreira; o que é portado é o conteúdo delas.
 *
 * O desenho é o SEGMENTADO das telas-modelo (11/09/2026): um trilho claro e a aba escolhida
 * em pílula azul cheia, cada uma com o seu ícone. Sem `mr-auto`: quem empurra o resto da barra
 * é a própria barra, e no nível de entrada as abas flutuavam no meio dela.
 */
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { Box, Clapperboard, type LucideIcon, Paintbrush } from '../../ui/icons'
import type { SceneWorkshopMode } from './useSceneWorkshop'

const TABS: ReadonlyArray<[SceneWorkshopMode, string, LucideIcon]> = [
  ['model', COPY.scene.modelMode, Box],
  ['paint', SCENE_PAINT_COPY.tab, Paintbrush],
  ['animation', COPY.scene.animationMode, Clapperboard],
]

export function SceneModeTabs({
  mode,
  onChange,
}: {
  mode: SceneWorkshopMode
  onChange(next: SceneWorkshopMode): void
}) {
  return (
    <fieldset aria-label={COPY.scene.animationModes} className="mld-seg">
      {TABS.map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent"
        >
          <Icon aria-hidden="true" />
          {label}
        </button>
      ))}
    </fieldset>
  )
}
