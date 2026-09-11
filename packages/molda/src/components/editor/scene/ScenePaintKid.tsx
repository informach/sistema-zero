/**
 * A coluna da aba Pintar, no lugar das ferramentas de modelar: a caixa de ferramentas, o aviso
 * de trabalho em andamento, o erro da pintura e o consentimento das faces tortas. A faixa de
 * cores (`ScenePaintPalette`) fica embaixo do palco, onde o Animar tem a linha do tempo.
 */
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { Button } from '../../ui/Button'
import { ScenePaintToolbox } from './ScenePaintToolbox'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function ScenePaintColumn({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const { paint, paintIssue } = workshop
  const copy = COPY.scene
  return (
    <>
      <ScenePaintToolbox paint={paint} />
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
    </>
  )
}
