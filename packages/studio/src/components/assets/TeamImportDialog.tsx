import { type JSX, useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ProjectAsset } from '#core'
import { Button, Modal } from '#ui'
import { personalIdOf } from '../../asset-library/personalSync'
import { normalizeSearchText } from '../../core/searchText'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useT } from '../../studio/i18n'
import {
  type StudioTeamArtKind,
  type StudioTeamArtSummary,
  useStudioTeamLibrary,
} from '../../studio/team-library'
import { addMoldaCreationToProject, addPintaCreationToProject } from './addCreationToProject'
import { projectHas3DConsumer } from './has3DConsumer'

/**
 * Janela "Trazer da equipe" (Pensa em equipe, 14/10/2026): as artes que as colegas
 * ENTREGARAM nas missões do plano (Pinta e Molda), para quem programa trazer ao jogo.
 *
 * Irmã do `PintaImportDialog` e do `MoldaImportDialog`, e entra pelo MESMO caminho de
 * "adicionar ao projeto" das duas (`addCreationToProject.ts`): o desenho vira imagem com as
 * animações/peças, a criação 3D vira modelo/textura/céu com a validação do arquivo, e as
 * duas ganham o elo `personal:<id>`. Diferenças, todas pelo assunto:
 * - a criação continua sendo da COLEGA: trazer de novo pega a versão de agora (o botão
 *   "Trazer de novo" no cartão que já está no jogo atualiza no lugar, sem trocar o nome);
 * - modelo e céu pedem um consumidor 3D no projeto (a mesma régua do Molda); desenho e
 *   textura entram sempre;
 * - o consentimento do `needs-review` do Molda vale aqui também (a cena que perde algo).
 *
 * Fica ABERTA depois de trazer (dá para trazer várias). Modal aninhada sobre o painel, como
 * as irmãs (o `<dialog>` empilha no top-layer; Esc fecha só a de cima).
 */
export interface TeamImportDialogProps {
  onClose: () => void
  /** Chamado após trazer (o painel re-lista a biblioteca pessoal e sincroniza os jogos). */
  onImported?: () => void
}

/** Filtro puro da busca: nome da arte, da missão e de quem fez, sem acento nem caixa. */
export function filterTeamArt(
  items: readonly StudioTeamArtSummary[],
  query: string,
): StudioTeamArtSummary[] {
  const q = normalizeSearchText(query.trim())
  if (!q) return [...items]
  return items.filter((item) =>
    normalizeSearchText(`${item.name} ${item.missionTitle} ${item.byName}`).includes(q),
  )
}

/** Modelo e céu precisam de quem os consuma no projeto; desenho e textura são imagens. */
export function teamArtNeeds3D(kind: StudioTeamArtKind): boolean {
  return kind === 'model' || kind === 'sky'
}

const KIND_LABEL_KEY: Record<StudioTeamArtKind, string> = {
  drawing: 'teamImport.kind.drawing',
  model: 'teamImport.kind.model',
  texture: 'teamImport.kind.texture',
  sky: 'teamImport.kind.sky',
}

/** Emoji do tipo: o cartão sem miniatura. */
const KIND_EMOJI: Record<StudioTeamArtKind, string> = {
  drawing: '🎨',
  model: '🧊',
  texture: '🧱',
  sky: '🌤️',
}

const EMPTY_ASSETS: ProjectAsset[] = []

type LoadState =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ready'; items: StudioTeamArtSummary[] }

export function TeamImportDialog({ onClose, onImported }: TeamImportDialogProps): JSX.Element {
  const t = useT()
  const adapter = useStudioTeamLibrary()
  const storeApi = useProjectStoreApi()
  const { assets, has3D, projectId } = useProjectStore(
    useShallow((s) => ({
      assets: s.project?.assets ?? EMPTY_ASSETS,
      projectId: s.project?.id,
      has3D: projectHas3DConsumer(s.project),
    })),
  )

  const [load, setLoad] = useState<LoadState>({ phase: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [review, setReview] = useState<{
    item: StudioTeamArtSummary
    token: string
    losses: string[]
  } | null>(null)

  // A mesma guarda do "Trazer do Molda": um import que termina depois de a janela fechar ou
  // de outro jogo abrir NÃO entrega nada (senão a arte cairia no jogo errado).
  const owner = useMemo(
    () => ({ adapter, projectId, storeApi, active: true, busy: false }),
    [adapter, projectId, storeApi],
  )
  useEffect(() => {
    owner.active = true
    setBusyId(null)
    setReview(null)
    setError(null)
    setNotice(null)
    return () => {
      owner.active = false
    }
  }, [owner])

  useEffect(() => {
    if (!adapter) return
    // `reloadKey` re-dispara a listagem no "Tentar de novo".
    void reloadKey
    // StrictMode monta → limpa → monta: a flag descarta a resposta da montagem morta.
    let cancelled = false
    setLoad({ phase: 'loading' })
    adapter
      .list()
      .then((items) => {
        if (!cancelled) setLoad({ phase: 'ready', items })
      })
      .catch(() => {
        if (!cancelled) setLoad({ phase: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [adapter, reloadKey])

  // Quais artes já estão NESTE jogo (o elo é o `libId personal:<id>` da criação da colega).
  const inProject = new Set(assets.map((asset) => personalIdOf(asset)).filter(Boolean))

  const removeCard = (id: string) =>
    setLoad((current) =>
      current.phase === 'ready'
        ? { phase: 'ready', items: current.items.filter((item) => item.id !== id) }
        : current,
    )

  const handleAdd = async (item: StudioTeamArtSummary, acceptedReview?: string): Promise<void> => {
    if (!adapter || owner.busy || !owner.active) return
    owner.busy = true
    const current = () => owner.active && owner.storeApi.getState().project?.id === owner.projectId
    const alreadyInGame = Boolean(item.assetId && inProject.has(item.assetId))
    setBusyId(item.id)
    setError(null)
    setNotice(null)
    setReview(null)
    try {
      const imported = await adapter.import(
        item.id,
        acceptedReview ? { acceptedReview } : undefined,
      )
      if (!current()) return
      if (!imported.result.ok) {
        const refusal = imported.result
        if (refusal.code === 'needs-review' && 'review' in refusal && refusal.review) {
          setReview({ item, ...refusal.review })
          return
        }
        setError(refusal.error)
        // A colega apagou a arte (ou a missão deixou de estar entregue) entre listar e trazer.
        if (refusal.code === 'not-found') removeCard(item.id)
        return
      }
      const state = owner.storeApi.getState()
      // O MESMO caminho das janelas do Pinta e do Molda (atualiza no lugar se já está no jogo).
      const err =
        imported.tool === 'pinta'
          ? addPintaCreationToProject(state, imported.result.asset)
          : addMoldaCreationToProject(state, imported.result.asset)
      if (err) {
        setError(err)
        return
      }
      if (alreadyInGame) setNotice(t('teamImport.refreshed', { name: item.name }))
      onImported?.()
    } catch {
      if (current()) setError(t('teamImport.importError'))
    } finally {
      owner.busy = false
      if (current()) setBusyId(null)
    }
  }

  const visible = load.phase === 'ready' ? filterTeamArt(load.items, query) : []
  const someoneNeeds3D = !has3D && visible.some((item) => teamArtNeeds3D(item.kind))

  return (
    <Modal
      open
      onClose={onClose}
      title={t('teamImport.title')}
      className="w-[680px] max-w-[92vw]"
      footer={
        <Button variant="ghost" size="sm" className="min-h-11" onClick={onClose}>
          {t('teamImport.close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-sz-fg-soft">{t('teamImport.subtitle')}</p>
          {/* Sempre montada: a região viva nasce VAZIA e recebe o texto depois (é assim que o
              leitor de tela anuncia "trouxe de novo"). Vazia, não ocupa altura. */}
          <p role="status" className="text-xs font-semibold text-emerald-500">
            {notice ?? ''}
          </p>
        </div>

        <input
          type="search"
          name="team-art-search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          aria-label={t('teamImport.search.label')}
          placeholder={t('teamImport.search.placeholder')}
          className="h-11 min-w-0 rounded-md border border-sz-border bg-sz-bg px-3 text-sm font-normal text-sz-fg outline-none focus:border-sz-accent"
        />

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400"
          >
            {error}
          </p>
        ) : null}

        {review ? (
          <section
            aria-label={t('moldaImport.review.title')}
            className="rounded-md border border-sz-border p-3"
          >
            <p className="text-sm font-semibold">
              {t('moldaImport.review.title')}: {review.item.name}
            </p>
            <p className="text-sm">{t('moldaImport.review.hint')}</p>
            <ul className="list-disc pl-5 text-sm">
              {review.losses.map((loss) => (
                <li key={loss}>{loss}</li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                className="min-h-11"
                disabled={busyId !== null}
                onClick={() => void handleAdd(review.item, review.token)}
              >
                {t('moldaImport.review.accept')}
              </Button>
              <Button variant="ghost" className="min-h-11" onClick={() => setReview(null)}>
                {t('moldaImport.review.cancel')}
              </Button>
            </div>
          </section>
        ) : null}

        {someoneNeeds3D ? (
          <p role="note" className="text-xs text-sz-fg-soft">
            {t('moldaImport.needs3d')}
          </p>
        ) : null}

        {load.phase === 'loading' ? (
          <p className="text-sm text-sz-fg-soft">{t('teamImport.loading')}</p>
        ) : null}

        {load.phase === 'error' ? (
          <div role="alert" className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-sz-fg-soft">{t('teamImport.loadError')}</p>
            <Button
              variant="subtle"
              size="sm"
              className="min-h-11"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              {t('teamImport.retry')}
            </Button>
          </div>
        ) : null}

        {load.phase === 'ready' && load.items.length === 0 ? (
          <p className="text-sm text-sz-fg-soft">{t('teamImport.empty')}</p>
        ) : null}

        {load.phase === 'ready' && load.items.length > 0 && visible.length === 0 ? (
          <p className="text-sm text-sz-fg-soft">{t('teamImport.noResults')}</p>
        ) : null}

        {visible.length > 0 ? (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {visible.map((item) => {
              const added = Boolean(item.assetId && inProject.has(item.assetId))
              const blocked = !has3D && teamArtNeeds3D(item.kind)
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-md border border-sz-border bg-sz-panel-soft p-2"
                >
                  <div className="flex items-center gap-2">
                    {item.thumbDataUrl ? (
                      <img
                        src={item.thumbDataUrl}
                        alt=""
                        width={48}
                        height={48}
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded bg-sz-bg object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-sz-bg text-2xl"
                      >
                        {KIND_EMOJI[item.kind]}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-mono text-xs text-sz-fg" title={item.name}>
                        {item.name}
                      </span>
                      <span className="text-[10px] text-sz-fg-soft">
                        {t(KIND_LABEL_KEY[item.kind])} · {t('teamImport.by', { name: item.byName })}
                      </span>
                      <span
                        className="truncate text-[10px] text-sz-fg-soft"
                        title={item.missionTitle}
                      >
                        {t('teamImport.mission', { title: item.missionTitle })}
                      </span>
                    </div>
                  </div>
                  <div className="flex min-h-11 flex-wrap items-center justify-end gap-2">
                    {added ? (
                      <>
                        <span className="inline-flex items-center text-xs font-semibold text-emerald-500">
                          {t('teamImport.inProject')}
                        </span>
                        <Button
                          variant="subtle"
                          size="sm"
                          className="min-h-11"
                          disabled={busyId !== null}
                          onClick={() => void handleAdd(item)}
                        >
                          {busyId === item.id ? t('teamImport.adding') : t('teamImport.again')}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        className="min-h-11"
                        disabled={busyId !== null || blocked}
                        title={blocked ? t('moldaImport.needs3d') : undefined}
                        onClick={() => void handleAdd(item)}
                      >
                        {busyId === item.id ? t('teamImport.adding') : t('teamImport.add')}
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
