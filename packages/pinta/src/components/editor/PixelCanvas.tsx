/**
 * A superfície de desenho: converte pointer events em posições de pixel e
 * delega à máquina pura de ferramenta (`pixel/tools.ts`); o preview do gesto é
 * pintado DIRETO no canvas (sem setState por move — 60fps no touch), e o
 * commit vira UMA entrada de undo no editorStore.
 *
 * A ferramenta SELEÇÃO (recorta/move um retângulo) NÃO passa pela máquina pura:
 * o estado do recorte vive em refs aqui e reusa `pixel/selection.ts` (extrair →
 * flutuar → carimbar). O buraco da extração só é COMMITADO no carimbo final —
 * enquanto flutua, o bitmap do store segue o original, então undo/redo/troca de
 * quadro apenas LARGAM a seleção (sem perda do que já estava salvo).
 *
 * Sobre a seleção moram as AÇÕES do pedaço (copiar/recortar/colar/duplicar/
 * espelhar/apagar), pelo teclado e por uma barra flutuante — é assim que a
 * criança faz a asa do outro lado da nave sem desenhar de novo. A área de
 * transferência vive na SESSÃO, então copiar num quadro e colar noutro funciona.
 *
 * happy-dom não tem canvas 2D: `createScaledPainter` devolve null e o
 * componente simplesmente não pinta (a lógica de gesto continua testável).
 */
import type { JSX, PointerEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  activeBitmapOf,
  activeCelsOf,
  previousFrameOf,
  withActiveBitmap,
} from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import { TRANSPARENT_INDEX } from '../../core/palette'
import { safeSetPointerCapture } from '../../core/pointer'
import { isPixelLayeredKind, type PintaBitmap, resolveAssetPalette } from '../../core/project'
import type { Vec2 } from '../../pixel/bitmap'
import { flattenCelsRange, layerIndexOf, visibleComposite } from '../../pixel/layers'
import { flipHorizontal, flipVertical } from '../../pixel/ops'
import {
  createScaledPainter,
  paintPixelGrid,
  paintSelectionOverlay,
  type ScaledPainter,
} from '../../pixel/render'
import {
  cropBitmap,
  extractSelection,
  type FloatingSelection,
  hasPaintedPixel,
  normalizeRect,
  type SelectionRect,
  stampSelection,
} from '../../pixel/selection'
import {
  type ToolGesture,
  type ToolSettings,
  toolPointerDown,
  toolPointerMove,
  toolPointerUp,
} from '../../pixel/tools'
import { ToolButton } from '../ui/Button'
import { Copy, FlipHorizontal2, FlipVertical2, Trash2 } from '../ui/icons'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores, useSession } from './editorContext'
import { useWheelZoom } from './useWheelZoom'

const ONION_ALPHA = 0.3

/** Quantos pixels o pedaço colado nasce deslocado (nasce "do lado", visível). */
const PASTE_OFFSET = 2

/** Estado local da ferramenta seleção (marquee em curso → retângulo → flutuante). */
type Selection =
  | { kind: 'marquee'; start: Vec2; rect: SelectionRect | null }
  | { kind: 'rect'; rect: SelectionRect }
  | { kind: 'floating'; floating: FloatingSelection; remaining: PintaBitmap }

function floatRect(f: FloatingSelection): SelectionRect {
  return { x: f.x, y: f.y, width: f.bitmap.width, height: f.bitmap.height }
}

function inside(rect: SelectionRect, p: Vec2): boolean {
  return p.x >= rect.x && p.x < rect.x + rect.width && p.y >= rect.y && p.y < rect.y + rect.height
}

export function PixelCanvas(): JSX.Element {
  const { editor, session } = useEditorStores()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const tool = useSession((state) => state.tool)
  const zoom = useSession((state) => state.zoom)
  const onion = useSession((state) => state.onion)
  const showGrid = useSession((state) => state.showGrid)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const layerId = useSession((state) => state.layerId)
  // Paleta efetiva (base + extras), estável por asset — pintar uma cor extra
  // recém-adicionada é uma mudança de asset, então o canvas repinta.
  const colors = useMemo(() => resolveAssetPalette(asset), [asset])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  // A barra de ações do pedaço: clicar NELA não pode desselecionar.
  const selectionBarRef = useRef<HTMLDivElement>(null)
  const painterRef = useRef<ScaledPainter | null>(null)
  const gestureRef = useRef<ToolGesture | null>(null)
  // Dono do gesto: um segundo dedo/palma não injeta pontos no traço do primeiro.
  const gesturePointerRef = useRef<number | null>(null)

  // Estado da seleção + dono do arrasto do recorte flutuante.
  const selRef = useRef<Selection | null>(null)
  // Espelho REACT só da EXISTÊNCIA da seleção (dirige a barra de ações). Muda
  // nas transições; arrastar o recorte segue mexendo apenas em refs, sem
  // re-render por movimento.
  const [selKind, setSelKind] = useState<'none' | 'rect' | 'floating'>('none')
  const selPointerRef = useRef<number | null>(null)
  const movingRef = useRef<{ offset: Vec2 } | null>(null)
  // Distingue "o bitmap mudou porque EU commitei" de "mudou por fora"
  // (undo/redo) — no segundo caso a seleção pendente é largada.
  const selfCommitRef = useRef(false)
  const lastBitmapRef = useRef<PintaBitmap | null>(null)

  // Ações do pedaço selecionado SEMPRE as do último render (elas leem o estado
  // vivo, mas `renderCanvas` fecha sobre zoom/cores). O listener de teclado é
  // registrado uma vez e chama por aqui. (As funções são declarações — içadas.)
  const actionsRef = useRef({
    copy: copySelection,
    cut: cutSelection,
    paste: pasteClipboard,
    duplicate: duplicateSelection,
    remove: deleteSelection,
    stamp: stampPending,
    hasSelection: () => selRef.current !== null,
  })
  actionsRef.current = {
    copy: copySelection,
    cut: cutSelection,
    paste: pasteClipboard,
    duplicate: duplicateSelection,
    remove: deleteSelection,
    stamp: stampPending,
    hasSelection: () => selRef.current !== null,
  }

  const frameRef = { animationId, frameIndex, layerId }
  const bitmap = activeBitmapOf(asset, frameRef)
  const ghost = onion ? previousFrameOf(asset, frameRef) : null

  // As camadas ao redor da que está sendo editada, achatadas UMA vez por
  // (asset, camada, quadro): durante o gesto só o bitmap ativo muda, então o
  // pintor blita 3 imagens por movimento em vez de recompor a pilha.
  const surrounding = useMemo(() => {
    if (!isPixelLayeredKind(asset)) return { under: null, over: null }
    const cels = activeCelsOf(asset, { animationId, frameIndex, layerId })
    if (!cels) return { under: null, over: null }
    const active = layerIndexOf(asset, layerId)
    return {
      under: flattenCelsRange(cels, asset.layers, 0, active),
      over: flattenCelsRange(cels, asset.layers, active + 1, cels.length),
    }
  }, [asset, layerId, animationId, frameIndex])

  /** A camada ativa está escondida? Então o traço não apareceria. */
  const activeHidden =
    isPixelLayeredKind(asset) && asset.layers[layerIndexOf(asset, layerId)]?.visible === false

  /**
   * O desenho VISÍVEL inteiro (todas as camadas) — referência do balde e do
   * conta-gotas. Sem camadas extras é o próprio bitmap ativo.
   */
  const composite = useMemo(() => {
    if (!bitmap) return undefined
    return visibleComposite(bitmap, !activeHidden, surrounding.under, surrounding.over)
  }, [bitmap, surrounding, activeHidden])

  // Trocar de quadro/animação NO MEIO de um gesto (multi-touch) descarta o
  // gesto — sem isso o pointerup commitaria o bitmap antigo POR CIMA do quadro
  // recém-selecionado. A seleção flutuante também é largada (nunca commitou o
  // buraco, então o quadro antigo fica intacto).
  // biome-ignore lint/correctness/useExhaustiveDependencies: as deps são o GATILHO (mudou o quadro/camada ativa)
  useEffect(() => {
    gestureRef.current = null
    gesturePointerRef.current = null
    applySelection(null)
    movingRef.current = null
  }, [animationId, frameIndex, layerId])

  function paint(current: PintaBitmap): void {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!painterRef.current) painterRef.current = createScaledPainter(canvas)
    const painter = painterRef.current
    if (!painter) return
    painter.paint(current, colors, zoom, {
      ...(ghost ? { ghost: { bitmap: ghost, alpha: ONION_ALPHA } } : {}),
      under: surrounding.under,
      over: surrounding.over,
      hideActive: activeHidden,
    })
    paintPixelGrid(canvas, current, zoom, showGrid)
  }

  /** Pinta o bitmap (compondo o recorte flutuante) + o contorno da seleção. */
  function renderCanvas(): void {
    const sel = selRef.current
    if (sel?.kind === 'floating') {
      paint(stampSelection(sel.remaining, sel.floating))
      paintSelectionOverlay(canvasRef.current, floatRect(sel.floating), zoom)
      return
    }
    if (!bitmap) return
    paint(bitmap)
    if (sel?.kind === 'rect') paintSelectionOverlay(canvasRef.current, sel.rect, zoom)
    else if (sel?.kind === 'marquee' && sel.rect) {
      paintSelectionOverlay(canvasRef.current, sel.rect, zoom)
    }
  }

  // Repinta quando bitmap/zoom/onion mudam (fora de gesto; o gesto pinta direto).
  // biome-ignore lint/correctness/useExhaustiveDependencies: `renderCanvas` lê os mesmos valores das deps
  useEffect(() => {
    if (!bitmap) return
    if (selfCommitRef.current) {
      selfCommitRef.current = false
    } else if (lastBitmapRef.current && lastBitmapRef.current !== bitmap && selRef.current) {
      // Conteúdo mudou por fora (undo/redo): a seleção pendente perde o chão.
      applySelection(null)
      movingRef.current = null
    }
    lastBitmapRef.current = bitmap
    if (!gestureRef.current) renderCanvas()
  }, [bitmap, zoom, onion, ghost, surrounding, activeHidden, showGrid, colors])

  // Sair da ferramenta seleção CARIMBA o recorte pendente (some sem sumir).
  // biome-ignore lint/correctness/useExhaustiveDependencies: stampPending lê refs; o gatilho é `tool`
  useEffect(() => {
    if (tool !== 'select') stampPending()
  }, [tool])

  useEffect(
    () => () => {
      painterRef.current?.dispose()
      painterRef.current = null
    },
    [],
  )

  // Atalhos do pedaço: Ctrl/Cmd+C copia, +X recorta, +V cola, +D duplica e
  // Delete apaga. Registrado UMA vez (as ações vêm do ref). Não colide com o
  // Ctrl+Z/Y do EditorScreen; campos de texto são ignorados (mesmo guard).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      const actions = actionsRef.current
      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase()
        // Copiar só "consome" a tecla quando havia um pedaço selecionado — sem
        // seleção, o copiar do navegador segue funcionando normalmente.
        if (key === 'c') {
          if (actions.copy()) event.preventDefault()
        } else if (key === 'x') {
          if (actions.copy()) {
            event.preventDefault()
            actions.cut()
          }
        } else if (key === 'v') {
          event.preventDefault()
          actions.paste()
        } else if (key === 'd') {
          event.preventDefault()
          actions.duplicate()
        }
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!actions.hasSelection()) return
        event.preventDefault()
        actions.remove()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Clicar FORA do desenho desseleciona (o que estava flutuando é carimbado).
  // Sem isto a barra de ações ficava aberta para sempre depois de um clique
  // qualquer na tela. A própria barra e o palco não contam como "fora".
  useEffect(() => {
    function onPointerDown(event: globalThis.PointerEvent): void {
      if (!selRef.current) return
      const target = event.target as Node | null
      if (!target) return
      if (canvasRef.current?.contains(target)) return
      if (selectionBarRef.current?.contains(target)) return
      actionsRef.current.stamp()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  // Recorte flutuante nunca carimbado se perderia ao sair do editor (o autosave
  // grava o asset do store, sem o pedaço levantado). A limpeza do filho roda
  // ANTES do flush do EditorScreen, então o carimbo entra no que é salvo.
  useEffect(() => () => actionsRef.current.stamp(), [])

  // Rolagem do mouse = aproximar/afastar (depois do efeito que pinta: o canvas
  // só muda de tamanho ali, e a âncora do cursor precisa do tamanho novo).
  useWheelZoom(stageRef, canvasRef)

  if (!bitmap) return <div className="flex-1" />

  function pixelPos(event: PointerEvent<HTMLCanvasElement>): Vec2 {
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: Math.floor((event.clientX - rect.left) / zoom),
      y: Math.floor((event.clientY - rect.top) / zoom),
    }
  }

  /**
   * `secondary` = o gesto veio do BOTÃO DIREITO do mouse: pinta com a 2ª cor
   * da caixa de ferramentas (padrão dos programas de desenho).
   */
  function settings(secondary = false): ToolSettings {
    const s = session.getState()
    return {
      // 'pan'/'select' não são do motor pixel — nunca chegam aqui (o handler
      // trata a seleção antes), mas o fallback mantém o tipo honesto.
      tool: s.tool === 'pan' || s.tool === 'select' ? 'pencil' : s.tool,
      color: secondary ? s.colorSecondary : s.color,
      brushSize: s.brushSize,
      mirrorX: s.mirrorX,
      mirrorY: s.mirrorY,
      filled: s.filled,
    }
  }

  function commitBitmap(next: PintaBitmap): void {
    // Ref VIVO da sessão (não o do render): o commit cai no quadro certo mesmo
    // se a seleção mudou durante o gesto.
    selfCommitRef.current = true
    const state = editor.getState()
    const s = session.getState()
    state.commit(
      withActiveBitmap(
        state.asset,
        { animationId: s.animationId, frameIndex: s.frameIndex, layerId: s.layerId },
        next,
      ),
    )
  }

  /** Cel da CAMADA ativa no quadro ativo, segundo o estado vivo (não o do render). */
  function liveBitmap(): PintaBitmap | null {
    const s = session.getState()
    return activeBitmapOf(editor.getState().asset, {
      animationId: s.animationId,
      frameIndex: s.frameIndex,
      layerId: s.layerId,
    })
  }

  /** Troca a seleção mantendo a barra de ações em dia (ponto ÚNICO de escrita). */
  function applySelection(next: Selection | null): void {
    selRef.current = next
    setSelKind(next?.kind === 'rect' ? 'rect' : next?.kind === 'floating' ? 'floating' : 'none')
  }

  /** Carimba o recorte flutuante (se houver) e zera a seleção. */
  function stampPending(): void {
    const sel = selRef.current
    applySelection(null)
    movingRef.current = null
    if (sel?.kind === 'floating') commitBitmap(stampSelection(sel.remaining, sel.floating))
  }

  // ---- Ações do pedaço selecionado --------------------------------------

  /**
   * O pedaço como bitmap próprio: assentado vira CÓPIA (o desenho fica
   * intacto), levantado é ele mesmo. `null` = não há o que copiar.
   */
  function selectionBitmap(): PintaBitmap | null {
    const sel = selRef.current
    if (sel?.kind === 'floating') return sel.floating.bitmap
    const current = liveBitmap()
    if (!current || sel?.kind !== 'rect') return null
    return cropBitmap(current, sel.rect)
  }

  /** Guarda o pedaço na área de transferência. `false` = não havia seleção. */
  function copySelection(): boolean {
    const cut = selectionBitmap()
    if (!cut) return false
    session.getState().setClipboard(cut)
    return true
  }

  /** Cola o que está guardado como recorte flutuante, do lado e já arrastável. */
  function pasteClipboard(): void {
    const clip = session.getState().clipboard
    if (!clip) return
    const sel = selRef.current
    const from =
      sel?.kind === 'floating'
        ? { x: sel.floating.x, y: sel.floating.y }
        : sel?.kind === 'rect'
          ? { x: sel.rect.x, y: sel.rect.y }
          : { x: -PASTE_OFFSET, y: -PASTE_OFFSET }
    // Carimba o que já estava flutuando antes de trocar de recorte.
    stampPending()
    const current = liveBitmap()
    if (!current) return
    // Colar ACRESCENTA (não fura o fundo): o "remaining" é o desenho de agora.
    applySelection({
      kind: 'floating',
      floating: {
        bitmap: clip,
        x: Math.min(Math.max(from.x + PASTE_OFFSET, 0), Math.max(current.width - 1, 0)),
        y: Math.min(Math.max(from.y + PASTE_OFFSET, 0), Math.max(current.height - 1, 0)),
      },
      remaining: current,
    })
    // Sem a ferramenta seleção o pedaço colado não seria arrastável.
    session.getState().setTool('select')
    renderCanvas()
  }

  /** Copiar + colar numa tacada (o original fica onde está). */
  function duplicateSelection(): void {
    if (!copySelection()) return
    pasteClipboard()
  }

  /**
   * Espelha o PEDAÇO (não o quadro). Assentado, levanta primeiro — assim o giro
   * acontece no recorte e ele volta espelhado no mesmo lugar.
   */
  function flipSelection(axis: 'h' | 'v'): void {
    const sel = selRef.current
    const current = liveBitmap()
    if (!current) return
    const lifted =
      sel?.kind === 'floating'
        ? { floating: sel.floating, remaining: sel.remaining }
        : sel?.kind === 'rect'
          ? extractSelection(current, sel.rect)
          : null
    if (!lifted) return
    const bmp = lifted.floating.bitmap
    applySelection({
      kind: 'floating',
      floating: {
        ...lifted.floating,
        bitmap: axis === 'h' ? flipHorizontal(bmp) : flipVertical(bmp),
      },
      remaining: lifted.remaining,
    })
    renderCanvas()
  }

  /** Apaga o pedaço: levantado some, assentado limpa a área (Delete). */
  function deleteSelection(): void {
    const sel = selRef.current
    if (sel?.kind === 'floating') {
      applySelection(null)
      movingRef.current = null
      commitBitmap(sel.remaining)
      return
    }
    const current = liveBitmap()
    if (!current || sel?.kind !== 'rect') return
    const { remaining } = extractSelection(current, sel.rect)
    applySelection(null)
    commitBitmap(remaining)
  }

  /** Recortar = copiar + apagar. */
  function cutSelection(): void {
    if (!copySelection()) return
    deleteSelection()
  }

  function selectPointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    if (!event.isPrimary || !bitmap) return
    safeSetPointerCapture(event.currentTarget, event.pointerId)
    selPointerRef.current = event.pointerId
    const p = pixelPos(event)
    const sel = selRef.current
    if (sel?.kind === 'floating' && inside(floatRect(sel.floating), p)) {
      movingRef.current = { offset: { x: p.x - sel.floating.x, y: p.y - sel.floating.y } }
      return
    }
    if (sel?.kind === 'rect' && inside(sel.rect, p)) {
      // Pegar o retângulo: extrai o recorte (buraco transparente) e passa a mover.
      const { remaining, floating } = extractSelection(bitmap, sel.rect)
      applySelection({ kind: 'floating', floating, remaining })
      movingRef.current = { offset: { x: p.x - floating.x, y: p.y - floating.y } }
      renderCanvas()
      return
    }
    // Novo marquee: carimba o recorte anterior antes de começar do zero.
    stampPending()
    applySelection({ kind: 'marquee', start: p, rect: normalizeRect(bitmap, p, p) })
    renderCanvas()
  }

  function selectPointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    if (event.pointerId !== selPointerRef.current || !bitmap) return
    const p = pixelPos(event)
    const sel = selRef.current
    const moving = movingRef.current
    if (sel?.kind === 'floating' && moving) {
      sel.floating.x = p.x - moving.offset.x
      sel.floating.y = p.y - moving.offset.y
      renderCanvas()
      return
    }
    if (sel?.kind === 'marquee') {
      sel.rect = normalizeRect(bitmap, sel.start, p)
      renderCanvas()
    }
  }

  function selectPointerUp(event: PointerEvent<HTMLCanvasElement>): void {
    if (event.pointerId !== selPointerRef.current) return
    selPointerRef.current = null
    if (movingRef.current) {
      movingRef.current = null
      return
    }
    const sel = selRef.current
    if (sel?.kind === 'marquee') {
      // Pedaço só de fundo quadriculado NÃO vira seleção: a criança seleciona o
      // que ela pintou, não o vazio (senão a barra de ações abre por engano).
      const settled =
        sel.rect && bitmap && hasPaintedPixel(bitmap, sel.rect)
          ? ({ kind: 'rect', rect: sel.rect } as const)
          : null
      applySelection(settled)
      renderCanvas()
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    if (tool === 'select') {
      selectPointerDown(event)
      return
    }
    if (!event.isPrimary || !bitmap || gestureRef.current) return
    safeSetPointerCapture(event.currentTarget, event.pointerId)
    gesturePointerRef.current = event.pointerId
    // Botão DIREITO pinta com a 2ª cor da caixa (padrão dos programas de
    // desenho). Só o `pointerdown` traz o botão; o resto do traço herda a cor
    // pelo `settings` que fica congelado dentro do ToolGesture.
    const secondary = event.button === 2
    // Camada escondida: o traço iria para um lugar invisível — avisa em vez de
    // deixar a criança achar que a ferramenta quebrou (régua do `isTileBlank`).
    if (activeHidden) showToast(COPY.layers.hiddenWarning)
    // O balde e o conta-gotas trabalham sobre o que se VÊ (composto).
    const result = toolPointerDown(bitmap, settings(secondary), pixelPos(event), composite)
    if (result.pickedColor !== undefined) {
      const s = session.getState()
      if (result.pickedColor === TRANSPARENT_INDEX) {
        s.setTool('eraser')
      } else {
        // Conta-gotas com o botão direito guarda na cor SECUNDÁRIA.
        s.applyColor(result.pickedColor, secondary ? 'secondary' : undefined)
        s.setTool('pencil')
      }
      return
    }
    if (result.commit) {
      commitBitmap(result.commit)
      return
    }
    if (result.gesture) {
      gestureRef.current = result.gesture
      paint(result.gesture.working)
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    if (tool === 'select') {
      selectPointerMove(event)
      return
    }
    const gesture = gestureRef.current
    if (!gesture || event.pointerId !== gesturePointerRef.current) return
    const next = toolPointerMove(gesture, pixelPos(event))
    if (next !== gesture) {
      gestureRef.current = next
      paint(next.working)
    }
  }

  function endGesture(event: PointerEvent<HTMLCanvasElement>): void {
    if (tool === 'select') {
      selectPointerUp(event)
      return
    }
    const gesture = gestureRef.current
    if (!gesture || event.pointerId !== gesturePointerRef.current) return
    gestureRef.current = null
    gesturePointerRef.current = null
    const committed = toolPointerUp(gesture, pixelPos(event))
    if (committed) {
      commitBitmap(committed)
    } else if (bitmap) {
      paint(bitmap)
    }
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1">
      {/* Barra do pedaço selecionado: flutua sobre o palco (não empurra o
          desenho ao aparecer) e é a via do tablet, onde não há teclado. */}
      {selKind === 'none' ? null : (
        <div
          ref={selectionBarRef}
          role="toolbar"
          aria-label={COPY.selection.bar}
          className="pin-panel absolute top-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 p-1 shadow-lg"
        >
          <ToolButton
            icon={Copy}
            label={COPY.selection.duplicate}
            shortcut="Ctrl+D"
            onClick={duplicateSelection}
          />
          <ToolButton
            icon={FlipHorizontal2}
            label={COPY.selection.flipH}
            onClick={() => flipSelection('h')}
          />
          <ToolButton
            icon={FlipVertical2}
            label={COPY.selection.flipV}
            onClick={() => flipSelection('v')}
          />
          <ToolButton
            icon={Trash2}
            label={COPY.selection.remove}
            shortcut="Delete"
            onClick={deleteSelection}
          />
        </div>
      )}
      {/* Centralização SEGURA: com `items-center` puro, o que passa do topo/da
          esquerda fica INALCANÇÁVEL (a rolagem não vai a negativo) — desenho
          aproximado perdia metade. `safe center` centraliza quando cabe e
          alinha no começo quando não cabe. E `min-w-0`/`min-h-0` para o palco
          ROLAR em vez de esticar o editor (o tamanho mínimo automático de um
          item flex é o do conteúdo). */}
      <div
        ref={stageRef}
        className="flex min-h-0 min-w-0 flex-1 overflow-auto p-4 [align-items:safe_center] [justify-content:safe_center]"
      >
        {/* Tamanho EXPLÍCITO (doc × zoom, como o palco do vetor): o canvas só
            muda de tamanho quando repinta (num efeito), e sem isto a área
            rolável fica com a medida velha por um quadro — a âncora do zoom
            pela rolagem media errado. */}
        <div
          className="pin-checkerboard border-2 border-pin-border shadow-inner"
          style={{ width: bitmap.width * zoom, height: bitmap.height * zoom }}
        >
          <canvas
            ref={canvasRef}
            className="pin-pixelated block"
            style={{ touchAction: 'none', imageRendering: 'pixelated' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
            // O botão direito PINTA (2ª cor): o menu do navegador não pode abrir
            // por cima do desenho.
            onContextMenu={(event) => event.preventDefault()}
            aria-label={COPY.a11y.drawArea}
            role="img"
          />
        </div>
      </div>
    </div>
  )
}
