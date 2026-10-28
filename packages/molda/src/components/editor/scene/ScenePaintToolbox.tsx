/**
 * A coluna da esquerda da aba Pintar: o que a mão faz. Três blocos, de cima para baixo:
 * as FERRAMENTAS (Pincel, Balde, Borracha, Pegar cor, Pintar de perto), o JEITO da ferramenta
 * escolhida (tamanho, como apagar, o que o balde enche) e as AJUDAS (Espelhar, Só nesta peça).
 * A cor mora na barra do pé do palco; formas, área e carimbo, em "Mais jeitos de pintar".
 *
 * As ferramentas são LADRILHOS com o nome embaixo do ícone (`SceneTile`), como as do Modelar.
 * A tecla do atalho não é desenhada: fica no `title` e no `aria-keyshortcuts`. O Pincel e o
 * Balde levam o pingo da tinta atual no canto.
 *
 * Rótulo, ícone e tecla vêm do registro (`sceneCommandRegistry.ts`) e a ação de
 * `scenePaintShortcuts.ts`: o botão e o atalho são a mesma coisa.
 */
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { RequiresTool } from '../../toolAccess'
import { FlipHorizontal2, Target } from '../../ui/icons'
import { SCENE_TILE_GRID, SceneTile } from './SceneTile'
import { sceneCommand } from './sceneCommandRegistry'
import { SCENE_PAINT_ACTIONS, type ScenePaintActionId } from './scenePaintShortcuts'
import type { useScenePaint } from './useScenePaint'

/**
 * A grade dos ladrilhos: a MESMA do Modelar (duas colunas na coluna do desktop; abaixo de `lg`,
 * uma fileira só). Aqui a fileira rola dentro dela mesma, porque a coluna deitada do Pintar
 * quebra linha (tem o jeito da ferramenta e as ajudas): em duas fileiras de ladrilhos o palco
 * de um celular em pé caía para 190px.
 */
const PAINT_TILES = SCENE_TILE_GRID

/** O tamanho do traço desenhado: a bolinha cresce com a largura real (1, 2 e 3 px). */
const WIDTHS = [
  [1, 'paint.width-1', 6],
  [2, 'paint.width-2', 10],
  [3, 'paint.width-3', 16],
] as const

export function ScenePaintToolbox({
  paint,
  onChooseTool,
}: {
  paint: ReturnType<typeof useScenePaint>
  onChooseTool?(): void
}) {
  const { eraser, fill, picker, rotate, closeupTool, shape, brush } = paint
  const copy = SCENE_PAINT_COPY
  const ink = `rgb(${paint.ink[0]} ${paint.ink[1]} ${paint.ink[2]})`
  const colorImage = (paint.data?.imageKind ?? 'color') === 'color'
  const pencil = !eraser && !fill && !shape && !picker && !rotate && !closeupTool
  const tools: Array<[ScenePaintActionId, boolean]> = [
    ['paint.pencil', pencil],
    ['paint.fill', fill],
    ['paint.eraser', eraser],
    ['paint.picker', picker],
    ['paint.closeup', closeupTool],
  ]
  return (
    <RequiresTool family="paint.brush">
      <fieldset
        disabled={paint.drawing || paint.busy}
        className={steadyWhileDrawing(paint, 'min-w-0 max-lg:w-full')}
      >
        <legend className="mld-kicker mb-2">{copy.tools}</legend>
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
                dot={id === 'paint.pencil' || id === 'paint.fill' ? ink : undefined}
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
      {picker && <p className="text-xs text-mld-muted">{copy.pickerHint}</p>}
      {rotate && <p className="text-xs text-mld-muted">{copy.rotateHint}</p>}
      {closeupTool && <p className="text-xs text-mld-muted">{copy.closeUpHint}</p>}
      {fill && (
        <fieldset
          disabled={paint.drawing || paint.busy}
          className={steadyWhileDrawing(paint, 'min-w-0')}
        >
          <legend className="mld-kicker mb-2">{copy.fillHow}</legend>
          <div className="mld-width-seg" data-stack="">
            <button
              type="button"
              aria-pressed={paint.fillScope === 'area'}
              onClick={() => paint.setFillScope('area')}
            >
              {copy.fillScopes.area}
            </button>
            {colorImage && (
              <RequiresTool family="model.finish">
                <button
                  type="button"
                  aria-pressed={paint.fillScope === 'base'}
                  onClick={() => paint.setFillScope('base')}
                >
                  {copy.fillScopes.base}
                </button>
              </RequiresTool>
            )}
          </div>
          <p className="mt-1 text-xs text-mld-muted">{copy.fillHint}</p>
        </fieldset>
      )}
      {!fill && !picker && !rotate && !closeupTool && (
        <fieldset
          disabled={paint.drawing || paint.busy}
          className={steadyWhileDrawing(paint, 'min-w-0')}
        >
          <legend className="mld-kicker mb-2">{copy.widths}</legend>
          {/* A bolinha é a largura real em pixels, na cor da tinta (a borracha não tem cor). */}
          <div className="mld-width-seg">
            {WIDTHS.map(([size, id, dot]) => {
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
                  <span
                    aria-hidden="true"
                    className="mld-width-dot"
                    style={{ width: dot, height: dot, background: eraser ? undefined : ink }}
                  />
                </button>
              )
            })}
          </div>
        </fieldset>
      )}
      {eraser && colorImage && (
        <fieldset
          disabled={paint.drawing || paint.busy}
          className={steadyWhileDrawing(paint, 'min-w-0')}
        >
          <legend className="mld-kicker mb-2">{copy.eraseHow}</legend>
          <div className="mld-width-seg" data-stack="">
            {(['paint', 'cutout'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={paint.eraseMode === mode}
                onClick={() => paint.setEraseMode(mode)}
              >
                {copy.eraseModes[mode]}
              </button>
            ))}
          </div>
          {paint.eraseMode === 'cutout' && (
            <p className="mt-1 text-xs text-mld-muted">{copy.instructions.cutout}</p>
          )}
        </fieldset>
      )}
      {eraser && (!colorImage || paint.eraseMode !== 'cutout') && (
        <p className="text-xs text-mld-muted">
          {paint.data && paint.data.image.layers.length > 1
            ? copy.eraseLayerHint(paint.data.layer.name)
            : copy.eraseHint}
        </p>
      )}
      {/* As AJUDAS valem para o próximo traço: ficam ligáveis a qualquer hora, também durante um
          trabalho demorado (por isso este fieldset não tem `disabled`, ao contrário dos outros). */}
      <fieldset className="min-w-0">
        <legend className="mld-kicker mb-2">{copy.helps}</legend>
        <div className={PAINT_TILES}>
          <SceneTile
            data-toggle=""
            icon={FlipHorizontal2}
            label={copy.mirrorShort}
            aria-label={copy.mirror}
            title={copy.mirrorHint}
            pressed={paint.mirror}
            onClick={() => paint.setMirror(!paint.mirror)}
          />
          {paint.surfaceMode && (
            <SceneTile
              data-toggle=""
              icon={Target}
              label={copy.onlyThisPiece}
              title={copy.onlyThisPieceHint}
              pressed={paint.pieceScope === 'selected'}
              onClick={() =>
                paint.setPieceScope(paint.pieceScope === 'selected' ? 'all' : 'selected')
              }
            />
          )}
        </div>
      </fieldset>
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
