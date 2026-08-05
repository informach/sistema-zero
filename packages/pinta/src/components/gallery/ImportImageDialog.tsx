/**
 * "Trazer uma foto": a criança escolhe se a imagem vira CENÁRIO ou PEÇAS, o
 * tamanho, e vê uma PRÉVIA já quantizada (cores do Pinta). Confirmar monta o
 * asset e entra pela mesma porta do backup (`galleryStore.importAssets`). A
 * decodificação (browser) acontece no GalleryScreen; aqui só o núcleo puro.
 */
import type { JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import { getPalette } from '../../core/palette'
import {
  BACKGROUND_SIZES,
  createPixelBackgroundAsset,
  createTilesetAsset,
  normalizeAssetName,
  type PintaAsset,
  type PintaBitmap,
  TILE_SIZES,
} from '../../core/project'
import {
  detectTileSize,
  quantizeToIndexed,
  type RGBAImage,
  resizeCover,
  sliceIndexedTiles,
} from '../../import/quantize'
import { paintBitmap } from '../../pixel/render'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

type Target = 'background' | 'tileset'
type Step = 'target' | 'size' | 'name'

function BitmapCanvas({
  bitmap,
  colors,
}: {
  bitmap: PintaBitmap
  colors: readonly string[]
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) paintBitmap(canvas, bitmap, colors)
  }, [bitmap, colors])
  return (
    <canvas
      ref={canvasRef}
      className="pin-pixelated max-h-40 max-w-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

export function ImportImageDialog({
  open,
  image,
  onClose,
  onImport,
}: {
  open: boolean
  /** RGBA já decodificada (GalleryScreen faz o decode antes de abrir). */
  image: RGBAImage | null
  onClose: () => void
  onImport: (asset: PintaAsset) => void
}): JSX.Element | null {
  const [step, setStep] = useState<Step>('target')
  const [target, setTarget] = useState<Target>('background')
  const [sizeKey, setSizeKey] = useState<string>(
    `${BACKGROUND_SIZES[1]?.width}x${BACKGROUND_SIZES[1]?.height}`,
  )
  const [tileSize, setTileSize] = useState<number>(16)
  const [name, setName] = useState('')

  const detected = useMemo(
    () => (image ? detectTileSize(image.width, image.height) : null),
    [image],
  )

  function reset(): void {
    setStep('target')
    setTarget('background')
    setName('')
  }
  function close(): void {
    reset()
    onClose()
  }

  // Prévia: quantiza o resultado do alvo/tamanho corrente (memo por combinação).
  const result = useMemo(() => {
    if (!image) return null
    if (target === 'background') {
      const [w = 240, h = 180] = sizeKey.split('x').map(Number)
      const resized = resizeCover(image, w, h)
      const { bitmap, extraColors } = quantizeToIndexed(resized)
      return { kind: 'background' as const, bitmap, extraColors, width: w, height: h }
    }
    const { bitmap, extraColors } = quantizeToIndexed(image)
    const { tiles, tooMany } = sliceIndexedTiles(bitmap, tileSize)
    return { kind: 'tileset' as const, tiles, extraColors, tooMany }
  }, [image, target, sizeKey, tileSize])

  const previewColors = useMemo(
    () => [...getPalette('arcade').colors, ...(result?.extraColors ?? [])],
    [result],
  )

  const normalized = useMemo(() => normalizeAssetName(name), [name])
  const nameError = !name.trim() ? null : !normalized ? COPY.newAsset.nameInvalid : null
  const tooMany = result?.kind === 'tileset' && result.tooMany

  if (!open || !image) return null

  function pickTarget(t: Target): void {
    setTarget(t)
    if (t === 'tileset') setTileSize(detected ?? 16)
    setStep('size')
  }

  function confirm(): void {
    if (!result || !normalized || tooMany) return
    if (result.kind === 'background') {
      const base = createPixelBackgroundAsset({
        name: normalized,
        width: result.width,
        height: result.height,
      })
      onImport({
        ...base,
        // A foto entra como a camada única do cenário.
        cels: [result.bitmap],
        ...(result.extraColors.length ? { extraColors: result.extraColors } : {}),
      })
    } else {
      const base = createTilesetAsset({ name: normalized, tileSize })
      onImport({
        ...base,
        tiles: result.tiles,
        solid: result.tiles.map(() => false),
        platform: result.tiles.map(() => false),
        ...(result.extraColors.length ? { extraColors: result.extraColors } : {}),
      })
    }
    close()
  }

  const title =
    step === 'target'
      ? COPY.importImage.title
      : step === 'size'
        ? target === 'background'
          ? COPY.importImage.sizeTitle
          : COPY.importImage.tileSizeTitle
        : COPY.newAsset.nameTitle

  return (
    <Dialog open onClose={close} title={title} wide={step !== 'name'}>
      {step === 'target' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(['background', 'tileset'] as const).map((t) => {
            const info =
              t === 'background' ? COPY.importImage.asBackground : COPY.importImage.asTileset
            return (
              <button
                key={t}
                type="button"
                onClick={() => pickTarget(t)}
                className="pin-pop flex flex-col items-center gap-2 rounded-2xl border-2 border-pin-border bg-pin-bg p-6 text-center transition hover:border-pin-accent hover:shadow-md"
              >
                <span aria-hidden="true" className="text-4xl">
                  {info.emoji}
                </span>
                <span className="pin-display block text-lg">{info.title}</span>
                <span className="block text-sm text-pin-muted">{info.description}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      {step === 'size' ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {target === 'background'
              ? BACKGROUND_SIZES.map((size) => {
                  const key = `${size.width}x${size.height}`
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSizeKey(key)}
                      aria-pressed={sizeKey === key}
                      className={`pin-pop min-h-14 rounded-2xl border-2 p-2 text-sm transition ${
                        sizeKey === key
                          ? 'border-pin-accent bg-pin-accent/10'
                          : 'border-pin-border bg-pin-bg hover:border-pin-accent'
                      }`}
                    >
                      {size.width} × {size.height}
                    </button>
                  )
                })
              : TILE_SIZES.map((ts) => (
                  <button
                    key={ts}
                    type="button"
                    onClick={() => setTileSize(ts)}
                    aria-pressed={tileSize === ts}
                    className={`pin-pop min-h-14 rounded-2xl border-2 p-2 text-sm transition ${
                      tileSize === ts
                        ? 'border-pin-accent bg-pin-accent/10'
                        : 'border-pin-border bg-pin-bg hover:border-pin-accent'
                    }`}
                  >
                    {ts} × {ts}
                    {detected === ts ? (
                      <span className="mt-0.5 block text-[10px] text-pin-muted">
                        {COPY.importImage.detected}
                      </span>
                    ) : null}
                  </button>
                ))}
          </div>

          {/* Prévia já quantizada + recado das cores. */}
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-pin-bg p-3">
            <span className="pin-checkerboard flex items-center justify-center rounded-xl border-2 border-pin-border p-1">
              {result?.kind === 'background' ? (
                <BitmapCanvas bitmap={result.bitmap} colors={previewColors} />
              ) : (
                <span className="flex flex-wrap items-center justify-center gap-0.5">
                  {result?.tiles.slice(0, 12).map((tile, i) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: peças não têm id; a ordem É a identidade
                      key={i}
                      className="size-10"
                    >
                      <BitmapCanvas bitmap={tile} colors={previewColors} />
                    </span>
                  ))}
                </span>
              )}
            </span>
            <span className="text-center text-xs text-pin-muted">
              {COPY.importImage.colorsNote}
              {result ? ` · ${COPY.importImage.newColors(result.extraColors.length)}` : ''}
              {result?.kind === 'tileset' && !result.tooMany
                ? ` · ${COPY.importImage.uniqueTiles(result.tiles.length)}`
                : ''}
            </span>
            {tooMany ? (
              <span role="status" className="text-center text-sm font-bold text-pin-danger">
                {COPY.importImage.tooManyTiles}
              </span>
            ) : null}
          </div>

          <div className="mt-1 flex justify-between">
            <Button variant="ghost" onClick={() => setStep('target')}>
              {COPY.importImage.back}
            </Button>
            <Button variant="primary" disabled={tooMany} onClick={() => setStep('name')}>
              {COPY.importImage.next}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'name' ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            confirm()
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={COPY.newAsset.namePlaceholder}
            aria-label={COPY.newAsset.nameTitle}
            aria-invalid={Boolean(nameError)}
            className="min-h-11 rounded-xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
          />
          <p role="status" className="text-sm text-pin-muted">
            {nameError ?? COPY.newAsset.nameHelp}
          </p>
          <div className="mt-1 flex justify-between">
            <Button variant="ghost" onClick={() => setStep('size')}>
              {COPY.importImage.back}
            </Button>
            <Button type="submit" variant="primary" disabled={!normalized || Boolean(nameError)}>
              {COPY.importImage.create}
            </Button>
          </div>
        </form>
      ) : null}
    </Dialog>
  )
}
