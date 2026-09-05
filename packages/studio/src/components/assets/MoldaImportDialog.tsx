import { type JSX, useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ProjectAsset } from '#core'
import { Button, Modal } from '#ui'
import { personalIdOf } from '../../asset-library/personalSync'
import { normalizeSearchText } from '../../core/searchText'
import { useProjectStore } from '../../state/projectStore'
import { useT } from '../../studio/i18n'
import { type StudioMoldaCreationSummary, useStudioMoldaLibrary } from '../../studio/molda-library'
import { uniqueAssetName } from './assetNames'
import { projectHas3DConsumer } from './has3DConsumer'

/**
 * Modal "Trazer do Molda" — o fluxo PULL das criações 3D: lista TODAS as criações da
 * galeria do Molda (via o adapter do host), com busca por nome e selo do tipo, e
 * importa a escolhida direto para o projeto. Clone do `PintaImportDialog`, chaveado
 * pelo TIPO: a textura vira imagem (`image`) e entra sempre; modelo (`.glb`) e céu
 * (`.hdr`) só entram quando o projeto tem quem os consuma (Jogo 3D, Jogo 3D Avançado,
 * Mundo 3D ou Canvas 3D) — senão o botão fica desabilitado com a dica de instalar.
 *
 * Fica ABERTA após adicionar (dá para trazer vários); o selo "✓ no projeto" (derivado
 * do `libId personal:<id>` dos assets do projeto) atualiza na hora.
 */
export interface MoldaImportDialogProps {
  onClose: () => void
  /** Chamado após um import bem-sucedido (o painel re-lista a biblioteca pessoal). */
  onImported?: () => void
}

/** Filtro puro da busca (nome, sem acento/caixa). */
export function filterMoldaCreations(
  creations: readonly StudioMoldaCreationSummary[],
  query: string,
): StudioMoldaCreationSummary[] {
  const q = normalizeSearchText(query.trim())
  if (!q) return [...creations]
  return creations.filter((c) => normalizeSearchText(c.name).includes(q))
}

/** Modelo e céu precisam de um consumidor 3D no projeto; a textura é uma imagem comum. */
export function moldaCreationNeeds3D(kind: StudioMoldaCreationSummary['kind']): boolean {
  return kind !== 'texture'
}

const KIND_LABEL_KEY: Record<StudioMoldaCreationSummary['kind'], string> = {
  model: 'moldaImport.kind.model',
  texture: 'moldaImport.kind.texture',
  sky: 'moldaImport.kind.sky',
}

/** Emoji do tipo — fallback visual quando a criação não tem miniatura. */
const KIND_EMOJI: Record<StudioMoldaCreationSummary['kind'], string> = {
  model: '🧊',
  texture: '🧱',
  sky: '🌤️',
}

const EMPTY_ASSETS: ProjectAsset[] = []

type LoadState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; creations: StudioMoldaCreationSummary[] }

export function MoldaImportDialog({ onClose, onImported }: MoldaImportDialogProps): JSX.Element {
  const t = useT()
  const adapter = useStudioMoldaLibrary()
  const { assets, has3D } = useProjectStore(
    useShallow((s) => ({
      assets: s.project?.assets ?? EMPTY_ASSETS,
      has3D: projectHas3DConsumer(s.project),
    })),
  )
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
      .then((creations) => {
        if (!cancelled) setLoad({ phase: 'ready', creations })
      })
      .catch(() => {
        if (!cancelled) setLoad({ phase: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [adapter, reloadKey])

  // Quais criações já estão NESTE projeto (o elo é o libId `personal:<id>`).
  const inProject = new Set(assets.map((a) => personalIdOf(a)).filter(Boolean))

  const handleAdd = async (creation: StudioMoldaCreationSummary): Promise<void> => {
    if (!adapter || busyId) return
    setBusyId(creation.id)
    setError(null)
    try {
      const result = await adapter.import(creation.id)
      if (!result.ok) {
        setError(result.error)
        if (result.code === 'not-found' && load.phase === 'ready') {
          // Apagada no Molda entre listar e importar → o card sai da lista.
          setLoad({
            phase: 'ready',
            creations: load.creations.filter((c) => c.id !== creation.id),
          })
        }
        return
      }
      const taken = new Set(assets.map((a) => a.name))
      const err = addAsset({
        name: uniqueAssetName(result.asset.name, taken),
        dataUrl: result.asset.dataUrl,
        kind: result.asset.kind,
        // O nome do arquivo vai junto: a validação do store cruza a extensão com o
        // MIME e a assinatura binária (mesmo caminho do upload de .glb/.hdr).
        originalFileName: result.asset.originalFileName,
        ...(result.asset.width !== undefined ? { width: result.asset.width } : {}),
        ...(result.asset.height !== undefined ? { height: result.asset.height } : {}),
        source: 'library',
        libId: `personal:${result.asset.id}`,
        ...(result.asset.libRevision !== undefined
          ? { libRevision: result.asset.libRevision }
          : {}),
      })
      if (err) {
        setError(err)
        return
      }
      onImported?.()
    } catch {
      setError(t('moldaImport.importError'))
    } finally {
      setBusyId(null)
    }
  }

  const visible = load.phase === 'ready' ? filterMoldaCreations(load.creations, query) : []
  const someoneNeeds3D = !has3D && visible.some((c) => moldaCreationNeeds3D(c.kind))

  return (
    <Modal
      open
      onClose={onClose}
      title={t('moldaImport.title')}
      className="w-[680px] max-w-[92vw]"
      footer={
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('moldaImport.close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-sz-fg-soft">{t('moldaImport.subtitle')}</p>

        <input
          type="search"
          name="molda-creation-search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          aria-label={t('moldaImport.search.label')}
          placeholder={t('moldaImport.search.placeholder')}
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

        {someoneNeeds3D ? (
          <p role="note" className="text-xs text-sz-fg-soft">
            {t('moldaImport.needs3d')}
          </p>
        ) : null}

        {load.phase === 'loading' ? (
          <p role="status" className="text-sm text-sz-fg-soft">
            {t('moldaImport.loading')}
          </p>
        ) : null}

        {load.phase === 'error' ? (
          <div role="alert" className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-sz-fg-soft">{t('moldaImport.loadError')}</p>
            <Button variant="subtle" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              {t('moldaImport.retry')}
            </Button>
          </div>
        ) : null}

        {load.phase === 'ready' && load.creations.length === 0 ? (
          <p className="text-sm text-sz-fg-soft">{t('moldaImport.empty')}</p>
        ) : null}

        {load.phase === 'ready' && load.creations.length > 0 && visible.length === 0 ? (
          <p className="text-sm text-sz-fg-soft">{t('moldaImport.noResults')}</p>
        ) : null}

        {visible.length > 0 ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visible.map((creation) => {
              const added = inProject.has(creation.id)
              const blocked = !has3D && moldaCreationNeeds3D(creation.kind)
              return (
                <li
                  key={creation.id}
                  className="flex flex-col gap-2 rounded-md border border-sz-border bg-sz-panel-soft p-2"
                >
                  <div className="flex items-center gap-2">
                    {creation.thumbDataUrl ? (
                      <img
                        src={creation.thumbDataUrl}
                        alt=""
                        width={48}
                        height={48}
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded bg-sz-bg object-contain"
                        style={
                          creation.kind === 'texture' ? { imageRendering: 'pixelated' } : undefined
                        }
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-sz-bg text-2xl"
                      >
                        {KIND_EMOJI[creation.kind]}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-mono text-xs text-sz-fg" title={creation.name}>
                        {creation.name}
                      </span>
                      <span className="text-[10px] text-sz-fg-soft">
                        {t(KIND_LABEL_KEY[creation.kind])}
                      </span>
                    </div>
                  </div>
                  <div className="flex min-h-8 items-center justify-end gap-2">
                    {/* Já no projeto → SÓ o selinho (mesma decisão do Pinta: sem
                        "Adicionar de novo"). */}
                    {added ? (
                      <span className="inline-flex items-center text-xs font-semibold text-emerald-500">
                        {t('moldaImport.inProject')}
                      </span>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busyId !== null || blocked}
                        title={blocked ? t('moldaImport.needs3d') : undefined}
                        onClick={() => void handleAdd(creation)}
                      >
                        {busyId === creation.id ? t('moldaImport.adding') : t('moldaImport.add')}
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
