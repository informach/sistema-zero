/**
 * Caixa de ferramentas do motor pixel (layout de programa de desenho): em cima
 * os TAMANHOS do traço, no meio as ferramentas em DUAS colunas (com os toggles
 * e as ações de bitmap inteiro) e embaixo as DUAS CORES — principal (botão
 * esquerdo do mouse) e secundária (botão direito), com o botão de trocar.
 *
 * Clicar num dos quadrados de cor escolhe QUEM recebe a próxima cor tocada na
 * paleta (`sessionStore.activeSlot`).
 */
import { clsx } from 'clsx'
import { Fragment, type JSX, useEffect } from 'react'
import { activeBitmapOf, withActiveBitmap, withActiveCels } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import { isAnimatedSpriteKind, isPixelLayeredKind, resolveAssetPalette } from '../../core/project'
import { shortcut } from '../../core/shortcuts'
import { filterTools, isToolAllowed, toolFallback } from '../../core/toolCuration'
import { hasLockedLayer, isLayerLocked } from '../../pixel/layers'
import { clearBitmap, flipHorizontal, flipVertical, rotate90 } from '../../pixel/ops'
import type { PintaSessionTool } from '../../state/sessionStore'
import { IconButton, ToolButton } from '../ui/Button'
import {
  BrushCleaning,
  Circle,
  Eraser,
  FlipHorizontal,
  FlipHorizontal2,
  FlipVertical,
  FlipVertical2,
  Grid3x3,
  type LucideIcon,
  PaintBucket,
  PaintRoller,
  Pencil,
  Pipette,
  Repeat,
  Replace,
  RotateCw,
  Slash,
  Square,
  SquareDashed,
} from '../ui/icons'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores, useSession, useToolCuration } from './editorContext'
import { useActionShortcuts } from './useActionShortcuts'
import { toolShortcutMap, useToolShortcuts } from './useToolShortcuts'

/**
 * As letras são as dos programas de desenho de gente grande (Photoshop/
 * Aseprite): a criança leva o hábito junto quando trocar de ferramenta.
 */
const TOOLS: Array<{
  id: PintaSessionTool
  icon: LucideIcon
  label: string
  shortcut: string
}> = [
  { id: 'pencil', icon: Pencil, label: COPY.tools.pencil, shortcut: 'P' },
  { id: 'eraser', icon: Eraser, label: COPY.tools.eraser, shortcut: 'E' },
  { id: 'fill', icon: PaintBucket, label: COPY.tools.fill, shortcut: 'G' },
  { id: 'recolor', icon: Replace, label: COPY.tools.recolor, shortcut: 'R' },
  { id: 'select', icon: SquareDashed, label: COPY.tools.select, shortcut: 'M' },
  { id: 'line', icon: Slash, label: COPY.tools.line, shortcut: 'L' },
  { id: 'rect', icon: Square, label: COPY.tools.rect, shortcut: 'U' },
  { id: 'ellipse', icon: Circle, label: COPY.tools.ellipse, shortcut: 'O' },
  { id: 'picker', icon: Pipette, label: COPY.tools.picker, shortcut: 'I' },
]

const TOOL_SHORTCUTS = toolShortcutMap(TOOLS)

const BRUSH_SIZES = [1, 2, 3] as const

/** O zoom com que o editor de pixel abre (`sessionStore` default) — o "Ctrl+0" volta para ele. */
const DEFAULT_PIXEL_ZOOM = 8

/** As letras da caixa do PIXEL, para a janela "Atalhos" (uma fonte só: esta lista). */
export const PIXEL_TOOL_SHORTCUTS: ReadonlyArray<{ id: string; label: string; shortcut: string }> =
  TOOLS.map((t) => ({ id: t.id, label: t.label, shortcut: t.shortcut }))

export function ToolBar({
  orientation = 'vertical',
}: {
  orientation?: 'vertical' | 'horizontal'
}): JSX.Element {
  const vertical = orientation === 'vertical'
  const { editor, session } = useEditorStores()
  const { showToast } = useToast()
  const tool = useSession((state) => state.tool)
  const brushSize = useSession((state) => state.brushSize)
  const mirrorX = useSession((state) => state.mirrorX)
  const mirrorY = useSession((state) => state.mirrorY)
  const showGrid = useSession((state) => state.showGrid)
  const filled = useSession((state) => state.filled)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const layerId = useSession((state) => state.layerId)
  const asset = useEditor((state) => state.asset)
  const allowTools = useToolCuration()

  useToolShortcuts(TOOL_SHORTCUTS, (id) => session.getState().setTool(id))

  /**
   * ⚠️ A ferramenta ativa não pode ficar fora da caixa. Sem isto, um bloco de aula que esconda a
   * ferramenta que estava selecionada deixa a criança pintando com algo que ela não vê nem
   * consegue trocar. Mesma régua que o `PaletteBar` já segue ao mudar de cor.
   */
  useEffect(() => {
    const next = toolFallback(tool, TOOLS, allowTools)
    if (next) session.getState().setTool(next as PintaSessionTool)
  }, [tool, allowTools, session])

  const showFilled = tool === 'rect' || tool === 'ellipse'

  function transformBitmap(op: 'flipH' | 'flipV' | 'rotate'): void {
    const ref = { animationId, frameIndex, layerId }
    const state = editor.getState()
    // Espelhar/girar escrevem TODOS os cels do quadro — com QUALQUER camada
    // trancada, meia transformação desalinharia o desenho. Bloqueia inteiro.
    if (isPixelLayeredKind(state.asset) && hasLockedLayer(state.asset)) {
      showToast(COPY.layers.lockedTransform)
      return
    }
    // Espelhar/girar valem para o quadro INTEIRO (todas as camadas juntas):
    // fazer só na ativa desalinharia o desenho.
    const transform = op === 'flipH' ? flipHorizontal : op === 'flipV' ? flipVertical : rotate90
    const next = withActiveCels(state.asset, ref, transform)
    if (next !== state.asset) state.commit(next)
  }

  function clearActive(): void {
    // "Limpar tudo" age na CAMADA ativa (o resto do desenho fica).
    const ref = { animationId, frameIndex, layerId }
    const state = editor.getState()
    if (isPixelLayeredKind(state.asset) && isLayerLocked(state.asset, layerId)) {
      showToast(COPY.layers.lockedWarning)
      return
    }
    const bitmap = activeBitmapOf(state.asset, ref)
    if (!bitmap) return
    const next = clearBitmap(bitmap)
    // Já está vazio: não gasta uma entrada de undo.
    if (next.data.every((v, i) => v === bitmap.data[i])) return
    state.commit(withActiveBitmap(state.asset, ref, next))
  }

  const activeBitmap = activeBitmapOf(asset, { animationId, frameIndex, layerId })
  const canRotate =
    activeBitmap !== null &&
    (asset.kind !== 'pixel-sprite' || activeBitmap.width === activeBitmap.height)

  // Atalhos de AÇÃO no padrão do Aseprite (08/2026): X troca as cores, Shift+H/V
  // espelham o QUADRO, Shift+R gira, Ctrl+' grade, Alt+M espelhos, F3 fantasma,
  // zoom. Registrados AQUI porque é aqui que as ações moram (as mesmas dos
  // botões); os combos vêm do catálogo que alimenta a janela "Atalhos".
  // ⚠️ Cada atalho respeita a CURADORIA da caixa (`allowTools`, as aulas): o que a
  // professora escondeu não pode ligar pelo teclado (a grade, o espelho, os giros).
  const allowed = (id: string) => isToolAllowed(allowTools, id)
  useActionShortcuts([
    { combo: shortcut('swapColors'), run: () => session.getState().swapColors() },
    {
      combo: shortcut('flipFrameH'),
      run: () => transformBitmap('flipH'),
      when: () => allowed('flipH'),
    },
    {
      combo: shortcut('flipFrameV'),
      run: () => transformBitmap('flipV'),
      when: () => allowed('flipV'),
    },
    {
      combo: shortcut('rotateFrame'),
      run: () => transformBitmap('rotate'),
      when: () => canRotate && allowed('rotate'),
    },
    {
      combo: shortcut('grid'),
      run: () => session.getState().toggleGrid(),
      when: () => allowed('grid'),
    },
    {
      combo: shortcut('mirrorH'),
      run: () => session.getState().toggleMirror(),
      when: () => allowed('mirror'),
    },
    {
      combo: shortcut('mirrorV'),
      run: () => session.getState().toggleMirrorY(),
      when: () => allowed('mirrorV'),
    },
    {
      combo: shortcut('onion'),
      run: () => session.getState().toggleOnion(),
      // O fantasma vive na faixa de quadros (não é curado): só depende do kind.
      when: () => isAnimatedSpriteKind(asset),
    },
    { combo: shortcut('zoomIn'), run: () => session.getState().zoomIn(), repeat: true },
    { combo: shortcut('zoomOut'), run: () => session.getState().zoomOut(), repeat: true },
    { combo: shortcut('zoomReset'), run: () => session.getState().setZoom(DEFAULT_PIXEL_ZOOM) },
  ])

  const divider = vertical ? (
    <hr className="col-span-2 my-1 w-8 border-pin-border" />
  ) : (
    <span aria-hidden="true" className="mx-1 h-8 w-0.5 shrink-0 rounded bg-pin-border" />
  )

  const brushSizes = BRUSH_SIZES.map((size) => (
    <IconButton
      key={size}
      active={brushSize === size}
      aria-label={`${COPY.tools.brushSize}: ${size}`}
      aria-pressed={brushSize === size}
      title={`${COPY.tools.brushSize}: ${size}`}
      onClick={() => session.getState().setBrushSize(size)}
    >
      <span
        aria-hidden="true"
        className="rounded-full bg-current"
        style={{ width: size * 4 + 2, height: size * 4 + 2 }}
      />
    </IconButton>
  ))

  /**
   * A caixa em três grupos, cada um curável. Alternadores e ações do quadro ganharam id junto com
   * as ferramentas de propósito: quem pede "a tela não pode vir cheia" está olhando a caixa
   * INTEIRA, não só o que é selecionável.
   */
  const drawNodes = filterTools(TOOLS, allowTools).map((entry) => (
    <ToolButton
      key={entry.id}
      icon={entry.icon}
      label={entry.label}
      shortcut={entry.shortcut}
      active={tool === entry.id}
      onClick={() => session.getState().setTool(entry.id)}
    />
  ))

  const toggleNodes = filterTools(
    [
      {
        id: 'mirror',
        node: (
          <ToolButton
            icon={FlipHorizontal}
            label={COPY.tools.mirror}
            active={mirrorX}
            onClick={() => session.getState().toggleMirror()}
          />
        ),
      },
      {
        id: 'mirrorV',
        node: (
          <ToolButton
            icon={FlipVertical}
            label={COPY.tools.mirrorV}
            active={mirrorY}
            onClick={() => session.getState().toggleMirrorY()}
          />
        ),
      },
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
      // "Preencher" só existe com retângulo/círculo na mão, como sempre.
      ...(showFilled
        ? [
            {
              id: 'filled',
              node: (
                <ToolButton
                  icon={PaintRoller}
                  label={COPY.tools.filled}
                  active={filled}
                  onClick={() => session.getState().toggleFilled()}
                />
              ),
            },
          ]
        : []),
    ],
    allowTools,
  ).map((entry) => <Fragment key={entry.id}>{entry.node}</Fragment>)

  const actionNodes = filterTools(
    [
      {
        id: 'flipH',
        node: (
          <ToolButton
            icon={FlipHorizontal2}
            label={COPY.tools.flipH}
            onClick={() => transformBitmap('flipH')}
          />
        ),
      },
      {
        id: 'flipV',
        node: (
          <ToolButton
            icon={FlipVertical2}
            label={COPY.tools.flipV}
            onClick={() => transformBitmap('flipV')}
          />
        ),
      },
      {
        id: 'rotate',
        node: (
          <ToolButton
            icon={RotateCw}
            label={COPY.tools.rotate}
            disabled={!canRotate}
            onClick={() => transformBitmap('rotate')}
          />
        ),
      },
      {
        id: 'clear',
        node: <ToolButton icon={BrushCleaning} label={COPY.tools.clear} onClick={clearActive} />,
      },
    ],
    allowTools,
  ).map((entry) => <Fragment key={entry.id}>{entry.node}</Fragment>)

  /**
   * Grupo vazio SOME junto com o divisor dele — senão a caixa curada ficaria com traços soltos
   * separando nada. Na barra horizontal os tamanhos do traço seguem no meio, como antes.
   */
  const groups: Array<{ name: string; nodes: JSX.Element[] }> = [
    { name: 'draw', nodes: drawNodes },
    ...(vertical ? [] : [{ name: 'brush', nodes: brushSizes }]),
    { name: 'toggle', nodes: toggleNodes },
    { name: 'action', nodes: actionNodes },
  ].filter((group) => group.nodes.length > 0)

  const tools = (
    <>
      {groups.map((group, index) => (
        <Fragment key={group.name}>
          {index > 0 ? divider : null}
          {group.nodes}
        </Fragment>
      ))}
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
   * Caixa vertical: tamanhos FIXOS no topo, ferramentas em duas colunas rolando
   * no meio e as duas cores FIXAS no pé. Sem os extremos fixos, numa tela de
   * 768px (onde a faixa do Spritesheet come altura) as cores saíam da vista —
   * justamente o que a caixa precisa mostrar sempre.
   *
   * `max-h-full` é o que faz isso valer de fato: sem ele a caixa crescia até a
   * altura do CONTEÚDO (672px numa faixa de 532px), a coluna é que rolava e as
   * cores iam parar embaixo da linha d'água. Com o teto, quem rola é a grade do
   * meio — e quando sobra altura a caixa continua do tamanho do conteúdo.
   */
  return (
    <div
      role="toolbar"
      aria-label={COPY.a11y.tools}
      aria-orientation={orientation}
      className="pin-panel flex max-h-full min-h-0 shrink-0 flex-col gap-1 p-2"
    >
      <div className="grid shrink-0 grid-cols-2 justify-items-center gap-1">{brushSizes}</div>
      {divider}
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start justify-items-center gap-1 overflow-y-auto">
        {tools}
      </div>
      {divider}
      <ColorSlots />
    </div>
  )
}

/**
 * As DUAS cores da caixa: principal (frente) e secundária (atrás, deslocada),
 * mais o botão de trocar. Clicar num quadrado o deixa SELECIONADO — a próxima
 * cor tocada na paleta cai nele. O botão esquerdo do mouse pinta com a
 * principal; o direito, com a secundária.
 */
function ColorSlots(): JSX.Element | null {
  const { session } = useEditorStores()
  const asset = useEditor((state) => state.asset)
  const primary = useSession((state) => state.color)
  const secondary = useSession((state) => state.colorSecondary)
  const activeSlot = useSession((state) => state.activeSlot)

  // Só kinds com paleta indexada (o vetor usa cor livre).
  if (!('paletteId' in asset)) return null
  const colors = resolveAssetPalette(asset)

  const swatch = (slot: 'primary' | 'secondary'): JSX.Element => {
    const index = slot === 'primary' ? primary : secondary
    const hex = colors[index] ?? ''
    const active = activeSlot === slot
    const label = slot === 'primary' ? COPY.tools.primaryColor : COPY.tools.secondaryColor
    const hint = slot === 'primary' ? COPY.tools.primaryHint : COPY.tools.secondaryHint
    return (
      <button
        type="button"
        aria-pressed={active}
        aria-label={`${label}: ${hex || COPY.tools.transparentColor}`}
        title={hint}
        onClick={() => session.getState().setActiveSlot(slot)}
        className={clsx(
          'size-11 rounded-lg border-2 transition',
          // Sem cor (índice 0) mostra o xadrez de transparência.
          !hex && 'pin-checkerboard',
          active ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border',
          slot === 'secondary' && 'absolute right-0 bottom-0',
        )}
        style={hex ? { backgroundColor: hex } : undefined}
      />
    )
  }

  return (
    <div className="flex items-end justify-center gap-1 py-1">
      <IconButton
        aria-label={COPY.tools.swapColors}
        title={COPY.tools.swapColors}
        onClick={() => session.getState().swapColors()}
        className="self-end"
      >
        <Repeat aria-hidden="true" className="size-4" />
      </IconButton>
      {/* A secundária fica ATRÁS e deslocada, como nos programas de desenho. */}
      <div className="relative size-16 shrink-0">
        {swatch('secondary')}
        <span className="absolute top-0 left-0">{swatch('primary')}</span>
      </div>
    </div>
  )
}
