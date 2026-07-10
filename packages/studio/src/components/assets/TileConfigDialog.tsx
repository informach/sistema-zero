import { type JSX, useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectAsset } from '#core'
import { Button, Modal } from '#ui'
import { useProjectStore } from '../../state/projectStore'
import {
  imageDataFromDataUrl,
  imageToTilemapMeta,
  MAX_UNIQUE_TILES,
  type SliceResult,
  sliceTiles,
} from './tileSlicer'

/**
 * "Usar como conjunto de peças" / "Usar como mapa de tiles (fatiar)" — o caminho
 * do UPLOAD sem Pinta. Os dois modos convergem para os MESMOS metadados que o
 * Pinta manda pela ponte (`asset.tileset` / `asset.tilemap`), então tudo que
 * funciona para desenhos do Pinta (seletor de sólidos, editor de grade, bloco
 * "Criar mapa do meu desenho") passa a valer para imagens enviadas do computador.
 *
 * happy-dom não tem canvas: as prévias/fatiador só rodam em browser real (a UI
 * degrada com mensagem gentil; a lógica pura vive em tileSlicer.ts, testada).
 */
export interface TileConfigDialogProps {
  asset: ProjectAsset
  mode: 'tileset' | 'tilemap'
  onClose: () => void
}

const TILE_PRESETS = [8, 16, 32] as const

function TileThumb({
  dataUrl,
  tileSize,
  cols,
  index,
}: {
  dataUrl: string
  tileSize: number
  cols: number
  index: number
}): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const sx = (index % cols) * tileSize
      const sy = Math.floor(index / cols) * tileSize
      ctx.drawImage(img, sx, sy, tileSize, tileSize, 0, 0, canvas.width, canvas.height)
    }
    img.src = dataUrl
  }, [dataUrl, tileSize, cols, index])
  return (
    <canvas
      ref={ref}
      width={28}
      height={28}
      className="h-7 w-7"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

/** Peça ÚNICA do fatiador desenhada dos bytes RGBA (putImageData). */
function UniqueTileThumb({
  bytes,
  tileSize,
}: {
  bytes: Uint8ClampedArray
  tileSize: number
}): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    try {
      const tile = new ImageData(new Uint8ClampedArray(bytes), tileSize, tileSize)
      const off = document.createElement('canvas')
      off.width = tileSize
      off.height = tileSize
      const offCtx = off.getContext('2d')
      if (!offCtx) return
      offCtx.putImageData(tile, 0, 0)
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(off, 0, 0, tileSize, tileSize, 0, 0, canvas.width, canvas.height)
    } catch {
      // sem canvas real: fica em branco (QA de browser)
    }
  }, [bytes, tileSize])
  return (
    <canvas
      ref={ref}
      width={28}
      height={28}
      className="h-7 w-7"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

export function TileConfigDialog({ asset, mode, onClose }: TileConfigDialogProps): JSX.Element {
  const updateAssetMeta = useProjectStore((s) => s.updateAssetMeta)
  const [tileSize, setTileSize] = useState(
    () => asset.tileset?.tileSize ?? asset.tilemap?.tileSize ?? 16,
  )
  const [solid, setSolid] = useState<Set<number>>(
    () => new Set(mode === 'tileset' ? (asset.tileset?.solid ?? []) : (asset.tilemap?.solid ?? [])),
  )
  const [slice, setSlice] = useState<SliceResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const width = asset.width ?? 0
  const height = asset.height ?? 0
  const sheetCols = tileSize > 0 ? Math.max(1, Math.floor(width / tileSize)) : 1
  const sheetCount =
    tileSize > 0 ? Math.max(0, Math.floor(width / tileSize) * Math.floor(height / tileSize)) : 0

  // Fatiador (só no modo mapa): re-fatia quando o tamanho do tile muda.
  useEffect(() => {
    if (mode !== 'tilemap' || tileSize <= 0) return
    let cancelled = false
    setSlice(null)
    void imageDataFromDataUrl(asset.dataUrl).then((data) => {
      if (cancelled) return
      setSlice(data ? sliceTiles(data, tileSize) : null)
    })
    return () => {
      cancelled = true
    }
  }, [mode, asset.dataUrl, tileSize])

  const toggleSolid = (idx: number) => {
    setSolid((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const solidList = useMemo(() => [...solid].sort((a, b) => a - b), [solid])

  const save = async () => {
    setError(null)
    if (mode === 'tileset') {
      const err = updateAssetMeta(asset.id, { tileset: { tileSize, solid: solidList } })
      if (err) setError(err)
      else onClose()
      return
    }
    setBusy(true)
    try {
      const { meta, tooMany } = await imageToTilemapMeta(asset.dataUrl, tileSize, solidList)
      if (tooMany) {
        setError(
          `Essa imagem tem peças demais (mais de ${MAX_UNIQUE_TILES}) — mapas são feitos de blocos que se REPETEM. Tente outro tamanho de tile.`,
        )
        return
      }
      if (!meta) {
        setError('Não consegui fatiar essa imagem aqui. Tente outro tamanho de tile.')
        return
      }
      const err = updateAssetMeta(asset.id, { tilemap: meta })
      if (err) setError(err)
      else onClose()
    } finally {
      setBusy(false)
    }
  }

  const title =
    mode === 'tileset'
      ? `Usar "${asset.name}" como conjunto de peças`
      : `Usar "${asset.name}" como mapa de tiles`

  return (
    <Modal open onClose={onClose} title={title}>
      <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-1 text-sm text-sz-fg">
        <p className="text-xs leading-relaxed text-sz-fg-soft">
          {mode === 'tileset'
            ? 'Diga o tamanho de cada peça (em pixels na arte) e toque nas peças que BLOQUEIAM o movimento. Depois use a imagem no bloco "Criar mapa de tiles".'
            : 'O Estúdio corta a imagem em peças, junta as repetidas e monta a grade sozinho. Depois é só usar o bloco "Criar mapa do meu desenho".'}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold">Tamanho do tile:</span>
          {TILE_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTileSize(p)}
              className={`rounded border px-2 py-0.5 text-xs ${
                tileSize === p
                  ? 'border-sz-accent text-sz-accent'
                  : 'border-sz-border text-sz-fg-soft'
              }`}
            >
              {p}px
            </button>
          ))}
          <input
            type="number"
            min={2}
            max={128}
            value={tileSize}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10)
              if (Number.isFinite(n) && n > 0) setTileSize(Math.min(128, n))
            }}
            aria-label="Tamanho do tile em pixels"
            className="w-16 rounded border border-sz-border bg-sz-bg px-1.5 py-0.5 font-mono text-xs outline-none focus:border-sz-accent"
          />
          <span className="text-[11px] text-sz-fg-soft">
            {width}×{height} px
          </span>
        </div>

        {mode === 'tileset' ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-sz-fg-soft">
              {sheetCount} peças. Toque nas SÓLIDAS (que barram o personagem):
            </span>
            <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
              {Array.from({ length: Math.min(sheetCount, 128) }, (_, idx) => (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: o índice É a identidade da peça na folha
                  key={`${tileSize}:${idx}`}
                  type="button"
                  title={`Peça ${idx}`}
                  onClick={() => toggleSolid(idx)}
                  className={`relative rounded border-2 p-0.5 ${
                    solid.has(idx) ? 'border-sz-accent' : 'border-sz-border'
                  }`}
                >
                  <TileThumb
                    dataUrl={asset.dataUrl}
                    tileSize={tileSize}
                    cols={sheetCols}
                    index={idx}
                  />
                  {solid.has(idx) ? (
                    <span className="absolute -right-1.5 -top-1.5 text-xs">🧱</span>
                  ) : null}
                  <small className="absolute bottom-0 right-0.5 text-[8px] text-sz-fg-soft">
                    {idx}
                  </small>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {slice === null ? (
              <span className="text-xs text-sz-fg-soft">Fatiando a imagem…</span>
            ) : slice.tooMany ? (
              <span className="text-xs text-red-400">
                Peças demais (acima de {MAX_UNIQUE_TILES}) — mapas são feitos de blocos que se
                repetem. Tente outro tamanho de tile.
              </span>
            ) : (
              <>
                <span className="text-xs text-sz-fg-soft">
                  Grade de {slice.cols}×{slice.rows} com {slice.uniqueTiles.length} peças únicas.
                  Toque nas SÓLIDAS (que barram o personagem):
                </span>
                <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                  {slice.uniqueTiles.map((bytes, idx) => (
                    <button
                      // biome-ignore lint/suspicious/noArrayIndexKey: peças únicas são estáveis por fatia
                      key={`${tileSize}:${idx}`}
                      type="button"
                      title={`Peça ${idx}`}
                      onClick={() => toggleSolid(idx)}
                      className={`relative rounded border-2 p-0.5 ${
                        solid.has(idx) ? 'border-sz-accent' : 'border-sz-border'
                      }`}
                    >
                      <UniqueTileThumb bytes={bytes} tileSize={tileSize} />
                      {solid.has(idx) ? (
                        <span className="absolute -right-1.5 -top-1.5 text-xs">🧱</span>
                      ) : null}
                      <small className="absolute bottom-0 right-0.5 text-[8px] text-sz-fg-soft">
                        {idx}
                      </small>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={busy || (mode === 'tilemap' && (slice === null || slice.tooMany))}
            onClick={() => void save()}
          >
            {busy ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
