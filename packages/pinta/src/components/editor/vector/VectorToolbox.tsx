/**
 * Caixa de ferramentas do editor VETORIAL, com a MESMA anatomia da caixa do
 * pixel (a criança não estranha ao trocar de estilo): espessuras do traço
 * FIXAS no topo, ferramentas em DUAS colunas rolando no meio e os dois slots
 * de cor (preenchimento na frente, contorno atrás) FIXOS no pé, com o botão
 * de trocar. Clicar num slot escolhe QUEM recebe a próxima cor da paleta.
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { Fragment, useEffect, useState } from 'react'
import { COPY } from '../../../core/copy'
import { filterTools, toolFallback } from '../../../core/toolCuration'
import { isVectorGradient } from '../../../vector/model'
import { IconButton, ToolButton } from '../../ui/Button'
import { Grid3x3, Image, Maximize, Repeat } from '../../ui/icons'
import { useEditor, useEditorStores, useSession, useToolCuration } from '../editorContext'
import { useVectorEditor, type VectorColorChannel } from './VectorEditorScope'
import { VectorInsertAssetDialog } from './VectorInsertAssetDialog'
import { gradientCss, TOOLS } from './vectorTools'

/** Mesmos degraus do slider de espessura do painel de aparência. */
const STROKE_WIDTH_PRESETS = [1, 2, 3, 4, 6, 8] as const

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

  // A ativa cortada viraria estado impossível: selecionada e fora da tela. Mesma régua do pixel.
  useEffect(() => {
    const next = toolFallback(tool, TOOLS, allowTools)
    if (next) setTool(next as typeof tool)
  }, [tool, allowTools, setTool])

  const divider = vertical ? (
    <hr className="col-span-2 my-1 w-8 border-pin-border" />
  ) : (
    <span aria-hidden="true" className="mx-1 h-8 w-0.5 shrink-0 rounded bg-pin-border" />
  )

  const strokeWidths = STROKE_WIDTH_PRESETS.map((width) => (
    <IconButton
      key={width}
      active={style.stroke?.width === width}
      aria-label={`${COPY.vector.strokeWidth}: ${width}`}
      aria-pressed={style.stroke?.width === width}
      title={`${COPY.vector.strokeWidth}: ${width}`}
      // Sem contorno? Escolher uma espessura LIGA o contorno (preto default).
      onClick={() => applyStyle({ stroke: { color: style.stroke?.color ?? '#000000', width } })}
    >
      <span
        aria-hidden="true"
        className="rounded-full bg-current"
        style={{ width: width * 2 + 4, height: width * 2 + 4 }}
      />
    </IconButton>
  ))

  const drawNodes = filterTools(TOOLS, allowTools).map((entry) => (
    <ToolButton
      key={entry.id}
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
        node: <ToolButton icon={Maximize} label={COPY.editor.zoomFit} onClick={zoomToFit} />,
      },
      {
        // Fora dos dois presets de propósito: numa aula o desenho é isolado da galeria pessoal.
        id: 'insertAsset',
        node: (
          <ToolButton
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

  const tools = (
    <>
      {groups.map((group, index) => (
        <Fragment key={group.name}>
          {index > 0 ? divider : null}
          {group.nodes}
        </Fragment>
      ))}
      {/* O diálogo não é botão: fica fora dos grupos para nenhuma curadoria o desmontar. */}
      <VectorInsertAssetDialog
        open={insertOpen}
        onClose={() => setInsertOpen(false)}
        currentId={assetId}
      />
    </>
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
        {tools}
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
      className="pin-panel flex max-h-full min-h-0 shrink-0 flex-col gap-1 p-2"
    >
      <div className="grid shrink-0 grid-cols-2 justify-items-center gap-1">{strokeWidths}</div>
      {divider}
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start justify-items-center gap-1 overflow-y-auto">
        {tools}
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
