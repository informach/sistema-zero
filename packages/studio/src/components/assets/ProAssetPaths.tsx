import { useEffect, useState } from 'react'
import type { ProjectAsset } from '#core'
import { buildProAssetBundle, type ProAssetManifestEntry } from '../../core/proAssets'

/** Small, read-only paths; importing the library remains the existing Materials workflow. */
export function ProAssetPaths({ assets }: { assets: ProjectAsset[] }) {
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
    <details className="rounded-lg border border-sz-line p-3 text-xs">
      <summary className="cursor-pointer font-medium">Usar materiais no código</summary>
      <p className="my-2">
        Os arquivos ficam em public/. O manifesto studio-assets/manifest.json contém IDs, caminhos,
        animações e colisões. Use o ID em src/characters.ts para trocar personagens da arena.
        Renomear um material mantém seu ID e caminho.
      </p>
      {state.error ? (
        <p role="alert">{state.error}</p>
      ) : (
        <ul className="flex max-h-40 flex-col gap-2 overflow-auto">
          {state.entries.map((asset) => (
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
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="mt-2">
        {copyStatus}
      </p>
    </details>
  )
}
