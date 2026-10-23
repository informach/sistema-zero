import { useEffect, useMemo, useState } from 'react'
import type { ProjectAsset } from '#core'
import { isPythonProject } from '../../core/editableProject'
import type { ProAssetManifestEntry } from '../../core/proAssets'
import { type ProExample, proAssetExample } from '../../core/proExamples'
import { pythonProAssetExample } from '../../python/proExamples'
import { useProjectStore } from '../../state/projectStore'
import { editorAssetEntries } from './editorAssetEntries'

/** Canonical paths and reviewed insertion; imports still belong to the existing Materials library. */
export function ProAssetPaths({
  assets,
  path = '',
  onInsert,
  expanded = false,
  onFindUses,
}: {
  assets: ProjectAsset[]
  path?: string
  onInsert?: (example: ProExample) => void
  expanded?: boolean
  onFindUses?: (query: string) => void
}) {
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
  const [open, setOpen] = useState(expanded)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(50)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const originals = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets])
  const [copyStatus, setCopyStatus] = useState('')
  const [state, setState] = useState<{
    entries: ProAssetManifestEntry[]
    scope?: typeof scope
    error?: string
  }>({
    entries: [],
  })
  useEffect(() => {
    if (!open) return
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
  }, [scope, layoutKey, open])
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
  const entries = current
    ? state.entries.filter((asset) =>
        `${asset.name} ${asset.kind} ${asset.id}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
      )
    : []
  return (
    <details
      open={open}
      onToggle={(event) => {
        if (event.target === event.currentTarget) setOpen(event.currentTarget.open)
      }}
      className="rounded-lg border border-sz-line p-3 text-xs"
    >
      <summary className="cursor-pointer font-medium">Usar materiais no código</summary>
      {open && (
        <>
          <p className="my-2">
            {language === 'python' ? (
              'Use os caminhos abaixo no código Python. Os mesmos arquivos e caminhos acompanham o projeto ao exportar para o computador. Renomear o material mantém seu ID e caminho.'
            ) : (
              <>
                Os arquivos ficam em public/. O manifesto studio-assets/manifest.json contém IDs,
                caminhos, animações e colisões. Use os caminhos abaixo para carregar os materiais no
                código do jogo. Renomear um material mantém seu ID e caminho. O caminho carrega o
                arquivo; o ID encontra seus metadados no manifesto.
              </>
            )}
          </p>
          <label className="block">
            Filtrar materiais
            <input
              type="search"
              maxLength={120}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setLimit(50)
              }}
              className="my-2 min-h-9 w-full rounded border border-sz-border bg-sz-bg px-2"
            />
          </label>
          {!current && <p role="status">Lendo materiais…</p>}
          {current && !state.error && !entries.length && (
            <p role="status">Nenhum material encontrado.</p>
          )}
          {current && state.error ? (
            <p role="alert">{state.error}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {entries.slice(0, limit).map((asset) => {
                return (
                  <li key={asset.id}>
                    <span className="font-medium">{asset.name}</span>
                    {asset.kind === 'image' && (
                      <>
                        <button
                          type="button"
                          className="ml-2 min-h-9 rounded px-2 text-sz-accent"
                          aria-label={`Prévia de ${asset.name}`}
                          aria-expanded={previewId === asset.id}
                          onClick={() => setPreviewId(previewId === asset.id ? null : asset.id)}
                        >
                          Prévia
                        </button>
                        {previewId === asset.id && (
                          <img
                            src={originals.get(asset.id)?.dataUrl}
                            alt={asset.name}
                            loading="lazy"
                            decoding="async"
                            className="my-2 h-24 w-full object-contain"
                          />
                        )}
                      </>
                    )}
                    {onFindUses && (
                      <div className="my-1 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="min-h-9 rounded border border-sz-line px-2"
                          onClick={() => onFindUses(asset.url)}
                        >
                          Buscar caminho no código
                        </button>
                        <button
                          type="button"
                          className="min-h-9 rounded border border-sz-line px-2"
                          onClick={() => onFindUses(asset.id)}
                        >
                          Buscar ID no código
                        </button>
                      </div>
                    )}
                    <p className="text-sz-fg-soft">
                      {asset.kind} · {Math.ceil(asset.bytes / 1024)} KB
                      {asset.width && asset.height ? ` · ${asset.width} × ${asset.height} px` : ''}
                      {asset.license ? ` · ${asset.license.name}` : ' · Licença não informada'}
                    </p>
                    {asset.sprite && (
                      <p>
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
                      <p>
                        Mapa: {asset.tilemap.cols} × {asset.tilemap.rows} casas, tile de{' '}
                        {asset.tilemap.tileSize} px. Camada frontal:{' '}
                        {asset.tilemap.frontGrid ? 'sim' : 'não'}.
                      </p>
                    )}
                    {asset.model && (
                      <p>
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
                    <div className="flex items-center gap-2">
                      <span>ID:</span>
                      <code className="break-all select-all">{asset.id}</code>
                      <button
                        type="button"
                        className="shrink-0 rounded border border-sz-line px-2 py-1"
                        aria-label={`Copiar ID de ${asset.name}`}
                        onClick={() => void copy(asset.id, 'ID')}
                      >
                        Copiar ID
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="break-all select-all">{asset.url}</code>
                      <button
                        type="button"
                        className="shrink-0 rounded border border-sz-line px-2 py-1"
                        aria-label={`Copiar caminho de ${asset.name}`}
                        onClick={() => void copy(asset.url, 'Caminho')}
                      >
                        Copiar caminho
                      </button>
                    </div>
                    <ProAssetExampleDetails
                      asset={asset}
                      path={path}
                      onInsert={onInsert}
                      copy={copy}
                    />
                  </li>
                )
              })}
            </ul>
          )}
          {entries.length > limit && (
            <button
              type="button"
              className="my-2 min-h-9 rounded border border-sz-line px-2"
              onClick={() => setLimit((value) => value + 50)}
            >
              Mostrar mais materiais
            </button>
          )}
          {onFindUses && (
            <p className="mt-2 text-sz-fg-mute">
              A busca encontra texto literal. Caminhos montados pelo código podem não aparecer.
            </p>
          )}
          <p role="status" className="mt-2">
            {copyStatus}
          </p>
        </>
      )}
    </details>
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
      className="mt-2"
      onToggle={(event) => {
        if (event.target === event.currentTarget) setOpen(event.currentTarget.open)
      }}
    >
      <summary className="cursor-pointer py-2">Como usar neste jogo</summary>
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
          <p className="my-2">{example.explanation}</p>
          <pre className="max-h-56 overflow-auto rounded bg-sz-bg p-2">
            <code>{example.code}</code>
          </pre>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-9 rounded border border-sz-line px-2"
              onClick={() => void copy(example.code, 'Exemplo')}
            >
              Copiar exemplo
            </button>
            {onInsert && path && author && (
              <button
                type="button"
                className="min-h-9 rounded border border-sz-line px-2"
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
            <p className="mt-2">
              Para inserir com revisão, abra Materiais na lateral do código e escolha um arquivo
              {python ? 'Python.' : 'JavaScript ou TypeScript.'}
            </p>
          )}
        </>
      ) : (
        <p className="my-2">
          Não há exemplo automático para este material e arquivo. Use o caminho com o carregador do
          seu jogo.
        </p>
      )}
    </>
  )
}
