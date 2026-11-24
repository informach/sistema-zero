import { hexToRgb } from '../../core/color'
import { SceneColorPicker } from '../editor/scene/SceneColorPicker'

/** O seletor do Molda, compartilhado pelas oficinas sem acesso ao estado de modelagem. */
export function ColorPicker({
  value,
  disabled = false,
  onChange,
}: {
  value: string
  disabled?: boolean
  onChange(hex: string): void
}) {
  const rgb = hexToRgb(value)
  return <SceneColorPicker ink={[...rgb, 255]} disabled={disabled} change={onChange} />
}
