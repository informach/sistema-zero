/**
 * As ferramentas da aba Pintar à vista: Lápis, Borracha, Balde e Conta-gotas, e a largura do
 * traço. São as do editor antigo, em botões de 44 px. O resto (formas, área, degradê, carimbo,
 * folha inteira) mora em "Mais jeitos de pintar".
 */
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { RequiresTool } from '../../toolAccess'
import { Button, ToolButton } from '../../ui/Button'
import { Eraser, PaintBucket, Pencil, Pipette, RotateCw } from '../../ui/icons'
import type { useScenePaint } from './useScenePaint'

export function ScenePaintToolbox({ paint }: { paint: ReturnType<typeof useScenePaint> }) {
  const copy = COPY.scene
  const { eraser, fill, picker, rotate, shape, brush } = paint
  const pencil = !eraser && !fill && !shape && !picker && !rotate
  return (
    <RequiresTool family="paint.brush">
      <fieldset disabled={paint.drawing || paint.busy} className="flex flex-wrap gap-1">
        <legend className="sr-only">{SCENE_PAINT_COPY.tools}</legend>
        <ToolButton
          icon={Pencil}
          label={copy.paintPencil}
          active={pencil}
          onClick={() => paint.setEraser(false)}
        />
        <ToolButton
          icon={Eraser}
          label={copy.paintEraser}
          active={eraser}
          onClick={() => paint.setEraser(true)}
        />
        <ToolButton
          icon={PaintBucket}
          label={copy.paintFill}
          active={fill}
          onClick={paint.setFill}
        />
        <ToolButton
          icon={Pipette}
          label={copy.paintPicker}
          active={picker}
          onClick={paint.setPicker}
        />
        <ToolButton
          icon={RotateCw}
          label={SCENE_PAINT_COPY.rotate}
          active={rotate}
          onClick={paint.setRotate}
        />
      </fieldset>
      {picker && <p className="text-xs text-mld-muted">{copy.paintPickerHint}</p>}
      {fill && <p className="text-xs text-mld-muted">{copy.paintFillHint}</p>}
      {rotate && <p className="text-xs text-mld-muted">{SCENE_PAINT_COPY.rotateHint}</p>}
      {!fill && !picker && !rotate && (
        <fieldset disabled={paint.drawing || paint.busy} className="flex flex-wrap gap-1">
          <legend className="w-full text-xs font-bold text-mld-muted">
            {SCENE_PAINT_COPY.widths}
          </legend>
          {([1, 2, 3] as const).map((size) => (
            <Button
              key={size}
              variant="ghost"
              className="px-3 text-sm"
              aria-pressed={size === brush}
              onClick={() => paint.setBrush(size)}
            >
              {SCENE_PAINT_COPY.width[size]}
            </Button>
          ))}
        </fieldset>
      )}
    </RequiresTool>
  )
}
