import { type JSX, type ReactNode, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { CAMERA_VIEWS, type CameraView } from '../../../viewport/types'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { ImageIcon } from '../../ui/icons'
import { useReferenceImage } from './useReferenceImage'

const DEFAULT_PLACEMENT = { opacity: 30, scale: 80, x: 0, y: 0, flipped: false, visible: true }

/** Screen-space reference, owned only by this viewport. Never enters snapshots, thumbnails or exports. */
export function ReferenceImageGuide({
  children,
  view,
  disabled,
  available = true,
  triggerPlacement = 'top-3 left-3',
}: {
  children: ReactNode
  view: CameraView
  disabled: boolean
  /**
   * `false` quando a imagem de apoio está trancada (o portão da oficina nova): o palco
   * continua, sem o gatilho, a caixa e a imagem. O editor antigo não passa, e fica igual.
   */
  available?: boolean
  /**
   * Onde o gatilho fica no palco. O editor antigo usa o canto de cima; a oficina nova tem as
   * ferramentas flutuando nesse canto (z-20) e ali o gatilho ficava coberto e sem clique.
   */
  triggerPlacement?: string
}): JSX.Element {
  const reference = useReferenceImage()
  const [open, setOpen] = useState(false)
  const [boundView, setBoundView] = useState(view)
  const [placement, setPlacement] = useState(DEFAULT_PLACEMENT)
  const fileInput = useRef<HTMLInputElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const copy = COPY.editor.model.reference
  const close = () => {
    reference.cancel()
    setOpen(false)
  }
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_50%_30%,color-mix(in_oklab,var(--color-mld-surface)_70%,var(--color-mld-bg)),var(--color-mld-bg))]">
      {children}
      {available && reference.image && placement.visible && boundView === view && !disabled && (
        <img
          aria-hidden="true"
          alt=""
          draggable={false}
          src={reference.image.url}
          className="pointer-events-none absolute inset-0 size-full select-none object-contain"
          style={{
            opacity: placement.opacity / 100,
            transform: `translate(${placement.x}%, ${placement.y}%) scale(${placement.flipped ? -placement.scale / 100 : placement.scale / 100}, ${placement.scale / 100})`,
          }}
          onError={reference.remove}
        />
      )}
      {available && (
        <Button
          ref={button}
          variant="outline"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={`absolute ${triggerPlacement} z-10 min-h-11 bg-mld-surface/95 px-3 text-sm`}
          aria-haspopup="dialog"
        >
          <ImageIcon aria-hidden="true" className="size-4" />
          {copy.title}
        </Button>
      )}
      <Dialog open={available && open} onClose={close} title={copy.title} returnFocusTo={button}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-mld-text-soft">{copy.hint}</p>
          <p className="text-xs text-mld-muted">{copy.formats}</p>
          <input
            ref={fileInput}
            type="file"
            name="molda-reference-file"
            accept="image/png,image/jpeg,.png,.jpg,.jpeg"
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (!file) return
              void reference.choose(file).then((accepted) => {
                if (!accepted) return
                setBoundView(view)
                setPlacement(DEFAULT_PLACEMENT)
              })
            }}
          />
          <Button variant="primary" onClick={() => fileInput.current?.click()}>
            {reference.image ? copy.replace : copy.choose}
          </Button>
          {reference.loading && (
            <p role="status" className="text-sm text-mld-text">
              {copy.loading}
            </p>
          )}
          {reference.error && (
            <p role="alert" className="text-sm text-mld-danger">
              {copy.failures[reference.error]}
            </p>
          )}
          {reference.image && (
            <>
              <p className="break-words text-sm font-bold text-mld-text">{reference.image.name}</p>
              <label className="flex flex-col gap-1 text-sm text-mld-text">
                {copy.view}
                <select
                  name="molda-reference-view"
                  value={boundView}
                  onChange={(event) => {
                    const next = CAMERA_VIEWS.find((candidate) => candidate === event.target.value)
                    if (next) setBoundView(next)
                  }}
                  className="min-h-11 rounded-xl border-2 border-mld-border bg-mld-bg px-3 text-mld-text"
                >
                  {CAMERA_VIEWS.map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {COPY.editor.model.views[candidate]}
                    </option>
                  ))}
                </select>
              </label>
              {(['opacity', 'scale', 'x', 'y'] as const).map((key) => (
                <label key={key} className="flex flex-col text-sm text-mld-text">
                  <span>
                    {copy[key]}: {placement[key]}%
                  </span>
                  <input
                    name={`molda-reference-${key}`}
                    aria-label={copy[key]}
                    type="range"
                    min={key === 'x' || key === 'y' ? -70 : 10}
                    max={key === 'scale' ? 200 : key === 'opacity' ? 90 : 70}
                    step={5}
                    value={placement[key]}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      setPlacement((current) => ({ ...current, [key]: value }))
                    }}
                    className="min-h-11 w-full accent-mld-accent"
                  />
                </label>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  aria-pressed={placement.visible}
                  onClick={() =>
                    setPlacement((current) => ({ ...current, visible: !current.visible }))
                  }
                >
                  {copy.visible}
                </Button>
                <Button
                  variant="outline"
                  aria-pressed={placement.flipped}
                  onClick={() =>
                    setPlacement((current) => ({ ...current, flipped: !current.flipped }))
                  }
                >
                  {copy.flip}
                </Button>
                <Button variant="ghost" onClick={() => setPlacement(DEFAULT_PLACEMENT)}>
                  {copy.reset}
                </Button>
                <Button variant="ghost" onClick={reference.remove}>
                  {copy.remove}
                </Button>
              </div>
            </>
          )}
          <Button variant="outline" onClick={close}>
            {copy.done}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
