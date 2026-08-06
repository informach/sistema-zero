/**
 * Painel de APARÊNCIA do vetor (largura fixa `w-68`, como os painéis do
 * pixel): degradê, espessura do contorno e opacidade; lados/pontas quando a
 * ferramenta de polígono/estrela está ativa; e as operações da seleção
 * (espelhar, ordem, agrupar, duplicar, apagar). As CORES de preenchimento e
 * contorno vivem no painel "Cores" (VectorColorsPanel).
 */
import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import { isVectorGradient } from '../../vector/model'
import { ToolButton } from '../ui/Button'
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
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
import { Panel } from '../ui/Panel'
import { ColorButton } from './ColorPicker'
import { useVectorEditor } from './vector/VectorEditorScope'

const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8] as const

/** Painel lateral de aparência e operações da seleção vetorial. */
export function VectorPropertiesPanel(): JSX.Element {
  const {
    style,
    customColors,
    selected,
    tool,
    polygonSides,
    starTips,
    rectRadius,
    setRectRadius,
    updateSelected,
    rememberColor,
    applyStyle,
    currentGradient,
    applyGradient,
    setPolygonSides,
    setStarTips,
    flipSelected,
    alignSelected,
    moveOrder,
    groupSelected,
    ungroupSelected,
    duplicateSelected,
    removeSelected,
  } = useVectorEditor()
  const single = selected.length === 1
  const singleShape = single ? (selected[0] ?? null) : null
  const selectedRect = singleShape?.type === 'rect' ? singleShape : null
  const selectedText = singleShape?.type === 'text' ? singleShape : null
  const activeGradient = isVectorGradient(style.fill) ? style.fill : null

  return (
    <div className="flex w-68 shrink-0 flex-col gap-2">
      <Panel title={COPY.vector.appearance}>
        <span className="mt-2 mb-1 block text-sm font-bold text-pin-muted">
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
      </Panel>

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

      {tool === 'rect' || selectedRect ? (
        <section className="pin-panel p-3">
          {/* Vale para o PRÓXIMO retângulo e edita o selecionado na hora. */}
          <label className="block text-sm font-bold text-pin-muted">
            {`${COPY.vector.cornerRadius}: ${selectedRect ? Math.round(selectedRect.rx) : rectRadius}`}
            <input
              type="range"
              name="vector-rect-radius"
              min={0}
              max={24}
              step={1}
              value={selectedRect ? Math.round(selectedRect.rx) : rectRadius}
              onChange={(event) => {
                const radius = Number(event.target.value)
                setRectRadius(radius)
                if (selectedRect) {
                  updateSelected((s) =>
                    s.type === 'rect' ? { ...s, rx: Math.min(radius, Math.min(s.w, s.h) / 2) } : s,
                  )
                }
              }}
              className="mt-1 w-full accent-pin-accent"
            />
          </label>
        </section>
      ) : null}

      {selectedText ? (
        <section className="pin-panel p-3">
          <label className="block text-sm font-bold text-pin-muted">
            {`${COPY.vector.fontSize}: ${Math.round(selectedText.fontSize)}`}
            <input
              type="range"
              name="vector-font-size"
              min={8}
              max={96}
              step={2}
              value={Math.min(Math.max(Math.round(selectedText.fontSize), 8), 96)}
              onChange={(event) => {
                // Clamp do MODELO (6–200) preservado.
                const fontSize = Math.min(Math.max(Number(event.target.value), 6), 200)
                updateSelected((s) => (s.type === 'text' ? { ...s, fontSize } : s))
              }}
              className="mt-1 w-full accent-pin-accent"
            />
          </label>
        </section>
      ) : null}

      {selected.length > 0 ? (
        <section className="pin-panel flex flex-col gap-2 p-3">
          {/* Alinhar: 2+ formas alinham entre si; 1 forma alinha na TELA. */}
          <span className="block px-1 text-sm font-bold text-pin-muted">
            {COPY.vector.alignTitle}
          </span>
          <div className="flex flex-wrap justify-center gap-1">
            <ToolButton
              icon={AlignStartVertical}
              label={COPY.vector.alignLeft}
              onClick={() => alignSelected('left')}
            />
            <ToolButton
              icon={AlignCenterVertical}
              label={COPY.vector.alignCenterH}
              onClick={() => alignSelected('centerH')}
            />
            <ToolButton
              icon={AlignEndVertical}
              label={COPY.vector.alignRight}
              onClick={() => alignSelected('right')}
            />
            <ToolButton
              icon={AlignStartHorizontal}
              label={COPY.vector.alignTop}
              onClick={() => alignSelected('top')}
            />
            <ToolButton
              icon={AlignCenterHorizontal}
              label={COPY.vector.alignMiddleV}
              onClick={() => alignSelected('middleV')}
            />
            <ToolButton
              icon={AlignEndHorizontal}
              label={COPY.vector.alignBottom}
              onClick={() => alignSelected('bottom')}
            />
          </div>
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
