/**
 * Tela do editor de UM asset: cria as stores (editor + sessão), liga o flush
 * do autosave em pagehide/unmount/voltar e monta o layout por tipo de asset.
 * Topbar: voltar · nome · desfazer/refazer · badge de salvo · Baixar ·
 * Usar no Estúdio (só quando o host dá o callback).
 *
 * Layout (desktop, ≥768px): ferramentas à ESQUERDA, palco no centro (flex-1) e
 * painel DIREITO consolidado (prévia + cores + animações, w-56) — embaixo, UMA
 * faixa só (quadros/peças + zoom). A cadeia min-h-0 + overflow interno fecha a
 * altura sem rolagem de página. Em tela estreita o palco domina: rail
 * horizontal em cima, paleta em linha única e prévia/animações colapsáveis.
 */
import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { COPY } from '../../core/copy'
import { assetStyle, type PintaAsset } from '../../core/project'
import { buildStudioPayload, type StudioPayload } from '../../export/studioBridge'
import { tilemapToStudioGrid } from '../../export/studioGrid'
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
import { Button, IconButton, ToolButton } from '../ui/Button'
import { ArrowLeft, ChevronDown, Download, Redo2, Rocket, Undo2 } from '../ui/icons'
import { useToast } from '../ui/Toast'
import { AnimationDetails } from './AnimationDetails'
import { CoachMarks } from './CoachMarks'
import { PintaEditorProvider, useEditor, useSession } from './editorContext'
import { PaletteBar } from './PaletteBar'
import { PixelCanvas } from './PixelCanvas'
import { PreviewPlayer } from './PreviewPlayer'
import { SpriteSheetPanel } from './SpriteSheetPanel'
import { TilemapEditor } from './TilemapEditor'
import { TileStrip } from './TileStrip'
import { ToolBar } from './ToolBar'
import { useMediaQuery } from './useMediaQuery'
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

/**
 * Coluna ESQUERDA dos kinds PIXEL (desktop): rail de ferramentas + área de
 * cores logo abaixo (como na imagem-modelo). A PaletteBar se auto-remove nos
 * kinds sem paleta (nenhum pixel), então serve sprite/cenário/peças igual.
 */
function PixelLeftColumn(): JSX.Element {
  return (
    <div className="flex min-h-0 shrink-0 flex-col gap-2 overflow-y-auto">
      <ToolBar />
      <PaletteBar />
    </div>
  )
}

/**
 * Painel DIREITO dos SPRITES (desktop): a prévia rodando + os detalhes da
 * animação selecionada (Duração/Velocidade/Repetição/Suavização). Ambos se
 * auto-removem fora de sprite animado.
 */
function SpriteRightPanel(): JSX.Element {
  return (
    <div className="flex min-h-0 w-56 shrink-0 flex-col gap-2 overflow-y-auto overflow-x-hidden">
      <PreviewPlayer />
      <AnimationDetails />
    </div>
  )
}

/**
 * Tela estreita: a prévia + os detalhes da animação viram uma seção COLAPSÁVEL
 * (fechada por padrão — o palco domina; abrir empurra in-flow, o canvas encolhe
 * via min-h-0, nada de fixed/portal por cima da tab bar do host). A faixa
 * Spritesheet fica sempre visível no rodapé.
 */
function SpritePanelDisclosure(): JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <div className="pin-panel shrink-0 p-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-2 text-sm font-bold text-pin-text transition hover:bg-pin-border/40"
      >
        {COPY.animation.panel}
        <ChevronDown
          aria-hidden="true"
          className={`size-5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <div className="flex gap-2 overflow-x-auto pt-2">
          <div className="w-44 shrink-0">
            <PreviewPlayer />
          </div>
          <div className="min-w-56 flex-1">
            <AnimationDetails />
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * A faixa do rodapé. Sprites (pixel e vetor) ganham a faixa "Spritesheet" (uma
 * linha por animação, com os quadros inline) + o zoom no cabeçalho dela. Peças
 * mantêm a tira de tiles; cenários ficam só com o zoom encostado à direita.
 */
function EditorFooter({
  asset,
  stacked = false,
}: {
  asset: PintaAsset
  stacked?: boolean
}): JSX.Element {
  const hasFrames = asset.kind === 'pixel-sprite' || asset.kind === 'vector-sprite'
  const hasTiles = asset.kind === 'tileset' || asset.kind === 'vector-tileset'
  if (hasFrames) {
    return <SpriteSheetPanel className="shrink-0" zoomSlot={<ZoomControls />} />
  }
  if (stacked) {
    return (
      <div className="flex shrink-0 flex-col gap-2">
        {hasTiles ? <TileStrip /> : null}
        <div className="flex justify-end">
          <ZoomControls />
        </div>
      </div>
    )
  }
  return (
    <div className="flex shrink-0 items-stretch gap-2">
      {hasTiles ? <TileStrip className="min-w-0 flex-1" /> : <div className="flex-1" />}
      <ZoomControls />
    </div>
  )
}

function EditorBody({ asset }: { asset: PintaAsset }): JSX.Element {
  const wide = useMediaQuery('(min-width: 768px)')
  if (
    asset.kind === 'pixel-sprite' ||
    asset.kind === 'pixel-background' ||
    asset.kind === 'tileset'
  ) {
    const isSprite = asset.kind === 'pixel-sprite'
    if (wide) {
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
          <div className="flex min-h-0 flex-1 items-stretch gap-2">
            <PixelLeftColumn />
            <PixelCanvas />
            {isSprite ? <SpriteRightPanel /> : null}
          </div>
          <EditorFooter asset={asset} />
        </div>
      )
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
        <ToolBar orientation="horizontal" />
        <PixelCanvas />
        <PaletteBar layout="row" />
        {isSprite ? <SpritePanelDisclosure /> : null}
        <EditorFooter asset={asset} stacked />
      </div>
    )
  }
  if (asset.kind === 'tilemap') {
    return <TilemapEditor />
  }
  // Kinds vetoriais: o MESMO editor de shapes; personagem ganha o painel de
  // prévia/detalhes + a faixa Spritesheet (espelho do pixel), peças ganham a
  // tira de tiles. As cores do vetor vivem dentro do próprio VectorEditor.
  const isVectorSprite = asset.kind === 'vector-sprite'
  if (wide) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
        <div className="flex min-h-0 flex-1 items-stretch gap-2">
          <VectorEditor />
          {isVectorSprite ? <SpriteRightPanel /> : null}
        </div>
        <EditorFooter asset={asset} />
      </div>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
      <VectorEditor />
      {isVectorSprite ? <SpritePanelDisclosure /> : null}
      <EditorFooter asset={asset} stacked />
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
  async function exportForStudio(): Promise<StudioPayload | null> {
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
        // Animações/tiles do Pinta viajam junto → o Estúdio oferece o seletor por nome.
        ...(payload.sprite ? { sprite: payload.sprite } : {}),
        ...(payload.tileset ? { tileset: payload.tileset } : {}),
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

  /**
   * Mapa NÃO é uma figura: o "Usar no Estúdio" copia a GRADE jogável (o que o
   * bloco de mapa do Estúdio consome), não um PNG achatado. A imagem do mapa
   * continua no "Baixar".
   */
  async function handleSendTilemap(): Promise<void> {
    if (asset.kind !== 'tilemap') return
    try {
      await navigator.clipboard.writeText(tilemapToStudioGrid(asset))
      showToast(COPY.sendToStudio.mapGridCopied)
    } catch {
      showToast(COPY.sendToStudio.mapGridError)
    }
  }

  const isTilemap = asset.kind === 'tilemap'

  return (
    <header className="flex flex-wrap items-center gap-2 border-b-2 border-pin-border bg-pin-surface px-3 py-2">
      <ToolButton icon={ArrowLeft} label={COPY.editor.back} onClick={onBack} />
      <span aria-hidden="true" className="text-xl">
        {kind.emoji}
      </span>
      <span className="pin-display mr-2 truncate text-lg" title={asset.name}>
        {asset.name}
      </span>
      <IconButton
        aria-label={COPY.editor.undo}
        title={`${COPY.editor.undo} (Ctrl+Z)`}
        disabled={!canUndo}
        onClick={() => editorState.undo()}
      >
        <Undo2 aria-hidden="true" className="size-5" />
      </IconButton>
      <IconButton
        aria-label={COPY.editor.redo}
        title={`${COPY.editor.redo} (Ctrl+Y)`}
        disabled={!canRedo}
        onClick={() => editorState.redo()}
      >
        <Redo2 aria-hidden="true" className="size-5" />
      </IconButton>
      <SaveBadge />
      <div className="ml-auto flex items-center gap-2">
        <Button onClick={() => setExportOpen(true)}>
          <Download aria-hidden="true" className="size-4" />
          {COPY.editor.download}
        </Button>
        {adapter.sendToStudio ? (
          <Button
            variant="primary"
            disabled={sending}
            onClick={() => void (isTilemap ? handleSendTilemap() : handleSendToStudio())}
          >
            <Rocket aria-hidden="true" className="size-4" />
            {sending ? COPY.sendToStudio.sending : COPY.editor.sendToStudio}
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

  // Atalhos de desfazer/refazer (07/2026): Ctrl/Cmd+Z desfaz; Ctrl/Cmd+Shift+Z
  // e Ctrl/Cmd+Y refazem. Ignora campos de texto (mesmo guard do VectorEditor);
  // undo/redo são no-op sem histórico, então não precisa checar canUndo/canRedo.
  useEffect(() => {
    if (!stores) return
    const editorStore = stores.editor
    function onKeyDown(event: KeyboardEvent): void {
      if (!(event.ctrlKey || event.metaKey)) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        editorStore.getState().undo()
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        editorStore.getState().redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
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
  // Dicas de 1º uso por ESTILO (pixel/vetor/mapa).
  const coach = assetStyle(asset.kind) ?? 'map'
  const coachCopy = COPY.coach[coach]
  return (
    <>
      <CoachMarks id={coach} title={coachCopy.title} tips={coachCopy.tips} />
      <EditorBody asset={asset} />
    </>
  )
}
