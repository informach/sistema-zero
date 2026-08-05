import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import { isVectorGradient, type VectorGradient, type VectorShape } from '../../vector/model'
import type { ShapeStyle } from '../../vector/shapes'
import { ToolButton } from '../ui/Button'
import {
  BringToFront,
  ChevronsDown,
  ChevronsUp,
  CircleDot,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Group,
  MoveHorizontal,
  MoveVertical,
  SendToBack,
  Trash2,
  Ungroup,
} from '../ui/icons'
import { ColorButton } from './ColorPicker'

const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8] as const

export type VectorPropertyTool = 'polygon' | 'star' | string

interface VectorPropertiesPanelProps {
  style: ShapeStyle
  swatches: readonly string[]
  customColors: readonly string[]
  selected: readonly VectorShape[]
  tool: VectorPropertyTool
  polygonSides: number
  starTips: number
  rememberColor: (hex: string) => void
  applyStyle: (partial: Partial<ShapeStyle>) => void
  currentGradient: () => VectorGradient
  applyGradient: (partial: Partial<VectorGradient>) => void
  setPolygonSides: (value: number) => void
  setStarTips: (value: number) => void
  flipSelected: (axis: 'h' | 'v') => void
  moveOrder: (to: 1 | -1 | 'front' | 'back') => void
  groupSelected: () => void
  ungroupSelected: () => void
  duplicateSelected: () => void
  removeSelected: () => void
}

/** Painel lateral de aparência e operações da seleção vetorial. */
export function VectorPropertiesPanel({
  style,
  swatches,
  customColors,
  selected,
  tool,
  polygonSides,
  starTips,
  rememberColor,
  applyStyle,
  currentGradient,
  applyGradient,
  setPolygonSides,
  setStarTips,
  flipSelected,
  moveOrder,
  groupSelected,
  ungroupSelected,
  duplicateSelected,
  removeSelected,
}: VectorPropertiesPanelProps): JSX.Element {
  const single = selected.length === 1
  const activeGradient = isVectorGradient(style.fill) ? style.fill : null

  return (
    <div className="flex min-h-0 w-56 shrink-0 flex-col gap-2 overflow-y-auto">
      <section className="pin-panel p-3">
        <span className="mb-1 block text-sm font-bold text-pin-muted">{COPY.vector.fill}</span>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            aria-label={`${COPY.vector.fill}: ${COPY.vector.none}`}
            aria-pressed={style.fill === 'none'}
            title={COPY.vector.none}
            onClick={() => applyStyle({ fill: 'none' })}
            className={`pin-checkerboard size-11 rounded-lg border-2 ${style.fill === 'none' ? 'border-pin-accent ring-1 ring-pin-accent' : 'border-pin-border'}`}
          />
          {swatches.map((hex) => (
            <button
              key={`fill-${hex}`}
              type="button"
              aria-label={`${COPY.vector.fill}: ${COPY.colorNames[hex] ?? hex}`}
              aria-pressed={style.fill === hex}
              title={COPY.colorNames[hex] ?? hex}
              onClick={() => applyStyle({ fill: hex })}
              className={`size-11 rounded-lg border-2 ${style.fill === hex ? 'border-pin-accent ring-1 ring-pin-accent' : 'border-pin-border'}`}
              style={{ backgroundColor: hex }}
            />
          ))}
          <ColorButton
            label={`${COPY.vector.fill}: ${COPY.vector.customColor}`}
            value={
              typeof style.fill === 'string' && style.fill.startsWith('#') ? style.fill : '#000000'
            }
            recentColors={customColors}
            onChange={(hex) => {
              rememberColor(hex)
              applyStyle({ fill: hex })
            }}
          />
        </div>

        <span className="mt-3 mb-1 block text-sm font-bold text-pin-muted">
          {COPY.vector.gradient}
        </span>
        <div className="flex flex-wrap items-center gap-1">
          <ToolButton
            icon={MoveHorizontal}
            label={COPY.vector.gradientH}
            active={activeGradient?.type === 'linear' && activeGradient.angle === 0}
            onClick={() => applyGradient({ type: 'linear', angle: 0 })}
          />
          <ToolButton
            icon={MoveVertical}
            label={COPY.vector.gradientV}
            active={activeGradient?.type === 'linear' && activeGradient.angle === 90}
            onClick={() => applyGradient({ type: 'linear', angle: 90 })}
          />
          <ToolButton
            icon={CircleDot}
            label={COPY.vector.gradientRadial}
            active={activeGradient?.type === 'radial'}
            onClick={() => applyGradient({ type: 'radial' })}
          />
          <ColorButton
            label={COPY.vector.gradientFrom}
            value={activeGradient?.from ?? currentGradient().from}
            recentColors={customColors}
            onChange={(hex) => {
              rememberColor(hex)
              applyGradient({ from: hex })
            }}
          />
          <ColorButton
            label={COPY.vector.gradientTo}
            value={activeGradient?.to ?? currentGradient().to}
            recentColors={customColors}
            onChange={(hex) => {
              rememberColor(hex)
              applyGradient({ to: hex })
            }}
          />
        </div>

        <span className="mt-3 mb-1 block text-sm font-bold text-pin-muted">
          {COPY.vector.stroke}
        </span>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            aria-label={`${COPY.vector.stroke}: ${COPY.vector.none}`}
            aria-pressed={style.stroke === null}
            title={COPY.vector.none}
            onClick={() => applyStyle({ stroke: null })}
            className={`pin-checkerboard size-11 rounded-lg border-2 ${style.stroke === null ? 'border-pin-accent ring-1 ring-pin-accent' : 'border-pin-border'}`}
          />
          {swatches.map((hex) => (
            <button
              key={`stroke-${hex}`}
              type="button"
              aria-label={`${COPY.vector.stroke}: ${COPY.colorNames[hex] ?? hex}`}
              aria-pressed={style.stroke?.color === hex}
              title={COPY.colorNames[hex] ?? hex}
              onClick={() =>
                applyStyle({ stroke: { color: hex, width: style.stroke?.width ?? 2 } })
              }
              className={`size-11 rounded-lg border-2 ${style.stroke?.color === hex ? 'border-pin-accent ring-1 ring-pin-accent' : 'border-pin-border'}`}
              style={{ backgroundColor: hex }}
            />
          ))}
          <ColorButton
            label={`${COPY.vector.stroke}: ${COPY.vector.customColor}`}
            value={style.stroke?.color ?? '#000000'}
            recentColors={customColors}
            onChange={(hex) => {
              rememberColor(hex)
              applyStyle({ stroke: { color: hex, width: style.stroke?.width ?? 2 } })
            }}
          />
        </div>

        <label className="mt-3 block text-sm font-bold text-pin-muted">
          {COPY.vector.strokeWidth}
          <input
            type="range"
            name="vector-stroke-width"
            min={0}
            max={STROKE_WIDTHS.length - 1}
            step={1}
            value={Math.max(
              STROKE_WIDTHS.findIndex((width) => width >= (style.stroke?.width ?? 2)),
              0,
            )}
            disabled={style.stroke === null}
            onChange={(event) => {
              const width = STROKE_WIDTHS[Number(event.target.value)] ?? 2
              applyStyle({ stroke: { color: style.stroke?.color ?? '#000000', width } })
            }}
            className="mt-1 w-full accent-pin-accent"
          />
        </label>

        <label className="mt-2 block text-sm font-bold text-pin-muted">
          {COPY.vector.opacity}
          <input
            type="range"
            name="vector-opacity"
            min={25}
            max={100}
            step={5}
            value={Math.round(style.opacity * 100)}
            onChange={(event) => applyStyle({ opacity: Number(event.target.value) / 100 })}
            className="mt-1 w-full accent-pin-accent"
          />
        </label>
      </section>

      {tool === 'polygon' || tool === 'star' ? (
        <section className="pin-panel p-3">
          <label className="block text-sm font-bold text-pin-muted">
            {tool === 'polygon'
              ? `${COPY.vector.sides}: ${polygonSides}`
              : `${COPY.vector.tips}: ${starTips}`}
            <input
              type="range"
              name={tool === 'polygon' ? 'vector-polygon-sides' : 'vector-star-tips'}
              min={3}
              max={12}
              step={1}
              value={tool === 'polygon' ? polygonSides : starTips}
              onChange={(event) =>
                tool === 'polygon'
                  ? setPolygonSides(Number(event.target.value))
                  : setStarTips(Number(event.target.value))
              }
              className="mt-1 w-full accent-pin-accent"
            />
          </label>
        </section>
      ) : null}

      {selected.length > 0 ? (
        <section className="pin-panel flex flex-col gap-2 p-3">
          <div className="flex flex-wrap justify-center gap-1">
            <ToolButton
              icon={FlipHorizontal2}
              label={COPY.tools.flipH}
              onClick={() => flipSelected('h')}
            />
            <ToolButton
              icon={FlipVertical2}
              label={COPY.tools.flipV}
              onClick={() => flipSelected('v')}
            />
            <ToolButton
              icon={BringToFront}
              label={COPY.vector.toFront}
              disabled={!single}
              onClick={() => moveOrder('front')}
            />
            <ToolButton
              icon={ChevronsUp}
              label={COPY.vector.forward}
              disabled={!single}
              onClick={() => moveOrder(1)}
            />
            <ToolButton
              icon={ChevronsDown}
              label={COPY.vector.backward}
              disabled={!single}
              onClick={() => moveOrder(-1)}
            />
            <ToolButton
              icon={SendToBack}
              label={COPY.vector.toBack}
              disabled={!single}
              onClick={() => moveOrder('back')}
            />
            {selected.length >= 2 ? (
              <ToolButton icon={Group} label={COPY.vector.group} onClick={groupSelected} />
            ) : null}
            {selected.some((shape) => shape.groupId) ? (
              <ToolButton icon={Ungroup} label={COPY.vector.ungroup} onClick={ungroupSelected} />
            ) : null}
            <ToolButton icon={Copy} label={COPY.vector.duplicate} onClick={duplicateSelected} />
            <ToolButton icon={Trash2} label={COPY.vector.remove} onClick={removeSelected} />
          </div>
        </section>
      ) : null}
    </div>
  )
}
