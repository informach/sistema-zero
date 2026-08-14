/**
 * Tira de PEÇAS do tileset: miniaturas clicáveis +
 * nova/duplicar/apagar + o badge 🧱 de peça SÓLIDA. Inserir/remover uma peça
 * REMAPEIA as células de todos os MAPAS que usam este tileset (invariante:
 * índice no array = índice na folha = índice nas células) — o remap dos mapas
 * é persistido direto na galeria (fora do undo do tileset; cross-asset).
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { COPY } from '../../core/copy'
import {
  type AnyTilesetAsset,
  isTilesetKind,
  type PintaAsset,
  type PintaBitmap,
  resolveAssetPalette,
  type TilemapAsset,
  type VectorFrame,
} from '../../core/project'
import { paintBitmap } from '../../pixel/render'
import {
  addTile,
  cycleCollision,
  duplicateTile,
  remapTilemapCells,
  removeTile,
  type TileCollision,
  tileCollisionAt,
} from '../../tiles/tilesetOps'
import { VectorFrameSvg } from '../../vector/VectorFrameSvg'
import { usePintaApp } from '../appContext'
import { ToolButton } from '../ui/Button'
import { ArrowUpToLine, BrickWall, Copy, Plus, Trash2 } from '../ui/icons'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores, useSession } from './editorContext'

function PixelTileThumb({
  bitmap,
  colors,
}: {
  bitmap: PintaBitmap
  colors: readonly string[]
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) paintBitmap(canvas, bitmap, colors)
  }, [bitmap, colors])
  return (
    <canvas
      ref={canvasRef}
      className="pin-pixelated h-full w-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

/** Selo de colisão no canto da peça: 🧱 sólido (vermelho) / ⬆️ plataforma (âmbar). */
export function TileCollisionBadge({
  collision,
}: {
  collision: TileCollision
}): JSX.Element | null {
  if (collision === 'solid') {
    return (
      <span
        aria-hidden="true"
        className="absolute right-0 bottom-0 rounded-tl-lg bg-pin-surface/85 p-0.5 text-pin-danger"
      >
        <BrickWall className="size-3" />
      </span>
    )
  }
  if (collision === 'platform') {
    return (
      <span
        aria-hidden="true"
        className="absolute right-0 bottom-0 rounded-tl-lg bg-pin-collision-platform/85 p-0.5 text-pin-text"
      >
        <ArrowUpToLine className="size-3" />
      </span>
    )
  }
  return null
}

function TileThumbButton({
  index,
  selected,
  collision,
  label,
  onSelect,
  children,
}: {
  index: number
  selected: boolean
  collision: TileCollision
  label: string
  onSelect: () => void
  children: JSX.Element
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className={`pin-checkerboard relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition ${
        selected ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border'
      }`}
    >
      {children}
      {/* O NÚMERO da peça é o que a criança digita na grade/sólidos do Estúdio. */}
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 rounded-br-lg bg-pin-surface/85 px-1 text-[10px] font-bold text-pin-muted"
      >
        {index}
      </span>
      <TileCollisionBadge collision={collision} />
    </button>
  )
}

const COLLISION_LABEL: Record<TileCollision, string> = {
  none: COPY.tiles.collisionNone,
  solid: COPY.tiles.collisionSolid,
  platform: COPY.tiles.collisionPlatform,
}

export function TileStrip({ className }: { className?: string }): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const { gallery } = usePintaApp()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const frameIndex = useSession((state) => state.frameIndex)
  const colors = useMemo(() => resolveAssetPalette(asset), [asset])

  if (!isTilesetKind(asset)) return null
  const selectedIndex = Math.min(frameIndex, asset.tiles.length - 1)
  const selectedCollision = tileCollisionAt(asset, selectedIndex)

  /**
   * Remap das células dos MAPAS deste tileset ao inserir/remover uma peça.
   * Devolve os pares antes/depois (só dos mapas que MUDARAM) para o
   * `commitLinked` — o remap entra na MESMA entrada de undo do tileset (desfazer
   * a edição da peça volta os mapas junto; não deixa mais célula apontando errado).
   */
  function computeRemap(change: { insertedAt: number } | { removedAt: number }): {
    before: PintaAsset[]
    after: PintaAsset[]
  } {
    // A galeria contém apenas revisões CONFIRMADAS. Sobrepomos os mapas vivos
    // do editor para que duas inserções dentro do debounce remapeiem a segunda
    // a partir do resultado da primeira, sem publicar nada antes do IndexedDB.
    const affectedById = new Map(
      gallery
        .getState()
        .assets.filter((a): a is TilemapAsset => a.kind === 'tilemap' && a.tilesetId === asset.id)
        .map((tilemap) => [tilemap.id, tilemap]),
    )
    for (const linked of editor.getState().linkedAssets ?? []) {
      if (linked.kind === 'tilemap' && linked.tilesetId === asset.id) {
        affectedById.set(linked.id, linked)
      }
    }
    const affected = [...affectedById.values()]
    const before: PintaAsset[] = []
    const after: PintaAsset[] = []
    for (const tilemap of affected) {
      const next = remapTilemapCells(tilemap, change)
      if (next === tilemap) continue
      before.push(tilemap)
      after.push({ ...next, updatedAt: Date.now() })
    }
    return { before, after }
  }

  function mutate(
    op: (tileset: AnyTilesetAsset) => {
      next: AnyTilesetAsset
      selectIndex?: number
      remap?: { insertedAt: number } | { removedAt: number }
      limitToast?: string
    },
  ): void {
    const current = editor.getState().asset
    if (!isTilesetKind(current)) return
    const { next, selectIndex, remap, limitToast } = op(current)
    if (next === current) {
      if (limitToast) showToast(limitToast)
      return
    }
    if (remap) {
      editor.getState().commitLinked(next, computeRemap(remap))
    } else {
      editor.getState().commit(next)
    }
    if (selectIndex !== undefined) session.getState().selectFrame(selectIndex)
  }

  return (
    <div className={clsx('pin-panel flex items-center gap-2 p-2', className)}>
      <span className="px-1 text-sm font-bold text-pin-muted">{COPY.tiles.tiles}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
        {asset.tiles.map((tile, index) => (
          <TileThumbButton
            // biome-ignore lint/suspicious/noArrayIndexKey: peças não têm id; a ordem É a identidade (índice nos mapas)
            key={index}
            index={index}
            selected={index === selectedIndex}
            collision={tileCollisionAt(asset, index)}
            label={COPY.tiles.tileLabel(index)}
            onSelect={() => session.getState().selectFrame(index)}
          >
            {asset.kind === 'tileset' ? (
              <PixelTileThumb bitmap={tile as PintaBitmap} colors={colors} />
            ) : (
              <VectorFrameSvg
                width={asset.tileSize}
                height={asset.tileSize}
                shapes={tile as VectorFrame}
                className="h-full w-full"
              />
            )}
          </TileThumbButton>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <ToolButton
          icon={Plus}
          label={COPY.tiles.addTile}
          onClick={() =>
            mutate((tileset) => ({
              next: addTile(tileset, selectedIndex),
              selectIndex: selectedIndex + 1,
              remap: { insertedAt: selectedIndex + 1 },
              limitToast: COPY.tiles.tileLimit,
            }))
          }
        />
        <ToolButton
          icon={Copy}
          label={COPY.tiles.duplicateTile}
          onClick={() =>
            mutate((tileset) => ({
              next: duplicateTile(tileset, selectedIndex),
              selectIndex: selectedIndex + 1,
              remap: { insertedAt: selectedIndex + 1 },
              limitToast: COPY.tiles.tileLimit,
            }))
          }
        />
        <ToolButton
          icon={Trash2}
          label={COPY.tiles.removeTile}
          disabled={asset.tiles.length <= 1}
          onClick={() =>
            mutate((tileset) => ({
              next: removeTile(tileset, selectedIndex),
              selectIndex: Math.max(selectedIndex - 1, 0),
              remap: { removedAt: selectedIndex },
            }))
          }
        />
        <ToolButton
          icon={selectedCollision === 'platform' ? ArrowUpToLine : BrickWall}
          label={`${COPY.tiles.cycleCollision} — ${COLLISION_LABEL[selectedCollision]}`}
          active={selectedCollision !== 'none'}
          onClick={() => mutate((tileset) => ({ next: cycleCollision(tileset, selectedIndex) }))}
        />
      </div>
    </div>
  )
}
