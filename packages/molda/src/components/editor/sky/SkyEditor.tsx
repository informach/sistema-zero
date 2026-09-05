/**
 * O editor do CÉU: prévia 3D à esquerda (o céu ilumina uma casinha e uma bola
 * metálica; sem WebGL, a miniatura CSS) e os controles à direita (céu de
 * partida, sol, cores, nuvens, estrelas, exposição). Cada slider é um GESTO:
 * ao vivo é `replace`, ao soltar UM `commitGesture` (um passo de desfazer por
 * arrasto). Mexer em qualquer controle põe o preset em "Do seu jeito".
 */
import type { ChangeEvent, JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { normalizeHex } from '../../../core/color'
import { COPY } from '../../../core/copy'
import type { MoldaSkyAsset } from '../../../core/model'
import { triggerDownload } from '../../../export/download'
import { exportSkyHdr, HDR_MIME } from '../../../export/skyHdr'
import {
  SKY_PRESET_IDS,
  SKY_RANGES,
  type SkyParams,
  type SkyPresetId,
  skyPreset,
} from '../../../sky/params'
import { renderSky, SKY_PREVIEW_SIZE } from '../../../sky/render'
import type { EditorStore } from '../../../state/editorStore'
import { prefersReducedMotion } from '../../../viewport/reducedMotion'
import type { SkyPreviewLike } from '../../../viewport/SkyPreview'
import { createSkyPreview } from '../../../viewport/skyPreviewFactory'
import { SkyThumb } from '../../gallery/thumbs'
import { Button } from '../../ui/Button'
import { Download, Sparkles } from '../../ui/icons'
import { Panel } from '../../ui/Panel'
import { useToast } from '../../ui/Toast'
import { useMediaQuery } from '../../ui/useMediaQuery'
import { EditorTopBar } from '../EditorTopBar'

const PREVIEW_DELAY_MS = 40

/** Um gesto de edição: `begin` guarda o antes, `update` mostra ao vivo, `end` commita. */
function useSkyGesture(editor: EditorStore): {
  begin(): void
  update(next: MoldaSkyAsset): void
  end(): void
  commit(next: MoldaSkyAsset): void
} {
  const before = useRef<MoldaSkyAsset | null>(null)
  const current = useCallback(() => editor.getState().asset as MoldaSkyAsset, [editor])
  return {
    begin: () => {
      if (!before.current) before.current = current()
    },
    update: (next) => {
      if (!before.current) before.current = current()
      editor.getState().replace(next)
    },
    end: () => {
      const start = before.current
      before.current = null
      if (!start) return
      const after = current()
      if (after !== start) editor.getState().commitGesture(start, after)
    },
    commit: (next) => {
      before.current = null
      if (next !== current()) editor.getState().commit(next)
    },
  }
}

function withParams(asset: MoldaSkyAsset, patch: Partial<SkyParams>): MoldaSkyAsset {
  return { ...asset, params: { ...asset.params, ...patch, preset: 'custom' } }
}

function SkySlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onBegin,
  onChange,
  onEnd,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (value: number) => string
  onBegin: () => void
  onChange: (value: number) => void
  onEnd: () => void
}): JSX.Element {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between text-xs font-bold text-mld-muted">
        <span>{label}</span>
        <span className="text-mld-text">{format ? format(value) : String(value)}</span>
      </span>
      <input
        type="range"
        name={label}
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onPointerDown={onBegin}
        onKeyDown={onBegin}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onEnd}
        onKeyUp={onEnd}
        onBlur={onEnd}
        className="h-11 w-full cursor-pointer accent-mld-accent"
      />
    </label>
  )
}

function ColorField({
  label,
  value,
  onBegin,
  onChange,
  onEnd,
}: {
  label: string
  value: string
  onBegin: () => void
  onChange: (hex: string) => void
  onEnd: () => void
}): JSX.Element {
  return (
    <label className="flex items-center justify-between gap-2 text-xs font-bold text-mld-muted">
      <span>{label}</span>
      <input
        type="color"
        name={label}
        aria-label={label}
        value={value}
        onFocus={onBegin}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const hex = normalizeHex(event.target.value)
          if (hex) onChange(hex)
        }}
        onBlur={onEnd}
        className="h-11 w-14 cursor-pointer rounded-lg border-2 border-mld-border bg-mld-surface"
      />
    </label>
  )
}

function useSkyPreviewCanvas(): {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  preview: SkyPreviewLike | null
  unsupported: boolean
} {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [preview, setPreview] = useState<SkyPreviewLike | null>(null)
  const [unsupported, setUnsupported] = useState(false)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let instance: SkyPreviewLike
    try {
      instance = createSkyPreview(canvas, { reducedMotion: prefersReducedMotion() })
    } catch {
      setUnsupported(true)
      return
    }
    setPreview(instance)
    return () => {
      instance.dispose()
      setPreview(null)
    }
  }, [])
  return { canvasRef, preview, unsupported }
}

export function SkyEditor({
  editor,
  onBack,
}: {
  editor: EditorStore
  onBack: () => void
}): JSX.Element {
  const asset = useStore(editor, (state) => state.asset) as MoldaSkyAsset
  const { showToast } = useToast()
  const gesture = useSkyGesture(editor)
  const wide = useMediaQuery('(min-width: 768px)')
  const { canvasRef, preview, unsupported } = useSkyPreviewCanvas()
  const copy = COPY.editor.sky
  const params = asset.params

  // A prévia acompanha os parâmetros com um atraso curto (o render é na CPU).
  useEffect(() => {
    if (!preview) return
    const timer = setTimeout(() => {
      preview.setSky(renderSky(params, SKY_PREVIEW_SIZE.width, SKY_PREVIEW_SIZE.height))
    }, PREVIEW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [preview, params])

  const current = useCallback(() => editor.getState().asset as MoldaSkyAsset, [editor])
  const patch = (next: Partial<SkyParams>): void => gesture.update(withParams(current(), next))
  const cloudPatch = (next: Partial<SkyParams['clouds']>): void =>
    gesture.update(withParams(current(), { clouds: { ...current().params.clouds, ...next } }))

  function applyPreset(id: SkyPresetId): void {
    if (current().params.preset === id) return
    gesture.commit({ ...current(), params: skyPreset(id) })
  }

  function shuffleClouds(): void {
    const seed = (Math.imul(current().params.clouds.seed, 1664525) + 1013904223) >>> 0
    gesture.commit(withParams(current(), { clouds: { ...current().params.clouds, seed } }))
  }

  function download(): void {
    showToast(copy.download.preparing)
    setTimeout(() => {
      const result = exportSkyHdr(current())
      if (!result.ok) {
        showToast(copy.download.tooBig)
        return
      }
      const blob = new Blob([result.bytes as BlobPart], { type: HDR_MIME })
      showToast(
        triggerDownload(blob, `${current().name}.hdr`, HDR_MIME)
          ? copy.download.ready
          : copy.download.failed,
      )
    }, 0)
  }

  const controls = (
    <>
      <Panel title={copy.presetsPanel} className="shrink-0">
        <div className="flex flex-wrap gap-2">
          {SKY_PRESET_IDS.map((id) => {
            const active = params.preset === id
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => applyPreset(id)}
                className={
                  active
                    ? 'flex min-h-11 items-center gap-2 rounded-full border-2 border-mld-accent bg-mld-accent px-3 text-sm font-bold text-mld-accent-fg'
                    : 'flex min-h-11 items-center gap-2 rounded-full border-2 border-mld-border bg-mld-surface px-3 text-sm font-bold text-mld-text hover:border-mld-accent'
                }
              >
                <span className="size-5 overflow-hidden rounded-full" aria-hidden="true">
                  <SkyThumb params={skyPreset(id)} />
                </span>
                {COPY.skyPresets[id]}
              </button>
            )
          })}
        </div>
        {params.preset === 'custom' ? (
          <p className="px-1 text-xs text-mld-muted">{COPY.skyPresets.custom}</p>
        ) : null}
      </Panel>
      <Panel title={copy.sun} className="shrink-0">
        <SkySlider
          label={copy.elevation}
          value={params.sunElevation}
          min={SKY_RANGES.sunElevation[0]}
          max={SKY_RANGES.sunElevation[1]}
          step={1}
          format={copy.degrees}
          onBegin={gesture.begin}
          onChange={(value) => patch({ sunElevation: value })}
          onEnd={gesture.end}
        />
        <SkySlider
          label={copy.azimuth}
          value={params.sunAzimuth}
          min={SKY_RANGES.sunAzimuth[0]}
          max={SKY_RANGES.sunAzimuth[1]}
          step={5}
          format={copy.degrees}
          onBegin={gesture.begin}
          onChange={(value) => patch({ sunAzimuth: value })}
          onEnd={gesture.end}
        />
        <SkySlider
          label={copy.size}
          value={params.sunSize}
          min={SKY_RANGES.sunSize[0]}
          max={SKY_RANGES.sunSize[1]}
          step={0.5}
          format={copy.degrees}
          onBegin={gesture.begin}
          onChange={(value) => patch({ sunSize: value })}
          onEnd={gesture.end}
        />
        <SkySlider
          label={copy.intensity}
          value={params.sunIntensity}
          min={SKY_RANGES.sunIntensity[0]}
          max={SKY_RANGES.sunIntensity[1]}
          step={1}
          onBegin={gesture.begin}
          onChange={(value) => patch({ sunIntensity: value })}
          onEnd={gesture.end}
        />
      </Panel>
      <Panel title={copy.colors} className="shrink-0">
        <ColorField
          label={copy.top}
          value={params.topColor}
          onBegin={gesture.begin}
          onChange={(hex) => patch({ topColor: hex })}
          onEnd={gesture.end}
        />
        <ColorField
          label={copy.horizon}
          value={params.horizonColor}
          onBegin={gesture.begin}
          onChange={(hex) => patch({ horizonColor: hex })}
          onEnd={gesture.end}
        />
        <ColorField
          label={copy.ground}
          value={params.groundColor}
          onBegin={gesture.begin}
          onChange={(hex) => patch({ groundColor: hex })}
          onEnd={gesture.end}
        />
      </Panel>
      <Panel
        title={copy.clouds}
        className="shrink-0"
        actions={
          <Button variant="ghost" onClick={shuffleClouds} className="min-h-11 px-2 text-xs">
            <Sparkles aria-hidden="true" className="size-4" />
            {copy.shuffle}
          </Button>
        }
      >
        <SkySlider
          label={copy.amount}
          value={params.clouds.amount}
          min={0}
          max={1}
          step={0.05}
          format={copy.percent}
          onBegin={gesture.begin}
          onChange={(value) => cloudPatch({ amount: value })}
          onEnd={gesture.end}
        />
        <SkySlider
          label={copy.softness}
          value={params.clouds.softness}
          min={0}
          max={1}
          step={0.05}
          format={copy.percent}
          onBegin={gesture.begin}
          onChange={(value) => cloudPatch({ softness: value })}
          onEnd={gesture.end}
        />
      </Panel>
      <Panel title={copy.stars} className="shrink-0">
        <SkySlider
          label={copy.stars}
          value={params.stars}
          min={0}
          max={1}
          step={0.05}
          format={copy.percent}
          onBegin={gesture.begin}
          onChange={(value) => patch({ stars: value })}
          onEnd={gesture.end}
        />
      </Panel>
      <Panel title={copy.exposure} className="shrink-0">
        <SkySlider
          label={copy.exposure}
          value={params.exposure}
          min={SKY_RANGES.exposure[0]}
          max={SKY_RANGES.exposure[1]}
          step={0.05}
          format={(value) => `${value.toFixed(2)}×`}
          onBegin={gesture.begin}
          onChange={(value) => patch({ exposure: value })}
          onEnd={gesture.end}
        />
      </Panel>
    </>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorTopBar
        editor={editor}
        onBack={onBack}
        actions={
          <Button
            variant="outline"
            onClick={download}
            aria-label={copy.download.hdr}
            title={copy.download.hdr}
            className="min-h-11 px-3 text-sm"
          >
            <Download aria-hidden="true" className="size-4" />
            <span className="hidden md:inline">{copy.download.hdr}</span>
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 overflow-hidden bg-mld-bg">
            {unsupported ? (
              <div className="flex h-full flex-col">
                <div className="min-h-0 flex-1">
                  <SkyThumb params={params} />
                </div>
                <p className="p-3 text-center text-sm text-mld-text-soft">{copy.unsupported}</p>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                aria-label={copy.preview}
                className="mld-viewport block size-full"
              />
            )}
          </div>
          {!wide ? (
            <details className="max-h-80 shrink-0 overflow-y-auto border-t-2 border-mld-border bg-mld-surface">
              <summary className="min-h-11 cursor-pointer px-3 py-2 text-sm font-bold text-mld-text">
                {copy.controls}
              </summary>
              <div className="flex flex-col gap-2 p-2">{controls}</div>
            </details>
          ) : null}
        </div>
        {wide ? (
          <aside className="flex w-72 shrink-0 flex-col gap-2 overflow-y-auto border-l-2 border-mld-border bg-mld-bg p-2">
            {controls}
          </aside>
        ) : null}
      </div>
    </div>
  )
}
