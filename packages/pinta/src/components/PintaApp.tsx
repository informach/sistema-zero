/**
 * Componente raiz do Pinta — uncontrolled, navegação por ESTADO (sem router):
 * galeria ⇄ editor. O host só passa o `adapter` (tema/capabilities) e chama
 * `setPintaStorageNamespace(viewerId)` ANTES de montar.
 */
import { PensaMissionLayout } from '@sistemazero/ui/pensa-mission-panel'
import type { JSX } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { isPintaMemoryAsset } from '../core/assetMemory'
import { COPY } from '../core/copy'
import {
  createGuidedBackgroundAsset,
  findInitialCanvasAsset,
  isValidInitialCanvas,
} from '../core/guidedCanvas'
import { pintaLocalRevisionOf } from '../core/localAssetOrigin'
import { isTilesetKind } from '../core/project'
import type { PintaHostAdapter, PintaInitialCanvas } from '../core/types'
import { createClipboardStore } from '../state/clipboardStore'
import type { PintaEditorStore } from '../state/editorStore'
import { createGalleryStore } from '../state/galleryStore'
import type { LocalRegionAuthorSession } from '../state/localRegionAuthorSession'
import { createPaletteLibraryStore } from '../state/paletteLibraryStore'
import {
  createPintaPersistence,
  getPintaStorageNamespace,
  type PintaPersistence,
} from '../state/persistence'
import {
  type PintaAppContextValue,
  PintaAppProvider,
  usePintaApp,
  usePintaGallery,
} from './appContext'
import { EditorScreen } from './editor/EditorScreen'
import { FocalEditorScreen } from './editor/FocalEditorScreen'
import { GalleryScreen } from './gallery/GalleryScreen'
import { TaskBriefPanel } from './TaskBriefPanel'
import { erroParaCrianca, withSaveBeforeTaskActions } from './taskSessionSave'
import { ToastProvider, useToast } from './ui/Toast'

type PintaView =
  | { screen: 'gallery' }
  /** `fit`: a tela com molde abre com o zoom em que cabe inteira (`fitZoomFor`). */
  | { screen: 'editor'; assetId: string; fit?: boolean; focal?: LocalRegionAuthorSession }

const EMPTY_ADAPTER: PintaHostAdapter = {}

function OpenFailureToast({ failure }: { failure: { message: string } | null }) {
  const { showToast } = useToast()
  useEffect(() => {
    if (failure) showToast(failure.message)
  }, [failure, showToast])
  return null
}

/**
 * Abre o desenho pedido pelo host (botão "Editar" do Estúdio → `/pinta?desenho=`).
 *
 * ⚠️ Só DEPOIS que a galeria carrega: o `EditorScreen` resolve o asset num
 * inicializador de estado e volta para a galeria quando não acha — abrir cedo
 * cairia na galeria e o link pareceria quebrado. Vive aqui dentro (e não no
 * corpo do PintaApp) para poder avisar pelo toast quando o desenho já foi
 * apagado.
 */
function InitialAssetOpener({ onMissing }: { onMissing(id: string): void }): null {
  const { gallery, openAsset, takeInitialAssetId } = usePintaApp()
  const { showToast } = useToast()
  const loaded = usePintaGallery((state) => state.loaded)
  const syncing = usePintaGallery((state) => state.syncing)
  // O id pedido é tomado UMA vez; se o desenho ainda não está aqui mas a nuvem está
  // sincronizando (criado noutro aparelho, `?desenho=`/Pensa), espera a sincronia acabar.
  const pendingRef = useRef<string | null>(null)

  useEffect(() => {
    if (!loaded) return
    const id = pendingRef.current ?? takeInitialAssetId()
    if (!id) return
    const { assets, regionCards } = gallery.getState()
    if (assets.some((a) => a.id === id) || regionCards.some((a) => a.id === id)) {
      pendingRef.current = null
      openAsset(id)
      return
    }
    if (syncing) {
      pendingRef.current = id
      return
    }
    pendingRef.current = null
    onMissing(id)
    showToast(COPY.gallery.drawingGone)
  }, [loaded, syncing, gallery, openAsset, takeInitialAssetId, onMissing, showToast])

  return null
}

/**
 * Abre a tela com molde pedida pelo host (`adapter.initialCanvas`), 1x: reabre o desenho de mesmo
 * nome e tamanho ou cria um novo. Espera a galeria carregar e a nuvem assentar (o desenho pode ter
 * sido feito noutro aparelho); tela fora dos limites cai na galeria com o recado de erro.
 */
function InitialCanvasOpener({
  canvas,
  onOpen,
}: {
  canvas: PintaInitialCanvas | null
  onOpen: (id: string) => void
}): null {
  const { gallery } = usePintaApp()
  const { showToast } = useToast()
  const loaded = usePintaGallery((state) => state.loaded)
  const syncing = usePintaGallery((state) => state.syncing)
  const done = useRef(false)
  useEffect(() => {
    if (!canvas || done.current || !loaded || syncing) return
    done.current = true
    if (!isValidInitialCanvas(canvas)) {
      showToast(COPY.editor.saveError)
      return
    }
    const existing = findInitialCanvasAsset(gallery.getState().assets, canvas)
    if (existing) {
      onOpen(existing.id)
      return
    }
    void gallery
      .getState()
      .createPrepared(createGuidedBackgroundAsset(canvas))
      .then((asset) => {
        if (asset) onOpen(asset.id)
        else showToast(gallery.getState().mutateError ?? COPY.editor.saveError)
      })
  }, [canvas, loaded, syncing, gallery, onOpen, showToast])
  return null
}

export interface PintaCompletionControl {
  /** Salva o desenho aberto; `null` indica que a galeria está aberta. */
  flush(): Promise<import('../core/assetMemory').PintaMemoryAsset | null>
}

export function PintaApp({
  onCompletionControlChange,
  adapter,
  persistence,
  onWorkspaceChange,
}: {
  adapter?: PintaHostAdapter
  onCompletionControlChange?: (control: PintaCompletionControl | null) => void
  /** Ausente = IndexedDB do perfil. O bloco de aula injeta o armazenamento dele. */
  persistence?: PintaPersistence<import('../core/assetMemory').PintaWorkshopAsset>
  /** Informa ao host quando o editor ocupa toda a área, sem acoplar o Pinta ao menu externo. */
  onWorkspaceChange?: (active: boolean) => void
}): JSX.Element {
  // O default é resolvido UMA vez, junto com a store: `createPintaPersistence` captura o banco do
  // namespace vigente, e recriá-lo a cada render poderia atravessar perfis.
  const [store] = useState(() => {
    const resolved = persistence ?? createPintaPersistence()
    return {
      persistence: resolved,
      // A trava de conta (`holdOpen`) não fecha a janela focal: a sessão a segura até fechar, e o
      // armazenamento da conta só oferece a sessão ligada à fila causal. As pontes ainda pedem o
      // documento inteiro.
      gallery: createGalleryStore(resolved, {
        focalGallery: Boolean(
          resolved.openRegionSession &&
            !adapter?.taskSession &&
            !adapter?.onChange &&
            !adapter?.allowTools?.length &&
            !adapter?.sendToStudio &&
            !adapter?.resyncToStudio &&
            !onCompletionControlChange,
        ),
      }),
      // Copiar num desenho e colar em outro: a área de transferência é do app (com
      // espelho em localStorage, para atravessar abas e sobreviver a fechar).
      clipboard: createClipboardStore({ namespace: getPintaStorageNamespace() }),
      // "Minhas paletas" do perfil (fora da galeria); armazenamento sem os
      // métodos opcionais → a store nasce desabilitada e a UI esconde a seção.
      paletteLibrary: createPaletteLibraryStore(resolved),
    }
  })
  const { gallery, paletteLibrary } = store
  // A escuta do armazenamento (nuvem do host) vive com o componente: liga ao montar, desliga ao
  // desmontar (StrictMode monta/desmonta/monta: a store descartada nunca fica inscrita).
  useEffect(() => gallery.getState().attachPersistence(), [gallery])
  useEffect(() => paletteLibrary.getState().attachPersistence(), [paletteLibrary])
  const [view, setView] = useState<PintaView>({ screen: 'gallery' })
  const editorOpen = view.screen === 'editor'
  useLayoutEffect(() => {
    onWorkspaceChange?.(editorOpen)
    return () => onWorkspaceChange?.(false)
  }, [editorOpen, onWorkspaceChange])
  const [initialIntentVersion, setInitialIntentVersion] = useState(0)
  const [missingAssetId, setMissingAssetId] = useState<string | null>(null)
  const resolvedAdapter = adapter ?? EMPTY_ADAPTER
  const theme = resolvedAdapter.theme ?? 'light'

  useEffect(() => {
    void gallery.getState().load()
  }, [gallery])

  // Intent do Pensa (missão de arte) vive num ref: consumido 1x pela galeria.
  const initialIntentRef = useRef(resolvedAdapter.initialIntent ?? null)
  // "Abrir este desenho" (botão Editar do Estúdio): também 1x, e só depois que a
  // galeria carrega — ver o InitialAssetOpener.
  const initialAssetIdRef = useRef(resolvedAdapter.initialAssetId ?? null)
  // A tela com molde do host: lida 1x (o adapter pode mudar de identidade a cada render).
  const [initialCanvas] = useState(() => resolvedAdapter.initialCanvas ?? null)
  // A store do editor ABERTO (null na galeria). É o que deixa o "Voltar ao plano"
  // do painel gravar antes de sair, sem o painel conhecer o editor.
  // ⚠️ A identidade tem que ser estável: o `EditorScreen` tem `onEditorReady` nas
  // deps do efeito que se anuncia, e uma função nova por render o faria
  // desanunciar e reanunciar a cada volta do `useMemo` do contexto.
  const editorRef = useRef<Pick<
    PintaEditorStore<import('../core/assetMemory').PintaMemoryAsset>,
    'getState'
  > | null>(null)
  const handleEditorReady = useCallback(
    (
      editor: Pick<
        PintaEditorStore<import('../core/assetMemory').PintaMemoryAsset>,
        'getState'
      > | null,
    ) => {
      editorRef.current = editor
    },
    [],
  )

  useEffect(() => {
    if (!onCompletionControlChange) return
    const control: PintaCompletionControl = {
      async flush() {
        const editor = editorRef.current
        if (!editor) return null
        const resultado = await editor.getState().flush()
        if (!resultado.ok) throw new Error(resultado.error)
        if (editorRef.current !== editor)
          throw new Error('O desenho aberto mudou enquanto era salvo')
        const state = editor.getState()
        if (state.asset !== state.savedAsset) throw new Error('O desenho mudou enquanto era salvo')
        return state.savedAsset
      },
    }
    onCompletionControlChange(control)
    return () => onCompletionControlChange(null)
  }, [onCompletionControlChange])

  // ⚠⚠ Navegação com identidade ESTÁVEL (18/09/2026, achado do full review da seta que
  // recolhe). O `context` depende do `adapter`, e o adapter passou a mudar de identidade a cada
  // clique na seta do brief — com `openAsset` nascendo inline, o `onOpenCard` do
  // `GalleryScreen` (que o tem nas deps) mudava junto e o `memo` do `AssetCard` quebrava para
  // TODOS os cartões a cada clique, contra o invariante escrito no próprio `AssetCard`
  // ("callbacks POR ID, estáveis na galeria"). Com o `useCallback`, só quem lê o adapter
  // re-renderiza. Vale para todo host que troque o adapter por qualquer motivo.
  const openGeneration = useRef(0)
  const releaseEditor = useRef<(() => void) | null>(null)
  const focused = useRef<LocalRegionAuthorSession | null>(null)
  const opening = useRef<AbortController | null>(null)
  const restoreGalleryIndex = useRef(false)
  const releaseGalleryIndex = useRef<(() => void) | null>(null)
  const [openFailure, setOpenFailure] = useState<{ message: string } | null>(null)
  const retireOpen = useCallback(() => {
    openGeneration.current++
    opening.current?.abort()
    opening.current = null
    focused.current?.close()
    focused.current = null
    releaseGalleryIndex.current?.()
    releaseGalleryIndex.current = null
    releaseEditor.current?.()
    releaseEditor.current = null
  }, [])
  useEffect(() => retireOpen, [retireOpen])
  const open = useCallback(
    (id: string, fit?: boolean) => {
      const generation = ++openGeneration.current
      opening.current?.abort()
      opening.current = null
      setOpenFailure(null)
      const nextView = { screen: 'editor' as const, assetId: id, ...(fit ? { fit } : {}) }
      const { regionCards, assets } = gallery.getState()
      const card = regionCards.find((item) => item.id === id)
      const known = assets.find((item) => item.id === id)
      // The integral map/tileset tools can remap or follow relationships throughout the gallery.
      const fullCatalog = Boolean(
        regionCards.length &&
          known &&
          (known.kind === 'tilemap' || known.kind === 'map-set' || isTilesetKind(known)),
      )
      if (!store.persistence.holdOpen && !card && !fullCatalog) {
        setView(nextView)
        return
      }
      const controller = new AbortController()
      opening.current = controller
      void (async () => {
        const release = await store.persistence.holdOpen?.(id)
        try {
          if (generation !== openGeneration.current) return
          if (card && !fit && store.persistence.openRegionSession) {
            const focal = await store.persistence.openRegionSession(id, controller.signal)
            if (generation !== openGeneration.current) {
              focal?.close()
              return
            }
            if (focal) {
              releaseEditor.current?.()
              focused.current?.close()
              focused.current = focal
              // A trava da conta acompanha a janela: a descida não grava sob o cenário aberto.
              releaseEditor.current = release ?? null
              setView({ ...nextView, focal })
              return
            }
          }
          const listed = fullCatalog || card ? await store.persistence.listAllAssets() : null
          const catalog = listed?.filter(isPintaMemoryAsset) ?? null
          const found = listed
            ? listed.find((item) => item.id === id)
            : await store.persistence.loadAssetById(id)
          if (generation !== openGeneration.current) return
          if (!found) {
            setOpenFailure({ message: COPY.gallery.drawingGone })
            return
          }
          // A projected map stays stored as it is; no editor here opens it yet.
          if (!isPintaMemoryAsset(found)) {
            setOpenFailure({ message: COPY.gallery.projectedUnavailable([found.name]) })
            return
          }
          const asset = found
          if (catalog) {
            releaseGalleryIndex.current?.()
            releaseGalleryIndex.current = gallery.getState().holdFullInventory()
            gallery.getState().absorbMany(catalog)
            restoreGalleryIndex.current = true
          } else gallery.getState().absorb(asset)
          releaseEditor.current?.()
          focused.current?.close()
          focused.current = null
          releaseEditor.current = release ?? null
          setView(nextView)
        } finally {
          if (releaseEditor.current !== release) release?.()
        }
      })().catch(() => {
        if (generation === openGeneration.current)
          setOpenFailure({ message: COPY.gallery.drawingOpenError })
      })
    },
    [gallery, store.persistence],
  )
  const openAsset = useCallback((id: string) => open(id), [open])
  const openFitted = useCallback((id: string) => open(id, true), [open])
  const closeEditor = useCallback(() => {
    const refresh = focused.current !== null || restoreGalleryIndex.current
    restoreGalleryIndex.current = false
    retireOpen()
    setView({ screen: 'gallery' })
    if (refresh) void gallery.getState().load()
  }, [retireOpen, gallery])
  const openComplete = async (focal: LocalRegionAuthorSession) => {
    const generation = openGeneration.current
    const revision = focal.store.getState().revision
    const catalog = (await store.persistence.listAllAssets()).filter(isPintaMemoryAsset)
    const asset = catalog.find((item) => item.id === focal.id)
    if (generation !== openGeneration.current || focused.current !== focal) return
    if (
      !asset ||
      pintaLocalRevisionOf(asset) !== revision ||
      focal.store.getState().revision !== revision
    )
      throw Error(COPY.scene.gestureChanged)
    gallery.getState().absorbMany(catalog)
    restoreGalleryIndex.current = true
    // O mesmo cenário segue aberto no editor inteiro: a trava da conta passa para ele.
    const hold = releaseEditor.current
    releaseEditor.current = null
    retireOpen()
    releaseEditor.current = hold
    releaseGalleryIndex.current = gallery.getState().holdFullInventory()
    setView({ screen: 'editor', assetId: asset.id })
  }
  const context = useMemo<PintaAppContextValue>(
    () => ({
      adapter: resolvedAdapter,
      gallery,
      persistence: store.persistence,
      clipboard: store.clipboard,
      paletteLibrary: store.paletteLibrary,
      openAsset,
      closeEditor,
      takeInitialIntent: () => {
        const intent = initialIntentRef.current
        initialIntentRef.current = null
        return intent
      },
      initialIntentVersion,
      requestInitialIntent: (intent) => {
        initialIntentRef.current = intent
        closeEditor()
        setInitialIntentVersion((version) => version + 1)
      },
      takeInitialAssetId: () => {
        const id = initialAssetIdRef.current
        initialAssetIdRef.current = null
        return id
      },
      onEditorReady: handleEditorReady,
      onWorkshopEditorReady: handleEditorReady,
    }),
    [
      resolvedAdapter,
      gallery,
      store.persistence,
      store.clipboard,
      store.paletteLibrary,
      initialIntentVersion,
      handleEditorReady,
      openAsset,
      closeEditor,
    ],
  )
  const taskOutputId =
    resolvedAdapter.taskSession?.progress.deliveries[0]?.creation.creationId ?? null
  const taskOutputMissing = !!taskOutputId && missingAssetId === taskOutputId
  const recreateTaskAsset = () => {
    const session = resolvedAdapter.taskSession
    if (!session) return
    context.requestInitialIntent({
      projectRef: {
        id: session.project.id,
        name: session.project.name,
        palette: [],
      },
      artKind:
        session.assetSlots[0]?.kind === 'background'
          ? 'background'
          : session.assetSlots[0]?.kind === 'tileset'
            ? 'tileset'
            : session.assetSlots[0]?.kind === 'tilemap'
              ? 'tilemap'
              : 'sprite',
      style: 'either',
    })
  }
  /**
   * "Voltar ao plano": GUARDA e só então navega, a MESMA disciplina do "Voltar"
   * do editor (`EditorScreen`, que só fecha com `flush().ok`). O flush do
   * desmonte NÃO serve de garantia: ele é `void` e roda depois da navegação.
   *
   * Falhou ao guardar? Lança, e o painel mostra o recado sem navegar — o desenho
   * da criança não pode ficar para trás numa troca de tela.
   */
  /** Grava o desenho aberto (nada aberto = nada a gravar). `false` = a gravação falhou. */
  const gravarDesenhoAberto = useCallback(async (): Promise<boolean> => {
    const editor = editorRef.current
    if (!editor) return true
    const saved = await editor.getState().flush()
    if (!saved.ok) console.error('[pinta] gravar antes do guia falhou', saved.error)
    return saved.ok
  }, [])
  // O guia v2 GRAVA antes de concluir, continuar e pedir ajuda (ver `taskSessionSave`).
  const sessaoDoGuia = useMemo(
    () =>
      resolvedAdapter.taskSession
        ? withSaveBeforeTaskActions(resolvedAdapter.taskSession, gravarDesenhoAberto)
        : undefined,
    [resolvedAdapter.taskSession, gravarDesenhoAberto],
  )
  const returnToPlan = async () => {
    const editor = editorRef.current
    if (editor) {
      const saved = await editor.getState().flush()
      if (!saved.ok) throw erroParaCrianca(COPY.task.backError, saved.error)
    }
    await resolvedAdapter.taskSession?.onReturnToPlan?.()
  }

  return (
    <div
      data-pinta-theme={theme}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-pin-bg text-pin-text"
    >
      <PintaAppProvider value={context}>
        <ToastProvider>
          <OpenFailureToast failure={openFailure} />
          <InitialCanvasOpener canvas={initialCanvas} onOpen={openFitted} />
          <InitialAssetOpener
            onMissing={(id) => {
              if (resolvedAdapter.taskSession?.progress.deliveries[0]?.creation.creationId === id) {
                setMissingAssetId(id)
              }
            }}
          />
          {/* A missão do Pensa é uma coluna PRÓPRIA à direita (ou uma faixa embaixo, na tela
              estreita): nunca cobre a paleta, as camadas nem a linha de animações. */}
          <PensaMissionLayout
            panel={
              resolvedAdapter.taskSession ? (
                <TaskBriefPanel
                  session={sessaoDoGuia ?? resolvedAdapter.taskSession}
                  outputMissing={taskOutputMissing}
                  currentCreationId={view.screen === 'editor' ? view.assetId : null}
                  onRecreate={recreateTaskAsset}
                  onRelink={closeEditor}
                  onReturn={returnToPlan}
                />
              ) : null
            }
          >
            {view.screen === 'gallery' ? (
              <GalleryScreen />
            ) : view.focal ? (
              <FocalEditorScreen
                key={view.assetId}
                focal={view.focal}
                openComplete={() => openComplete(view.focal!)}
              />
            ) : (
              // key por asset: trocar de desenho recria o editor (stores novas).
              <EditorScreen key={view.assetId} assetId={view.assetId} fit={view.fit === true} />
            )}
          </PensaMissionLayout>
        </ToastProvider>
      </PintaAppProvider>
    </div>
  )
}
