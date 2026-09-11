/**
 * As ferramentas da aba Pintar à vista: Lápis, Borracha, Balde e Conta-gotas, a largura do
 * traço e os recursos do editor antigo (girar a pintura da face, pintar de perto, espelho e
 * vestir com textura), em botões de 44 px. O resto (formas, área, degradê, carimbo, folha
 * inteira) mora em "Mais jeitos de pintar".
 */
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { RequiresTool } from '../../toolAccess'
import { Button, ToolButton } from '../../ui/Button'
import {
  Eraser,
  FlipHorizontal2,
  ImageIcon,
  PaintBucket,
  Pencil,
  Pipette,
  RotateCw,
  Search,
} from '../../ui/icons'
import type { useScenePaint } from './useScenePaint'

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
        <ToolButton
          icon={Search}
          label={SCENE_PAINT_COPY.closeUp}
          active={closeupTool}
          onClick={paint.setCloseUpTool}
        />
        <ToolButton
          icon={FlipHorizontal2}
          label={SCENE_PAINT_COPY.mirror}
          hint={SCENE_PAINT_COPY.mirrorHint}
          active={paint.mirror}
          onClick={() => paint.setMirror(!paint.mirror)}
        />
        {onDress && (
          <ToolButton
            icon={ImageIcon}
            label={COPY.editor.model.paint.apply.button}
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
