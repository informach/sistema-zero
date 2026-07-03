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
import { usePintaApp, usePintaGallery } from '../appContext'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { useToast } from '../ui/Toast'
import { AssetCard } from './AssetCard'
import { NewAssetDialog, type NewAssetRole } from './NewAssetDialog'

/** Nome sugerido pela missão de arte (com sufixo se a criança já usou o base). */
const ROLE_NAME_BASE: Record<NewAssetRole, string> = {
  sprite: 'heroi',
  background: 'cenario',
  tileset: 'pecas',
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
  const { gallery, openAsset, takeInitialIntent } = usePintaApp()
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
    const taken = takeInitialIntent()
    if (taken) {
      setIntent(taken)
      setCreateOpen(true)
    }
  }, [takeInitialIntent])
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null)
  const [zipping, setZipping] = useState(false)
  const restoreRef = useRef<HTMLInputElement>(null)

  const renameTarget = assets.find((a) => a.id === renameId) ?? null
  const removeTarget = assets.find((a) => a.id === removeId) ?? null
  const tilesets = assets.filter(isTilesetKind)
  const lastStyle = usePintaGallery((state) => state.lastStyle)
  const findAsset = (id: string): (typeof assets)[number] | null =>
    assets.find((a) => a.id === id) ?? null

  // Agrupamento por jogo do Pensa: a ordem das seções segue o asset mais
  // recente (a lista já vem por updatedAt desc; o Map preserva a inserção).
  const byProject = new Map<string, PintaAsset[]>()
  const looseAssets: PintaAsset[] = []
  for (const asset of assets) {
    const projectName = asset.projectRef?.name
    if (!projectName) {
      looseAssets.push(asset)
      continue
    }
    const list = byProject.get(projectName) ?? []
    list.push(asset)
    byProject.set(projectName, list)
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
        void gallery
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

  async function handleRestore(file: File): Promise<void> {
    try {
      const { assets: restored, warnings } = importPintaJson(await file.text())
      if (restored.length === 0) {
        showToast(warnings[0] ?? COPY.gallery.restoreError)
        return
      }
      const { added, skipped } = await gallery.getState().importAssets(restored)
      const suffix = skipped > 0 || warnings.length > 0 ? ' Alguns ficaram de fora.' : ''
      showToast(
        added === 1
          ? `Trouxe 1 desenho de volta!${suffix}`
          : `Trouxe ${added} desenhos de volta!${suffix}`,
      )
    } catch {
      showToast(COPY.gallery.restoreError)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{COPY.gallery.title}</h1>
          <p className="text-base text-pin-muted">{COPY.gallery.subtitle}</p>
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
            ⬆ {COPY.gallery.restore}
          </Button>
          {assets.length > 0 ? (
            <Button variant="ghost" disabled={zipping} onClick={() => void handleDownloadAll()}>
              ⬇ {COPY.gallery.downloadAll}
            </Button>
          ) : null}
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <span aria-hidden="true">＋</span> {COPY.gallery.create}
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
            <span aria-hidden="true">✨</span> {COPY.gallery.emptyCta}
          </Button>
        </div>
      ) : null}

      {projectSections.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {assets.map(renderCard)}
        </div>
      ) : (
        // Seções por jogo do Pensa (desenhos com projectRef) + avulsos no fim.
        <div className="flex flex-col gap-6">
          {projectSections.map(([projectName, sectionAssets]) => (
            <section key={projectName} aria-label={projectName}>
              <h2 className="mb-2 text-lg font-bold">
                <span aria-hidden="true">🎮 </span>
                {projectName}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {sectionAssets.map(renderCard)}
              </div>
            </section>
          ))}
          {looseAssets.length > 0 ? (
            <section aria-label={COPY.gallery.looseSection}>
              <h2 className="mb-2 text-lg font-bold text-pin-muted">{COPY.gallery.looseSection}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {looseAssets.map(renderCard)}
              </div>
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
        initialStyle={lastStyle}
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
                const error = gallery.getState().mutateError
                if (error) showToast(error)
              }
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
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            aria-label={COPY.newAsset.nameTitle}
            className="min-h-11 rounded-2xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
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
