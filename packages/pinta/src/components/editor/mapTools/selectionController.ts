import type { PointerEvent, RefObject } from 'react'
import { safeSetPointerCapture } from '../../../core/pointer'
import type { TilemapAsset } from '../../../core/project'
import type { PintaEditorStore } from '../../../state/editorStore'
import { type CellPos, type CellRect, normalizeCellRect } from '../../../tiles/cellGeometry'
import {
  clearRegion,
  extractRegion,
  hasFilledCell,
  stampRegionAt,
} from '../../../tiles/mapSelection'
import type { TileStamp } from '../../../tiles/stamp'
import { commitIfChanged } from './commitGuard'
export type MapSelection =
  | { kind: 'marquee'; start: CellPos; rect: CellRect | null }
  | { kind: 'rect'; rect: CellRect }
  | { kind: 'floating'; stamp: TileStamp; at: CellPos; remaining: TilemapAsset }
interface Options {
  tilemap: TilemapAsset
  layerId: string
  editor: PintaEditorStore
  selRef: RefObject<MapSelection | null>
  movingRef: RefObject<{ offset: CellPos } | null>
  selPointerRef: RefObject<number | null>
  selfCommitRef: RefObject<boolean>
  setSelRect: (r: CellRect | null) => void
  cellFromEvent: (e: PointerEvent<HTMLCanvasElement>) => CellPos
  clampCell: (p: CellPos) => CellPos
  renderSelection: () => void
  /** Camada trancada: avisa e devolve `true` (o pedaço não é levantado). */
  isLocked?: () => boolean
}
export function createMapSelectionController({
  tilemap,
  layerId,
  editor,
  selRef,
  movingRef,
  selPointerRef,
  selfCommitRef,
  setSelRect,
  cellFromEvent,
  clampCell,
  renderSelection,
  isLocked,
}: Options) {
  /** Apaga o pedaço: levantado some, assentado limpa as células (Delete). */
  function deleteMapSelection(): void {
    const sel = selRef.current
    const state = editor.getState()
    if (!sel || state.asset.kind !== 'tilemap') return
    selRef.current = null
    movingRef.current = null
    setSelRect(null)
    selfCommitRef.current = true
    const next =
      sel.kind === 'floating'
        ? sel.remaining
        : sel.kind === 'rect'
          ? clearRegion(state.asset, layerId, sel.rect)
          : state.asset
    if (!commitIfChanged(state, next)) selfCommitRef.current = false
  }

  function stampPending(): void {
    const sel = selRef.current
    selRef.current = null
    movingRef.current = null
    setSelRect(null)
    if (sel?.kind === 'floating' && tilemap) {
      // Soltar no mesmo lugar (ou numa camada trancada) não muda nada: nada é gravado.
      selfCommitRef.current = commitIfChanged(
        editor.getState(),
        stampRegionAt(sel.remaining, layerId, sel.at, sel.stamp),
      )
    }
  }

  function selectDown(event: PointerEvent<HTMLCanvasElement>): void {
    if (!event.isPrimary || !tilemap) return
    safeSetPointerCapture(event.currentTarget, event.pointerId)
    selPointerRef.current = event.pointerId
    const p = clampCell(cellFromEvent(event))
    const sel = selRef.current
    if (sel?.kind === 'floating') {
      const within =
        p.col >= sel.at.col &&
        p.col < sel.at.col + sel.stamp.cols &&
        p.row >= sel.at.row &&
        p.row < sel.at.row + sel.stamp.rows
      if (within) {
        movingRef.current = { offset: { col: p.col - sel.at.col, row: p.row - sel.at.row } }
        return
      }
    }
    if (sel?.kind === 'rect') {
      const r = sel.rect
      const within =
        p.col >= r.col && p.col < r.col + r.cols && p.row >= r.row && p.row < r.row + r.rows
      if (within) {
        if (isLocked?.()) return
        const { remaining, floating } = extractRegion(tilemap, layerId, r)
        selRef.current = {
          kind: 'floating',
          stamp: floating,
          at: { col: r.col, row: r.row },
          remaining,
        }
        movingRef.current = { offset: { col: p.col - r.col, row: p.row - r.row } }
        setSelRect(null)
        renderSelection()
        return
      }
    }
    stampPending()
    selRef.current = {
      kind: 'marquee',
      start: p,
      rect: normalizeCellRect(p, p, tilemap.cols, tilemap.rows),
    }
    renderSelection()
  }

  function selectMove(event: PointerEvent<HTMLCanvasElement>): void {
    if (event.pointerId !== selPointerRef.current || !tilemap) return
    const p = clampCell(cellFromEvent(event))
    const sel = selRef.current
    const moving = movingRef.current
    if (sel?.kind === 'floating' && moving) {
      sel.at = { col: p.col - moving.offset.col, row: p.row - moving.offset.row }
      renderSelection()
      return
    }
    if (sel?.kind === 'marquee') {
      sel.rect = normalizeCellRect(sel.start, p, tilemap.cols, tilemap.rows)
      renderSelection()
    }
  }

  function selectUp(event: PointerEvent<HTMLCanvasElement>): void {
    if (event.pointerId !== selPointerRef.current) return
    selPointerRef.current = null
    if (movingRef.current) {
      movingRef.current = null
      return
    }
    const sel = selRef.current
    if (sel?.kind === 'marquee') {
      // Pedaço só de grade VAZIA não vira seleção (a grade de fundo é
      // referência, não desenho) — mesma régua do editor de pixel.
      if (sel.rect && tilemap && hasFilledCell(tilemap, layerId, sel.rect)) {
        selRef.current = { kind: 'rect', rect: sel.rect }
        setSelRect(sel.rect)
      } else {
        selRef.current = null
        setSelRect(null)
      }
      renderSelection()
    }
  }

  return { deleteMapSelection, stampPending, selectDown, selectMove, selectUp }
}
