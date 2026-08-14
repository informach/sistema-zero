/**
 * Criação de desenho em 4 passos: ESTILO (Pixel art | Vetor) → TIPO (cartões
 * ilustrados, os MESMOS papéis nos dois estilos) → TAMANHO (opções amigáveis
 * por tipo) → NOME (kebab, validado ao vivo). O mapa pede também qual tileset
 * usar (qualquer estilo serve) e fica desabilitado sem nenhum.
 */
import type { JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import {
  type AnyTilesetAsset,
  assetStyle,
  BACKGROUND_SIZES,
  isTilesetKind,
  normalizeAssetName,
  type PintaAsset,
  type PintaAssetKind,
  type PintaAssetStyle,
  resolveAssetPalette,
  SPRITE_FRAME_SIZES,
  TILE_SIZES,
  type TilesetAsset,
  VECTOR_SIZES,
  VECTOR_SPRITE_SIZES,
  VECTOR_TILE_SIZES,
} from '../../core/project'
import { paintBitmap } from '../../pixel/render'
import type { NewAssetInput } from '../../state/galleryStore'
import { VectorFrameSvg } from '../../vector/VectorFrameSvg'
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
import { TemplatePicker } from './TemplatePicker'

/** Primeiro nome livre por sufixo (`heroi` → `heroi-2`) para o passo de nome. */
function firstFreeName(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base
  for (let n = 2; n <= 99; n += 1) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
  return base
}

const TILEMAP_SIZES = [
  { cols: 12, rows: 9 },
  { cols: 20, rows: 15 },
  { cols: 40, rows: 30 },
  { cols: 64, rows: 48 },
  { cols: 128, rows: 96 },
] as const

const STYLE_ORDER: PintaAssetStyle[] = ['pixel', 'vector']

/** Os papéis são os MESMOS nos dois estilos; o Mapa é um só (usa qualquer tileset). */
const KINDS_BY_STYLE: Record<PintaAssetStyle, PintaAssetKind[]> = {
  pixel: ['pixel-sprite', 'pixel-background', 'tileset', 'tilemap'],
  vector: ['vector-sprite', 'vector-background', 'vector-tileset', 'tilemap'],
}

/** Cor do cartão por PAPEL (personagem/cenário/peças/mapa), igual nos 2 estilos. */
const KIND_RING_CLASSES: Record<PintaAssetKind, string> = {
  'pixel-sprite': 'border-pin-kind-sprite',
  'pixel-background': 'border-pin-kind-background',
  tileset: 'border-pin-kind-tileset',
  tilemap: 'border-pin-kind-tilemap',
  'vector-sprite': 'border-pin-kind-sprite',
  'vector-background': 'border-pin-kind-background',
  'vector-tileset': 'border-pin-kind-tileset',
}

const STYLE_RING_CLASSES: Record<PintaAssetStyle, string> = {
  pixel: 'border-pin-style-pixel',
  vector: 'border-pin-style-vector',
}

/** Papel sugerido pela missão de arte do Pensa (a criança ainda escolhe o estilo). */
export type NewAssetRole = 'sprite' | 'background' | 'tileset' | 'tilemap'

const KIND_FOR_ROLE: Record<PintaAssetStyle, Record<NewAssetRole, PintaAssetKind>> = {
  pixel: {
    sprite: 'pixel-sprite',
    background: 'pixel-background',
    tileset: 'tileset',
    tilemap: 'tilemap',
  },
  vector: {
    sprite: 'vector-sprite',
    background: 'vector-background',
    tileset: 'vector-tileset',
    tilemap: 'tilemap',
  },
}

type Step = 'style' | 'kind' | 'size' | 'template' | 'name'

/**
 * Pré-seleção da missão de arte: sprite pixel nasce em 32 (chega ao Estúdio com
 * mais resolução sem a criança pensar nisso — 16 segue disponível no passo de
 * tamanho); os demais tipos ficam na 1ª opção, como antes.
 */
function preferredSizeKeyFor(kind: PintaAssetKind): string {
  const choices = sizeChoicesFor(kind)
  if (kind === 'pixel-sprite') {
    const thirtyTwo = choices.find((c) => c.key === '32')
    if (thirtyTwo) return thirtyTwo.key
  }
  return choices[0]?.key ?? ''
}

interface SizeChoice {
  key: string
  label: string
  detail: string
}

function sizeChoicesFor(kind: PintaAssetKind): SizeChoice[] {
  switch (kind) {
    case 'pixel-sprite':
      return SPRITE_FRAME_SIZES.map((size) => ({
        key: String(size),
        label: COPY.sizes[size] ?? String(size),
        detail: `${size} × ${size}`,
      }))
    case 'pixel-background':
      return BACKGROUND_SIZES.map((size, index) => ({
        key: `${size.width}x${size.height}`,
        label: COPY.sizeScale[index] ?? '',
        detail: `${size.width} × ${size.height}`,
      }))
    case 'tileset':
      return TILE_SIZES.map((size, index) => ({
        key: String(size),
        label: COPY.sizeScale[index] ?? '',
        detail: `peças de ${size} × ${size}`,
      }))
    case 'tilemap':
      return TILEMAP_SIZES.map((size, index) => ({
        key: `${size.cols}x${size.rows}`,
        label: COPY.sizeScale[index] ?? '',
        detail: `${size.cols} × ${size.rows} peças`,
      }))
    case 'vector-sprite':
      return VECTOR_SPRITE_SIZES.map((size, index) => ({
        key: String(size),
        label: COPY.sizeScale[index] ?? '',
        detail: `${size} × ${size}`,
      }))
    case 'vector-background':
      return VECTOR_SIZES.map((size, index) => ({
        key: `${size.width}x${size.height}`,
        label: COPY.sizeScale[index] ?? '',
        detail: `${size.width} × ${size.height}`,
      }))
    case 'vector-tileset':
      return VECTOR_TILE_SIZES.map((size, index) => ({
        key: String(size),
        label: COPY.sizeScale[index] ?? '',
        detail: `peças de ${size} × ${size}`,
      }))
  }
}

/**
 * Quadro do personagem: "64" (preset quadrado) ou "128x32" (personalizado).
 * O `frameSize` continua indo junto por compatibilidade das fábricas.
 */
function quadro(sizeKey: string): [number, number] {
  const [w = 32, h] = sizeKey.split('x').map(Number)
  return [w, Number.isFinite(h) && h ? h : w]
}

function buildInput(
  kind: PintaAssetKind,
  sizeKey: string,
  name: string,
  tilesetId: string,
): NewAssetInput {
  switch (kind) {
    case 'pixel-sprite': {
      const [w, h] = quadro(sizeKey)
      return { kind, name, frameSize: w, frameWidth: w, frameHeight: h }
    }
    case 'pixel-background': {
      const [w = 160, h = 120] = sizeKey.split('x').map(Number)
      return { kind, name, width: w, height: h }
    }
    case 'tileset':
      return { kind, name, tileSize: Number(sizeKey) }
    case 'tilemap': {
      const [cols = 12, rows = 9] = sizeKey.split('x').map(Number)
      return { kind, name, tilesetId, cols, rows }
    }
    case 'vector-sprite': {
      const [w, h] = quadro(sizeKey)
      return { kind, name, frameSize: w, frameWidth: w, frameHeight: h }
    }
    case 'vector-background': {
      const [w = 480, h = 360] = sizeKey.split('x').map(Number)
      return { kind, name, width: w, height: h }
    }
    case 'vector-tileset':
      return { kind, name, tileSize: Number(sizeKey) }
  }
}

/** Quantas peças a miniatura do card mostra (o resto entra na contagem "N peças"). */
const TILESET_PREVIEW_TILES = 6

/** Uma peça pixel na miniatura do card (canvas 1:1, CSS pixelated). */
function PixelTilePreview({
  tileset,
  index,
}: {
  tileset: TilesetAsset
  index: number
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const colors = useMemo(() => resolveAssetPalette(tileset), [tileset])
  useEffect(() => {
    const canvas = canvasRef.current
    const bitmap = tileset.tiles[index]
    if (canvas && bitmap) paintBitmap(canvas, bitmap, colors)
  }, [tileset, index, colors])
  return (
    <canvas
      ref={canvasRef}
      className="pin-pixelated h-full w-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

/** Miniatura do CONJUNTO: as primeiras peças do tileset lado a lado (mostra que é uma coleção). */
function TilesetPreview({ tileset }: { tileset: AnyTilesetAsset }): JSX.Element {
  const shown = Math.min(tileset.tiles.length, TILESET_PREVIEW_TILES)
  return (
    <div className="pin-checkerboard flex w-full gap-0.5 overflow-hidden rounded-lg border-2 border-pin-border p-1">
      {Array.from({ length: shown }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: as peças não têm id; a ordem É a identidade
          key={i}
          className="size-8 shrink-0"
        >
          {tileset.kind === 'tileset' ? (
            <PixelTilePreview tileset={tileset} index={i} />
          ) : (
            <VectorFrameSvg
              width={tileset.tileSize}
              height={tileset.tileSize}
              shapes={tileset.tiles[i] ?? []}
              className="h-full w-full"
            />
          )}
        </span>
      ))}
    </div>
  )
}

export function NewAssetDialog({
  open,
  tilesets,
  takenNames,
  creating,
  initialStyle = 'pixel',
  initialRole = null,
  initialName = '',
  projectName = null,
  onClose,
  onCreate,
  onCreateFromTemplate,
}: {
  open: boolean
  /** Tilesets existentes de QUALQUER estilo (habilitam o Mapa + seletor). */
  tilesets: PintaAsset[]
  takenNames: ReadonlySet<string>
  creating: boolean
  /** Último estilo usado (galeria) — vem pré-destacado no primeiro passo. */
  initialStyle?: PintaAssetStyle
  /** Papel pré-escolhido (missão de arte do Pensa): escolher o estilo PULA o passo de tipo. */
  initialRole?: NewAssetRole | null
  /** Nome sugerido (a criança pode trocar). */
  initialName?: string
  /** Nome do jogo do Pensa — mostra o selo "Desenho para o jogo: ..." no topo. */
  projectName?: string | null
  onClose: () => void
  onCreate: (input: NewAssetInput) => void
  /** Cria a partir de um modelo pronto (novo ramo do wizard). */
  onCreateFromTemplate: (input: { templateId: string; name: string }) => void
}): JSX.Element | null {
  const [step, setStep] = useState<Step>('style')
  const [style, setStyle] = useState<PintaAssetStyle>(initialStyle)
  const [kind, setKind] = useState<PintaAssetKind | null>(null)
  const [sizeKey, setSizeKey] = useState<string>('')
  const [customValues, setCustomValues] = useState<CustomSizeValues>(EMPTY_CUSTOM_VALUES)
  const [tilesetId, setTilesetId] = useState<string>('')
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [name, setName] = useState(initialName)

  // Tamanho personalizado: `sizeKey` fica na sentinela 'custom' e a chave REAL
  // ("300x200"/"96"/"50x40") é derivada dos campos — inválida ⇒ null ⇒ o
  // "Avançar" desabilita. `buildInput` segue lendo a mesma string de sempre.
  const customSpec = kind ? customSizeSpecFor(kind) : null
  const customKey = kind && customSpec ? buildCustomSizeKey(kind, customValues) : null
  const effectiveSizeKey = sizeKey === CUSTOM_SIZE_KEY ? customKey : sizeKey

  const normalized = useMemo(() => normalizeAssetName(name), [name])
  const nameError = !name.trim()
    ? null
    : !normalized
      ? COPY.newAsset.nameInvalid
      : takenNames.has(normalized)
        ? COPY.newAsset.nameTaken
        : null

  function reset(): void {
    setStep('style')
    setStyle(initialStyle)
    setKind(null)
    setSizeKey('')
    setCustomValues(EMPTY_CUSTOM_VALUES)
    setTilesetId('')
    setTemplateId(null)
    setName(initialName)
  }

  /** Com papel pré-escolhido, escolher o estilo já resolve o tipo → tamanho. */
  function pickStyle(s: PintaAssetStyle): void {
    setStyle(s)
    if (initialRole) {
      const k = KIND_FOR_ROLE[s][initialRole]
      setKind(k)
      setSizeKey(preferredSizeKeyFor(k))
      if (k === 'tilemap') {
        // A missão de MAPA pula o card de tipo, então replica a pré-seleção
        // dele — sem isso o mapa nasceria com tilesetId '' (apontando para
        // tileset nenhum); o Avançar do passo de tamanho também exige tileset.
        const preferred = tilesets.find((t) => assetStyle(t.kind) === s)
        setTilesetId(preferred?.id ?? tilesets[0]?.id ?? '')
      }
      setStep('size')
      return
    }
    setStep('kind')
  }

  function close(): void {
    reset()
    onClose()
  }

  if (!open) return null

  const inTemplateBranch = step === 'template' || (step === 'name' && templateId !== null)

  const title =
    step === 'style'
      ? COPY.newAsset.styleTitle
      : step === 'kind'
        ? COPY.newAsset.title
        : step === 'size'
          ? COPY.newAsset.sizeTitle
          : step === 'template'
            ? COPY.templates.stepTitle
            : COPY.newAsset.nameTitle

  const STEP_ORDER: Step[] = inTemplateBranch
    ? ['style', 'template', 'name']
    : ['style', 'kind', 'size', 'name']
  const stepIndex = STEP_ORDER.indexOf(step)

  return (
    <Dialog
      open
      onClose={close}
      title={title}
      wide={step === 'style' || step === 'kind' || step === 'template'}
    >
      {/* Bolinhas de progresso: a criança vê quanto falta. */}
      <div
        role="img"
        className="mb-3 flex justify-center gap-2"
        aria-label={COPY.a11y.step(stepIndex + 1, STEP_ORDER.length)}
      >
        {STEP_ORDER.map((s, i) => (
          <span
            key={s}
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full transition ${
              i <= stepIndex ? '[background-image:var(--pin-gradient)]' : 'bg-pin-border'
            }`}
          />
        ))}
      </div>

      {projectName ? (
        <p className="mb-3 rounded-2xl bg-pin-bg px-4 py-2 text-center text-sm font-bold text-pin-muted">
          <span aria-hidden="true">🎮 </span>
          {COPY.newAsset.forProjectPrefix}: {projectName}
        </p>
      ) : null}

      {step === 'style' ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {STYLE_ORDER.map((s) => {
              const info = COPY.styles[s]
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => pickStyle(s)}
                  className={`pin-pop flex flex-col items-center gap-2 rounded-2xl border-2 bg-pin-bg p-6 text-center transition hover:shadow-md ${STYLE_RING_CLASSES[s]}`}
                >
                  <span aria-hidden="true" className="text-5xl">
                    {info.emoji}
                  </span>
                  <span className="pin-display block text-lg">{info.title}</span>
                  <span className="block text-sm text-pin-muted">{info.description}</span>
                </button>
              )
            })}
          </div>
          {/* 3º cartão: começar de um MODELO PRONTO (à parte dos 2 estilos). */}
          <button
            type="button"
            onClick={() => setStep('template')}
            className="pin-pop flex items-center justify-center gap-3 rounded-2xl border-2 border-pin-accent bg-pin-accent/5 p-4 text-center transition hover:shadow-md"
          >
            <span aria-hidden="true" className="text-3xl">
              {COPY.templates.styleCard.emoji}
            </span>
            <span>
              <span className="pin-display block text-base">{COPY.templates.styleCard.title}</span>
              <span className="block text-sm text-pin-muted">
                {COPY.templates.styleCard.description}
              </span>
            </span>
          </button>
        </div>
      ) : null}

      {step === 'template' ? (
        <TemplatePicker
          role={initialRole}
          onPick={(template) => {
            setTemplateId(template.id)
            setName(firstFreeName(template.suggestedName, takenNames))
            setStep('name')
          }}
          onBack={() => setStep('style')}
        />
      ) : null}

      {step === 'kind' ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {KINDS_BY_STYLE[style].map((k) => {
              const info = COPY.kinds[k]
              const disabled = k === 'tilemap' && tilesets.length === 0
              return (
                <button
                  key={k}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setKind(k)
                    const first = sizeChoicesFor(k)[0]
                    setSizeKey(first?.key ?? '')
                    if (k === 'tilemap') {
                      // Pré-seleciona um tileset do ESTILO escolhido, se houver.
                      const preferred = tilesets.find((t) => assetStyle(t.kind) === style)
                      setTilesetId(preferred?.id ?? tilesets[0]?.id ?? '')
                    }
                    setStep('size')
                  }}
                  className={`pin-pop flex items-start gap-3 rounded-2xl border-2 bg-pin-bg p-4 text-left transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${KIND_RING_CLASSES[k]}`}
                >
                  <span aria-hidden="true" className="text-3xl">
                    {info.emoji}
                  </span>
                  <span>
                    <span className="pin-display block text-base">{info.title}</span>
                    <span className="block text-sm text-pin-muted">
                      {disabled ? COPY.newAsset.needTileset : info.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-1 flex justify-start">
            <Button variant="ghost" onClick={() => setStep('style')}>
              {COPY.newAsset.back}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'size' && kind ? (
        <div className="flex flex-col gap-3">
          {kind === 'tilemap' && tilesets.length > 0 ? (
            <div>
              <span className="mb-1 block text-sm font-bold text-pin-muted">
                {COPY.newAsset.chooseTilesetTitle}
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {tilesets.map((tileset) => {
                  if (!isTilesetKind(tileset)) return null
                  const tilesetStyle = assetStyle(tileset.kind)
                  const selected = tilesetId === tileset.id
                  return (
                    <button
                      key={tileset.id}
                      type="button"
                      onClick={() => setTilesetId(tileset.id)}
                      aria-pressed={selected}
                      className={`pin-pop flex flex-col items-start gap-1 rounded-2xl border-2 p-2 text-left transition ${
                        selected
                          ? 'border-pin-accent bg-pin-accent/10'
                          : 'border-pin-border bg-pin-bg hover:border-pin-accent'
                      }`}
                    >
                      <TilesetPreview tileset={tileset} />
                      <span className="flex w-full items-center justify-between gap-1">
                        <span className="pin-display truncate text-sm" title={tileset.name}>
                          {tileset.name}
                        </span>
                        {tilesetStyle ? (
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${
                              tilesetStyle === 'pixel'
                                ? 'bg-pin-style-pixel'
                                : 'bg-pin-style-vector'
                            }`}
                          >
                            {COPY.styleBadge[tilesetStyle]}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-pin-muted">
                        {COPY.newAsset.tilesetPieces(tileset.tiles.length)} · {tileset.tileSize}×
                        {tileset.tileSize}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
          {kind === 'tilemap' && tilesets.length === 0 ? (
            // Missão de mapa sem nenhum tileset: explica por que o Avançar
            // está travado (botão desabilitado nunca fica sem explicação).
            <p role="status" className="text-sm font-bold text-pin-muted">
              {COPY.newAsset.needTileset}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            {sizeChoicesFor(kind).map((choice) => (
              <button
                key={choice.key}
                type="button"
                // Tocar num tamanho já avança para o nome (um toque a menos); o
                // botão "Avançar" fica p/ quem aceita o tamanho pré-selecionado.
                onClick={() => {
                  setSizeKey(choice.key)
                  setStep('name')
                }}
                aria-pressed={sizeKey === choice.key}
                className={`pin-pop flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 p-3 transition ${
                  sizeKey === choice.key
                    ? 'border-pin-accent bg-pin-accent/10'
                    : 'border-pin-border bg-pin-bg hover:border-pin-accent'
                }`}
              >
                <span className="text-base font-bold">{choice.label}</span>
                <span className="text-sm text-pin-muted">{choice.detail}</span>
              </button>
            ))}
            {customSpec ? (
              <button
                type="button"
                // ⚠️ SEM setStep: selecionar só revela o formulário (a criança
                // ainda vai digitar) — o caminho de saída é o "Avançar".
                onClick={() => {
                  if (sizeKey !== CUSTOM_SIZE_KEY) {
                    setCustomValues(seedCustomValues(kind, sizeKey))
                    setSizeKey(CUSTOM_SIZE_KEY)
                  }
                }}
                aria-pressed={sizeKey === CUSTOM_SIZE_KEY}
                className={`pin-pop flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 p-3 transition ${
                  sizeKey === CUSTOM_SIZE_KEY
                    ? 'border-pin-accent bg-pin-accent/10'
                    : 'border-pin-border bg-pin-bg hover:border-pin-accent'
                }`}
              >
                <span className="text-base font-bold">{COPY.newAsset.customSize.card}</span>
                <span className="text-sm text-pin-muted">
                  {COPY.newAsset.customSize.cardDetail}
                </span>
              </button>
            ) : null}
          </div>
          {sizeKey === CUSTOM_SIZE_KEY && customSpec ? (
            <CustomSizeFields
              spec={customSpec}
              values={customValues}
              onChange={(field, raw) => setCustomValues((v) => ({ ...v, [field]: raw }))}
              idPrefix="pinta-new-asset-size"
            />
          ) : null}
          <div className="mt-1 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(initialRole ? 'style' : 'kind')}>
              {COPY.newAsset.back}
            </Button>
            <Button
              variant="primary"
              // Mapa sem tileset não avança (a missão do Pensa entra aqui SEM
              // passar pelo card de tipo, que é quem guardava esse portão).
              disabled={!effectiveSizeKey || (kind === 'tilemap' && !tilesetId)}
              onClick={() => setStep('name')}
            >
              {COPY.newAsset.next}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'name' && (kind || templateId) ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!normalized || nameError) return
            if (templateId) onCreateFromTemplate({ templateId, name: normalized })
            else if (kind && effectiveSizeKey)
              onCreate(buildInput(kind, effectiveSizeKey, normalized, tilesetId))
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={COPY.newAsset.namePlaceholder}
            aria-label={COPY.newAsset.nameTitle}
            aria-invalid={Boolean(nameError)}
            aria-describedby="pinta-new-asset-name-help"
            className="min-h-11 rounded-xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
          />
          {/* role=status: o leitor de tela anuncia quando a ajuda vira erro. */}
          <p id="pinta-new-asset-name-help" role="status" className="text-sm text-pin-muted">
            {nameError ?? COPY.newAsset.nameHelp}
            {normalized && normalized !== name.trim() && !nameError ? (
              <>
                {' '}
                {COPY.newAsset.willLookLike} <strong>{normalized}</strong>
              </>
            ) : null}
          </p>
          <div className="mt-1 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(templateId ? 'template' : 'size')}>
              {COPY.newAsset.back}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!normalized || Boolean(nameError) || creating}
            >
              {creating ? COPY.newAsset.creating : COPY.newAsset.createButton}
            </Button>
          </div>
        </form>
      ) : null}
    </Dialog>
  )
}
