/**
 * Tela do editor de UM asset: cria as stores (editor + sessão), liga o flush
 * do autosave em pagehide/unmount/voltar e monta o layout por tipo de asset.
 * Topbar: ← voltar · nome · desfazer/refazer · badge de salvo · Baixar ·
 * 🚀 Usar no Estúdio (só quando o host dá o callback).
 */
import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { activeBitmapOf } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import type { PintaAsset } from '../../core/project'
import { bitmapToPngDataUrl } from '../../export/png'
import { packSpritesheet, spritesheetPngDataUrl } from '../../export/spritesheet'
import { createEditorStore, type PintaEditorStore } from '../../state/editorStore'
import { persistAsset } from '../../state/persistence'
import { createSessionStore, type PintaSessionStore } from '../../state/sessionStore'
import { packTileset, tilesetPngDataUrl } from '../../tiles/packTileset'
import { tilemapPngDataUrl } from '../../tiles/renderTilemap'
import { vectorPngDataUrl } from '../../vector/rasterize'
import { usePintaApp } from '../appContext'
import { ExportDialog } from '../export/ExportDialog'
import { Button, IconButton } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { AnimationList } from './AnimationList'
import { PintaEditorProvider, useEditor, useSession } from './editorContext'
import { FrameStrip } from './FrameStrip'
import { PaletteBar } from './PaletteBar'
import { PixelCanvas } from './PixelCanvas'
import { PreviewPlayer } from './PreviewPlayer'
import { TilemapEditor } from './TilemapEditor'
import { TileStrip } from './TileStrip'
import { ToolBar } from './ToolBar'
import { VectorEditor } from './VectorEditor'
import { ZoomControls } from './ZoomControls'

function SaveBadge(): JSX.Element {
  const saveState = useEditor((state) => state.saveState)
  const label =
    saveState === 'saved'
      ? COPY.editor.saved
      : saveState === 'saving'
        ? COPY.editor.saving
        : COPY.editor.saveError
  const tone =
    saveState === 'saved'
      ? 'text-pin-ok'
      : saveState === 'saving'
        ? 'text-pin-muted'
        : 'text-pin-danger'
  return <span className={`text-sm font-bold ${tone}`}>{label}</span>
}

function EditorBody({ asset }: { asset: PintaAsset }): JSX.Element {
  if (
    asset.kind === 'pixel-sprite' ||
    asset.kind === 'pixel-background' ||
    asset.kind === 'tileset'
  ) {
    const isSprite = asset.kind === 'pixel-sprite'
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="flex min-h-0 flex-1 items-stretch gap-3">
          <ToolBar />
          <PixelCanvas />
          {isSprite ? (
            // Coluna direita (layout MakeCode): prévia RODANDO + animações.
            <div className="flex w-48 shrink-0 flex-col gap-3 overflow-y-auto">
              <PreviewPlayer />
              <AnimationList />
            </div>
          ) : null}
        </div>
        {isSprite ? <FrameStrip /> : null}
        {asset.kind === 'tileset' ? <TileStrip /> : null}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <PaletteBar />
          <ZoomControls />
        </div>
      </div>
    )
  }
  if (asset.kind === 'tilemap') {
    return <TilemapEditor />
  }
  return <VectorEditor />
}

function EditorTopbar({ onBack }: { onBack: () => void }): JSX.Element {
  const { adapter, gallery } = usePintaApp()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const canUndo = useEditor((state) => state.canUndo)
  const canRedo = useEditor((state) => state.canRedo)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const editorState = useEditor((state) => state)
  const [sending, setSending] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const kind = COPY.kinds[asset.kind]
  const paletteId = asset.kind === 'tilemap' || asset.kind === 'vector' ? 'arcade' : asset.paletteId

  /**
   * O que atravessa a ponte "Usar no Estúdio" (PNG achatado na v1): sprite →
   * a FOLHA inteira (a criança usa os from/to da receita); tileset → a FOLHA
   * de peças (é a imagem que o bloco de tilemap carrega); tilemap → o mapa
   * ACHATADO como imagem; vetorial → rasterizado; demais → o bitmap ativo.
   */
  async function exportForStudio(): Promise<{
    dataUrl: string
    width: number
    height: number
  } | null> {
    if (asset.kind === 'vector') {
      const dataUrl = await vectorPngDataUrl(asset)
      if (!dataUrl) return null
      return { dataUrl, width: asset.width, height: asset.height }
    }
    return exportForStudioSync()
  }

  function exportForStudioSync(): { dataUrl: string; width: number; height: number } | null {
    if (asset.kind === 'pixel-sprite') {
      const pack = packSpritesheet(asset)
      const dataUrl = spritesheetPngDataUrl(asset, pack)
      if (!dataUrl) return null
      return {
        dataUrl,
        width: pack.columns * pack.frameWidth,
        height: pack.rows * pack.frameHeight,
      }
    }
    if (asset.kind === 'tileset') {
      const pack = packTileset(asset)
      const dataUrl = tilesetPngDataUrl(asset)
      if (!dataUrl) return null
      return {
        dataUrl,
        width: pack.columns * pack.tileSize,
        height: pack.rows * pack.tileSize,
      }
    }
    if (asset.kind === 'tilemap') {
      const tileset = gallery
        .getState()
        .assets.find((a) => a.kind === 'tileset' && a.id === asset.tilesetId)
      if (tileset?.kind !== 'tileset') return null
      const dataUrl = tilemapPngDataUrl(asset, tileset)
      if (!dataUrl) return null
      return {
        dataUrl,
        width: asset.cols * tileset.tileSize,
        height: asset.rows * tileset.tileSize,
      }
    }
    const bitmap = activeBitmapOf(asset, { animationId, frameIndex })
    if (!bitmap) return null
    const dataUrl = bitmapToPngDataUrl(bitmap, paletteId)
    if (!dataUrl) return null
    return { dataUrl, width: bitmap.width, height: bitmap.height }
  }

  async function handleSendToStudio(): Promise<void> {
    if (!adapter.sendToStudio || sending) return
    const payload = await exportForStudio()
    if (!payload) {
      showToast(COPY.sendToStudio.error)
      return
    }
    // Teto de UM asset no Studio — manter em sincronia com
    // MAX_ASSET_DATA_URL_CHARS de packages/studio/src/core/project.ts. Validar
    // AQUI dá a mensagem gentil antes do fail-soft genérico da ponte.
    const STUDIO_MAX_ASSET_CHARS = 800_000
    if (payload.dataUrl.length > STUDIO_MAX_ASSET_CHARS) {
      showToast(COPY.sendToStudio.tooBig)
      return
    }
    setSending(true)
    try {
      const result = await adapter.sendToStudio({
        id: asset.id,
        name: asset.name,
        dataUrl: payload.dataUrl,
        width: payload.width,
        height: payload.height,
      })
      showToast(
        result.ok
          ? adapter.studioOwned
            ? COPY.sendToStudio.success
            : COPY.sendToStudio.successLocked
          : (result.error ?? COPY.sendToStudio.error),
      )
    } catch {
      showToast(COPY.sendToStudio.error)
    } finally {
      setSending(false)
    }
  }

  return (
    <header className="flex flex-wrap items-center gap-2 border-b-2 border-pin-border bg-pin-surface px-3 py-2">
      <IconButton aria-label={COPY.editor.back} title={COPY.editor.back} onClick={onBack}>
        <span aria-hidden="true">←</span>
      </IconButton>
      <span aria-hidden="true" className="text-xl">
        {kind.emoji}
      </span>
      <span className="mr-2 truncate text-lg font-bold" title={asset.name}>
        {asset.name}
      </span>
      <IconButton
        aria-label={COPY.editor.undo}
        title={COPY.editor.undo}
        disabled={!canUndo}
        onClick={() => editorState.undo()}
      >
        <span aria-hidden="true">↩️</span>
      </IconButton>
      <IconButton
        aria-label={COPY.editor.redo}
        title={COPY.editor.redo}
        disabled={!canRedo}
        onClick={() => editorState.redo()}
      >
        <span aria-hidden="true">↪️</span>
      </IconButton>
      <SaveBadge />
      <div className="ml-auto flex items-center gap-2">
        <Button onClick={() => setExportOpen(true)}>⬇ {COPY.editor.download}</Button>
        {adapter.sendToStudio ? (
          <Button variant="primary" disabled={sending} onClick={() => void handleSendToStudio()}>
            🚀 {sending ? COPY.sendToStudio.sending : COPY.editor.sendToStudio}
          </Button>
        ) : null}
      </div>
      <ExportDialog
        open={exportOpen}
        asset={asset}
        frameRef={{ animationId, frameIndex }}
        onClose={() => setExportOpen(false)}
      />
    </header>
  )
}

export function EditorScreen({ assetId }: { assetId: string }): JSX.Element | null {
  const { gallery, closeEditor } = usePintaApp()
  const [stores] = useState<{ editor: PintaEditorStore; session: PintaSessionStore } | null>(() => {
    const asset = gallery.getState().assets.find((a) => a.id === assetId)
    if (!asset) return null
    return {
      editor: createEditorStore({
        asset,
        persist: persistAsset,
        onSaved: (saved) => gallery.getState().absorb(saved),
      }),
      session: createSessionStore(),
    }
  })

  // Asset sumiu (apagado em outra aba / id inválido)? Volta pra galeria.
  useEffect(() => {
    if (!stores) closeEditor()
  }, [stores, closeEditor])

  // Flush do autosave em pagehide e no desmonte (voltar/troca de tela).
  useEffect(() => {
    if (!stores) return
    const flush = (): void => {
      void stores.editor.getState().flush()
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [stores])

  if (!stores) return null

  return (
    <PintaEditorProvider value={stores}>
      <div className="flex min-h-0 flex-1 flex-col">
        <EditorTopbar
          onBack={() => {
            void stores.editor.getState().flush()
            closeEditor()
          }}
        />
        <EditorBodyBound />
      </div>
    </PintaEditorProvider>
  )
}

function EditorBodyBound(): JSX.Element {
  const asset = useEditor((state) => state.asset)
  return <EditorBody asset={asset} />
}
