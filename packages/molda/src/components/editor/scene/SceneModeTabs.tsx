/**
 * As três abas do topo: Modelar, Pintar e Animar. Cada uma troca a caixa de ferramentas
 * inteira, e é essa troca que deixa a oficina mais fácil: o que não é da aba não aparece.
 *
 * As abas nunca somem por nível de carreira; o que é portado é o conteúdo delas.
 */
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { Button } from '../../ui/Button'
import type { SceneWorkshopMode } from './useSceneWorkshop'

const TABS: ReadonlyArray<[SceneWorkshopMode, string]> = [
  ['model', COPY.scene.modelMode],
  ['paint', SCENE_PAINT_COPY.tab],
  ['animation', COPY.scene.animationMode],
]

export function SceneModeTabs({
  mode,
  onChange,
}: {
  mode: SceneWorkshopMode
  onChange(next: SceneWorkshopMode): void
}) {
  return (
    <fieldset aria-label={COPY.scene.animationModes} className="mr-auto flex shrink-0 gap-2">
      {TABS.map(([value, label]) => (
        <Button
          key={value}
          className="text-sm"
          variant={mode === value ? 'primary' : 'ghost'}
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
        >
          {label}
        </Button>
      ))}
    </fieldset>
  )
}
