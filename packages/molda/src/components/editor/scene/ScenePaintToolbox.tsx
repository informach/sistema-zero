/**
 * As ferramentas da aba Pintar à vista: Lápis, Borracha, Balde e Conta-gotas, a largura do
 * traço e os recursos do editor antigo (girar a pintura da face, pintar de perto, espelho e
 * vestir com textura). O resto (formas, área, degradê, carimbo, folha inteira) mora em "Mais
 * jeitos de pintar".
 *
 * Desde a casca das telas-modelo (11/09/2026) as ferramentas são LADRILHOS com o nome embaixo
 * do ícone (`SceneTile`), como as do Modelar: só o ícone não dizia o que "Girar a pintura da
 * face" e "Pintar de perto" fazem. O nome é o texto do botão e continua sendo o nome acessível.
 *
 * Rótulo, ícone e tecla vêm do registro (`sceneCommandRegistry.ts`) e a ação de
 * `scenePaintShortcuts.ts`: o botão e o atalho são a mesma coisa.
 */
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { RequiresTool } from '../../toolAccess'
import { ChevronDown, FlipHorizontal2, Grid3x3 } from '../../ui/icons'
import { SCENE_TILE_GRID, SceneTile } from './SceneTile'
import { sceneCommand } from './sceneCommandRegistry'
import { SCENE_PAINT_ACTIONS, type ScenePaintActionId } from './scenePaintShortcuts'
import type { useScenePaint } from './useScenePaint'

/**
 * A grade dos ladrilhos: a MESMA do Modelar (duas colunas na coluna do desktop; abaixo de `lg`,
 * uma fileira só). Aqui a fileira rola dentro dela mesma, porque a coluna deitada do Pintar
 * quebra linha (tem a largura do traço e os avisos da ferramenta): em duas fileiras de
 * ladrilhos o palco de um celular em pé caía para 190px.
 */
const PAINT_TILES = SCENE_TILE_GRID

const WIDTHS = [
  [1, 'paint.width-1'],
  [2, 'paint.width-2'],
  [3, 'paint.width-3'],
] as const

export function ScenePaintToolbox({
  paint,
  onDress,
  onChooseTool,
}: {
  paint: ReturnType<typeof useScenePaint>
  /** "Vestir com textura": só quando há galeria (dentro do app) e uma peça para vestir. */
  onDress?: () => void
  onChooseTool?(): void
}) {
  const { eraser, fill, picker, rotate, closeupTool, shape, brush } = paint
  const pencil = !eraser && !fill && !shape && !picker && !rotate && !closeupTool
  const tools: Array<[ScenePaintActionId, boolean]> = [
    ['paint.pencil', pencil],
    ['paint.fill', fill],
    ['paint.eraser', eraser],
    ['paint.picker', picker],
    ['paint.closeup', closeupTool],
  ]
  const dress = sceneCommand('paint.dress')
  return (
    <RequiresTool family="paint.brush">
      <fieldset
        disabled={paint.drawing || paint.busy}
        className={steadyWhileDrawing(paint, 'min-w-0 max-lg:w-full')}
      >
        <legend className="mld-kicker mb-2">{SCENE_PAINT_COPY.tools}</legend>
        <div className={PAINT_TILES}>
          {tools.map(([id, active]) => {
            const command = sceneCommand(id)
            const key = command.shortcut?.display
            return (
              <SceneTile
                key={id}
                data-paint-tool={id}
                icon={command.icon}
                label={command.label}
                pressed={active}
                keyHint={key}
                aria-keyshortcuts={key}
                title={`${command.label}${key ? ` (${key})` : ''}${command.help ? `. ${command.help}` : ''}`}
                onClick={() => {
                  onChooseTool?.()
                  SCENE_PAINT_ACTIONS[id](paint)
                }}
              />
            )
          })}
        </div>
      </fieldset>
      {picker && <p className="text-xs text-mld-muted">{SCENE_PAINT_COPY.pickerHint}</p>}
      {fill && <p className="text-xs text-mld-muted">{SCENE_PAINT_COPY.fillHint}</p>}
      {rotate && <p className="text-xs text-mld-muted">{SCENE_PAINT_COPY.rotateHint}</p>}
      {closeupTool && <p className="text-xs text-mld-muted">{SCENE_PAINT_COPY.closeUpHint}</p>}
      {!fill && !picker && !rotate && !closeupTool && (
        <fieldset
          disabled={paint.drawing || paint.busy}
          className={steadyWhileDrawing(paint, 'min-w-0')}
        >
          <legend className="mld-kicker mb-2">{SCENE_PAINT_COPY.widths}</legend>
          {/* O número é a largura real em pixels, como no Pinta Pixelart. */}
          <div className="mld-width-seg">
            {WIDTHS.map(([size, id]) => {
              const command = sceneCommand(id)
              const key = command.shortcut?.display
              return (
                <button
                  key={size}
                  type="button"
                  aria-label={command.label}
                  aria-pressed={size === brush}
                  aria-keyshortcuts={key}
                  title={key ? `${command.label} (${key})` : command.label}
                  onClick={() => SCENE_PAINT_ACTIONS[id](paint)}
                >
                  {size}
                </button>
              )
            })}
          </div>
          <p className="mt-1 text-center text-xs font-bold text-mld-muted" aria-live="polite">
            {SCENE_PAINT_COPY.width[brush]}
          </p>
        </fieldset>
      )}
      <SceneTile
        data-toggle=""
        icon={FlipHorizontal2}
        label={SCENE_PAINT_COPY.mirrorShort}
        aria-label={SCENE_PAINT_COPY.mirror}
        title={SCENE_PAINT_COPY.mirrorHint}
        pressed={paint.mirror}
        onClick={() => paint.setMirror(!paint.mirror)}
      />
      <SceneTile
        data-toggle=""
        icon={Grid3x3}
        label="Quadradinhos"
        title="Mostrar a grade da pintura sobre a superfície"
        pressed={paint.grid}
        onClick={() => paint.setGrid(!paint.grid)}
      />
      <details className="mld-rail-more">
        <summary>
          {SCENE_PAINT_COPY.moreBrushes}
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className={PAINT_TILES}>
          {(['paint.rotate'] as const).map((id) => {
            const command = sceneCommand(id)
            return (
              <SceneTile
                key={id}
                data-paint-tool={id}
                icon={command.icon}
                label={command.label}
                pressed={rotate}
                onClick={() => {
                  onChooseTool?.()
                  SCENE_PAINT_ACTIONS[id](paint)
                }}
              />
            )
          })}
          {onDress && (
            <SceneTile
              icon={dress.icon}
              label={dress.label}
              aria-haspopup="dialog"
              onClick={onDress}
            />
          )}
        </div>
      </details>
    </RequiresTool>
  )
}

/**
 * Durante o traço os botões ficam desligados (um toque neles cancelaria o traço), mas sem
 * esmaecer: cada traço fazia a coluna inteira piscar. Só o trabalho demorado (`busy`) esmaece.
 * O `opacity-100` é utilitária e vence o esmaecido do `.mld-tile`, que mora em
 * `@layer components`.
 */
export function steadyWhileDrawing(
  paint: Pick<ReturnType<typeof useScenePaint>, 'drawing' | 'busy'>,
  className: string,
) {
  return paint.drawing && !paint.busy ? `${className} [&_button:disabled]:opacity-100` : className
}
