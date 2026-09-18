/**
 * Componente raiz do Pinta — uncontrolled, navegação por ESTADO (sem router):
 * galeria ⇄ editor. O host só passa o `adapter` (tema/capabilities) e chama
 * `setPintaStorageNamespace(viewerId)` ANTES de montar.
 */
import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../core/copy'
import type { PintaHostAdapter } from '../core/types'
import { createClipboardStore } from '../state/clipboardStore'
import type { PintaEditorStore } from '../state/editorStore'
import { createGalleryStore } from '../state/galleryStore'
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
import { GalleryScreen } from './gallery/GalleryScreen'
import { TaskBriefPanel } from './TaskBriefPanel'
import { ToastProvider, useToast } from './ui/Toast'

type PintaView = { screen: 'gallery' } | { screen: 'editor'; assetId: string }

const EMPTY_ADAPTER: PintaHostAdapter = {}

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
    if (gallery.getState().assets.some((a) => a.id === id)) {
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

export function PintaApp({
  adapter,
  persistence,
}: {
  adapter?: PintaHostAdapter
  /** Ausente = IndexedDB do perfil. O bloco de aula injeta o armazenamento dele. */
  persistence?: PintaPersistence
}): JSX.Element {
  // O default é resolvido UMA vez, junto com a store: `createPintaPersistence` captura o banco do
  // namespace vigente, e recriá-lo a cada render poderia atravessar perfis.
  const [store] = useState(() => {
    const resolved = persistence ?? createPintaPersistence()
    return {
      persistence: resolved,
      gallery: createGalleryStore(resolved),
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
  // A store do editor ABERTO (null na galeria). É o que deixa o "Voltar ao plano"
  // do painel gravar antes de sair, sem o painel conhecer o editor.
  // ⚠️ A identidade tem que ser estável: o `EditorScreen` tem `onEditorReady` nas
  // deps do efeito que se anuncia, e uma função nova por render o faria
  // desanunciar e reanunciar a cada volta do `useMemo` do contexto.
  const editorRef = useRef<PintaEditorStore | null>(null)
  const handleEditorReady = useCallback((editor: PintaEditorStore | null) => {
    editorRef.current = editor
  }, [])

  // ⚠⚠ Navegação com identidade ESTÁVEL (18/09/2026, achado do full review da seta que
  // recolhe). O `context` depende do `adapter`, e o adapter passou a mudar de identidade a cada
  // clique na seta do brief — com `openAsset` nascendo inline, o `onOpenCard` do
  // `GalleryScreen` (que o tem nas deps) mudava junto e o `memo` do `AssetCard` quebrava para
  // TODOS os cartões a cada clique, contra o invariante escrito no próprio `AssetCard`
  // ("callbacks POR ID, estáveis na galeria"). Com o `useCallback`, só quem lê o adapter
  // re-renderiza. Vale para todo host que troque o adapter por qualquer motivo.
  const openAsset = useCallback((id: string) => setView({ screen: 'editor', assetId: id }), [])
  const closeEditor = useCallback(() => setView({ screen: 'gallery' }), [])
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
        setView({ screen: 'gallery' })
        setInitialIntentVersion((version) => version + 1)
      },
      takeInitialAssetId: () => {
        const id = initialAssetIdRef.current
        initialAssetIdRef.current = null
        return id
      },
      onEditorReady: handleEditorReady,
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
  const taskOutputId = resolvedAdapter.taskSession?.progress.outputRef?.assetId ?? null
  const taskOutputMissing = !!taskOutputId && missingAssetId === taskOutputId
  const recreateTaskAsset = () => {
    const session = resolvedAdapter.taskSession
    if (!session) return
    context.requestInitialIntent({
      projectRef: {
        id: session.project.id,
        name: session.project.name,
        palette: session.brief.palette.map((item) => item.color),
      },
      artKind: session.brief.artKind,
      style: session.brief.style,
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
  const returnToPlan = async () => {
    const editor = editorRef.current
    if (editor) {
      const saved = await editor.getState().flush()
      if (!saved.ok) throw new Error(saved.error)
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
          <InitialAssetOpener
            onMissing={(id) => {
              if (resolvedAdapter.taskSession?.progress.outputRef?.assetId === id) {
                setMissingAssetId(id)
              }
            }}
          />
          {resolvedAdapter.taskSession ? (
            <TaskBriefPanel
              session={resolvedAdapter.taskSession}
              outputMissing={taskOutputMissing}
              onRecreate={recreateTaskAsset}
              onRelink={() => setView({ screen: 'gallery' })}
              {...(resolvedAdapter.taskSession.onReturnToPlan ? { onReturn: returnToPlan } : {})}
            />
          ) : null}
          {view.screen === 'gallery' ? (
            <GalleryScreen />
          ) : (
            // key por asset: trocar de desenho recria o editor (stores novas).
            <EditorScreen key={view.assetId} assetId={view.assetId} />
          )}
        </ToastProvider>
      </PintaAppProvider>
    </div>
  )
}
