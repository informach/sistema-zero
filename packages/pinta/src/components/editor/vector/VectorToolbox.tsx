/**
 * Caixa de ferramentas do editor VETORIAL, com a MESMA anatomia da caixa do
 * pixel (a criança não estranha ao trocar de estilo): espessuras do traço
 * FIXAS no topo, ferramentas em DUAS colunas rolando no meio e os dois slots
 * de cor (preenchimento na frente, contorno atrás) FIXOS no pé, com o botão
 * de trocar. Clicar num slot escolhe QUEM recebe a próxima cor da paleta.
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useState } from 'react'
import { COPY } from '../../../core/copy'
import { isVectorGradient } from '../../../vector/model'
import { IconButton, ToolButton } from '../../ui/Button'
import { Grid3x3, Image, Maximize, Repeat } from '../../ui/icons'
import { useEditor, useEditorStores, useSession } from '../editorContext'
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
  const [insertOpen, setInsertOpen] = useState(false)

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

  const tools = (
    <>
      {TOOLS.map((entry) => (
        <ToolButton
          key={entry.id}
          icon={entry.icon}
          label={entry.label}
          shortcut={entry.shortcut}
          active={tool === entry.id}
          onClick={() => setTool(entry.id)}
        />
      ))}

      {divider}

      {/* Na barra HORIZONTAL (tela estreita) as espessuras seguem no meio. */}
      {vertical ? null : strokeWidths}
      {vertical ? null : divider}

      {/* Grade de apoio por cima do desenho (espelho do toggle do pixel). */}
      <ToolButton
        icon={Grid3x3}
        label={COPY.tools.grid}
        active={showGrid}
        onClick={() => session.getState().toggleGrid()}
      />
      <ToolButton icon={Maximize} label={COPY.editor.zoomFit} onClick={zoomToFit} />
      {/* Trazer um desenho da galeria. Mora AQUI porque este mesmo fragmento
          serve o rail vertical do desktop e a barra horizontal da tela
          estreita: um ponto só cobre os dois. */}
      <ToolButton
        icon={Image}
        label={COPY.vector.insertAsset}
        onClick={() => setInsertOpen(true)}
      />
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
    return (
      <button
        type="button"
        aria-pressed={active}
        aria-label={`${label}: ${name}`}
        title={label}
        onClick={() => setActiveChannel(channel)}
        className={clsx(
          'size-11 rounded-lg border-2 transition',
          isNone && 'pin-checkerboard',
          active ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border',
          channel === 'stroke' && 'absolute right-0 bottom-0',
        )}
        style={
          gradient
            ? { background: gradientCss(gradient) }
            : hex
              ? { backgroundColor: hex }
              : undefined
        }
      />
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
      {/* O contorno fica ATRÁS e deslocado, como a 2ª cor do pixel. */}
      <div className="relative size-16 shrink-0">
        {swatch('stroke')}
        <span className="absolute top-0 left-0">{swatch('fill')}</span>
      </div>
    </div>
  )
}
