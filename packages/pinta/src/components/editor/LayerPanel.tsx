/**
 * Painel de CAMADAS do editor de pixel (cenário e personagem animado): header
 * com o título, a lixeira (apaga a camada ativa, com confirmação) e o "+" azul;
 * embaixo, uma linha por camada com olho (mostrar/esconder), miniatura do
 * desenho, nome e alça de arrastar.
 *
 * A lista aparece INVERTIDA em relação ao modelo: `layers[0]` é o FUNDO, e no
 * painel a camada de cima fica em cima (é o que a criança espera ao olhar o
 * desenho). Reordenar arrasta pela alça; a alça focada também aceita ↑/↓, que
 * é o caminho por teclado.
 *
 * Renomear: clicar no nome da camada JÁ ATIVA abre o diálogo (clicar numa
 * camada inativa apenas seleciona — um toque, uma coisa só).
 */
import { clsx } from 'clsx'
import type { JSX, PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { activeCelsOf } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import {
  isPixelLayeredKind,
  PINTA_LIMITS,
  type PintaAsset,
  type PintaPixelLayer,
  resolveAssetPalette,
} from '../../core/project'
import { shortcut } from '../../core/shortcuts'
import {
  addPixelLayer,
  layerIndexOf,
  movePixelLayer,
  removePixelLayer,
  renamePixelLayer,
  togglePixelLayerLocked,
  togglePixelLayerVisible,
} from '../../pixel/layers'
import { paintBitmap } from '../../pixel/render'
import { Button, ToolButton } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Eye, EyeOff, GripVertical, Lock, LockOpen, Plus, Trash2 } from '../ui/icons'
import { Panel } from '../ui/Panel'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores, useSession } from './editorContext'
import { addPointerDragListeners } from './pointerDrag'
import { useActionShortcuts } from './useActionShortcuts'

/** Miniatura do desenho da camada no quadro atual. */
function LayerThumb({
  bitmap,
  colors,
}: {
  bitmap: { width: number; height: number; data: Uint8Array } | null
  colors: readonly string[]
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && bitmap) paintBitmap(canvas, bitmap, colors)
  }, [bitmap, colors])
  return (
    <span
      aria-hidden="true"
      className="pin-checkerboard size-8 shrink-0 overflow-hidden rounded-md border-2 border-pin-border"
    >
      <canvas
        ref={canvasRef}
        className="pin-pixelated h-full w-full object-contain"
        style={{ imageRendering: 'pixelated' }}
      />
    </span>
  )
}

export function LayerPanel(): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const layerId = useSession((state) => state.layerId)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  /** Camada sendo arrastada (id) — só para o feedback visual. */
  const [dragging, setDragging] = useState<string | null>(null)
  const rowsRef = useRef<HTMLUListElement | null>(null)
  const dragCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => () => dragCleanupRef.current?.(), [])

  // Shift+N = nova camada (Aseprite). `handleAdd` lê o estado vivo e é içada.
  useActionShortcuts([
    {
      combo: shortcut('addLayer'),
      run: () => handleAdd(),
      when: () => isPixelLayeredKind(editor.getState().asset),
    },
  ])

  if (!isPixelLayeredKind(asset)) return null

  // ⚠️ O narrowing do guard acima NÃO atravessa as closures abaixo (gotcha do
  // pacote): capture o asset já estreitado numa const própria.
  const layered = asset
  const colors = resolveAssetPalette(layered)
  const cels = activeCelsOf(layered, { animationId, frameIndex, layerId })
  const activeIndex = layerIndexOf(layered, layerId)
  const activeLayer = layered.layers[activeIndex] ?? null
  // De cima para baixo, como a criança vê o desenho.
  const rows = layered.layers.map((layer, index) => ({ layer, index })).reverse()

  function commitLayers(next: PintaAsset, changed: boolean): void {
    if (!changed) return
    editor.getState().commit(next)
  }

  function handleAdd(): void {
    const state = editor.getState()
    if (!isPixelLayeredKind(state.asset)) return
    const next = addPixelLayer(state.asset)
    if (next === state.asset) {
      showToast(COPY.layers.limit)
      return
    }
    state.commit(next)
    // A nova entra no topo e já vira a ativa (é onde a criança vai desenhar).
    session.getState().selectLayer(next.layers[next.layers.length - 1]?.id ?? null)
  }

  function handleTrash(): void {
    if (layered.layers.length <= 1) {
      showToast(COPY.layers.lastOne)
      return
    }
    // Trancada não se apaga: destrancar primeiro é a decisão explícita.
    if (activeLayer?.locked === true) {
      showToast(COPY.layers.lockedDelete)
      return
    }
    setConfirmOpen(true)
  }

  function confirmRemove(): void {
    setConfirmOpen(false)
    const state = editor.getState()
    if (!isPixelLayeredKind(state.asset) || !activeLayer) return
    const next = removePixelLayer(state.asset, activeLayer.id)
    if (next === state.asset) return
    state.commit(next)
    session.getState().selectLayer(next.layers[next.layers.length - 1]?.id ?? null)
  }

  function handleRowClick(layer: PintaPixelLayer): void {
    // Camada inativa: seleciona. Camada ativa: abre o renomear.
    if (layer.id !== activeLayer?.id) {
      session.getState().selectLayer(layer.id)
      return
    }
    setDraftName(layer.name)
    setRenameOpen(true)
  }

  function confirmRename(): void {
    const state = editor.getState()
    if (!isPixelLayeredKind(state.asset) || !activeLayer) return
    const next = renamePixelLayer(state.asset, activeLayer.id, draftName)
    commitLayers(next, next !== state.asset)
    setRenameOpen(false)
  }

  function toggleVisible(layer: PintaPixelLayer): void {
    const state = editor.getState()
    if (!isPixelLayeredKind(state.asset)) return
    const next = togglePixelLayerVisible(state.asset, layer.id)
    commitLayers(next, next !== state.asset)
  }

  function toggleLocked(layer: PintaPixelLayer): void {
    const state = editor.getState()
    if (!isPixelLayeredKind(state.asset)) return
    const next = togglePixelLayerLocked(state.asset, layer.id)
    commitLayers(next, next !== state.asset)
  }

  /** Move a camada `delta` posições no EMPILHAMENTO (+1 = para cima). */
  function move(layer: PintaPixelLayer, delta: number): void {
    const state = editor.getState()
    if (!isPixelLayeredKind(state.asset)) return
    const from = state.asset.layers.findIndex((l) => l.id === layer.id)
    const next = movePixelLayer(state.asset, layer.id, from + delta)
    commitLayers(next, next !== state.asset)
  }

  /**
   * Arrastar pela alça: acompanha o dedo/ponteiro e, ao passar do meio da linha
   * vizinha, troca de posição na hora (sem fantasma flutuante — a lista curta
   * torna o movimento direto legível).
   */
  function handleDragStart(layer: PintaPixelLayer, event: ReactPointerEvent<HTMLElement>): void {
    event.preventDefault()
    dragCleanupRef.current?.()
    setDragging(layer.id)
    const handle = event.currentTarget
    handle.setPointerCapture?.(event.pointerId)

    const onMove = (moveEvent: PointerEvent): void => {
      const list = rowsRef.current
      if (!list) return
      const items = Array.from(list.querySelectorAll<HTMLLIElement>('li[data-layer]'))
      const overIndex = items.findIndex((item) => {
        const rect = item.getBoundingClientRect()
        return moveEvent.clientY >= rect.top && moveEvent.clientY <= rect.bottom
      })
      const over = items[overIndex]
      const overId = over?.dataset.layer
      if (!overId || overId === layer.id) return
      const state = editor.getState()
      if (!isPixelLayeredKind(state.asset)) return
      const target = state.asset.layers.findIndex((l) => l.id === overId)
      const next = movePixelLayer(state.asset, layer.id, target)
      if (next !== state.asset) state.commit(next)
    }
    const onUp = (): void => {
      setDragging(null)
      dragCleanupRef.current = null
    }
    dragCleanupRef.current = addPointerDragListeners(document, { onMove, onEnd: onUp })
  }

  return (
    <Panel
      title={COPY.layers.title}
      className="w-68"
      actions={
        <>
          <ToolButton
            icon={Trash2}
            label={COPY.layers.remove}
            onClick={handleTrash}
            aria-disabled={layered.layers.length <= 1}
            className={layered.layers.length <= 1 ? 'opacity-40' : undefined}
          />
          <button
            type="button"
            aria-label={COPY.layers.add}
            title={COPY.layers.add}
            onClick={handleAdd}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-pin-accent text-pin-accent-fg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent"
          >
            <Plus aria-hidden="true" className="size-5" />
          </button>
        </>
      }
    >
      <ul
        ref={rowsRef}
        className="flex max-h-48 flex-col gap-1 overflow-y-auto overscroll-contain p-0.5"
      >
        {rows.map(({ layer, index }) => {
          const active = layer.id === activeLayer?.id
          return (
            <li
              key={layer.id}
              data-layer={layer.id}
              className={clsx(
                'flex items-center gap-1 rounded-xl border-2 pr-1 transition',
                active ? 'border-pin-accent' : 'border-transparent',
                dragging === layer.id && 'opacity-60',
              )}
            >
              <ToolButton
                icon={layer.visible ? Eye : EyeOff}
                label={`${layer.visible ? COPY.layers.hide : COPY.layers.show}: ${layer.name}`}
                onClick={() => toggleVisible(layer)}
              />
              <ToolButton
                icon={layer.locked === true ? Lock : LockOpen}
                label={`${layer.locked === true ? COPY.layers.unlock : COPY.layers.lock}: ${layer.name}`}
                onClick={() => toggleLocked(layer)}
              />
              <button
                type="button"
                aria-pressed={active}
                onClick={() => handleRowClick(layer)}
                title={active ? COPY.layers.rename : layer.name}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-left transition hover:bg-pin-border/40"
              >
                <LayerThumb bitmap={cels?.[index] ?? null} colors={colors} />
                <span
                  className={clsx(
                    'min-w-0 flex-1 truncate text-sm font-bold',
                    layer.visible ? 'text-pin-text' : 'text-pin-muted',
                  )}
                >
                  {layer.name}
                </span>
              </button>
              <button
                type="button"
                aria-label={`${COPY.layers.reorder}: ${layer.name}`}
                title={COPY.layers.reorder}
                onPointerDown={(event) => handleDragStart(layer, event)}
                onKeyDown={(event) => {
                  // Teclado é a via acessível do arrastar.
                  if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    move(layer, 1)
                  } else if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    move(layer, -1)
                  }
                }}
                className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-pin-muted transition hover:bg-pin-border/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent"
              >
                <GripVertical aria-hidden="true" className="size-5" />
              </button>
            </li>
          )
        })}
      </ul>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={COPY.layers.removeTitle}
      >
        <p className="text-pin-text">{COPY.layers.removeBody}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            {COPY.gallery.cancel}
          </Button>
          <Button variant="danger" onClick={confirmRemove}>
            {COPY.layers.removeConfirm}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title={COPY.layers.renameTitle}
      >
        <label className="flex flex-col gap-1 text-sm font-bold text-pin-muted">
          {COPY.layers.nameLabel}
          <input
            type="text"
            name="pinta-layer-name"
            autoComplete="off"
            value={draftName}
            maxLength={PINTA_LIMITS.maxAnimationNameChars}
            placeholder={COPY.layers.namePlaceholder}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') confirmRename()
            }}
            className="min-h-11 rounded-xl border-2 border-pin-border bg-pin-bg px-3 text-base font-normal text-pin-text"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRenameOpen(false)}>
            {COPY.gallery.cancel}
          </Button>
          <Button variant="primary" onClick={confirmRename}>
            {COPY.layers.save}
          </Button>
        </div>
      </Dialog>
    </Panel>
  )
}
