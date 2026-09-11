import { useId, useLayoutEffect, useRef, useState } from 'react'
import {
  SCENE_FIRST_STEPS_COPY as copy,
  type SceneFirstStepsTopic,
} from '../../../core/sceneFirstStepsCopy'
import type { MoldaToolFamilyId } from '../../../core/toolFamilies'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { isMoldaDialogOpen } from '../../ui/Dialog'

/**
 * A família que cada assunto ensina: a ajuda não ensina ferramenta trancada. "Como articular"
 * pede ossos, apoios e malha, e os ossos (a faixa profissional) trazem os outros dois junto.
 */
const TOPIC_FAMILY: Readonly<Record<SceneFirstStepsTopic, MoldaToolFamilyId>> = {
  model: 'model.pieces',
  paint: 'paint.brush',
  skin: 'model.skin',
  animation: 'animate.create',
}

/** Session-only reading state. Deliberately receives no editor or gesture actions. */
export function SceneFirstSteps({ context }: { context: SceneFirstStepsTopic }) {
  const [open, setOpen] = useState(false)
  const [chosen, setTopic] = useState(context)
  const { can } = useMoldaToolAccess()
  const topics = (Object.keys(copy.tracks) as SceneFirstStepsTopic[]).filter((name) =>
    can(TOPIC_FAMILY[name]),
  )
  const allowed = (name: SceneFirstStepsTopic) => (topics.includes(name) ? name : topics[0])
  const topic = allowed(chosen) ?? context
  const [positions, setPositions] = useState({ model: 0, paint: 0, animation: 0, skin: 0 })
  const trigger = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const panelId = useId()
  const titleId = useId()
  const track = copy.tracks[topic]
  const position = positions[topic]
  const step = track.steps[position]!

  useLayoutEffect(() => {
    const button = trigger.current
    if (open && button?.ownerDocument.activeElement === button && !isMoldaDialogOpen())
      heading.current?.focus()
  }, [open])

  function close() {
    setOpen(false)
    trigger.current?.focus()
  }

  function move(direction: -1 | 1) {
    setPositions((value) => ({
      ...value,
      [topic]: Math.max(0, Math.min(track.steps.length - 1, value[topic] + direction)),
    }))
  }

  if (!topics.length) return null
  return (
    <aside
      aria-label={copy.open}
      className={[
        'absolute bottom-3 left-3 z-20 flex max-h-[calc(100%-1.5rem)]',
        'max-w-[calc(100%-1.5rem)] flex-col items-start gap-2',
      ].join(' ')}
      onKeyDown={(event) => {
        if (!open || isMoldaDialogOpen()) return
        // Keep native button/Tab behavior, but never forward authoring shortcuts.
        event.stopPropagation()
        if (event.key === 'Escape' && !event.defaultPrevented) {
          event.preventDefault()
          close()
        }
      }}
    >
      <Button
        ref={trigger}
        className="shrink-0 text-sm"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(event) => {
          if (isMoldaDialogOpen()) return
          if (open) close()
          else {
            event.currentTarget.focus()
            setTopic(allowed(context) ?? context)
            setOpen(true)
          }
        }}
      >
        {copy.open}
      </Button>
      {open && (
        <section
          id={panelId}
          aria-labelledby={titleId}
          className={[
            'min-h-0 w-88 max-w-full space-y-3 overflow-auto overscroll-contain',
            'rounded-xl border border-mld-border bg-mld-surface p-4 text-mld-text',
          ].join(' ')}
        >
          <h2 ref={heading} id={titleId} tabIndex={-1} className="mld-display text-lg">
            {copy.title}
          </h2>
          <p className="text-sm text-mld-muted">{copy.hint}</p>
          <fieldset aria-label={copy.topics} className="flex flex-wrap gap-1">
            {topics.map((name) => (
              <Button
                key={name}
                variant={topic === name ? 'primary' : 'ghost'}
                className="px-3 text-sm"
                aria-pressed={topic === name}
                onClick={() => setTopic(name)}
              >
                {copy.tracks[name].label}
              </Button>
            ))}
          </fieldset>
          <div aria-live="polite" aria-atomic="true" className="space-y-2">
            <p className="text-sm text-mld-muted">{copy.position(position, track.steps.length)}</p>
            <h3 className="font-bold">{step.title}</h3>
            <p className="text-sm leading-relaxed">{step.text}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="text-sm aria-disabled:cursor-default aria-disabled:opacity-50"
              aria-disabled={position === 0}
              onClick={() => move(-1)}
            >
              {copy.previous}
            </Button>
            <Button
              className="text-sm aria-disabled:cursor-default aria-disabled:opacity-50"
              aria-disabled={position === track.steps.length - 1}
              onClick={() => move(1)}
            >
              {copy.next}
            </Button>
            <Button className="text-sm" onClick={close}>
              {copy.close}
            </Button>
          </div>
        </section>
      )}
    </aside>
  )
}
