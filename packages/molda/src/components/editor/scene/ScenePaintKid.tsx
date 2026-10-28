/**
 * A aba Pintar em duas partes. `ScenePaintColumn` é a coluna da esquerda, no lugar das
 * ferramentas de modelar: a caixa de ferramentas, o aviso de espelho, o trabalho em andamento e
 * o erro da pintura. `ScenePaintPieceTextures` mora no cartão da peça do painel direito: criar,
 * usar imagem, vestir com textura pronta e a prévia da pintura animada. As cores ficam na barra
 * do pé do palco (`ScenePaintColorBar`).
 */
import { useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { scenePalette } from '../../../scene/composite'
import { sceneMaterialImageBase } from '../../../scene/materialImages'
import { dressScenePiece } from '../../../scene/pieceTexture'
import { useOptionalMoldaApp } from '../../appContext'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { ApplyTextureDialog } from '../model/ApplyTextureDialog'
import { SceneFlipbookPreview } from './SceneFlipbookPreview'
import { ScenePaintTextureActions } from './ScenePaintTextureActions'
import { ScenePaintToolbox } from './ScenePaintToolbox'
import { sceneCommand } from './sceneCommandRegistry'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function ScenePaintColumn({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const { paint } = workshop
  const copy = COPY.scene
  return (
    <>
      <ScenePaintToolbox
        paint={paint}
        onChooseTool={() => {
          if (workshop.area === 'uv') workshop.openArea('sheet')
        }}
      />
      {paint.mirror && (
        <p className="text-xs text-mld-muted">
          {paint.closeUp ? SCENE_PAINT_COPY.mirrorCloseUp : SCENE_PAINT_COPY.mirrorOn}
        </p>
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
    </>
  )
}

export function ScenePaintPieceTextures({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const { paint } = workshop
  // As texturas prontas moram na galeria do app; a pintura direta funciona sem ela.
  const app = useOptionalMoldaApp()
  const [choosingTexture, setChoosingTexture] = useState(false)
  const target = paint.session?.target ?? null
  const latest = useRef(target)
  latest.current = target
  const canUseTexture = !!app && !!target && (target.imageKind ?? 'color') === 'color'
  // A pintura que se mexe é leitura, sempre livre. Com `paint.flipbook`, a prévia mora em "Mais
  // jeitos de pintar"; sem ele, a criança ainda assiste daqui.
  const { can } = useMoldaToolAccess()
  const { paletteId, customPalette, extraColors } = workshop.document
  const palette = useMemo(
    () => scenePalette({ paletteId, customPalette, extraColors }),
    [paletteId, customPalette, extraColors],
  )
  // Sem sessão (peça travada, pintura de outra peça), a prévia ainda sai da imagem de cor da peça
  // escolhida: assistir é leitura.
  const shown = useMemo(() => {
    if (paint.data) return paint.data
    const node = workshop.primary
    if (node?.kind !== 'mesh') return null
    const material = workshop.index.materials.get(node.materialId)
    const image =
      material?.colorImageId === undefined
        ? undefined
        : workshop.index.images.get(material.colorImageId)
    return material && image ? { material, image, imageKind: 'color' as const } : null
  }, [paint.data, workshop.primary, workshop.index])
  const flipbook = !can('paint.flipbook') && shown?.image.flipbook ? shown : null
  const DressIcon = sceneCommand('paint.dress').icon
  return (
    <>
      <ScenePaintTextureActions
        key={workshop.primary?.id ?? 'no-piece'}
        workshop={workshop}
        currentName={shown?.image.name}
      />
      {canUseTexture && (
        <section aria-label="Texturas prontas">
          <Button
            variant="ghost"
            className="w-full justify-start text-sm"
            aria-haspopup="dialog"
            onClick={() => {
              paint.cancel()
              setChoosingTexture(true)
            }}
          >
            <DressIcon aria-hidden="true" className="size-4" />
            {sceneCommand('paint.dress').label}
          </Button>
        </section>
      )}
      {app && (
        <ApplyTextureDialog
          open={choosingTexture && canUseTexture}
          onClose={() => setChoosingTexture(false)}
          onApply={(texture, mode) => {
            setChoosingTexture(false)
            const current = latest.current
            // A peça de agora: a textura chega depois de ler o disco, e o alvo pode ter mudado.
            if (current)
              workshop.run((source) => dressScenePiece(source, current.nodeId, texture, mode))
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
    </>
  )
}
