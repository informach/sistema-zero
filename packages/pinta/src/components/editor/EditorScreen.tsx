/**
 * Tela do editor de UM asset: cria as stores (editor + sessão), liga o flush
 * do autosave em pagehide/unmount/voltar e monta o layout por tipo de asset.
 * Topbar: ← voltar · nome · desfazer/refazer · badge de salvo · Baixar ·
 * 🚀 Usar no Estúdio (só quando o host dá o callback).
 */
import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { COPY } from '../../core/copy'
import { assetStyle, type PintaAsset } from '../../core/project'
import { buildStudioPayload } from '../../export/studioBridge'
import { createEditorStore, type PintaEditorStore } from '../../state/editorStore'
import { persistAsset } from '../../state/persistence'
import {
  createSessionStore,
  type PintaSessionState,
  type PintaSessionStore,
  TILEMAP_ZOOM_LEVELS,
  VECTOR_ZOOM_LEVELS,
} from '../../state/sessionStore'
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
  // Kinds vetoriais: o MESMO editor de shapes; personagem ganha a coluna de
  // animações + tira de quadros (espelho do pixel), peças ganham a tira de tiles.
  const isVectorSprite = asset.kind === 'vector-sprite'
  const isVectorTileset = asset.kind === 'vector-tileset'
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
      <div className="flex min-h-0 flex-1 items-stretch gap-3">
        <VectorEditor />
        {isVectorSprite ? (
          <div className="flex w-48 shrink-0 flex-col gap-3 overflow-y-auto">
            <PreviewPlayer />
            <AnimationList />
          </div>
        ) : null}
      </div>
      {isVectorSprite ? <FrameStrip /> : null}
      {isVectorTileset ? <TileStrip /> : null}
    </div>
  )
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

  /**
   * O que atravessa a ponte "Usar no Estúdio" (PNG achatado na v1): montado em
   * `export/studioBridge.ts` (sprites enviam a FOLHA inteira; tilesets a folha
   * de peças; tilemap o mapa achatado; vetoriais rasterizam).
   */
  async function exportForStudio(): Promise<{
    dataUrl: string
    width: number
    height: number
  } | null> {
    return buildStudioPayload(
      asset,
      (id) => gallery.getState().assets.find((a) => a.id === id) ?? null,
      { animationId, frameIndex },
    )
  }

  async function handleSendToStudio(): Promise<void> {
    if (!adapter.sendToStudio || sending) return
    // A trava arma ANTES da rasterização (async, pode levar centenas de ms) —
    // senão um duplo clique dispara dois exports + dois envios concorrentes.
    setSending(true)
    const payload = await exportForStudio().catch(() => null)
    if (!payload) {
      setSending(false)
      showToast(COPY.sendToStudio.error)
      return
    }
    // Teto de UM asset no Studio — manter em sincronia com
    // MAX_ASSET_DATA_URL_CHARS de packages/studio/src/core/project.ts. Validar
    // AQUI dá a mensagem gentil antes do fail-soft genérico da ponte.
    const STUDIO_MAX_ASSET_CHARS = 800_000
    if (payload.dataUrl.length > STUDIO_MAX_ASSET_CHARS) {
      setSending(false)
      showToast(COPY.sendToStudio.tooBig)
      return
    }
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

/**
 * Defaults da sessão por tipo de editor: o vetor usa a escala de zoom própria
 * (o palco desenha em px de documento) e começa num zoom confortável para o
 * tamanho; o mapa usa níveis onde o fator É a escala real da célula.
 */
function sessionDefaultsFor(asset: PintaAsset): Partial<PintaSessionState> {
  if (asset.kind === 'tilemap') return { zoom: 2, zoomLevels: TILEMAP_ZOOM_LEVELS }
  if (assetStyle(asset.kind) !== 'vector') return {}
  const docSize =
    asset.kind === 'vector-sprite'
      ? Math.max(asset.frameWidth, asset.frameHeight)
      : asset.kind === 'vector-tileset'
        ? asset.tileSize
        : asset.kind === 'vector-background'
          ? Math.max(asset.width, asset.height)
          : 0
  const zoom = docSize <= 48 ? 8 : docSize <= 160 ? 4 : 1
  return { zoom, zoomLevels: VECTOR_ZOOM_LEVELS }
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
      session: createSessionStore(sessionDefaultsFor(asset)),
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
