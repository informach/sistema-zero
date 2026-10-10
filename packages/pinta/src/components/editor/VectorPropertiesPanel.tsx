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
import { type JSX, type PointerEvent as ReactPointerEvent, useEffect, useRef } from 'react'
import { COPY } from '../../core/copy'
import {
  fontFamilyOf,
  isVectorFontFamily,
  textAlignOf,
  VECTOR_FONT_FAMILIES,
  VECTOR_FONT_FAMILY_INFO,
} from '../../vector/model'
import {
  ALL_CORNERS,
  maskFromRadii,
  RECT_CORNERS,
  type RectCorner,
  type RectCornerMask,
  radiiForMask,
  radiiFromMask,
  rectCornerRadii,
  toggleCornerMask,
  withRectCorners,
} from '../../vector/rectCorners'
import { DEFAULT_STROKE_WIDTH } from '../../vector/shapes'
import { Button, IconButton, ToolButton } from '../ui/Button'
import { AlignCenter, AlignLeft, AlignRight, SquareRoundCorner } from '../ui/icons'
import { Panel, type PanelDisclosure, usePanelLook } from '../ui/Panel'
import { addPointerDragListeners } from './pointerDrag'
import { useVectorEditor } from './vector/VectorEditorScope'
import { formatStrokeWidth, gradientCss } from './vector/vectorTools'

/**
 * A grade 2x2 dos cantos, na ordem VISUAL (cima-esquerda, cima-direita, baixo-esquerda,
 * baixo-direita). O glifo do lucide arredonda o canto de cima-direita; a rotação por classe o
 * leva a cada canto. Rótulo FIXO + `aria-pressed` (a régua do cadeado das guias): alternar o
 * rótulo junto leria "pressionado" duas vezes no leitor de tela.
 */
const CORNER_BUTTONS: ReadonlyArray<{ corner: RectCorner; label: string; rotate: string }> = [
  { corner: 'tl', label: COPY.vector.cornerTopLeft, rotate: '-rotate-90' },
  { corner: 'tr', label: COPY.vector.cornerTopRight, rotate: '' },
  { corner: 'bl', label: COPY.vector.cornerBottomLeft, rotate: 'rotate-180' },
  { corner: 'br', label: COPY.vector.cornerBottomRight, rotate: 'rotate-90' },
]

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
    rectCorners,
    setRectCorners,
    textAlign,
    setTextAlign,
    fontFamily,
    setFontFamily,
    updateSelected,
    applyStyle,
    beginStyleGesture,
    currentGradient,
    gradientOpen,
    setGradientOpen,
    gradientButtonRef,
    setPolygonSides,
    setStarTips,
  } = useVectorEditor()
  const strokeWidth = style.stroke?.width ?? DEFAULT_STROKE_WIDTH
  // O arrasto de um controle deslizante é UM gesto: abre no toque, fecha no soltar (em qualquer
  // lugar da página), e desfazer volta ao antes do arrasto inteiro. Teclado segue um passo por tecla.
  const fecharGesto = useRef<(() => void) | null>(null)
  useEffect(() => () => fecharGesto.current?.(), [])
  function abrirGesto(event: ReactPointerEvent<HTMLInputElement>): void {
    fecharGesto.current?.()
    const fechar = beginStyleGesture()
    const soltar = addPointerDragListeners(document, {
      pointerId: event.pointerId,
      onMove: () => {},
      onEnd: () => {
        fecharGesto.current = null
        fechar()
      },
    })
    fecharGesto.current = () => {
      fecharGesto.current = null
      soltar()
      fechar()
    }
  }
  const noGesto = () => fecharGesto.current === null
  const single = selected.length === 1
  const singleShape = single ? (selected[0] ?? null) : null
  const selectedRect = singleShape?.type === 'rect' ? singleShape : null
  const selectedText = singleShape?.type === 'text' ? singleShape : null
  // Mesma fonte da janela do Degradê: a forma selecionada, ou o estilo sem seleção.
  const working = currentGradient()
  // A grade dos cantos mostra os cantos do retângulo REDONDO selecionado; sem seleção, ou com
  // o selecionado todo reto, mostra a máscara armada para o próximo retângulo.
  const cornerMask: RectCornerMask =
    selectedRect && selectedRect.rx > 0 ? maskFromRadii(rectCornerRadii(selectedRect)) : rectCorners

  // Retângulo TRANCADO selecionado: nem a máscara do próximo retângulo arma (a régua do
  // `freeForStyle`: com a seleção trancada a paleta também não arma a cor da próxima forma). O
  // `updateSelected` com a identidade só leva ao toast do cadeado, que explica, sem commit.
  const lockedOnly = selectedRect?.locked === true
  function armCorners(mask: RectCornerMask): void {
    if (mask.some((on, i) => on !== rectCorners[i])) setRectCorners(mask)
  }

  function toggleCorner(corner: RectCorner): void {
    if (lockedOnly) {
      updateSelected((s) => s)
      return
    }
    const mask = toggleCornerMask(cornerMask, corner)
    armCorners(mask)
    if (!selectedRect) return
    // Canto que liga ganha o raio da forma (o maior dela) ou, com tudo reto (`rx` 0), o raio já
    // armado no slider; os já redondos ficam, o que desliga vai a zero. Sem raio nenhum a forma
    // não muda e só a máscara arma: o `withRectCorners` devolve a mesma referência e o
    // `updateFree` não grava desfazer vazio.
    updateSelected((s) =>
      s.type === 'rect'
        ? withRectCorners(s, radiiForMask(rectCornerRadii(s), mask, s.rx || rectRadius))
        : s,
    )
  }
  // Na coluna branca as sub-seções empilham coladas (a divisória separa); no cartão, com vão.
  const stack = `flex w-68 shrink-0 flex-col ${usePanelLook() === 'card' ? 'gap-2' : ''}`

  if (disclosure && !disclosure.open) {
    return (
      <div className={stack}>
        <Panel title={COPY.vector.appearance} disclosure={disclosure}>
          {null}
        </Panel>
      </div>
    )
  }

  return (
    <div className={stack}>
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
            style={{ background: gradientCss(working) }}
          />
          {COPY.vector.gradient}
        </Button>

        <label className="mt-3 block text-sm font-bold text-pin-muted">
          <span className="flex items-center justify-between gap-2">
            {COPY.vector.strokeWidth}
            <span aria-hidden="true" className="tabular-nums text-pin-text">
              {formatStrokeWidth(strokeWidth)}
            </span>
          </span>
          <input
            type="range"
            name="vector-stroke-width"
            aria-label={COPY.vector.strokeWidth}
            min={0.5}
            max={10}
            step={0.5}
            // Só a posição do controle é limitada; selecionar um legado não altera a forma.
            value={Math.min(10, Math.max(0.5, strokeWidth))}
            aria-valuetext={formatStrokeWidth(strokeWidth)}
            disabled={style.stroke === null}
            onPointerDown={abrirGesto}
            onChange={(event) => {
              const width = Number(event.target.value)
              applyStyle({ stroke: { color: style.stroke?.color ?? '#000000', width } }, noGesto())
            }}
            className="mt-1 h-11 w-full accent-pin-accent"
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
            onPointerDown={abrirGesto}
            onChange={(event) =>
              applyStyle({ opacity: Number(event.target.value) / 100 }, noGesto())
            }
            className="mt-1 h-11 w-full accent-pin-accent"
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
        // Vale para o PRÓXIMO retângulo e edita o selecionado na hora. O slider é o raio dos
        // cantos LIGADOS na grade; canto desligado fica reto (decisão dela: um raio só + quais
        // cantos, em vez de um raio por canto).
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
              if (lockedOnly) {
                updateSelected((s) => s)
                return
              }
              const radius = Number(event.target.value)
              setRectRadius(radius)
              // Com os quatro cantos desligados o raio não teria onde cair e o slider ficaria
              // morto (o polegar voltaria a 0 sem explicação): mexer nele religa os quatro. E a
              // máscara da FORMA arma o escopo: passar por 0 colapsa os cantos em `rx` (a grade
              // passa a ler o escopo), e voltar a 1 devolve o mesmo padrão em vez de os quatro.
              const mask = cornerMask.some(Boolean) ? cornerMask : ALL_CORNERS
              armCorners(mask)
              if (selectedRect) {
                updateSelected((s) =>
                  s.type === 'rect' ? withRectCorners(s, radiiFromMask(mask, radius)) : s,
                )
              }
            }}
            className="w-full accent-pin-accent"
          />
          <fieldset className="m-0 mt-2 min-w-0 border-0 p-0">
            <legend className="text-sm font-bold text-pin-muted">{COPY.vector.corners}</legend>
            <div className="mt-1 grid w-fit grid-cols-2 gap-1">
              {CORNER_BUTTONS.map(({ corner, label, rotate }) => {
                const on = cornerMask[RECT_CORNERS.indexOf(corner)] === true
                return (
                  <IconButton
                    key={corner}
                    tone="quiet"
                    active={on}
                    aria-pressed={on}
                    aria-label={label}
                    title={label}
                    onClick={() => toggleCorner(corner)}
                  >
                    <SquareRoundCorner aria-hidden="true" className={`size-5 ${rotate}`} />
                  </IconButton>
                )
              })}
            </div>
          </fieldset>
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
