/**
 * Tela inicial: a galeria de desenhos do perfil. CRUD completo (criar em 3
 * passos, renomear, duplicar, apagar com confirmação) + estados de
 * carregando/vazio/erro com retry.
 */
import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import { isTilesetKind, type PintaAsset } from '../../core/project'
import type { PintaInitialIntent } from '../../core/types'
import { triggerDownload } from '../../export/download'
import { importPintaJson } from '../../export/projectJson'
import { zipGallery } from '../../export/zip'
import { decodeImageFile, IMPORT_ACCEPT } from '../../import/decodeImage'
import type { RGBAImage } from '../../import/quantize'
import { usePintaApp, usePintaGallery } from '../appContext'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Download, Image as ImageIcon, Plus, Sparkles, Upload } from '../ui/icons'
import { useToast } from '../ui/Toast'
import { AssetCard } from './AssetCard'
import { ImportImageDialog } from './ImportImageDialog'
import { NewAssetDialog, type NewAssetRole } from './NewAssetDialog'

/**
 * Grade da galeria: cards PEQUENOS, "só para reconhecer o desenho" (referência
 * MakeCode Arcade). `auto-fill` + `minmax` em vez de um número fixo de colunas
 * porque o card precisa ter o MESMO tamanho em qualquer tela: com
 * `grid-cols-10` fixo, um monitor de 1920 esticaria cada card para ~148px e a
 * galeria voltaria a ser uma lista de cartões grandes. Assim dá ~10 colunas num
 * notebook de 1366 e ~15 em 1920, com o card sempre em ~92px.
 */
const GALLERY_GRID_CLASS = 'grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(88px,1fr))]'

/** Nome sugerido pela missão de arte (com sufixo se a criança já usou o base). */
const ROLE_NAME_BASE: Record<NewAssetRole, string> = {
  sprite: 'heroi',
  background: 'cenario',
  tileset: 'pecas',
  tilemap: 'mapa',
}

function suggestName(role: NewAssetRole, taken: ReadonlySet<string>): string {
  const base = ROLE_NAME_BASE[role]
  if (!taken.has(base)) return base
  for (let n = 2; n <= 99; n += 1) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
  }
  return ''
}

export function GalleryScreen(): JSX.Element {
  const { gallery, openAsset, takeInitialIntent, initialIntentVersion } = usePintaApp()
  const { showToast } = useToast()
  const assets = usePintaGallery((state) => state.assets)
  const loaded = usePintaGallery((state) => state.loaded)
  const loading = usePintaGallery((state) => state.loading)
  const loadError = usePintaGallery((state) => state.loadError)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  // Intent do Pensa (missão de arte): abre o "Criar novo" pré-configurado. É
  // consumido no efeito (não no initializer) p/ o duplo-mount do StrictMode
  // não engolir o intent; o segundo run recebe null e não faz nada.
  const [intent, setIntent] = useState<PintaInitialIntent | null>(null)
  useEffect(() => {
    // O contador é o sinal para consumir um novo intent, mesmo que o callback
    // estável continue com a mesma identidade.
    void initialIntentVersion
    const taken = takeInitialIntent()
    if (taken) {
      setIntent(taken)
      setCreateOpen(true)
    }
  }, [takeInitialIntent, initialIntentVersion])
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null)
  const [zipping, setZipping] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const [importImage, setImportImage] = useState<RGBAImage | null>(null)
  const restoreRef = useRef<HTMLInputElement>(null)

  const renameTarget = assets.find((a) => a.id === renameId) ?? null
  const removeTarget = assets.find((a) => a.id === removeId) ?? null
  const tilesets = assets.filter(isTilesetKind)
  const lastStyle = usePintaGallery((state) => state.lastStyle)
  const findAsset = (id: string): (typeof assets)[number] | null =>
    assets.find((a) => a.id === id) ?? null

  // Agrupamento por jogo do Pensa: chave = projectRef.id (não o nome — dois
  // jogos homônimos não devem fundir). A ordem das seções segue o asset mais
  // recente (a lista já vem por updatedAt desc; o Map preserva a inserção).
  const byProject = new Map<string, { name: string; assets: PintaAsset[] }>()
  const looseAssets: PintaAsset[] = []
  for (const asset of assets) {
    const ref = asset.projectRef
    if (!ref) {
      looseAssets.push(asset)
      continue
    }
    const entry = byProject.get(ref.id) ?? { name: ref.name, assets: [] }
    entry.assets.push(asset)
    byProject.set(ref.id, entry)
  }
  const projectSections = [...byProject.entries()]

  const renderCard = (asset: PintaAsset): JSX.Element => (
    <AssetCard
      key={asset.id}
      asset={asset}
      justCreated={asset.id === justCreatedId}
      findAsset={findAsset}
      onOpen={() => openAsset(asset.id)}
      onRename={() => {
        setRenameId(asset.id)
        setRenameValue(asset.name)
      }}
      onDuplicate={() => {
        return gallery
          .getState()
          .duplicate(asset.id)
          .then((copy) => {
            if (!copy) {
              const error = gallery.getState().mutateError
              if (error) showToast(error)
            }
          })
      }}
      onRemove={() => setRemoveId(asset.id)}
    />
  )

  async function handleDownloadAll(): Promise<void> {
    if (zipping) return
    setZipping(true)
    try {
      const bytes = await zipGallery(gallery.getState().assets)
      triggerDownload(
        new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' }),
        'meus-desenhos-pinta.zip',
      )
      showToast(COPY.toast.downloadReady)
    } catch {
      showToast(COPY.gallery.zipError)
    } finally {
      setZipping(false)
    }
  }

  async function handlePhoto(file: File): Promise<void> {
    const decoded = await decodeImageFile(file)
    if (!decoded) {
      showToast(COPY.gallery.importDecodeError)
      return
    }
    setImportImage(decoded)
  }

  async function handleRestore(file: File): Promise<void> {
    try {
      const { assets: restored, warnings } = importPintaJson(await file.text())
      if (restored.length === 0) {
        showToast(warnings[0] ?? COPY.gallery.restoreError)
        return
      }
      const { added, skipped } = await gallery.getState().importAssets(restored)
      const suffix = skipped > 0 || warnings.length > 0 ? COPY.gallery.restorePartial : ''
      showToast(
        (added === 1 ? COPY.gallery.restoredOne : COPY.gallery.restoredMany(added)) + suffix,
      )
    } catch {
      showToast(COPY.gallery.restoreError)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
      {/* Cabeçalho de SEÇÃO da comunidade (mesma escala de `/criar` e da home
          do kids): este é o título da página quando o Pinta está embarcado —
          por isso ele mora aqui e some sozinho ao abrir o editor. */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="pin-display text-3xl md:text-4xl">{COPY.gallery.title}</h1>
          <p className="mt-1 text-pin-muted text-sm md:text-base">{COPY.gallery.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={restoreRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleRestore(file)
              event.target.value = ''
            }}
          />
          <Button variant="ghost" onClick={() => restoreRef.current?.click()}>
            <Upload aria-hidden="true" className="size-4" />
            {COPY.gallery.restore}
          </Button>
          <input
            ref={photoRef}
            type="file"
            accept={IMPORT_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handlePhoto(file)
              event.target.value = ''
            }}
          />
          <Button variant="ghost" onClick={() => photoRef.current?.click()}>
            <ImageIcon aria-hidden="true" className="size-4" />
            {COPY.gallery.importImage}
          </Button>
          {assets.length > 0 ? (
            <Button variant="ghost" disabled={zipping} onClick={() => void handleDownloadAll()}>
              <Download aria-hidden="true" className="size-4" />
              {COPY.gallery.downloadAll}
            </Button>
          ) : null}
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" className="size-4" />
            {COPY.gallery.create}
          </Button>
        </div>
      </header>

      {loading && !loaded ? (
        <p className="py-12 text-center text-base text-pin-muted">{COPY.gallery.loading}</p>
      ) : null}

      {loadError ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-base text-pin-muted">{loadError}</p>
          <Button onClick={() => void gallery.getState().load()}>{COPY.gallery.retry}</Button>
        </div>
      ) : null}

      {loaded && !loadError && assets.length === 0 ? (
        // Onboarding do primeiro uso: convite grande + CTA próprio (rótulo
        // distinto do "Criar novo" do header p/ não colidir com o getByRole).
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <span aria-hidden="true" className="text-5xl">
            🎨
          </span>
          <p className="max-w-md text-base text-pin-muted">{COPY.gallery.empty}</p>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Sparkles aria-hidden="true" className="size-4" />
            {COPY.gallery.emptyCta}
          </Button>
        </div>
      ) : null}

      {projectSections.length === 0 ? (
        <div className={GALLERY_GRID_CLASS}>{assets.map(renderCard)}</div>
      ) : (
        // Seções por jogo do Pensa (desenhos com projectRef) + avulsos no fim.
        <div className="flex flex-col gap-6">
          {projectSections.map(([projectId, section]) => (
            <section key={projectId} aria-label={section.name}>
              <h2 className="pin-display mb-2 text-lg">
                <span aria-hidden="true">🎮 </span>
                {section.name}
              </h2>
              <div className={GALLERY_GRID_CLASS}>{section.assets.map(renderCard)}</div>
            </section>
          ))}
          {looseAssets.length > 0 ? (
            <section aria-label={COPY.gallery.looseSection}>
              <h2 className="pin-display mb-2 text-lg text-pin-muted">
                {COPY.gallery.looseSection}
              </h2>
              <div className={GALLERY_GRID_CLASS}>{looseAssets.map(renderCard)}</div>
            </section>
          ) : null}
        </div>
      )}

      {/* Montado só quando aberto: o passo de estilo nasce do lastStyle ATUAL. */}
      <NewAssetDialog
        key={String(createOpen)}
        open={createOpen}
        tilesets={tilesets}
        takenNames={new Set(assets.map((a) => a.name))}
        creating={creating}
        initialStyle={intent?.style && intent.style !== 'either' ? intent.style : lastStyle}
        initialRole={intent?.artKind ?? null}
        initialName={
          intent?.artKind ? suggestName(intent.artKind, new Set(assets.map((a) => a.name))) : ''
        }
        projectName={intent?.projectRef.name ?? null}
        onClose={() => {
          // Fechar descarta o intent: o próximo "Criar novo" volta ao normal.
          setIntent(null)
          setCreateOpen(false)
        }}
        onCreate={(input) => {
          setCreating(true)
          const projectRef = intent?.projectRef
          void gallery
            .getState()
            .create(projectRef ? { ...input, projectRef } : input)
            .then((asset) => {
              setCreating(false)
              if (asset) {
                setIntent(null)
                setCreateOpen(false)
                setJustCreatedId(asset.id)
                openAsset(asset.id)
              } else {
                // Sempre avisa (fallback) — nunca clique-morto se o create falhar.
                showToast(gallery.getState().mutateError ?? COPY.editor.saveError)
              }
            })
        }}
        onCreateFromTemplate={(input) => {
          setCreating(true)
          void gallery
            .getState()
            .createFromTemplate({ ...input, projectRef: intent?.projectRef })
            .then((asset) => {
              setCreating(false)
              if (asset) {
                setIntent(null)
                setCreateOpen(false)
                setJustCreatedId(asset.id)
                openAsset(asset.id)
              } else {
                // Sempre avisa (fallback) — nunca clique-morto se o create falhar.
                showToast(gallery.getState().mutateError ?? COPY.editor.saveError)
              }
            })
        }}
      />

      <ImportImageDialog
        open={importImage !== null}
        image={importImage}
        onClose={() => setImportImage(null)}
        onImport={(asset) => {
          void gallery
            .getState()
            .importAssets([asset])
            .then(({ added }) => {
              showToast(added > 0 ? COPY.gallery.importDone : COPY.gallery.quotaFull)
            })
        }}
      />

      <Dialog
        open={renameTarget !== null}
        onClose={() => setRenameId(null)}
        title={COPY.gallery.rename}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!renameTarget) return
            void gallery
              .getState()
              .rename(renameTarget.id, renameValue)
              .then((ok) => {
                if (ok) {
                  setRenameId(null)
                } else {
                  const error = gallery.getState().mutateError
                  if (error) showToast(error)
                }
              })
          }}
        >
          <input
            name="pinta-asset-name"
            autoComplete="off"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            aria-label={COPY.newAsset.nameTitle}
            className="min-h-11 rounded-xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
          />
          <p className="text-sm text-pin-muted">{COPY.newAsset.nameHelp}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenameId(null)}>
              {COPY.gallery.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {COPY.gallery.rename}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={removeTarget !== null}
        onClose={() => setRemoveId(null)}
        title={COPY.gallery.removeConfirmTitle}
      >
        <p className="text-base text-pin-muted">{COPY.gallery.removeConfirmBody}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoveId(null)}>
            {COPY.gallery.cancel}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!removeTarget) return
              void gallery
                .getState()
                .remove(removeTarget.id)
                .then(() => setRemoveId(null))
            }}
          >
            {COPY.gallery.removeConfirm}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
