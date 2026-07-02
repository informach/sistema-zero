/**
 * Criação de desenho em 3 passos: TIPO (5 cartões ilustrados) → TAMANHO
 * (opções amigáveis por tipo) → NOME (kebab, validado ao vivo). O mapa pede
 * também qual tileset usar (e fica desabilitado sem nenhum).
 */
import type { JSX } from 'react'
import { useMemo, useState } from 'react'
import { COPY } from '../../core/copy'
import {
  BACKGROUND_SIZES,
  normalizeAssetName,
  type PintaAsset,
  type PintaAssetKind,
  SPRITE_FRAME_SIZES,
  TILE_SIZES,
  VECTOR_SIZES,
} from '../../core/project'
import type { NewAssetInput } from '../../state/galleryStore'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

const TILEMAP_SIZES = [
  { cols: 12, rows: 9 },
  { cols: 20, rows: 15 },
  { cols: 30, rows: 20 },
] as const

const KIND_ORDER: PintaAssetKind[] = [
  'pixel-sprite',
  'pixel-background',
  'tileset',
  'tilemap',
  'vector',
]

const KIND_RING_CLASSES: Record<PintaAssetKind, string> = {
  'pixel-sprite': 'border-pin-kind-sprite',
  'pixel-background': 'border-pin-kind-background',
  tileset: 'border-pin-kind-tileset',
  tilemap: 'border-pin-kind-tilemap',
  vector: 'border-pin-kind-vector',
}

type Step = 'kind' | 'size' | 'name'

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
    case 'vector':
      return VECTOR_SIZES.map((size, index) => ({
        key: `${size.width}x${size.height}`,
        label: COPY.sizeScale[index] ?? '',
        detail: `${size.width} × ${size.height}`,
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
    case 'vector': {
      const [w = 480, h = 360] = sizeKey.split('x').map(Number)
      return { kind, name, width: w, height: h }
    }
  }
}

export function NewAssetDialog({
  open,
  tilesets,
  takenNames,
  creating,
  onClose,
  onCreate,
}: {
  open: boolean
  /** Tilesets existentes (habilitam o cartão de Mapa e alimentam o seletor). */
  tilesets: PintaAsset[]
  takenNames: ReadonlySet<string>
  creating: boolean
  onClose: () => void
  onCreate: (input: NewAssetInput) => void
}): JSX.Element | null {
  const [step, setStep] = useState<Step>('kind')
  const [kind, setKind] = useState<PintaAssetKind | null>(null)
  const [sizeKey, setSizeKey] = useState<string>('')
  const [tilesetId, setTilesetId] = useState<string>('')
  const [name, setName] = useState('')

  const normalized = useMemo(() => normalizeAssetName(name), [name])
  const nameError = !name.trim()
    ? null
    : !normalized
      ? COPY.newAsset.nameInvalid
      : takenNames.has(normalized)
        ? COPY.newAsset.nameTaken
        : null

  function reset(): void {
    setStep('kind')
    setKind(null)
    setSizeKey('')
    setTilesetId('')
    setName('')
  }

  function close(): void {
    reset()
    onClose()
  }

  if (!open) return null

  const title =
    step === 'kind'
      ? COPY.newAsset.title
      : step === 'size'
        ? COPY.newAsset.sizeTitle
        : COPY.newAsset.nameTitle

  return (
    <Dialog open onClose={close} title={title} wide={step === 'kind'}>
      {step === 'kind' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {KIND_ORDER.map((k) => {
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
                  if (k === 'tilemap') setTilesetId(tilesets[0]?.id ?? '')
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
      ) : null}

      {step === 'size' && kind ? (
        <div className="flex flex-col gap-3">
          {kind === 'tilemap' && tilesets.length > 0 ? (
            <div>
              <span className="mb-1 block text-sm font-bold text-pin-muted">
                {COPY.newAsset.chooseTilesetTitle}
              </span>
              <div className="flex flex-wrap gap-2">
                {tilesets.map((tileset) => (
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
                  </button>
                ))}
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
            <Button variant="ghost" onClick={() => setStep('kind')}>
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
            className="min-h-11 rounded-2xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
          />
          <p className="text-sm text-pin-muted">
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
              {COPY.newAsset.createButton}
            </Button>
          </div>
        </form>
      ) : null}
    </Dialog>
  )
}
