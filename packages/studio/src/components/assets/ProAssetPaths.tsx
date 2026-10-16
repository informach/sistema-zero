import { useEffect, useState } from 'react'
import type { ProjectAsset } from '#core'
import { buildProAssetBundle, type ProAssetManifestEntry } from '../../core/proAssets'
import { type ProExample, proAssetExample } from '../../core/proExamples'
import { useProjectStore } from '../../state/projectStore'

/** Canonical paths and reviewed insertion; imports still belong to the existing Materials library. */
export function ProAssetPaths({
  assets,
  path = '',
  onInsert,
  expanded = false,
}: {
  assets: ProjectAsset[]
  path?: string
  onInsert?: (example: ProExample) => void
  expanded?: boolean
}) {
  const tree = useProjectStore((state) => state.project?.tree)
  const [copyStatus, setCopyStatus] = useState('')
  const [state, setState] = useState<{ entries: ProAssetManifestEntry[]; error?: string }>({
    entries: [],
  })
  useEffect(() => {
    let active = true
    setCopyStatus('')
    void buildProAssetBundle(assets)
      .then((bundle) => {
        if (active) setState({ entries: bundle.manifest.assets })
      })
      .catch((error: unknown) => {
        if (active)
          setState({ entries: [], error: error instanceof Error ? error.message : String(error) })
      })
    return () => {
      active = false
    }
  }, [assets])
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
  return (
    <details open={expanded || undefined} className="rounded-lg border border-sz-line p-3 text-xs">
      <summary className="cursor-pointer font-medium">Usar materiais no código</summary>
      <p className="my-2">
        Os arquivos ficam em public/. O manifesto studio-assets/manifest.json contém IDs, caminhos,
        animações e colisões. Use os caminhos abaixo para carregar os materiais no código do jogo.
        Renomear um material mantém seu ID e caminho. O caminho carrega o arquivo; o ID encontra
        seus metadados no manifesto.
      </p>
      {state.error ? (
        <p role="alert">{state.error}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {state.entries.map((asset) => {
            const example = tree ? proAssetExample(asset, path || 'exemplo.js', tree) : null
            return (
              <li key={asset.id}>
                <span className="font-medium">{asset.name}</span>
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
                <details className="mt-2">
                  <summary className="cursor-pointer py-2">Como usar neste jogo</summary>
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
                        {onInsert && path && (
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
                          Para inserir com revisão, abra Materiais na lateral do código e escolha um
                          arquivo JavaScript ou TypeScript.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="my-2">
                      Não há exemplo automático para este material e arquivo. Use o caminho com o
                      carregador do seu jogo.
                    </p>
                  )}
                </details>
              </li>
            )
          })}
        </ul>
      )}
      <p role="status" className="mt-2">
        {copyStatus}
      </p>
    </details>
  )
}
