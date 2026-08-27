/**
 * "Trazer uma foto": a criança escolhe se a imagem vira PERSONAGEM, CENÁRIO ou
 * PEÇAS, o tamanho, e vê uma PRÉVIA já quantizada (cores do Pinta). Confirmar
 * monta o asset e entra pela mesma porta do backup (`galleryStore.importAssets`).
 * A decodificação (browser) acontece no GalleryScreen; aqui só o núcleo puro.
 *
 * Personagem (08/2026, pedido dela): o PNG entra INTEIRO no quadro (contain,
 * sem cortar, transparência preservada) — o cover do cenário cortaria braço ou
 * orelha de um boneco. Vira `pixel-sprite` com um quadro na animação `parado`.
 */
import type { JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import {
  BACKGROUND_SIZES,
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilesetAsset,
  normalizeAssetName,
  type PintaAsset,
  type PintaBitmap,
  SPRITE_FRAME_SIZES,
  TILE_SIZES,
} from '../../core/project'
import { quantizeToPhotoPalette } from '../../import/paletteFromImage'
import {
  detectTileSize,
  type RGBAImage,
  resizeContain,
  resizeCover,
  sliceIndexedTiles,
} from '../../import/quantize'
import { paintBitmap } from '../../pixel/render'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { CustomSizeFields } from './CustomSizeFields'
import {
  buildCustomSizeKey,
  CUSTOM_SIZE_KEY,
  type CustomSizeValues,
  customSizeSpecFor,
  EMPTY_CUSTOM_VALUES,
  seedCustomValues,
} from './customSize'

type Target = 'sprite' | 'background' | 'tileset'
type Step = 'target' | 'size' | 'name'

const TARGETS: readonly Target[] = ['sprite', 'background', 'tileset']

const DEFAULT_BACKGROUND_KEY = `${BACKGROUND_SIZES[1]?.width}x${BACKGROUND_SIZES[1]?.height}`
/** O quadro Médio (32): o mesmo padrão sensato do "Criar novo". */
const DEFAULT_SPRITE_KEY = String(SPRITE_FRAME_SIZES[1])

/** "32" → 32×32; "128x32" → 128×32 (o formato que o assistente já usa). */
function parseSizeKey(key: string, fallback: number): { width: number; height: number } {
  const [w, h] = key.split('x').map(Number)
  const width = Number.isFinite(w) && w ? w : fallback
  return { width, height: Number.isFinite(h) && h ? h : width }
}

const SIZE_CARD = 'pin-pop min-h-14 rounded-2xl border-2 p-2 text-sm transition' as const
function sizeCardClass(pressed: boolean): string {
  return `${SIZE_CARD} ${
    pressed
      ? 'border-pin-accent bg-pin-accent/10'
      : 'border-pin-border bg-pin-bg hover:border-pin-accent'
  }`
}

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
  // Prévia AMPLIADA por número inteiro (um personagem de 16×16 num canvas de 16 px na
  // tela não deixa avaliar a quantização); o `max-*` segura o cenário grande.
  const scale = Math.max(1, Math.min(8, Math.floor(160 / Math.max(bitmap.width, bitmap.height))))
  return (
    <canvas
      ref={canvasRef}
      className="pin-pixelated max-h-40 max-w-full object-contain"
      style={{
        imageRendering: 'pixelated',
        width: bitmap.width * scale,
        height: bitmap.height * scale,
      }}
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
  const [sizeKey, setSizeKey] = useState<string>(DEFAULT_BACKGROUND_KEY)
  const [customValues, setCustomValues] = useState<CustomSizeValues>(EMPTY_CUSTOM_VALUES)
  // Estado PRÓPRIO do personagem: a chave do cenário ("240x180") não serve de
  // quadro, e misturar os dois vazaria o tamanho de um alvo no outro.
  const [spriteSizeKey, setSpriteSizeKey] = useState<string>(DEFAULT_SPRITE_KEY)
  const [spriteCustomValues, setSpriteCustomValues] =
    useState<CustomSizeValues>(EMPTY_CUSTOM_VALUES)
  const [tileSize, setTileSize] = useState<number>(16)
  const [name, setName] = useState('')

  const detected = useMemo(
    () => (image ? detectTileSize(image.width, image.height) : null),
    [image],
  )

  function reset(): void {
    setStep('target')
    setTarget('background')
    // O diálogo fica MONTADO entre aberturas (só a prop `open` muda): reabrir
    // com o card Personalizado selecionado e os campos recém-limpos seria um
    // beco (Avançar travado, sem prévia). A sentinela volta ao preset médio;
    // um preset comum escolhido continua lembrado, como antes.
    setSizeKey((k) => (k === CUSTOM_SIZE_KEY ? DEFAULT_BACKGROUND_KEY : k))
    setCustomValues(EMPTY_CUSTOM_VALUES)
    setSpriteSizeKey((k) => (k === CUSTOM_SIZE_KEY ? DEFAULT_SPRITE_KEY : k))
    setSpriteCustomValues(EMPTY_CUSTOM_VALUES)
    setName('')
  }
  function close(): void {
    reset()
    onClose()
  }

  // Tamanho personalizado (cenário e personagem — peças mantêm a whitelist do
  // motor). Chave real derivada dos campos; inválida ⇒ null ⇒ sem prévia e
  // Avançar desabilitado.
  const backgroundSpec = customSizeSpecFor('pixel-background')
  const spriteSpec = customSizeSpecFor('pixel-sprite')
  const effectiveSizeKey =
    target === 'sprite'
      ? spriteSizeKey === CUSTOM_SIZE_KEY
        ? buildCustomSizeKey('pixel-sprite', spriteCustomValues)
        : spriteSizeKey
      : sizeKey === CUSTOM_SIZE_KEY
        ? buildCustomSizeKey('pixel-background', customValues)
        : sizeKey

  // Prévia: quantiza o resultado do alvo/tamanho corrente (memo por combinação
  // VÁLIDA — digitação inválida não recomputa nem some com a prévia anterior).
  // A foto vira a PALETA PRÓPRIA do desenho (≤15 cores + transparente): é o que
  // mantém a criação dentro do teto de 16 — antes nascia arcade + até 48 extras.
  const result = useMemo(() => {
    if (!image) return null
    if (target === 'sprite') {
      if (!effectiveSizeKey) return null
      const { width: w, height: h } = parseSizeKey(effectiveSizeKey, 32)
      const resized = resizeContain(image, w, h)
      const { bitmap, colors } = quantizeToPhotoPalette(resized)
      return { kind: 'sprite' as const, bitmap, colors, width: w, height: h }
    }
    if (target === 'background') {
      if (!effectiveSizeKey) return null
      const { width: w, height: h } = parseSizeKey(effectiveSizeKey, 240)
      const resized = resizeCover(image, w, h)
      const { bitmap, colors } = quantizeToPhotoPalette(resized)
      return { kind: 'background' as const, bitmap, colors, width: w, height: h }
    }
    // O fatiamento opera em ÍNDICES; com a paleta da foto eles seguem ≤ 15.
    const { bitmap, colors } = quantizeToPhotoPalette(image)
    const { tiles, tooMany } = sliceIndexedTiles(bitmap, tileSize)
    return { kind: 'tileset' as const, tiles, colors, tooMany }
  }, [image, target, effectiveSizeKey, tileSize])

  // Slot '' pinta transparente (mesma régua do bitmapToRGBA).
  const previewColors = useMemo(() => result?.colors ?? [], [result])
  const paintedCount = useMemo(() => (result ? result.colors.filter(Boolean).length : 0), [result])

  const normalized = useMemo(() => normalizeAssetName(name), [name])
  const nameError = !name.trim() ? null : !normalized ? COPY.newAsset.nameInvalid : null
  const tooMany = result?.kind === 'tileset' && result.tooMany
  const noVisibleTiles = result?.kind === 'tileset' && !result.tooMany && result.tiles.length === 0

  if (!open || !image) return null

  function pickTarget(t: Target): void {
    setTarget(t)
    if (t === 'tileset') setTileSize(detected ?? 16)
    setStep('size')
  }

  function confirm(): void {
    if (!result || !normalized || tooMany || noVisibleTiles) return
    // Foto 100% transparente (0 cores) cai em arcade SEM a chave — 'custom' sem
    // cor pintável seria degradado pelo sanitize; melhor nem criar o estado.
    const paletteFields =
      paintedCount > 0
        ? {
            paletteId: 'custom' as const,
            customPalette: { name: COPY.importImage.photoPaletteName, colors: result.colors },
          }
        : {}
    if (result.kind === 'sprite') {
      const base = createPixelSpriteAsset({
        name: normalized,
        frameSize: result.width,
        frameWidth: result.width,
        frameHeight: result.height,
      })
      const [first, ...others] = base.animations
      if (!first) return
      // ⚠️ O bitmap TEM que casar com frameWidth × frameHeight: os dois saem do
      // mesmo `effectiveSizeKey`, então casam por construção. Um quadro fora de
      // medida seria descartado pelo sanitize e o desenho sumiria da galeria.
      onImport({
        ...base,
        // A foto entra como o único cel (uma camada) do primeiro quadro de `parado`.
        animations: [{ ...first, frames: [[result.bitmap]] }, ...others],
        ...paletteFields,
      })
    } else if (result.kind === 'background') {
      const base = createPixelBackgroundAsset({
        name: normalized,
        width: result.width,
        height: result.height,
      })
      onImport({
        ...base,
        // A foto entra como a camada única do cenário.
        cels: [result.bitmap],
        ...paletteFields,
      })
    } else {
      const base = createTilesetAsset({ name: normalized, tileSize })
      onImport({
        ...base,
        tiles: result.tiles,
        solid: result.tiles.map(() => false),
        platform: result.tiles.map(() => false),
        ...paletteFields,
      })
    }
    close()
  }

  const title =
    step === 'target'
      ? COPY.importImage.title
      : step === 'size'
        ? target === 'sprite'
          ? COPY.importImage.spriteSizeTitle
          : target === 'background'
            ? COPY.importImage.sizeTitle
            : COPY.importImage.tileSizeTitle
        : COPY.newAsset.nameTitle

  const targetInfo = {
    sprite: COPY.importImage.asSprite,
    background: COPY.importImage.asBackground,
    tileset: COPY.importImage.asTileset,
  } as const

  const customOpen =
    (target === 'sprite' && spriteSizeKey === CUSTOM_SIZE_KEY && spriteSpec) ||
    (target === 'background' && sizeKey === CUSTOM_SIZE_KEY && backgroundSpec)

  return (
    <Dialog open onClose={close} title={title} wide={step !== 'name'}>
      {step === 'target' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TARGETS.map((t) => {
            const info = targetInfo[t]
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
            {target === 'sprite'
              ? [
                  ...SPRITE_FRAME_SIZES.map((size) => {
                    const key = String(size)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSpriteSizeKey(key)}
                        aria-pressed={spriteSizeKey === key}
                        className={sizeCardClass(spriteSizeKey === key)}
                      >
                        <span className="block font-bold">{COPY.sizes[size] ?? key}</span>
                        <span className="block text-xs text-pin-muted">
                          {size} × {size}
                        </span>
                      </button>
                    )
                  }),
                  <button
                    key={CUSTOM_SIZE_KEY}
                    type="button"
                    // Só revela o formulário (aqui nem existe auto-avançar).
                    onClick={() => {
                      if (spriteSizeKey !== CUSTOM_SIZE_KEY) {
                        setSpriteCustomValues(seedCustomValues('pixel-sprite', spriteSizeKey))
                        setSpriteSizeKey(CUSTOM_SIZE_KEY)
                      }
                    }}
                    aria-pressed={spriteSizeKey === CUSTOM_SIZE_KEY}
                    className={sizeCardClass(spriteSizeKey === CUSTOM_SIZE_KEY)}
                  >
                    {COPY.newAsset.customSize.card}
                  </button>,
                ]
              : target === 'background'
                ? [
                    ...BACKGROUND_SIZES.map((size) => {
                      const key = `${size.width}x${size.height}`
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSizeKey(key)}
                          aria-pressed={sizeKey === key}
                          className={sizeCardClass(sizeKey === key)}
                        >
                          {size.width} × {size.height}
                        </button>
                      )
                    }),
                    <button
                      key={CUSTOM_SIZE_KEY}
                      type="button"
                      // Só revela o formulário (aqui nem existe auto-avançar).
                      onClick={() => {
                        if (sizeKey !== CUSTOM_SIZE_KEY) {
                          setCustomValues(seedCustomValues('pixel-background', sizeKey))
                          setSizeKey(CUSTOM_SIZE_KEY)
                        }
                      }}
                      aria-pressed={sizeKey === CUSTOM_SIZE_KEY}
                      className={sizeCardClass(sizeKey === CUSTOM_SIZE_KEY)}
                    >
                      {COPY.newAsset.customSize.card}
                    </button>,
                  ]
                : TILE_SIZES.map((ts) => (
                    <button
                      key={ts}
                      type="button"
                      onClick={() => setTileSize(ts)}
                      aria-pressed={tileSize === ts}
                      className={sizeCardClass(tileSize === ts)}
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

          {customOpen ? (
            target === 'sprite' && spriteSpec ? (
              <CustomSizeFields
                spec={spriteSpec}
                values={spriteCustomValues}
                onChange={(field, raw) => setSpriteCustomValues((v) => ({ ...v, [field]: raw }))}
                idPrefix="pinta-import-size"
              />
            ) : backgroundSpec ? (
              <CustomSizeFields
                spec={backgroundSpec}
                values={customValues}
                onChange={(field, raw) => setCustomValues((v) => ({ ...v, [field]: raw }))}
                idPrefix="pinta-import-size"
              />
            ) : null
          ) : null}

          {/* Prévia já quantizada + recado das cores. */}
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-pin-bg p-3">
            <span className="pin-checkerboard flex items-center justify-center rounded-xl border-2 border-pin-border p-1">
              {result?.kind === 'sprite' || result?.kind === 'background' ? (
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
              {target === 'sprite' ? `${COPY.importImage.spriteFitNote} ` : ''}
              {COPY.importImage.colorsNote}
              {result
                ? ` · ${
                    paintedCount > 0
                      ? COPY.importImage.photoPalette(paintedCount)
                      : COPY.importImage.transparentPalette
                  }`
                : ''}
              {result?.kind === 'tileset' && !result.tooMany && result.tiles.length > 0
                ? ` · ${COPY.importImage.uniqueTiles(result.tiles.length)}`
                : ''}
            </span>
            {/* SEMPRE montada: live region inserida no DOM já preenchida não é
                anunciada pelos leitores — o texto entra numa região que existe. */}
            <span
              id="pinta-import-size-error"
              role="status"
              className="text-center text-sm font-bold text-pin-danger"
            >
              {tooMany
                ? COPY.importImage.tooManyTiles
                : noVisibleTiles
                  ? COPY.importImage.noVisibleTiles
                  : ''}
            </span>
          </div>

          <div className="mt-1 flex justify-between">
            <Button variant="ghost" onClick={() => setStep('target')}>
              {COPY.importImage.back}
            </Button>
            <Button
              variant="primary"
              disabled={tooMany || noVisibleTiles || !result}
              aria-describedby="pinta-import-size-error"
              onClick={() => setStep('name')}
            >
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
            aria-describedby="pinta-import-name-help"
            className="min-h-11 rounded-xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
          />
          {/* Espelho do NewAssetDialog: ajuda LIGADA ao input (aria-describedby). */}
          <p id="pinta-import-name-help" role="status" className="text-sm text-pin-muted">
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
