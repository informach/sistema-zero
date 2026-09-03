/**
 * Painel de APARÊNCIA do vetor (largura fixa `w-68`, como os painéis do
 * pixel): degradê, espessura do contorno e opacidade; e os ajustes que só
 * aparecem com a ferramenta/forma certa (lados, cantos, tamanho da letra).
 *
 * O DEGRADÊ vive atrás de um botão, numa modal: é recurso de desvio (o dia a
 * dia é cor sólida) e, aberto no painel, qualquer toque nele já convertia o
 * preenchimento em degradê sem querer.
 *
 * As CORES de preenchimento e contorno vivem no painel "Cores"
 * (VectorColorsPanel); as ações da seleção (alinhar, ordem, agrupar, apagar…)
 * vivem na faixa colada na barra de cima (VectorSelectionBar) — antes ficavam
 * aqui embaixo, onde a criança só achava rolando a coluna inteira.
 */
import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import {
  fontFamilyOf,
  isVectorFontFamily,
  isVectorGradient,
  textAlignOf,
  VECTOR_FONT_FAMILIES,
  VECTOR_FONT_FAMILY_INFO,
} from '../../vector/model'
import { Button, ToolButton } from '../ui/Button'
import { AlignCenter, AlignLeft, AlignRight } from '../ui/icons'
import { Panel, type PanelDisclosure } from '../ui/Panel'
import { useVectorEditor } from './vector/VectorEditorScope'
import {
  formatStrokeWidth,
  gradientCss,
  STROKE_WIDTHS,
  strokeWidthIndex,
} from './vector/vectorTools'

/** Painel lateral de aparência da seleção/ferramenta vetorial. */
export function VectorPropertiesPanel({
  disclosure,
}: {
  disclosure?: PanelDisclosure
} = {}): JSX.Element {
  const {
    style,
    selected,
    tool,
    polygonSides,
    starTips,
    rectRadius,
    setRectRadius,
    textAlign,
    setTextAlign,
    fontFamily,
    setFontFamily,
    updateSelected,
    applyStyle,
    inspectedFill,
    currentGradient,
    gradientOpen,
    setGradientOpen,
    gradientButtonRef,
    setPolygonSides,
    setStarTips,
  } = useVectorEditor()
  const single = selected.length === 1
  const singleShape = single ? (selected[0] ?? null) : null
  const selectedRect = singleShape?.type === 'rect' ? singleShape : null
  const selectedText = singleShape?.type === 'text' ? singleShape : null
  // Mesma fonte da janela do Degradê: a forma selecionada, ou o estilo sem seleção.
  const inspected = inspectedFill()
  const activeGradient = isVectorGradient(inspected) ? inspected : null

  if (disclosure && !disclosure.open) {
    return (
      <div className="flex w-68 shrink-0 flex-col gap-2">
        <Panel title={COPY.vector.appearance} disclosure={disclosure}>
          {null}
        </Panel>
      </div>
    )
  }

  return (
    <div className="flex w-68 shrink-0 flex-col gap-2">
      <Panel title={COPY.vector.appearance} disclosure={disclosure}>
        {/* A amostra mostra o degradê VIGENTE (ou o que sairia ao ligar). */}
        <Button
          ref={gradientButtonRef}
          variant="outline"
          aria-haspopup="dialog"
          aria-expanded={gradientOpen}
          onClick={() => setGradientOpen(true)}
          className="mt-1 w-full justify-start"
        >
          <span
            aria-hidden="true"
            className="size-6 shrink-0 rounded-md border-2 border-pin-border"
            style={{ background: gradientCss(activeGradient ?? currentGradient()) }}
          />
          {COPY.vector.gradient}
        </Button>

        <label className="mt-3 block text-sm font-bold text-pin-muted">
          {COPY.vector.strokeWidth}
          <input
            type="range"
            name="vector-stroke-width"
            min={0}
            max={STROKE_WIDTHS.length - 1}
            step={1}
            // Degrau que alcança a espessura; legado 4/6/8 cai no ÚLTIMO (antes
            // caía no primeiro, mostrando o traço mais fino para um grosso).
            value={strokeWidthIndex(style.stroke?.width ?? 2)}
            // O valor acessível é a espessura REAL ("8" no legado), não o índice.
            aria-valuetext={formatStrokeWidth(style.stroke?.width ?? 2)}
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
        <Panel
          title={
            tool === 'polygon'
              ? `${COPY.vector.sides}: ${polygonSides}`
              : `${COPY.vector.tips}: ${starTips}`
          }
          ariaLabel={tool === 'polygon' ? COPY.vector.sides : COPY.vector.tips}
        >
          <input
            type="range"
            name={tool === 'polygon' ? 'vector-polygon-sides' : 'vector-star-tips'}
            aria-label={tool === 'polygon' ? COPY.vector.sides : COPY.vector.tips}
            min={3}
            max={12}
            step={1}
            value={tool === 'polygon' ? polygonSides : starTips}
            onChange={(event) =>
              tool === 'polygon'
                ? setPolygonSides(Number(event.target.value))
                : setStarTips(Number(event.target.value))
            }
            className="w-full accent-pin-accent"
          />
        </Panel>
      ) : null}

      {tool === 'rect' || selectedRect ? (
        // Vale para o PRÓXIMO retângulo e edita o selecionado na hora.
        <Panel
          title={`${COPY.vector.cornerRadius}: ${selectedRect ? Math.round(selectedRect.rx) : rectRadius}`}
          ariaLabel={COPY.vector.cornerRadius}
        >
          <input
            type="range"
            name="vector-rect-radius"
            aria-label={COPY.vector.cornerRadius}
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
            className="w-full accent-pin-accent"
          />
        </Panel>
      ) : null}

      {selectedText ? (
        <Panel
          title={`${COPY.vector.fontSize}: ${Math.round(selectedText.fontSize)}`}
          ariaLabel={COPY.vector.fontSize}
        >
          <input
            type="range"
            name="vector-font-size"
            aria-label={COPY.vector.fontSize}
            min={8}
            max={96}
            step={2}
            value={Math.min(Math.max(Math.round(selectedText.fontSize), 8), 96)}
            onChange={(event) => {
              // Clamp do MODELO (6–200) preservado.
              const fontSize = Math.min(Math.max(Number(event.target.value), 6), 200)
              updateSelected((s) => (s.type === 'text' ? { ...s, fontSize } : s))
            }}
            className="w-full accent-pin-accent"
          />
        </Panel>
      ) : null}

      {tool === 'text' || selectedText ? (
        <Panel title={COPY.vector.fontFamily} ariaLabel={COPY.vector.fontFamily}>
          <select
            aria-label={COPY.vector.fontFamily}
            value={selectedText ? fontFamilyOf(selectedText) : fontFamily}
            onChange={(event) => {
              if (isVectorFontFamily(event.target.value)) setFontFamily(event.target.value)
            }}
            className="min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-bg px-3 text-base text-pin-text outline-none focus:border-pin-accent"
          >
            {VECTOR_FONT_FAMILIES.map((family) => (
              <option key={family} value={family}>
                {VECTOR_FONT_FAMILY_INFO[family].label}
              </option>
            ))}
          </select>
        </Panel>
      ) : null}

      {/* Alinhamento das LINHAS. Aparece com a ferramenta Texto (arma o
          próximo) ou com um texto selecionado (realinha o que já existe). */}
      {tool === 'text' || selectedText ? (
        <Panel title={COPY.vector.textAlignTitle} ariaLabel={COPY.vector.textAlignTitle}>
          <div className="flex gap-1">
            {(
              [
                ['left', AlignLeft, COPY.vector.textAlignLeft],
                ['center', AlignCenter, COPY.vector.textAlignCenter],
                ['right', AlignRight, COPY.vector.textAlignRight],
              ] as const
            ).map(([value, icon, label]) => (
              <ToolButton
                key={value}
                icon={icon}
                label={label}
                active={(selectedText ? textAlignOf(selectedText) : textAlign) === value}
                onClick={() => setTextAlign(value)}
              />
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
