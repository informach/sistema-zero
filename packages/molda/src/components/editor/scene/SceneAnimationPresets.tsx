import { useEffect, useId, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneAnimationPresetOptions } from '../../../scene/animationPresets'
import {
  CHARACTER_MOTION_AMOUNT,
  CHARACTER_MOTION_ARMS,
  CHARACTER_MOTION_INFO,
  CHARACTER_MOTIONS,
  type CharacterMotionCategory,
  type CharacterMotionControl,
} from '../../../scene/characterMotions'
import { useMoldaToolAccess } from '../../toolAccess'
import { Button } from '../../ui/Button'
import { Check, PersonStanding, Sparkles, Star, X } from '../../ui/icons'
import { SceneCharacterRigSteps } from './SceneCharacterRigSection'
import { sceneAnimationFormNumber } from './sceneAnimationForm'
import { SCENE_APPEARANCE_FIELD as field } from './sceneAppearanceForm'
import { type MotionChoice, motionChoiceName, useCharacterMotion } from './useCharacterMotion'
import { useCharacterMotionLibrary } from './useCharacterMotionLibrary'
import { useSceneAnimationPreset } from './useSceneAnimationPreset'
import type { useSceneWorkshop } from './useSceneWorkshop'

const MOTION_CATEGORIES: readonly CharacterMotionCategory[] = [
  'mover',
  'brincar',
  'dancar',
  'emocoes',
]

export function SceneAnimationPresets({
  workshop,
}: {
  workshop: ReturnType<typeof useSceneWorkshop>
}) {
  const preview = useSceneAnimationPreset(workshop)
  const [kind, setKind] = useState<SceneAnimationPresetOptions['kind']>('bounce')
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const savedHint = useId()
  const copy = COPY.scene
  const motions = copy.characterMotions
  const library = useCharacterMotionLibrary()
  const canMark = useMoldaToolAccess().can('model.skin')
  const motion = useCharacterMotion(workshop, library.motions)
  const character = motion.rigged
  // Cada personagem tem no máximo um de cada: o guardado é o clipe com o nome que mexe os ossos dele.
  const saved = (choice: MotionChoice) => motion.clipOf(choice)
  /** A silhueta não deu: a pessoa marca os pontos, e o painel diz por quê. */
  const [manual, setManual] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // Esqueleto recém-montado: o movimento que a pessoa tinha escolhido já entra no personagem.
  const { characterRig } = workshop
  const wanted = characterRig.wanted
  // Ajustando ossos que já existem, espera montar: os de agora vão ser trocados.
  useEffect(() => {
    if (!wanted || !character || characterRig.draft) return
    characterRig.want(null)
    motion.choose(wanted)
  })
  const keyOf = (choice: MotionChoice) =>
    choice.kind === 'custom' ? `meu:${choice.id}` : choice.kind
  const pick = (choice: MotionChoice) => {
    setMessage(null)
    // Marcando (ou ajustando) os ossos, trocar de movimento só troca o que vem depois de montar.
    if (characterRig.draft) {
      characterRig.want(choice)
      return
    }
    if (!character) {
      workshop.requestTransition(() => {
        const points = motion.guess()
        // Peças que já têm ossos perdem os ossos e os movimentos deles: primeiro mostra e avisa.
        if (points && motion.replaced() > 0 && canMark) {
          setManual(false)
          characterRig.start(workshop.selected, true, choice, points)
          return
        }
        // Primeira vez, como no Mixamo: os ossos entram sozinhos junto do movimento.
        if (points && motion.rigAndChoose(choice, points)) return
        // Silhueta que não parece um corpo: marcar os 5 pontos ali mesmo no palco. Marcar à mão é
        // de Ossos e pesos (profissional); sem ele, o painel explica como deixar o personagem.
        if (!canMark) {
          setMessage(motions.autoFailedBasic)
          return
        }
        setManual(true)
        characterRig.start(workshop.selected, true, choice)
      })
      return
    }
    // Como no Mixamo: um clique já põe o movimento no personagem, poses e tudo.
    workshop.requestTransition(() => motion.choose(choice))
  }
  const choiceButton = (choice: MotionChoice) => {
    const pressed =
      character && !characterRig.draft
        ? motion.currentKey === keyOf(choice)
        : !!wanted && keyOf(wanted) === keyOf(choice)
    const done = character && !!saved(choice)
    return (
      <Button
        key={keyOf(choice)}
        className="gap-1 px-2 text-xs"
        aria-pressed={pressed}
        aria-describedby={done ? savedHint : undefined}
        onClick={() => pick(choice)}
      >
        {motionChoiceName(choice)}
        {done && <Check aria-hidden="true" className="size-3.5 shrink-0 text-mld-accent" />}
      </Button>
    )
  }
  const has = (control: CharacterMotionControl) => motion.controls.includes(control)
  const slider = (
    label: string,
    value: number,
    shown: string,
    spoken: string,
    range: { name: string; min: number; max: number; step: number },
    change: (value: number) => void,
  ) => (
    <label className="block space-y-1 text-xs">
      <span className="flex justify-between gap-2">
        <span>{label}</span>
        <span aria-hidden="true" className="text-mld-muted">
          {shown}
        </span>
      </span>
      <input
        type="range"
        name={range.name}
        className="w-full accent-mld-accent"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        aria-valuetext={spoken}
        onChange={(event) => change(Number(event.target.value))}
      />
    </label>
  )
  const saveMine = () => {
    const data = motion.readable()
    if (!data) {
      setMessage(motions.mineInvalid)
      return
    }
    const result = library.save(data)
    setMessage(
      result === 'saved'
        ? motions.mineSaved(data.name)
        : result === 'full'
          ? motions.mineFull
          : result === 'invalid'
            ? motions.mineInvalid
            : motions.mineError,
    )
  }
  return (
    // Prévia e parâmetros permanecem no painel direito, sem cobrir o palco.
    <section
      className="relative space-y-2"
      aria-label={copy.animationPresetTitle}
      // A área dos movimentos cresce só enquanto uma prévia toca ou os pontos são marcados; fora
      // disso, a galeria ocupa o que precisa e a pose fica com o resto (molda.css).
      data-preset-panel={preview.active || characterRig.draft ? '' : undefined}
      data-preset-gallery={character || open || characterRig.draft ? '' : undefined}
    >
      <fieldset className="space-y-2 rounded-xl border border-mld-border bg-mld-bg p-2">
        <legend className="px-1 text-sm font-bold">{motions.title}</legend>
        {MOTION_CATEGORIES.map((category) => (
          <fieldset key={category}>
            <legend className="mb-1 text-xs font-bold text-mld-muted">
              {motions.categories[category]}
            </legend>
            <div className="grid grid-cols-2 gap-1">
              {CHARACTER_MOTIONS.filter(
                (kind) => CHARACTER_MOTION_INFO[kind].category === category,
              ).map((kind) => choiceButton({ kind }))}
            </div>
          </fieldset>
        ))}
        {library.motions.length > 0 && (
          <fieldset>
            <legend className="mb-1 text-xs font-bold text-mld-muted">
              {motions.categories.meus}
            </legend>
            <ul className="space-y-1">
              {library.motions.map((entry) => (
                <li key={entry.id} className="flex gap-1">
                  <div className="grid min-w-0 flex-1">
                    {choiceButton({ kind: 'custom', id: entry.id, data: entry.data })}
                  </div>
                  <Button
                    size="compact"
                    className="px-2"
                    aria-label={motions.mineRemove(entry.data.name)}
                    onClick={() => library.remove(entry.id)}
                  >
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        <span id={savedHint} hidden>
          {motions.saved}
        </span>
        {characterRig.draft ? (
          <section
            className="space-y-2 rounded-lg border border-mld-accent p-2"
            aria-label={COPY.scene.characterRig.title}
          >
            {manual && (
              <p role="note" className="text-xs">
                {motions.autoFailed}
              </p>
            )}
            <SceneCharacterRigSteps workshop={workshop} />
          </section>
        ) : character && motion.current ? (
          <div className="space-y-2 rounded-lg border border-mld-accent p-2">
            <p role="status" className="text-xs">
              {motions.applied(motionChoiceName(motion.current))}
              {!motion.loop && ` ${motions.once}`}
            </p>
            {has('speed') &&
              slider(
                motions.speed,
                motion.speed,
                `${motion.speed.toLocaleString('pt-BR')}×`,
                `${motion.speed.toLocaleString('pt-BR')} vezes`,
                { name: 'molda-character-speed', min: 0.5, max: 2, step: 0.1 },
                (speed) => motion.tune({ speed }),
              )}
            {has('strength') &&
              slider(
                motions.strength,
                motion.strength,
                `${Math.round(motion.strength * 100)}%`,
                `${Math.round(motion.strength * 100)}%`,
                {
                  name: 'molda-character-strength',
                  min: CHARACTER_MOTION_AMOUNT.minimum,
                  max: CHARACTER_MOTION_AMOUNT.maximum,
                  step: 0.05,
                },
                (strength) => motion.tune({ strength }),
              )}
            {has('arms') &&
              slider(
                motions.arms,
                motion.arms,
                motions.armsValue(motion.arms),
                motions.armsValue(motion.arms),
                {
                  name: 'molda-character-arms',
                  min: CHARACTER_MOTION_ARMS.minimum,
                  max: CHARACTER_MOTION_ARMS.maximum,
                  step: 2,
                },
                (arms) => motion.tune({ arms }),
              )}
            {has('inPlace') && (
              <label className="flex min-h-11 items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  name="molda-character-in-place"
                  className="mt-0.5 size-5 shrink-0 accent-mld-accent"
                  checked={motion.inPlace}
                  onChange={(event) => motion.tune({ inPlace: event.target.checked })}
                />
                <span>
                  <span className="block font-bold">{motions.inPlace}</span>
                  <span className="text-mld-muted">{motions.inPlaceHint}</span>
                </span>
              </label>
            )}
            <p className="text-xs text-mld-muted">{motions.tuneHint}</p>
            {motion.auto && <p className="text-xs text-mld-muted">{motions.autoRigged}</p>}
            {canMark && (
              <Button
                size="compact"
                className="w-full"
                onClick={() =>
                  workshop.requestTransition(() => {
                    // Os ossos em repouso, com os pontos achados já marcados: é só corrigir. A
                    // linha do tempo só sai do movimento se a marcação abrir.
                    setManual(false)
                    if (
                      characterRig.start(
                        workshop.selected,
                        true,
                        motion.current!,
                        motion.guess() ?? [],
                      )
                    )
                      workshop.animation.setClip(null, null)
                  })
                }
              >
                <PersonStanding aria-hidden="true" className="size-4" />
                {motions.adjust}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-mld-muted">{character ? motions.hint : motions.missing}</p>
        )}
        {character && motion.savable && motion.current?.kind !== 'custom' && (
          <div className="space-y-1 rounded-lg border border-mld-border p-2">
            <p className="text-xs text-mld-muted">{motions.saveMineHint}</p>
            <Button size="compact" className="w-full" onClick={saveMine}>
              <Star aria-hidden="true" className="size-4" />
              {motions.saveMine}
            </Button>
          </div>
        )}
        {(message || library.error) && (
          <p role="status" className="text-xs">
            {message ?? motions.mineError}
          </p>
        )}
        {!characterRig.draft && characterRig.error && (
          <p role="alert" className="text-xs text-mld-danger">
            {characterRig.error}
          </p>
        )}
      </fieldset>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        // Quebra em duas linhas no painel estreito em vez de cortar o nome.
        className="sz-tool-pill mld-pill-sun w-full py-2 text-sm leading-tight whitespace-normal"
        onClick={() => {
          if (open) workshop.requestTransition(() => setOpen(false))
          else setOpen(true)
        }}
      >
        <Sparkles aria-hidden="true" />
        {motions.simple}
      </button>
      {open && (
        <div id={panelId} className="space-y-3 rounded-xl border border-mld-border bg-mld-bg p-2">
          <div className="space-y-3 pb-2">
            <p className="text-xs text-mld-muted">{copy.animationPresetHint}</p>
            <fieldset>
              <legend className="text-sm font-bold">O que vai se mexer?</legend>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  className="px-2 text-xs"
                  aria-pressed={workshop.animationTarget === 'piece'}
                  onClick={() => workshop.setAnimationTarget('piece')}
                >
                  Esta peça
                </Button>
                <Button
                  className="px-2 text-xs"
                  aria-pressed={workshop.animationTarget === 'model'}
                  onClick={() => workshop.setAnimationTarget('model')}
                >
                  Modelo inteiro
                </Button>
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-2">
              {(['bounce', 'sway', 'spin'] as const).map((kind) => (
                <Button
                  key={kind}
                  disabled={workshop.animationTarget === 'piece' && workshop.selected.length !== 1}
                  onClick={() =>
                    workshop.requestTransition(() => {
                      setKind(kind)
                      preview.prepare({
                        kind,
                        name: copy.animationPresetNames[kind],
                        axis: kind === 'sway' ? 'z' : 'y',
                        duration: 2,
                        amount: kind === 'sway' ? 25 : 1,
                      })
                      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
                        workshop.animation.play()
                    })
                  }
                >
                  {copy.animationPresetNames[kind]}
                </Button>
              ))}
            </div>
            <details>
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">
                Ajustar movimento
              </summary>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  const data = new FormData(event.currentTarget)
                  try {
                    const options: SceneAnimationPresetOptions = {
                      kind,
                      name: String(data.get('name') ?? ''),
                      axis: data.get('axis') as SceneAnimationPresetOptions['axis'],
                      duration: sceneAnimationFormNumber(data, 'duration'),
                      amount: sceneAnimationFormNumber(data, 'amount'),
                    }
                    workshop.requestTransition(() => preview.prepare(options))
                  } catch (error) {
                    workshop.animation.reportError(error)
                  }
                }}
              >
                <label className="block space-y-1 text-xs">
                  <span>{copy.animationPresetKind}</span>
                  <select
                    name="presetKind"
                    value={kind}
                    onChange={(event) => setKind(event.target.value as typeof kind)}
                    className={field}
                  >
                    {(['bounce', 'sway', 'spin'] as const).map((kind) => (
                      <option key={kind} value={kind}>
                        {copy.animationPresetNames[kind]}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-mld-muted">{copy.animationPresetHints[kind]}</p>
                <div key={kind} className="grid gap-2">
                  <label className="space-y-1 text-xs">
                    <span>{copy.animationName}</span>
                    <input
                      name="name"
                      defaultValue={copy.animationPresetNames[kind]}
                      maxLength={48}
                      required
                      className={field}
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span>{copy.animationDuration}</span>
                    <input
                      name="duration"
                      type="number"
                      min={Number.MIN_VALUE}
                      max={600}
                      step="any"
                      defaultValue="2"
                      required
                      className={field}
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span>
                      {kind === 'bounce'
                        ? copy.animationPresetDistance
                        : kind === 'sway'
                          ? copy.animationPresetAngle
                          : copy.animationPresetTurns}
                    </span>
                    <input
                      name="amount"
                      type="number"
                      min={kind === 'bounce' ? -1000 : kind === 'sway' ? -90 : -10}
                      max={kind === 'bounce' ? 1000 : kind === 'sway' ? 90 : 10}
                      step={kind === 'spin' ? 1 : 'any'}
                      defaultValue={kind === 'sway' ? 25 : 1}
                      required
                      className={field}
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span>{copy.animationPresetAxis}</span>
                    <select
                      name="axis"
                      defaultValue={kind === 'sway' ? 'z' : 'y'}
                      className={field}
                    >
                      {(['x', 'y', 'z'] as const).map((axis) => (
                        <option key={axis} value={axis}>
                          {copy.animationPoseAxes[axis]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <Button
                  type="submit"
                  disabled={workshop.animationTarget === 'piece' && workshop.selected.length !== 1}
                  className="text-sm"
                >
                  {copy.animationPresetPrepare}
                </Button>
              </form>
            </details>
          </div>
          {preview.active && (
            <div className="space-y-2 rounded-lg border border-mld-accent p-3">
              <p role="status" className="text-sm">
                {copy.animationPresetReady}
              </p>
              <div className="grid grid-cols-2 gap-1">
                <Button className="px-2 text-xs" onClick={() => preview.adjust(1.25, 'duration')}>
                  Mais devagar
                </Button>
                <Button className="px-2 text-xs" onClick={() => preview.adjust(0.8, 'duration')}>
                  Mais rápido
                </Button>
                {preview.kind !== 'spin' && (
                  <>
                    <Button className="px-2 text-xs" onClick={() => preview.adjust(0.8, 'amount')}>
                      Menos intenso
                    </Button>
                    <Button className="px-2 text-xs" onClick={() => preview.adjust(1.25, 'amount')}>
                      Mais intenso
                    </Button>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  disabled={!preview.canConfirm}
                  className="text-sm"
                  onClick={() => preview.confirm()}
                >
                  {copy.animationPresetConfirm}
                </Button>
                <Button className="text-sm" onClick={preview.cancel}>
                  {copy.animationPresetCancel}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {preview.error && (
        <p role="alert" className="text-sm text-mld-danger">
          {preview.error}
        </p>
      )}
    </section>
  )
}
