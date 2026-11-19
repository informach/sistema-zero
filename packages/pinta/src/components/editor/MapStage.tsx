/**
 * O PALCO do mapa: a área que rola, o papel quadriculado, o canvas das peças, os objetos
 * por cima e a barrinha do pedaço selecionado. Não decide nada: recebe tudo do controlador.
 */
import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import type { TilemapAsset } from '../../core/project'
import { isMapObjectTool } from '../../state/sessionStore'
import { Button } from '../ui/Button'
import { MapObjectArtwork } from './MapObjectArtwork'
import { MapObjectsOverlay } from './MapObjectsOverlay'
import type { TilemapController } from './mapTools/useTilemapController'
import { stageCursor } from './stageCursor'

export function MapStage({
  tilemap,
  controller: c,
}: {
  tilemap: TilemapAsset
  controller: TilemapController
}): JSX.Element {
  const objectTool = isMapObjectTool(c.tool) ? c.tool : null
  return (
    // A grade do mapa (no meio quando é menor; rola quando é maior, com `safe center`, senão
    // o que passa do topo fica fora de alcance).
    <div className="pin-stage relative flex min-h-0 min-w-0 flex-1">
      {/* A barra do pedaço FLUTUA sobre o palco: dentro do fluxo ela empurrava a grade para
          baixo ao aparecer e para cima ao sumir. */}
      {c.selRect ? (
        <div
          ref={c.selectionBarRef}
          className="pin-float absolute top-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 p-1.5"
        >
          <Button variant="barOutline" onClick={c.copySelection}>
            {COPY.tiles.copyPiece}
          </Button>
          {c.features.sets ? (
            <Button variant="barOutline" onClick={() => void c.saveSelectionAsSet()}>
              {COPY.scene.guardarConjunto}
            </Button>
          ) : null}
          <Button variant="barOutline" onClick={c.deleteSelection}>
            {COPY.tiles.clearPiece}
          </Button>
        </div>
      ) : null}
      <div
        ref={c.stageRef}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto p-2 [align-items:safe_center] [justify-content:safe_center]"
      >
        <div
          ref={c.paperRef}
          className="pin-checkerboard pin-paper relative shrink-0"
          style={{
            width: (tilemap.cols + 2 * c.pad) * c.cellPx,
            height: (tilemap.rows + 2 * c.pad) * c.cellPx,
          }}
          onPointerMove={c.trackPointer}
          onPointerDown={c.trackPointer}
        >
          <canvas
            ref={c.canvasRef}
            className="pin-pixelated absolute top-0 left-0 block"
            style={{
              touchAction: 'none',
              imageRendering: 'pixelated',
              cursor: stageCursor({ handTool: c.tool === 'pan', panning: c.panning }),
            }}
            {...c.canvasHandlers}
            aria-label={COPY.tiles.mapGrid}
            role="img"
          />
          {/* Os objetos por cima da grade (desenhados sempre; tocáveis só na camada de
              objetos, com uma ferramenta de objeto). */}
          <MapObjectsOverlay
            tilemap={tilemap}
            activeLayerId={c.activeObjectLayer?.id ?? null}
            interactive={c.activeObjectLayer !== null && objectTool !== null}
            tool={objectTool}
            tileSize={c.tileSize}
            pad={c.pad}
            scale={c.cellPx / c.tileSize}
            snap={c.snapObjects}
            selectedObjectId={c.selectedObjectId}
            selectedObjectIds={c.selectedObjectIds}
            onSelectObject={c.chooseObject}
            onSelectObjects={c.chooseObjects}
            deleteVertexRef={c.deleteVertexRef}
          />
          {c.libraryPlacement.preview ? (
            <svg
              data-pin-library-preview
              aria-label={COPY.scene.libraryPreview}
              role="img"
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${(tilemap.cols + 2 * c.pad) * c.tileSize} ${(tilemap.rows + 2 * c.pad) * c.tileSize}`}
            >
              <title>{COPY.scene.libraryPreview}</title>
              <g
                transform={`translate(${c.libraryPlacement.preview.offsetX + c.pad * c.tileSize} ${c.libraryPlacement.preview.offsetY + c.pad * c.tileSize})`}
                opacity={0.65}
              >
                <MapObjectArtwork
                  object={c.libraryPlacement.preview.object}
                  source={c.libraryPlacement.preview.source}
                />
                <rect
                  x={c.libraryPlacement.preview.object.x}
                  y={c.libraryPlacement.preview.object.y}
                  width={c.libraryPlacement.preview.object.width}
                  height={c.libraryPlacement.preview.object.height}
                  fill="none"
                  stroke="var(--color-pin-accent)"
                  strokeWidth={(2 * c.tileSize) / c.cellPx}
                />
              </g>
            </svg>
          ) : null}
        </div>
      </div>
    </div>
  )
}
