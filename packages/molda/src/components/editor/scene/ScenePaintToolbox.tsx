/**
 * As ferramentas da aba Pintar à vista: Lápis, Borracha, Balde e Conta-gotas, a largura do
 * traço e os recursos do editor antigo (girar a pintura da face, pintar de perto, espelho e
 * vestir com textura), em botões de 44 px. O resto (formas, área, degradê, carimbo, folha
 * inteira) mora em "Mais jeitos de pintar".
 *
 * Rótulo, ícone e tecla vêm do registro (`sceneCommandRegistry.ts`) e a ação de
 * `scenePaintShortcuts.ts`: o botão e o atalho são a mesma coisa.
 */
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { RequiresTool } from '../../toolAccess'
import { Button, ToolButton } from '../../ui/Button'
import { sceneCommand } from './sceneCommandRegistry'
import { SCENE_PAINT_ACTIONS, type ScenePaintActionId } from './scenePaintShortcuts'
import type { useScenePaint } from './useScenePaint'

const WIDTHS = [
  [1, 'paint.width-1'],
  [2, 'paint.width-2'],
  [3, 'paint.width-3'],
] as const

export function ScenePaintToolbox({
  paint,
  onDress,
}: {
  paint: ReturnType<typeof useScenePaint>
  /** "Vestir com textura": só quando há galeria (dentro do app) e uma peça para vestir. */
  onDress?: () => void
}) {
  const copy = COPY.scene
  const { eraser, fill, picker, rotate, closeupTool, shape, brush } = paint
  const pencil = !eraser && !fill && !shape && !picker && !rotate && !closeupTool
  const tools: Array<[ScenePaintActionId, boolean]> = [
    ['paint.pencil', pencil],
    ['paint.eraser', eraser],
    ['paint.fill', fill],
    ['paint.picker', picker],
    ['paint.rotate', rotate],
    ['paint.closeup', closeupTool],
    ['paint.mirror', paint.mirror],
  ]
  const dress = sceneCommand('paint.dress')
  return (
    <RequiresTool family="paint.brush">
      <fieldset disabled={paint.drawing || paint.busy} className="flex flex-wrap gap-1">
        <legend className="sr-only">{SCENE_PAINT_COPY.tools}</legend>
        {tools.map(([id, active]) => {
          const command = sceneCommand(id)
          return (
            <ToolButton
              key={id}
              icon={command.icon}
              label={command.label}
              active={active}
              shortcut={command.shortcut?.display}
              aria-keyshortcuts={command.shortcut?.display}
              hint={command.help}
              onClick={() => SCENE_PAINT_ACTIONS[id](paint)}
            />
          )
        })}
        {onDress && (
          <ToolButton
            icon={dress.icon}
            label={dress.label}
            aria-haspopup="dialog"
            onClick={onDress}
          />
        )}
      </fieldset>
      {picker && <p className="text-xs text-mld-muted">{copy.paintPickerHint}</p>}
      {fill && <p className="text-xs text-mld-muted">{copy.paintFillHint}</p>}
      {rotate && <p className="text-xs text-mld-muted">{SCENE_PAINT_COPY.rotateHint}</p>}
      {closeupTool && <p className="text-xs text-mld-muted">{SCENE_PAINT_COPY.closeUpHint}</p>}
      {!fill && !picker && !rotate && !closeupTool && (
        <fieldset disabled={paint.drawing || paint.busy} className="flex flex-wrap gap-1">
          <legend className="w-full text-xs font-bold text-mld-muted">
            {SCENE_PAINT_COPY.widths}
          </legend>
          {WIDTHS.map(([size, id]) => {
            const command = sceneCommand(id)
            const key = command.shortcut?.display
            return (
              <Button
                key={size}
                variant="ghost"
                className="px-3 text-sm"
                aria-pressed={size === brush}
                aria-keyshortcuts={key}
                title={key ? `${command.label} (${key})` : undefined}
                onClick={() => SCENE_PAINT_ACTIONS[id](paint)}
              >
                {command.label}
              </Button>
            )
          })}
        </fieldset>
      )}
    </RequiresTool>
  )
}
