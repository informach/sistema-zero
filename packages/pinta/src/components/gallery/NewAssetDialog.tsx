/**
 * Criação de desenho em 4 passos: ESTILO (Pixel art | Vetor) → TIPO (cartões
 * ilustrados, os MESMOS papéis nos dois estilos) → TAMANHO (opções amigáveis
 * por tipo) → NOME (kebab, validado ao vivo). O mapa pede também qual tileset
 * usar (qualquer estilo serve) e fica desabilitado sem nenhum.
 */
import type { JSX } from 'react'
import { useMemo, useState } from 'react'
import { COPY } from '../../core/copy'
import {
  assetStyle,
  BACKGROUND_SIZES,
  normalizeAssetName,
  type PintaAsset,
  type PintaAssetKind,
  type PintaAssetStyle,
  SPRITE_FRAME_SIZES,
  TILE_SIZES,
  VECTOR_SIZES,
  VECTOR_SPRITE_SIZES,
  VECTOR_TILE_SIZES,
} from '../../core/project'
import type { NewAssetInput } from '../../state/galleryStore'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

const TILEMAP_SIZES = [
  { cols: 12, rows: 9 },
  { cols: 20, rows: 15 },
  { cols: 30, rows: 20 },
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
export type NewAssetRole = 'sprite' | 'background' | 'tileset'

const KIND_FOR_ROLE: Record<PintaAssetStyle, Record<NewAssetRole, PintaAssetKind>> = {
  pixel: { sprite: 'pixel-sprite', background: 'pixel-background', tileset: 'tileset' },
  vector: { sprite: 'vector-sprite', background: 'vector-background', tileset: 'vector-tileset' },
}

type Step = 'style' | 'kind' | 'size' | 'name'

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

function buildInput(
  kind: PintaAssetKind,
  sizeKey: string,
  name: string,
  tilesetId: string,
): NewAssetInput {
  switch (kind) {
    case 'pixel-sprite':
      return { kind, name, frameSize: Number(sizeKey) }
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
    case 'vector-sprite':
      return { kind, name, frameSize: Number(sizeKey) }
    case 'vector-background': {
      const [w = 480, h = 360] = sizeKey.split('x').map(Number)
      return { kind, name, width: w, height: h }
    }
    case 'vector-tileset':
      return { kind, name, tileSize: Number(sizeKey) }
  }
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
}): JSX.Element | null {
  const [step, setStep] = useState<Step>('style')
  const [style, setStyle] = useState<PintaAssetStyle>(initialStyle)
  const [kind, setKind] = useState<PintaAssetKind | null>(null)
  const [sizeKey, setSizeKey] = useState<string>('')
  const [tilesetId, setTilesetId] = useState<string>('')
  const [name, setName] = useState(initialName)

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
    setTilesetId('')
    setName(initialName)
  }

  /** Com papel pré-escolhido, escolher o estilo já resolve o tipo → tamanho. */
  function pickStyle(s: PintaAssetStyle): void {
    setStyle(s)
    if (initialRole) {
      const k = KIND_FOR_ROLE[s][initialRole]
      setKind(k)
      setSizeKey(sizeChoicesFor(k)[0]?.key ?? '')
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

  const title =
    step === 'style'
      ? COPY.newAsset.styleTitle
      : step === 'kind'
        ? COPY.newAsset.title
        : step === 'size'
          ? COPY.newAsset.sizeTitle
          : COPY.newAsset.nameTitle

  const STEP_ORDER: Step[] = ['style', 'kind', 'size', 'name']
  const stepIndex = STEP_ORDER.indexOf(step)

  return (
    <Dialog open onClose={close} title={title} wide={step === 'style' || step === 'kind'}>
      {/* Bolinhas de progresso: a criança vê quanto falta. */}
      <div
        role="img"
        className="mb-3 flex justify-center gap-2"
        aria-label={`Passo ${stepIndex + 1} de ${STEP_ORDER.length}`}
      >
        {STEP_ORDER.map((s, i) => (
          <span
            key={s}
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full transition ${
              i <= stepIndex ? 'bg-pin-accent' : 'bg-pin-border'
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STYLE_ORDER.map((s) => {
            const info = COPY.styles[s]
            return (
              <button
                key={s}
                type="button"
                onClick={() => pickStyle(s)}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 bg-pin-bg p-6 text-center transition hover:shadow-md ${STYLE_RING_CLASSES[s]}`}
              >
                <span aria-hidden="true" className="text-5xl">
                  {info.emoji}
                </span>
                <span className="block text-lg font-bold">{info.title}</span>
                <span className="block text-sm text-pin-muted">{info.description}</span>
              </button>
            )
          })}
        </div>
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
                  className={`flex items-start gap-3 rounded-2xl border-2 bg-pin-bg p-4 text-left transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${KIND_RING_CLASSES[k]}`}
                >
                  <span aria-hidden="true" className="text-3xl">
                    {info.emoji}
                  </span>
                  <span>
                    <span className="block text-base font-bold">{info.title}</span>
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
              <div className="flex flex-wrap gap-2">
                {tilesets.map((tileset) => {
                  const tilesetStyle = assetStyle(tileset.kind)
                  return (
                    <button
                      key={tileset.id}
                      type="button"
                      onClick={() => setTilesetId(tileset.id)}
                      aria-pressed={tilesetId === tileset.id}
                      className={`min-h-11 rounded-2xl border-2 px-4 font-bold transition ${
                        tilesetId === tileset.id
                          ? 'border-pin-accent bg-pin-accent text-pin-accent-fg'
                          : 'border-pin-border bg-pin-bg hover:border-pin-accent'
                      }`}
                    >
                      🧩 {tileset.name}
                      {tilesetStyle ? (
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold text-white ${
                            tilesetStyle === 'pixel' ? 'bg-pin-style-pixel' : 'bg-pin-style-vector'
                          }`}
                        >
                          {COPY.styleBadge[tilesetStyle]}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            {sizeChoicesFor(kind).map((choice) => (
              <button
                key={choice.key}
                type="button"
                onClick={() => setSizeKey(choice.key)}
                aria-pressed={sizeKey === choice.key}
                className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 p-3 transition ${
                  sizeKey === choice.key
                    ? 'border-pin-accent bg-pin-accent/10'
                    : 'border-pin-border bg-pin-bg hover:border-pin-accent'
                }`}
              >
                <span className="text-base font-bold">{choice.label}</span>
                <span className="text-sm text-pin-muted">{choice.detail}</span>
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(initialRole ? 'style' : 'kind')}>
              {COPY.newAsset.back}
            </Button>
            <Button variant="primary" disabled={!sizeKey} onClick={() => setStep('name')}>
              {COPY.newAsset.next}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'name' && kind ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!normalized || nameError) return
            onCreate(buildInput(kind, sizeKey, normalized, tilesetId))
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
            className="min-h-11 rounded-2xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
          />
          {/* role=status: o leitor de tela anuncia quando a ajuda vira erro. */}
          <p id="pinta-new-asset-name-help" role="status" className="text-sm text-pin-muted">
            {nameError ?? COPY.newAsset.nameHelp}
            {normalized && normalized !== name.trim() && !nameError ? (
              <>
                {' '}
                Vai ficar assim: <strong>{normalized}</strong>
              </>
            ) : null}
          </p>
          <div className="mt-1 flex justify-between">
            <Button variant="ghost" onClick={() => setStep('size')}>
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
