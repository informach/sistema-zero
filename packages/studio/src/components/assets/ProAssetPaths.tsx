import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ProjectAsset } from '#core'
import { cn, IconBox, IconBrush, IconFile, IconImage, IconMusic, IconPlus } from '#ui'
import { isPythonProject } from '../../core/editableProject'
import type { ProAssetManifestEntry } from '../../core/proAssets'
import { type ProExample, proAssetExample } from '../../core/proExamples'
import { pythonProAssetExample } from '../../python/proExamples'
import { useProjectStore } from '../../state/projectStore'
import type { AssetsTab } from '../../state/uiStore'
import { useT } from '../../studio/i18n'
import { useStudioMoldaLibrary } from '../../studio/molda-library'
import { useStudioPintaLibrary } from '../../studio/pinta-library'
import { editorAssetEntries } from './editorAssetEntries'

const TAB_OF: Record<ProjectAsset['kind'], AssetsTab> = {
  image: 'images',
  audio: 'sounds',
  model3d: 'models3d',
  environment3d: 'models3d',
  font: 'fonts',
}
const TAB_KEY: Record<AssetsTab, string> = {
  images: 'images',
  sounds: 'sounds',
  models3d: 'models',
  fonts: 'fonts',
}
const TAB_ICON = { images: IconImage, sounds: IconMusic, models3d: IconBox, fonts: IconFile }
// As janelas da galeria do Pinta e do Molda só baixam quando a criança pede (as mesmas da janela
// "Materiais do jogo"; gravam no projeto pela store).
const PintaImportDialog = lazy(() =>
  import('./PintaImportDialog').then((module) => ({ default: module.PintaImportDialog })),
)
const MoldaImportDialog = lazy(() =>
  import('./MoldaImportDialog').then((module) => ({ default: module.MoldaImportDialog })),
)

/**
 * Os Materiais do jogo no painel do Pro (redesenho de 11/2026): o "Trazer" (abre a janela
 * "Materiais do jogo", onde mora o upload), as abas Imagens · Sons · 3D com a contagem, a grade
 * de miniaturas e, no material escolhido, o caminho "Para usar no código" com "Copiar", "Onde é
 * usado" (a busca literal no projeto) e "Como usar neste jogo" (os exemplos revisados de
 * sempre). Os caminhos e IDs são os canônicos do manifesto (JS) ou do runtime Python; a régua de
 * colisão com os fontes Python continua a de `editorAssetEntries`. Com os adapters do host, a aba
 * Imagens ganha "Trazer do Pinta" e a 3D "Trazer do Molda" (o Molda já some no Python pelo
 * próprio hook); só para quem edita. "Trazer", e não "Desenhar": a galeria traz o que a criança
 * já desenhou, o Studio não abre o editor do Pinta.
 */
export function ProAssetPaths({
  assets,
  path = '',
  onInsert,
  onFindUses,
  onBring,
}: {
  assets: ProjectAsset[]
  path?: string
  onInsert?: (example: ProExample) => void
  onFindUses?: (query: string) => void
  /** Abre a janela "Materiais do jogo" na aba pedida. */
  onBring?: (tab: AssetsTab) => void
}) {
  const t = useT()
  const id = useId()
  const author = useProjectStore((state) => state.editingAccess === 'author')
  const pintaLibrary = useStudioPintaLibrary()
  const moldaLibrary = useStudioMoldaLibrary()
  const [library, setLibrary] = useState<'pinta' | 'molda' | null>(null)
  // Os ids de antes da importação: o material novo (o que não estava aqui) fica escolhido.
  const before = useRef<Set<string> | null>(null)
  const projectId = useProjectStore((state) => state.project?.id)
  const language = useProjectStore((state): 'python' | 'javascript' =>
    state.project?.programmingLanguage === 'python' ? 'python' : 'javascript',
  )
  // Paths/kinds affect collisions; source edits must not decode all images again.
  const layoutKey = useProjectStore((state) =>
    language === 'python'
      ? JSON.stringify({
          files: Object.keys(state.project?.tree ?? {}).filter(
            (path) => state.project?.tree?.[path]?.kind === 'file',
          ),
          directories: Object.keys(state.project?.tree ?? {}).filter(
            (path) => state.project?.tree?.[path]?.kind === 'dir',
          ),
        })
      : '',
  )
  const scope = useMemo(
    () => ({ projectId, language, assets, layoutKey }),
    [projectId, language, assets, layoutKey],
  )
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(60)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const originals = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets])
  const [copyStatus, setCopyStatus] = useState('')
  const [state, setState] = useState<{
    entries: ProAssetManifestEntry[]
    scope?: typeof scope
    error?: string
  }>({ entries: [] })
  useEffect(() => {
    let active = true
    setCopyStatus('')
    const layout = layoutKey ? JSON.parse(layoutKey) : { files: [], directories: [] }
    void editorAssetEntries(scope.assets, scope.language, layout)
      .then((entries) => {
        if (active) setState({ entries, scope })
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            entries: [],
            scope,
            error: error instanceof Error ? error.message : String(error),
          })
      })
    return () => {
      active = false
    }
  }, [scope, layoutKey])
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus(`${label} copiado.`)
    } catch {
      setCopyStatus(
        'Não foi possível copiar automaticamente. Selecione o texto e copie pelo teclado.',
      )
    }
  }
  const current = state.scope === scope
  const counts = useMemo(() => {
    const result: Record<AssetsTab, number> = { images: 0, sounds: 0, models3d: 0, fonts: 0 }
    for (const asset of assets) result[TAB_OF[asset.kind]]++
    return result
  }, [assets])
  const tabs: AssetsTab[] = [
    'images',
    'sounds',
    ...(language === 'javascript' || counts.models3d ? (['models3d'] as const) : []),
    ...(counts.fonts ? (['fonts'] as const) : []),
  ]
  const [tab, setTab] = useState<AssetsTab>('images')
  const activeTab = tabs.includes(tab) ? tab : 'images'
  useEffect(() => {
    const known = before.current
    if (!known) return
    const added = assets.find((asset) => !known.has(asset.id))
    if (!added) return
    before.current = null
    setTab(TAB_OF[added.kind])
    setQuery('')
    setSelectedId(added.id)
  }, [assets])
  const creation =
    activeTab === 'images' && pintaLibrary && author
      ? ('pinta' as const)
      : activeTab === 'models3d' && moldaLibrary && author
        ? ('molda' as const)
        : null
  const openLibrary = (which: 'pinta' | 'molda') => {
    before.current = new Set(assets.map((asset) => asset.id))
    setLibrary(which)
  }
  const creationButton = (primary: boolean) =>
    creation ? (
      <button
        type="button"
        className={cn('sz-pro-btn sz-pro-btn--sm', primary && 'sz-pro-btn--primary')}
        onClick={() => openLibrary(creation)}
      >
        {creation === 'pinta' ? <IconBrush /> : <IconBox />}
        <span>
          {t(creation === 'pinta' ? 'pro.materials.fromPinta' : 'pro.materials.fromMolda')}
        </span>
      </button>
    ) : null
  const entries = current
    ? state.entries.filter(
        (asset) =>
          TAB_OF[asset.kind] === activeTab &&
          `${asset.name} ${asset.kind} ${asset.id}`
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase()),
      )
    : []
  // O cartão do material escolhido some quando o filtro o esconde.
  const selected = entries.find((asset) => asset.id === selectedId) ?? null
  const Icon = TAB_ICON[activeTab]
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-base font-black">{t('pro.materials')}</h2>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {counts[activeTab] > 0 ? creationButton(false) : null}
          {onBring ? (
            <button
              type="button"
              className="sz-pro-btn sz-pro-btn--sm sz-pro-btn--primary"
              onClick={() => onBring(activeTab)}
            >
              <IconPlus />
              <span>{t('pro.materials.bring')}</span>
            </button>
          ) : null}
        </div>
      </div>
      <div role="tablist" aria-label={t('pro.materials.kinds')} className="sz-pro-seg self-start">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            id={`${id}-tab-${item}`}
            aria-selected={activeTab === item}
            aria-controls={activeTab === item ? `${id}-panel` : undefined}
            className="sz-pro-seg-btn"
            onClick={() => {
              setTab(item)
              setSelectedId(null)
            }}
          >
            {t(`pro.materials.tab.${TAB_KEY[item]}`)}
            <span className="sz-pro-badge sz-pro-badge--quiet">{counts[item]}</span>
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${activeTab}`}
        className="flex flex-col gap-3"
      >
        {counts[activeTab] > 0 ? (
          <label className="flex flex-col gap-1 text-xs font-bold text-sz-fg-soft">
            {t('pro.materials.filter')}
            <input
              type="search"
              maxLength={120}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setLimit(60)
              }}
              className="min-h-10 rounded-xl border-2 border-sz-border bg-sz-bg px-3 font-normal text-sz-fg"
            />
          </label>
        ) : null}
        {!current && <p role="status">{t('pro.materials.reading')}</p>}
        {current && state.error ? <p role="alert">{state.error}</p> : null}
        {current && !state.error && counts[activeTab] === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-sz-border p-4 text-center">
            <span className="sz-pro-tile" aria-hidden="true">
              <Icon />
            </span>
            <p className="m-0 text-sz-fg-soft">{t(`pro.materials.empty.${TAB_KEY[activeTab]}`)}</p>
            {creationButton(true)}
            {onBring ? (
              <button
                type="button"
                className="sz-pro-btn sz-pro-btn--sm"
                onClick={() => onBring(activeTab)}
              >
                {t('pro.materials.bringFrom')}
              </button>
            ) : null}
          </div>
        ) : null}
        {current && !state.error && counts[activeTab] > 0 && !entries.length ? (
          <p role="status">{t('pro.materials.none')}</p>
        ) : null}
        {entries.length > 0 ? (
          <ul className="sz-pro-asset-grid">
            {entries.slice(0, limit).map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  className="sz-pro-asset"
                  aria-pressed={selected?.id === asset.id}
                  aria-label={t('pro.materials.see', { name: asset.name })}
                  onClick={() => setSelectedId(selected?.id === asset.id ? null : asset.id)}
                >
                  <span className="sz-pro-asset__thumb" aria-hidden="true">
                    {asset.kind === 'image' && originals.get(asset.id)?.dataUrl ? (
                      <img
                        src={originals.get(asset.id)?.dataUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <Icon />
                    )}
                  </span>
                  <span className="sz-pro-asset__name">{asset.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {entries.length > limit && (
          <button
            type="button"
            className="sz-pro-btn sz-pro-btn--sm self-start"
            onClick={() => setLimit((value) => value + 60)}
          >
            {t('pro.materials.showMore')}
          </button>
        )}
        {entries.length > 0 && !selected ? (
          <p className="m-0 text-xs text-sz-fg-soft">{t('pro.materials.pick')}</p>
        ) : null}
        {selected ? (
          <ProAssetDetail
            asset={selected}
            original={originals.get(selected.id)}
            path={path}
            onInsert={onInsert}
            onFindUses={onFindUses}
            copy={copy}
          />
        ) : null}
        <p role="status" className="m-0 text-xs text-sz-fg-soft">
          {copyStatus}
        </p>
      </div>
      {library ? (
        <Suspense fallback={null}>
          {library === 'pinta' ? (
            <PintaImportDialog onClose={() => setLibrary(null)} />
          ) : (
            <MoldaImportDialog onClose={() => setLibrary(null)} />
          )}
        </Suspense>
      ) : null}
    </div>
  )
}

function ProAssetDetail({
  asset,
  original,
  path,
  onInsert,
  onFindUses,
  copy,
}: {
  asset: ProAssetManifestEntry
  original?: ProjectAsset
  path: string
  onInsert?: (example: ProExample) => void
  onFindUses?: (query: string) => void
  copy(value: string, label: string): Promise<void>
}) {
  const t = useT()
  return (
    <section aria-label={asset.name} className="sz-pro-card flex flex-col gap-3 p-3">
      <div className="flex items-start gap-3">
        {asset.kind === 'image' && original?.dataUrl ? (
          <img
            src={original.dataUrl}
            alt={asset.name}
            decoding="async"
            className="h-20 w-20 flex-none rounded-lg bg-sz-panel-soft object-contain"
          />
        ) : null}
        <div className="min-w-0">
          <h3 className="m-0 break-words text-base font-black">{asset.name}</h3>
          <p className="m-0 text-xs text-sz-fg-soft">
            {Math.ceil(asset.bytes / 1024)} KB
            {asset.width && asset.height ? ` · ${asset.width} × ${asset.height} px` : ''}
            {asset.license ? ` · ${asset.license.name}` : ' · Licença não informada'}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-black uppercase tracking-wide text-sz-fg-mute">
          {t('pro.materials.useInCode')}
        </span>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-lg bg-sz-bg px-2 py-1.5 select-all">
            {asset.url}
          </code>
          <button
            type="button"
            className="sz-pro-btn sz-pro-btn--sm"
            aria-label={t('pro.materials.copyPathOf', { name: asset.name })}
            onClick={() => void copy(asset.url, 'Caminho')}
          >
            {t('pro.materials.copy')}
          </button>
        </div>
      </div>
      {onFindUses ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-wide text-sz-fg-mute">
            {t('pro.materials.whereUsed')}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="sz-pro-btn sz-pro-btn--sm"
              onClick={() => onFindUses(asset.url)}
            >
              {t('pro.materials.findPath')}
            </button>
            <button
              type="button"
              className="sz-pro-btn sz-pro-btn--sm"
              onClick={() => onFindUses(asset.id)}
            >
              {t('pro.materials.findId')}
            </button>
          </div>
          <p className="m-0 text-xs text-sz-fg-mute">{t('pro.search.literal')}</p>
        </div>
      ) : null}
      <ProAssetExampleDetails asset={asset} path={path} onInsert={onInsert} copy={copy} />
      <details>
        <summary className="cursor-pointer py-1 text-xs font-bold">
          {t('pro.materials.details')}
        </summary>
        <div className="mt-2 flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span>ID:</span>
            <code className="min-w-0 flex-1 break-all select-all">{asset.id}</code>
            <button
              type="button"
              className="sz-pro-btn sz-pro-btn--sm"
              aria-label={t('pro.materials.copyIdOf', { name: asset.name })}
              onClick={() => void copy(asset.id, 'ID')}
            >
              {t('pro.materials.copy')}
            </button>
          </div>
          {asset.sprite && (
            <p className="m-0">
              Quadros: {asset.sprite.frameW} × {asset.sprite.frameH} px. Animações:{' '}
              {asset.sprite.animations
                .map(
                  (animation) =>
                    `${animation.name} (${animation.from}–${animation.to}, ${animation.fps} fps)`,
                )
                .join('; ')}
              .
              {asset.sprite.hitbox
                ? ` Colisão no quadro: x=${asset.sprite.hitbox.x}, y=${asset.sprite.hitbox.y}, largura=${asset.sprite.hitbox.w}, altura=${asset.sprite.hitbox.h}.`
                : ' Colisão: quadro inteiro.'}
            </p>
          )}
          {asset.tilemap && (
            <p className="m-0">
              Mapa: {asset.tilemap.cols} × {asset.tilemap.rows} casas, tile de{' '}
              {asset.tilemap.tileSize} px. Camada frontal: {asset.tilemap.frontGrid ? 'sim' : 'não'}
              .
            </p>
          )}
          {asset.model && (
            <p className="m-0">
              Eixo vertical: Y · {asset.model.skins} esqueletos · {asset.model.nodes} nós.
              Animações:{' '}
              {asset.model.clips.length
                ? asset.model.clips
                    .map(
                      (clip) =>
                        `${clip.name || '(sem nome)'}${clip.durationSeconds !== undefined ? ` (${clip.durationSeconds.toFixed(2)} s)` : ''}`,
                    )
                    .join('; ')
                : 'nenhuma'}
              . A escala e a base devem usar os limites do modelo carregado.
            </p>
          )}
        </div>
      </details>
    </section>
  )
}

type AssetExampleProps = {
  asset: ProAssetManifestEntry
  path: string
  onInsert?: (example: ProExample) => void
  copy(value: string, label: string): Promise<void>
}
function ProAssetExampleDetails(props: AssetExampleProps) {
  const [open, setOpen] = useState(false)
  return (
    <details
      onToggle={(event) => {
        if (event.target === event.currentTarget) setOpen(event.currentTarget.open)
      }}
    >
      <summary className="cursor-pointer py-1 text-sm font-bold">Como usar neste jogo</summary>
      {open && <ProAssetExampleContent {...props} />}
    </details>
  )
}
function ProAssetExampleContent({ asset, path, onInsert, copy }: AssetExampleProps) {
  const project = useProjectStore((state) => state.project)
  const author = useProjectStore((state) => state.editingAccess !== 'observer')
  const python = project && isPythonProject(project)
  const example = python
    ? pythonProAssetExample(asset, path || 'exemplo.py', project)
    : project?.tree
      ? proAssetExample(asset, path || 'exemplo.js', project.tree)
      : null
  return (
    <>
      {example ? (
        <>
          <p className="my-2 text-xs">{example.explanation}</p>
          <pre className="max-h-56 overflow-auto rounded-lg bg-sz-bg p-2 text-xs">
            <code>{example.code}</code>
          </pre>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="sz-pro-btn sz-pro-btn--sm"
              onClick={() => void copy(example.code, 'Exemplo')}
            >
              Copiar exemplo
            </button>
            {onInsert && path && author && (
              <button
                type="button"
                className={cn('sz-pro-btn sz-pro-btn--sm sz-pro-btn--primary')}
                onClick={() =>
                  onInsert({
                    ...example,
                    asset: { id: asset.id, url: asset.url, sha256: asset.sha256 },
                  })
                }
              >
                Conferir inserção em {path}
              </button>
            )}
          </div>
          {!onInsert && (
            <p className="mt-2 text-xs">
              Para inserir com revisão, abra Materiais na lateral do código e escolha um arquivo
              {python ? ' Python.' : ' JavaScript ou TypeScript.'}
            </p>
          )}
        </>
      ) : (
        <p className="my-2 text-xs">
          Não há exemplo automático para este material e arquivo. Use o caminho com o carregador do
          seu jogo.
        </p>
      )}
    </>
  )
}
