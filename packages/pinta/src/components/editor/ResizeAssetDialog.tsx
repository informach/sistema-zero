/**
 * Mudar o tamanho do desenho SEM perder o que já foi feito.
 *
 * Reusa o `CustomSizeFields` do assistente de propósito: mesma validação, mesma
 * faixa, mesma frase de ajuda — a criança reconhece o formulário que já viu ao
 * criar. Quem faz a conta é a op PURA `resizeAsset`, num commit só (desfazível).
 */

import type { JSX } from 'react'
import { useState } from 'react'
import { type ResizeTarget, resizeAsset, resizeCuts } from '../../core/assetResize'
import { COPY } from '../../core/copy'
import type { PintaAsset } from '../../core/project'
import { CustomSizeFields } from '../gallery/CustomSizeFields'
import { type CustomSizeValues, EMPTY_CUSTOM_VALUES, parseCustomInt } from '../gallery/customSize'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

export function ResizeAssetDialog({
  open,
  onClose,
  asset,
  target,
  onResize,
}: {
  open: boolean
  onClose: () => void
  asset: PintaAsset
  target: ResizeTarget
  onResize: (next: PintaAsset) => void
}): JSX.Element {
  const [values, setValues] = useState<CustomSizeValues>(() => ({
    ...EMPTY_CUSTOM_VALUES,
    width: String(target.width),
    height: String(target.height),
  }))

  const spec = { fields: ['width', 'height'] as const, min: target.min, max: target.max }
  const largura = parseCustomInt(values.width, target.min, target.max)
  const altura = parseCustomInt(values.height, target.min, target.max)
  const valido = largura !== null && altura !== null
  const mudou = valido && (largura !== target.width || altura !== target.height)
  const corta = valido && resizeCuts(asset, largura, altura)

  function aplicar(): void {
    if (!mudou || largura === null || altura === null) return
    const proximo = resizeAsset(asset, largura, altura)
    if (!proximo || proximo === asset) return
    onResize(proximo)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={COPY.editor.resize.title}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-pin-muted">
          {target.unit === 'cells' ? COPY.editor.resize.helpCells : COPY.editor.resize.helpPixels}
        </p>
        <CustomSizeFields
          spec={spec}
          values={values}
          onChange={(field, value) => setValues((atual) => ({ ...atual, [field]: value }))}
          idPrefix="resize"
        />
        {/* ⚠️ Encolher CORTA. O aviso é a única coisa entre a criança e a perda —
            e mesmo assim o desfazer cobre, porque isto é UM commit. */}
        <p role="status" className="min-h-5 text-sm font-bold text-pin-danger">
          {corta ? COPY.editor.resize.willCut : ''}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {COPY.editor.resize.cancel}
          </Button>
          <Button variant="primary" disabled={!mudou} onClick={aplicar}>
            {COPY.editor.resize.apply}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
