/**
 * Caixa de ferramentas do editor VETORIAL, com a MESMA anatomia da caixa do
 * pixel (a criança não estranha ao trocar de estilo): espessuras do traço
 * FIXAS no topo, ferramentas em DUAS colunas rolando no meio e os dois slots
 * de cor (preenchimento na frente, contorno atrás) FIXOS no pé, com o botão
 * de trocar. Clicar num slot escolhe QUEM recebe a próxima cor da paleta.
 *
 * O desenho da tela-modelo (11/09/2026), o mesmo da caixa do pixel: quadrados claros de 40px (44
 * no toque), o ativo azul chapado, grupos em grades de duas colunas e um fio entre eles, na
 * coluna branca e sem moldura.
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { filterTools, toolFallback } from '../../../core/toolCuration'
import { isVectorGradient } from '../../../vector/model'
import { IconButton, ToolButton } from '../../ui/Button'
import { Grid3x3, Image, Maximize, Repeat } from '../../ui/icons'
import { useEditor, useEditorStores, useSession, useToolCuration } from '../editorContext'
import { ScrollMoreHint } from '../ScrollMoreHint'
import { TOOL_GRID } from '../toolGrid'
import { useScrollMore } from '../useScrollMore'
import { useVectorEditor, type VectorColorChannel } from './VectorEditorScope'
import { VectorInsertAssetDialog } from './VectorInsertAssetDialog'
import { formatStrokeWidth, gradientCss, STROKE_WIDTHS, strokeDotSize, TOOLS } from './vectorTools'

export function VectorToolbox({
  orientation = 'vertical',
}: {
  orientation?: 'vertical' | 'horizontal'
}): JSX.Element {
  const vertical = orientation === 'vertical'
  const { session } = useEditorStores()
  const showGrid = useSession((state) => state.showGrid)
  const { tool, setTool, zoomToFit, style, applyStyle } = useVectorEditor()
  const assetId = useEditor((state) => state.asset.id)
  const allowTools = useToolCuration()
  const [insertOpen, setInsertOpen] = useState(false)
  // O miolo rola com a barra escondida e o degradê no pé (a mesma régua da caixa do pixel).
  const middleRef = useRef<HTMLDivElement>(null)
  const more = useScrollMore(middleRef)

  // A ativa cortada viraria estado impossível: selecionada e fora da tela. Mesma régua do pixel.
  useEffect(() => {
    const next = toolFallback(tool, TOOLS, allowTools)
    if (next) setTool(next as typeof tool)
  }, [tool, allowTools, setTool])

  const divider = vertical ? (
    <hr className="pin-tool-divider" />
  ) : (
    <span aria-hidden="true" className="mx-1 h-8 w-0.5 shrink-0 rounded bg-pin-border" />
  )

  // Os degraus vêm de `STROKE_WIDTHS` (fonte única com o slider de Aparência).
  // `active` é igualdade ESTRITA de propósito: um traço antigo de 8 não acende o
  // "3" (mentiria), ele só não acende nada.
  const strokeWidths = STROKE_WIDTHS.map((width) => {
    const label = `${COPY.vector.strokeWidth}: ${formatStrokeWidth(width)}`
    const dot = strokeDotSize(width)
    return (
      <IconButton
        key={width}
        tone="quiet"
        active={style.stroke?.width === width}
        aria-label={label}
        aria-pressed={style.stroke?.width === width}
        title={label}
        // Sem contorno? Escolher uma espessura LIGA o contorno (preto default).
        onClick={() => applyStyle({ stroke: { color: style.stroke?.color ?? '#000000', width } })}
      >
        <span
          aria-hidden="true"
          className="rounded-full bg-current"
          style={{ width: dot, height: dot }}
        />
      </IconButton>
    )
  })

  const drawNodes = filterTools(TOOLS, allowTools).map((entry) => (
    <ToolButton
      key={entry.id}
      tone="quiet"
      icon={entry.icon}
      label={entry.label}
      shortcut={entry.shortcut}
      active={tool === entry.id}
      onClick={() => setTool(entry.id)}
    />
  ))

  const extraNodes = filterTools(
    [
      {
        id: 'grid',
        node: (
          <ToolButton
            tone="quiet"
            icon={Grid3x3}
            label={COPY.tools.grid}
            active={showGrid}
            onClick={() => session.getState().toggleGrid()}
          />
        ),
      },
      {
        // ⚠️ Está nos DOIS presets porque é o único controle daqui que só mexe na VISTA: quem
        // aproximou demais pela rolagem precisa do caminho de volta. Só some numa lista fina que
        // o professor montou à mão, onde a escolha é dele.
        id: 'fit',
        node: (
          <ToolButton
            tone="quiet"
            icon={Maximize}
            label={COPY.editor.zoomFit}
            onClick={zoomToFit}
          />
        ),
      },
      {
        // Fora dos dois presets de propósito: numa aula o desenho é isolado da galeria pessoal.
        id: 'insertAsset',
        node: (
          <ToolButton
            tone="quiet"
            icon={Image}
            label={COPY.vector.insertAsset}
            onClick={() => setInsertOpen(true)}
          />
        ),
      },
    ],
    allowTools,
  ).map((entry) => <Fragment key={entry.id}>{entry.node}</Fragment>)

  // Grupo vazio SOME junto com o divisor dele — senão a caixa curada fica com traços separando nada.
  const groups: Array<{ name: string; nodes: JSX.Element[] }> = [
    { name: 'draw', nodes: drawNodes },
    ...(vertical ? [] : [{ name: 'stroke', nodes: strokeWidths }]),
    { name: 'extra', nodes: extraNodes },
  ].filter((group) => group.nodes.length > 0)

  // O diálogo não é botão: fica fora dos grupos para nenhuma curadoria o desmontar.
  const insertDialog = (
    <VectorInsertAssetDialog
      open={insertOpen}
      onClose={() => setInsertOpen(false)}
      currentId={assetId}
    />
  )

  // Tela estreita: uma linha só, rolando na horizontal.
  if (!vertical) {
    return (
      <div
        role="toolbar"
        aria-label={COPY.a11y.tools}
        aria-orientation={orientation}
        className="pin-panel flex shrink-0 items-center gap-1 overflow-x-auto p-2"
      >
        {groups.map((group, index) => (
          <Fragment key={group.name}>
            {index > 0 ? divider : null}
            {group.nodes}
          </Fragment>
        ))}
        {insertDialog}
      </div>
    )
  }

  /**
   * Caixa vertical (mesma régua da do pixel): espessuras FIXAS no topo,
   * ferramentas em duas colunas rolando no meio e os dois slots de cor FIXOS
   * no pé — os extremos fixos garantem que as cores nunca saem da vista.
   * O `max-h-full` é o que faz o teto valer (senão a caixa cresce até o
   * conteúdo e quem rola é a coluna, levando as cores para baixo da vista);
   * quem estica com a linha do palco é a coluna de fora, não esta caixa.
   */
  return (
    <div
      role="toolbar"
      aria-label={COPY.a11y.tools}
      aria-orientation={orientation}
      className="flex max-h-full min-h-0 shrink-0 flex-col gap-2 px-1 py-2"
    >
      <div className={`shrink-0 ${TOOL_GRID}`}>{strokeWidths}</div>
      {divider}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={middleRef}
          className="pin-scroll-y flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-1"
        >
          {groups.map((group, index) => (
            <Fragment key={group.name}>
              {index > 0 ? divider : null}
              <div className={TOOL_GRID}>{group.nodes}</div>
            </Fragment>
          ))}
          {insertDialog}
        </div>
        {more ? <ScrollMoreHint /> : null}
      </div>
      {divider}
      <VectorColorSlots />
    </div>
  )
}

/**
 * Os dois "quadrados de cor" do vetor: PREENCHIMENTO na frente e CONTORNO
 * atrás (espelho do principal/secundária do pixel), mais o botão de trocar.
 * Clicar num quadrado o deixa SELECIONADO — a próxima cor tocada no painel
 * de cores cai nele.
 */
function VectorColorSlots(): JSX.Element {
  const { style, activeChannel, setActiveChannel, swapFillStroke } = useVectorEditor()

  const swatch = (channel: VectorColorChannel): JSX.Element => {
    const active = activeChannel === channel
    const label = channel === 'fill' ? COPY.vector.fill : COPY.vector.stroke
    const fill = style.fill
    const isNone = channel === 'fill' ? fill === 'none' : style.stroke === null
    const hex =
      channel === 'fill'
        ? typeof fill === 'string' && fill !== 'none'
          ? fill
          : null
        : (style.stroke?.color ?? null)
    const gradient = channel === 'fill' && isVectorGradient(fill) ? fill : null
    const name = gradient
      ? COPY.vector.gradient
      : isNone
        ? COPY.vector.none
        : hex
          ? (COPY.colorNames[hex] ?? hex)
          : COPY.vector.none
    const colorStyle = gradient
      ? { background: gradientCss(gradient) }
      : hex
        ? { backgroundColor: hex }
        : undefined
    return (
      <button
        type="button"
        aria-pressed={active}
        aria-label={`${label}: ${name}`}
        title={label}
        onClick={() => setActiveChannel(channel)}
        className={clsx(
          'group absolute flex size-11 items-center justify-center rounded-lg border-0 bg-transparent p-0 transition focus-visible:z-30 focus-visible:outline-none',
          active ? 'z-20' : channel === 'fill' ? 'z-10' : 'z-0',
          channel === 'fill' ? 'top-0 left-0' : 'right-0 bottom-0',
        )}
      >
        <span
          aria-hidden="true"
          data-vector-color-shape={channel}
          className={clsx(
            'pointer-events-none relative size-10 rounded-md border-2 shadow-sm transition group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-pin-accent',
            active
              ? 'border-pin-accent ring-2 ring-pin-accent'
              : 'border-pin-border group-hover:border-pin-accent/70',
            isNone && 'pin-checkerboard',
            channel === 'fill' ? 'translate-x-3' : '-translate-x-3',
          )}
          style={colorStyle}
        >
          {channel === 'stroke' ? (
            <span
              data-vector-color-hole=""
              className="absolute inset-[7px] rounded-[3px] border border-pin-border bg-pin-surface"
            />
          ) : null}
        </span>
      </button>
    )
  }

  return (
    <div className="flex items-end justify-center gap-1 py-1">
      <IconButton
        aria-label={COPY.vector.swapFillStroke}
        title={COPY.vector.swapFillStroke}
        onClick={swapFillStroke}
        className="self-end"
      >
        <Repeat aria-hidden="true" className="size-4" />
      </IconButton>
      {/* Os ALVOS não se cruzam; só as placas internas, sem pointer events, ficam sobrepostas. */}
      <div className="relative h-16 w-[88px] shrink-0">
        {swatch('stroke')}
        {swatch('fill')}
      </div>
    </div>
  )
}
