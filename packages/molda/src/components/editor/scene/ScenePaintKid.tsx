/**
 * A coluna da aba Pintar, no lugar das ferramentas de modelar: a caixa de ferramentas, o aviso
 * de trabalho em andamento, o erro da pintura e o consentimento das faces tortas. A faixa de
 * cores (`ScenePaintPalette`) fica embaixo do palco, onde o Animar tem a linha do tempo.
 */
import { useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { scenePalette } from '../../../scene/composite'
import { sceneMaterialImageBase } from '../../../scene/materialImages'
import { dressScenePaintTarget } from '../../../scene/pieceTexture'
import { useOptionalMoldaApp } from '../../appContext'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { ApplyTextureDialog } from '../model/ApplyTextureDialog'
import { SceneFlipbookPreview } from './SceneFlipbookPreview'
import { ScenePaintToolbox } from './ScenePaintToolbox'
import { SceneUpcomingTools } from './SceneUpcomingTools'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function ScenePaintColumn({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const { paint, paintIssue } = workshop
  const copy = COPY.scene
  // As texturas moram na galeria do app: a oficina montada sozinha não oferece o "Vestir".
  const app = useOptionalMoldaApp()
  const [dressing, setDressing] = useState(false)
  const target = paint.session?.target ?? null
  const latest = useRef(target)
  latest.current = target
  const canDress = !!app && !!target && (target.imageKind ?? 'color') === 'color'
  // A pintura que se mexe é leitura, sempre livre. Com `paint.flipbook`, a prévia mora em "Mais
  // jeitos de pintar"; sem ele, a criança ainda assiste daqui.
  const { can } = useMoldaToolAccess()
  const { paletteId, customPalette, extraColors } = workshop.document
  const palette = useMemo(
    () => scenePalette({ paletteId, customPalette, extraColors }),
    [paletteId, customPalette, extraColors],
  )
  const flipbook = !can('paint.flipbook') && paint.data?.image.flipbook ? paint.data : null
  return (
    <>
      <ScenePaintToolbox
        paint={paint}
        {...(canDress
          ? {
              onDress: () => {
                paint.cancel()
                setDressing(true)
              },
            }
          : {})}
      />
      {app && (
        <ApplyTextureDialog
          open={dressing && canDress}
          onClose={() => setDressing(false)}
          onApply={(texture, mode) => {
            setDressing(false)
            const current = latest.current
            // A peça de agora: a textura chega depois de ler o disco, e o alvo pode ter mudado.
            if (current)
              workshop.run((source) => dressScenePaintTarget(source, current, texture, mode))
          }}
        />
      )}
      {flipbook && (
        <SceneFlipbookPreview
          image={flipbook.image}
          palette={palette}
          base={sceneMaterialImageBase(flipbook.material, palette, flipbook.imageKind)}
          player={workshop.flipbook}
          disabled={paint.drawing || paint.busy}
          beforeChange={paint.cancel}
        />
      )}
      {paint.busy && (
        <div role="status" className="flex flex-wrap items-center gap-2">
          <p className="text-sm">
            {paint.stampFile.busy ? copy.imageImportBusy : copy.imageTaskBusy}
          </p>
          <Button className="text-sm" onClick={() => paint.cancel()}>
            {copy.imageTaskCancel}
          </Button>
        </div>
      )}
      {paint.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {paint.error}
        </p>
      )}
      {paintIssue && (
        <div role="status" className="space-y-2">
          <p className="text-sm">{SCENE_PAINT_COPY.crooked(paintIssue.faces.length)}</p>
          <Button className="text-sm" onClick={workshop.splitCrookedAndPaint}>
            {SCENE_PAINT_COPY.split}
          </Button>
        </div>
      )}
      {/* No celular a coluna vira faixa em cima do palco; mais uma fileira cobriria os controles. */}
      <SceneUpcomingTools tabs={['paint']} className="hidden md:block" />
    </>
  )
}
