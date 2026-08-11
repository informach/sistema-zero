/**
 * Tela do editor de UM asset: cria as stores (editor + sessão), liga o flush
 * do autosave em pagehide/unmount/voltar e monta o layout por tipo de asset.
 * Topbar: voltar · nome · desfazer/refazer · badge de salvo · Baixar ·
 * Usar no Estúdio (só quando o host dá o callback).
 *
 * Layout (desktop, ≥768px): coluna ESQUERDA de altura inteira (ferramentas em
 * cima, cores embaixo), e à direita dela uma coluna com o palco + a prévia lado
 * a lado em cima e a faixa (quadros/peças + zoom) encostada EMBAIXO,
 * atravessando as duas. A faixa NÃO é um rodapé de tudo: ali ela roubava altura
 * da coluna da esquerda e era o que forçava a criança a rolar as ferramentas.
 * A cadeia min-h-0 + overflow interno fecha a altura sem rolagem de página. Em
 * tela estreita o palco domina: rail horizontal em cima, paleta em linha única
 * e prévia/animações colapsáveis.
 */
import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { COPY } from '../../core/copy'
import { isTextEntryTarget } from '../../core/dom'
import { assetStyle, type PintaAsset } from '../../core/project'
import {
  buildStudioPayload,
  type StudioPayload,
  validateStudioPayloadSize,
} from '../../export/studioBridge'
import { createEditorStore, type PintaEditorStore } from '../../state/editorStore'
import { persistAssets } from '../../state/persistence'
import {
  createSessionStore,
  type PintaSessionState,
  type PintaSessionStore,
  TILEMAP_ZOOM_LEVELS,
  VECTOR_ZOOM_LEVELS,
} from '../../state/sessionStore'
import { updateTaskProgress } from '../../state/taskProgress'
import { usePintaApp } from '../appContext'
import { ExportDialog } from '../export/ExportDialog'
import { Button, IconButton, ToolButton } from '../ui/Button'
import { ArrowLeft, ChevronDown, Download, Gamepad2, Redo2, Rocket, Undo2 } from '../ui/icons'
import { useToast } from '../ui/Toast'
import { CoachMarks } from './CoachMarks'
import { PintaEditorProvider, useEditor, useSession } from './editorContext'
import { LayerPanel } from './LayerPanel'
import { PaletteBar } from './PaletteBar'
import { PixelCanvas } from './PixelCanvas'
import { PreviewPlayer } from './PreviewPlayer'
import { SpriteSheetPanel } from './SpriteSheetPanel'
import { TilemapEditor } from './TilemapEditor'
import { TileStrip } from './TileStrip'
import { ToolBar } from './ToolBar'
import { useMediaQuery } from './useMediaQuery'
import { useStudioResync } from './useStudioResync'
import { VectorEditorScope } from './vector/VectorEditorScope'
import { VectorPanelsDisclosure, VectorRightColumn } from './vector/VectorRightColumn'
import { VectorSelectionBar } from './vector/VectorSelectionBar'
import { VectorStage } from './vector/VectorStage'
import { VectorToolbox } from './vector/VectorToolbox'
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
  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`text-sm font-bold ${tone}`}
    >
      {label}
    </span>
  )
}

/** Coluna ESQUERDA dos kinds PIXEL (desktop): só o rail de ferramentas. */
function PixelLeftColumn(): JSX.Element {
  return (
    <div className="flex min-h-0 shrink-0 flex-col gap-2 overflow-y-auto">
      <ToolBar />
    </div>
  )
}

/**
 * Coluna ESQUERDA dos kinds VETORIAIS (desktop): gêmea da do pixel. O wrapper
 * não é decoração: é ele quem recebe o `stretch` da linha do palco. Sem ele a
 * caixa (que é o `.pin-panel` visível) esticava até a altura do palco e o
 * `flex-1` do miolo virava um vão branco acima das duas cores.
 */
function VectorLeftColumn(): JSX.Element {
  return (
    <div className="flex min-h-0 shrink-0 flex-col gap-2 overflow-y-auto">
      <VectorToolbox />
    </div>
  )
}

/**
 * Coluna DIREITA dos kinds de pixel (desktop): prévia (só sprite animado — ela
 * se auto-remove nos demais) → CAMADAS → CORES, todos na mesma largura
 * (`w-68`). Os três rolam JUNTOS por dentro da coluna; os detalhes da animação
 * vivem numa modal (engrenagem da prévia).
 */
function PixelRightColumn(): JSX.Element {
  return (
    <div className="flex min-h-0 w-68 shrink-0 flex-col gap-2 overflow-x-hidden overflow-y-auto">
      <PreviewPlayer />
      <LayerPanel />
      <PaletteBar />
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
          <LayerPanel />
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
    if (wide) {
      return (
        // A faixa de baixo (Spritesheet/peças + zoom) atravessa a LARGURA
        // INTEIRA. Isso só cabe porque as cores saíram da coluna esquerda (que
        // agora tem só as ferramentas): era a soma ferramentas+cores que não
        // cabia em 1366×768 quando a faixa era um rodapé de tudo.
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
          <div className="flex min-h-0 flex-1 items-stretch gap-2">
            <PixelLeftColumn />
            <PixelCanvas />
            {/* A coluna existe também no CENÁRIO (que não tem prévia) porque é
                onde moram camadas e cores; peças não têm camadas. */}
            {asset.kind === 'tileset' ? <PaletteBar /> : <PixelRightColumn />}
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
        {asset.kind === 'tileset' ? null : <SpritePanelDisclosure />}
        <EditorFooter asset={asset} stacked />
      </div>
    )
  }
  if (asset.kind === 'tilemap') {
    return <TilemapEditor />
  }
  // Kinds vetoriais: o MESMO arranjo do pixel — caixa de ferramentas à
  // esquerda, palco no meio, UMA coluna direita `w-68` (prévia → cores →
  // aparência) e a faixa (Spritesheet/peças + zoom) em LARGURA TOTAL embaixo.
  const isVectorSprite = asset.kind === 'vector-sprite'
  if (wide) {
    // O escopo envolve TUDO (não só a linha do palco) para a faixa da seleção
    // poder nascer colada na barra de cima. Ele é só um Provider, não vira DOM.
    return (
      <VectorEditorScope>
        <VectorSelectionBar />
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
          <div className="flex min-h-0 flex-1 items-stretch gap-2">
            <VectorLeftColumn />
            <VectorStage />
            <VectorRightColumn />
          </div>
          <EditorFooter asset={asset} />
        </div>
      </VectorEditorScope>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
      <VectorEditorScope>
        <VectorToolbox orientation="horizontal" />
        <VectorStage />
        <VectorPanelsDisclosure />
      </VectorEditorScope>
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
  const resynced = useStudioResync({
    asset,
    animationId,
    frameIndex,
    gallery,
    send: adapter.resyncToStudio,
  })

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
    // Tetos do Estúdio (asset e folha do mapa) — validar AQUI dá a mensagem
    // gentil antes do fail-soft genérico da ponte.
    if (validateStudioPayloadSize(payload) !== 'ok') {
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
        // Animações/tiles/mapa do Pinta viajam junto → o Estúdio oferece o
        // seletor por nome e o bloco "Criar mapa do meu desenho".
        ...(payload.sprite ? { sprite: payload.sprite } : {}),
        ...(payload.tileset ? { tileset: payload.tileset } : {}),
        ...(payload.tilemap ? { tilemap: payload.tilemap } : {}),
      })
      let taskProgressSaved = true
      if (result.ok && adapter.taskSession) {
        taskProgressSaved = await updateTaskProgress(adapter.taskSession, {
          ...(adapter.taskSession.progress.status === 'planned'
            ? { status: 'in_progress' as const }
            : {}),
          outputRef: {
            kind: 'pinta_asset',
            assetId: asset.id,
            assetName: result.name ?? asset.name,
            usedInStudioAt: new Date().toISOString(),
          },
        })
      }
      const successCopy = payload.tilemap
        ? adapter.studioOwned
          ? COPY.sendToStudio.mapSuccess
          : COPY.sendToStudio.mapSuccessLocked
        : adapter.studioOwned
          ? COPY.sendToStudio.success
          : COPY.sendToStudio.successLocked
      showToast(
        result.ok
          ? taskProgressSaved
            ? successCopy
            : COPY.editor.taskStudioProgressError
          : (result.error ?? COPY.sendToStudio.error),
      )
    } catch {
      showToast(COPY.sendToStudio.error)
    } finally {
      setSending(false)
    }
  }

  /** "Jogar meu mapa": envia o mapa p/ virar um JOGO pronto no Estúdio. */
  async function handlePlayMap(): Promise<void> {
    if (!adapter.sendGameToStudio || sending) return
    setSending(true)
    const payload = await exportForStudio().catch(() => null)
    if (!payload?.tilemap) {
      setSending(false)
      showToast(COPY.sendToStudio.error)
      return
    }
    // Tetos do Estúdio — paridade com o handleSendToStudio (a miniatura é
    // capada em 512px, mas o guarda dá a mensagem gentil se ainda estourar).
    if (validateStudioPayloadSize(payload) !== 'ok') {
      setSending(false)
      showToast(COPY.sendToStudio.tooBig)
      return
    }
    try {
      const result = await adapter.sendGameToStudio({
        id: asset.id,
        name: asset.name,
        dataUrl: payload.dataUrl,
        width: payload.width,
        height: payload.height,
        tilemap: payload.tilemap,
        ...(payload.tilemapFront ? { tilemapFront: payload.tilemapFront } : {}),
      })
      showToast(
        result.ok ? COPY.sendToStudio.playSuccess : (result.error ?? COPY.sendToStudio.error),
      )
    } catch {
      showToast(COPY.sendToStudio.error)
    } finally {
      setSending(false)
    }
  }

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b-2 border-pin-border bg-pin-surface px-3 py-2">
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
      {resynced ? (
        <span className="text-pin-text-soft text-xs" role="status">
          {COPY.sendToStudio.resynced}
        </span>
      ) : null}
      <div className="ml-auto flex items-center gap-2">
        <Button onClick={() => setExportOpen(true)}>
          <Download aria-hidden="true" className="size-4" />
          {COPY.editor.download}
        </Button>
        {asset.kind === 'tilemap' && adapter.sendGameToStudio ? (
          <Button disabled={sending} onClick={() => void handlePlayMap()}>
            <Gamepad2 aria-hidden="true" className="size-4" />
            {COPY.tiles.playMap}
          </Button>
        ) : null}
        {/* O foguete só existe em desenho DE UM JOGO do Pensa (projectRef): é
            onde ele marca o progresso da missão. Desenho avulso chega ao
            Estúdio pelo "Trazer do Pinta" de lá (decisão da dona, 08/2026). */}
        {adapter.sendToStudio && asset.projectRef ? (
          <Button variant="primary" disabled={sending} onClick={() => void handleSendToStudio()}>
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
  // A grade do vetor NASCE desligada (pedido da usuária: papel liso, com a
  // grade como apoio opcional) — no pixel ela segue ligada por padrão.
  return { zoom, zoomLevels: VECTOR_ZOOM_LEVELS, showGrid: false }
}

export function EditorScreen({ assetId }: { assetId: string }): JSX.Element | null {
  const { adapter, gallery, closeEditor } = usePintaApp()
  const { showToast } = useToast()
  const [stores] = useState<{ editor: PintaEditorStore; session: PintaSessionStore } | null>(() => {
    const asset = gallery.getState().assets.find((a) => a.id === assetId)
    if (!asset) return null
    return {
      editor: createEditorStore({
        asset,
        persist: (saved, linked) => persistAssets([saved, ...linked]),
        onSaved: (saved) => gallery.getState().absorb(saved),
        // Assets ligados (mapas remapeados ao editar peças do tileset) restaurados
        // por undo/redo: absorve na galeria; o editorStore persiste o conjunto
        // atomicamente junto do tileset no mesmo ciclo do badge/flush.
        applyLinkedAssets: (assets) => {
          const g = gallery.getState()
          for (const linked of assets) {
            g.absorb(linked)
          }
        },
      }),
      session: createSessionStore(sessionDefaultsFor(asset)),
    }
  })

  // Asset sumiu (apagado em outra aba / id inválido)? Volta pra galeria.
  useEffect(() => {
    if (!stores) closeEditor()
  }, [stores, closeEditor])

  // O primeiro desenho aberto nesta sessão passa a ser o output vinculado do
  // Cartão de Criação. Recarregar é idempotente; trocar de desenho religa.
  useEffect(() => {
    if (!stores || !adapter.taskSession || adapter.taskSession.progress.status === 'completed')
      return
    const asset = stores.editor.getState().asset
    const current = adapter.taskSession.progress.outputRef
    if (current?.assetId === asset.id && adapter.taskSession.progress.status !== 'planned') return
    void updateTaskProgress(adapter.taskSession, {
      ...(adapter.taskSession.progress.status === 'planned'
        ? { status: 'in_progress' as const }
        : {}),
      outputRef: {
        kind: 'pinta_asset',
        assetId: asset.id,
        assetName: asset.name,
        ...(current?.assetId === asset.id && current.usedInStudioAt
          ? { usedInStudioAt: current.usedInStudioAt }
          : {}),
      },
    }).then((saved) => {
      if (!saved) showToast(COPY.editor.taskLinkError)
    })
  }, [stores, adapter.taskSession, showToast])

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
      if (isTextEntryTarget(event.target)) return
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
