import { type JSX, useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ProjectAsset } from '#core'
import { Button, Modal } from '#ui'
import { personalIdOf } from '../../asset-library/personalSync'
import { normalizeSearchText } from '../../core/searchText'
import { useProjectStore } from '../../state/projectStore'
import { useT } from '../../studio/i18n'
import { type StudioPintaDrawingSummary, useStudioPintaLibrary } from '../../studio/pinta-library'
import { uniqueAssetName } from './assetNames'

/**
 * Modal "Trazer do Pinta" — o fluxo PULL de imagens: lista TODOS os desenhos
 * da galeria do Pinta (via o adapter do host), com busca por nome, e importa o
 * escolhido direto para o projeto. Fica ABERTA após adicionar (dá para trazer
 * vários); o selo "✓ no projeto" (derivado do `libId personal:<id>` dos assets
 * do projeto) atualiza na hora e responde o "o que eu já trouxe?".
 *
 * Modal aninhada sobre o AssetsPanel — mesmo precedente do TileConfigDialog
 * (`<dialog>.showModal()` empilha no top-layer nativo; Esc fecha só a de cima).
 */
export interface PintaImportDialogProps {
  onClose: () => void
  /** Chamado após um import bem-sucedido (o painel re-lista "Meus desenhos"). */
  onImported?: () => void
}

/** Filtro puro da busca (nome + nome do jogo, sem acento/caixa). */
export function filterPintaDrawings(
  drawings: readonly StudioPintaDrawingSummary[],
  query: string,
): StudioPintaDrawingSummary[] {
  const q = normalizeSearchText(query.trim())
  if (!q) return [...drawings]
  return drawings.filter((d) => normalizeSearchText(`${d.name} ${d.projectName ?? ''}`).includes(q))
}

const KIND_LABEL_KEY: Record<StudioPintaDrawingSummary['role'], string> = {
  sprite: 'pintaImport.kind.sprite',
  background: 'pintaImport.kind.background',
  tileset: 'pintaImport.kind.tileset',
  tilemap: 'pintaImport.kind.tilemap',
}

/** Emoji do tipo — fallback visual quando o desenho não tem miniatura. */
const KIND_EMOJI: Record<StudioPintaDrawingSummary['role'], string> = {
  sprite: '🧍',
  background: '🖼️',
  tileset: '🧩',
  tilemap: '🗺️',
}

const EMPTY_ASSETS: ProjectAsset[] = []

type LoadState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; drawings: StudioPintaDrawingSummary[] }

export function PintaImportDialog({ onClose, onImported }: PintaImportDialogProps): JSX.Element {
  const t = useT()
  const adapter = useStudioPintaLibrary()
  const assets = useProjectStore(useShallow((s) => s.project?.assets ?? EMPTY_ASSETS))
  const addAsset = useProjectStore((s) => s.addAsset)

  const [load, setLoad] = useState<LoadState>({ phase: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!adapter) return
    // `reloadKey` re-dispara a listagem no "Tentar de novo".
    void reloadKey
    // StrictMode monta→limpa→monta: a flag descarta a resposta da montagem morta.
    let cancelled = false
    setLoad({ phase: 'loading' })
    adapter
      .list()
      .then((drawings) => {
        if (!cancelled) setLoad({ phase: 'ready', drawings })
      })
      .catch(() => {
        if (!cancelled) setLoad({ phase: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [adapter, reloadKey])

  // Quais desenhos já estão NESTE projeto (o elo é o libId `personal:<id>`).
  const inProject = new Set(assets.map((a) => personalIdOf(a)).filter(Boolean))

  const handleAdd = async (drawing: StudioPintaDrawingSummary): Promise<void> => {
    if (!adapter || busyId) return
    setBusyId(drawing.id)
    setError(null)
    try {
      const result = await adapter.import(drawing.id)
      if (!result.ok) {
        setError(result.error)
        if (result.code === 'not-found' && load.phase === 'ready') {
          // Apagado no Pinta entre listar e importar → o card sai da lista.
          setLoad({ phase: 'ready', drawings: load.drawings.filter((d) => d.id !== drawing.id) })
        }
        return
      }
      const taken = new Set(assets.map((a) => a.name))
      const err = addAsset({
        name: uniqueAssetName(result.asset.name, taken),
        dataUrl: result.asset.dataUrl,
        width: result.asset.width,
        height: result.asset.height,
        source: 'library',
        libId: `personal:${result.asset.id}`,
        libRevision: result.asset.libRevision,
        // Animações/tiles/mapa viajam junto (re-sanitizados no store), como no
        // caminho "Meus desenhos".
        sprite: result.asset.sprite,
        tileset: result.asset.tileset,
        tilemap: result.asset.tilemap,
      })
      if (err) {
        setError(err)
        return
      }
      onImported?.()
    } catch {
      setError(t('pintaImport.importError'))
    } finally {
      setBusyId(null)
    }
  }

  const visible = load.phase === 'ready' ? filterPintaDrawings(load.drawings, query) : []

  return (
    <Modal
      open
      onClose={onClose}
      title={t('pintaImport.title')}
      className="w-[680px] max-w-[92vw]"
      footer={
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('pintaImport.close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-sz-fg-soft">{t('pintaImport.subtitle')}</p>

        <input
          type="search"
          name="pinta-drawing-search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          aria-label={t('pintaImport.search.label')}
          placeholder={t('pintaImport.search.placeholder')}
          className="h-9 min-w-0 rounded-md border border-sz-border bg-sz-bg px-3 text-sm font-normal text-sz-fg outline-none focus:border-sz-accent"
        />

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400"
          >
            {error}
          </p>
        ) : null}

        {load.phase === 'loading' ? (
          <p role="status" className="text-sm text-sz-fg-soft">
            {t('pintaImport.loading')}
          </p>
        ) : null}

        {load.phase === 'error' ? (
          <div role="alert" className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-sz-fg-soft">{t('pintaImport.loadError')}</p>
            <Button variant="subtle" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              {t('pintaImport.retry')}
            </Button>
          </div>
        ) : null}

        {load.phase === 'ready' && load.drawings.length === 0 ? (
          <p className="text-sm text-sz-fg-soft">{t('pintaImport.empty')}</p>
        ) : null}

        {load.phase === 'ready' && load.drawings.length > 0 && visible.length === 0 ? (
          <p className="text-sm text-sz-fg-soft">{t('pintaImport.noResults')}</p>
        ) : null}

        {visible.length > 0 ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visible.map((drawing) => {
              const added = inProject.has(drawing.id)
              return (
                <li
                  key={drawing.id}
                  className="flex flex-col gap-2 rounded-md border border-sz-border bg-sz-panel-soft p-2"
                >
                  <div className="flex items-center gap-2">
                    {drawing.thumbDataUrl ? (
                      <img
                        src={drawing.thumbDataUrl}
                        alt=""
                        width={48}
                        height={48}
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded bg-sz-bg object-contain"
                        style={
                          drawing.style === 'pixel' ? { imageRendering: 'pixelated' } : undefined
                        }
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-sz-bg text-2xl"
                      >
                        {KIND_EMOJI[drawing.role]}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-mono text-xs text-sz-fg" title={drawing.name}>
                        {drawing.name}
                      </span>
                      <span className="text-[10px] text-sz-fg-soft">
                        {t(KIND_LABEL_KEY[drawing.role])}
                      </span>
                      {drawing.projectName ? (
                        <span
                          className="truncate text-[10px] text-sz-fg-soft"
                          title={drawing.projectName}
                        >
                          {t('pintaImport.gameBadge', { name: drawing.projectName })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex min-h-8 items-center justify-end gap-2">
                    {/* Já no projeto → SÓ o selinho (decisão da dona: sem
                        "Adicionar de novo" — re-add acidental não existe). */}
                    {added ? (
                      <span className="inline-flex items-center text-xs font-semibold text-emerald-500">
                        {t('pintaImport.inProject')}
                      </span>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busyId !== null}
                        onClick={() => void handleAdd(drawing)}
                      >
                        {busyId === drawing.id ? t('pintaImport.adding') : t('pintaImport.add')}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </Modal>
  )
}
