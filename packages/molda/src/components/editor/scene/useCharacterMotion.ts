import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import type { SceneAnimationClip } from '../../../scene/animation'
import { guessCharacterMarks } from '../../../scene/characterAutoMarks'
import type { CharacterMotionData } from '../../../scene/characterMotionLibrary'
import {
  CHARACTER_MOTION_INFO,
  CHARACTER_MOTIONS,
  type CharacterMotion,
  type CharacterMotionControl,
  characterMotionFromClip,
  characterRigFor,
  createCharacterMotion,
  isCharacterMotionClip,
} from '../../../scene/characterMotions'
import {
  buildCharacterRig,
  characterRigTarget,
  findCharacterRigs,
  layoutCharacterSkeleton,
} from '../../../scene/characterRig'
import type { MoldaSceneDocument } from '../../../scene/document'
import { keepSceneThumb, sameSceneContent } from '../../../scene/documentContent'
import type { SavedCharacterMotion } from './useCharacterMotionLibrary'
import type { useSceneWorkshop } from './useSceneWorkshop'

const names = COPY.scene.characterMotions.names
const still = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const CUSTOM_CONTROLS = ['speed', 'strength', 'arms'] as const

/** Um movimento que dá para escolher: pronto (pelo tipo) ou meu (pelos dados guardados). */
export type MotionChoice =
  | { kind: CharacterMotion }
  | { kind: 'custom'; id: string; data: CharacterMotionData }
/** O nome que o movimento ganha na lista de movimentos (e que o reconhece depois). */
export const motionChoiceName = (choice: MotionChoice) =>
  choice.kind === 'custom' ? choice.data.name : names[choice.kind]
const nameOf = motionChoiceName
const baseDuration = (choice: MotionChoice) =>
  choice.kind === 'custom' ? choice.data.duration : CHARACTER_MOTION_INFO[choice.kind].duration
interface Tuning {
  amount: number
  arms: number
}
interface Settings extends Tuning {
  duration: number
  inPlace: boolean
}
type TuneChange = Partial<{ speed: number; strength: number; arms: number; inPlace: boolean }>
const jointsOf = (rig: ReturnType<typeof findCharacterRigs>[number] | null) =>
  new Set(rig ? rig.joints.values() : [])

/**
 * Como no Mixamo: escolher um movimento já o guarda no personagem e o deixa tocando, com as poses
 * na linha do tempo. Os controles (velocidade, intensidade, braços, no lugar) refazem o mesmo
 * movimento no lugar; enquanto nada mais mudar, os ajustes emendam o passo de desfazer da escolha.
 */
export function useCharacterMotion(
  workshop: ReturnType<typeof useSceneWorkshop>,
  mine: readonly SavedCharacterMotion[] = [],
) {
  const { animation, editor, document, selected } = workshop
  const live = useRef(workshop)
  live.current = workshop
  const clipId = useSyncExternalStore(
    animation.subscribe,
    () => {
      const source = animation.getSnapshot().source
      return source && !source.preview ? source.clip.id : null
    },
    () => null,
  )
  const rigs = useMemo(() => findCharacterRigs(document), [document])
  const allJoints = useMemo(() => new Set(rigs.flatMap((rig) => [...rig.joints.values()])), [rigs])
  // O personagem da escolha: com dois, o das peças escolhidas (cada um tem os seus movimentos).
  const rig = useMemo(() => {
    if (!rigs.length) return null
    try {
      return characterRigFor(document, selected)
    } catch {
      return null
    }
  }, [rigs, document, selected])
  const joints = useMemo(() => jointsOf(rig), [rig])
  const clip = clipId ? document.animations?.find((item) => item.id === clipId) : undefined
  // O movimento da linha do tempo: o nome dele e os ossos de personagem que ele mexe.
  const builtIn = clip
    ? CHARACTER_MOTIONS.find((motion) => isCharacterMotionClip(clip, names[motion], allJoints))
    : undefined
  const saved =
    clip && !builtIn
      ? mine.find((entry) => isCharacterMotionClip(clip, entry.data.name, allJoints))
      : undefined
  const current: MotionChoice | undefined = builtIn
    ? { kind: builtIn }
    : saved
      ? { kind: 'custom', id: saved.id, data: saved.data }
      : undefined
  /**
   * Intensidade e braços não ficam no arquivo: cada clipe que um ajuste fez lembra os seus. O
   * desfazer devolve um clipe de antes, que lembra os dele (ou o padrão, se não foi feito aqui).
   */
  const tuning = useRef(new WeakMap<SceneAnimationClip, Tuning>())
  const known = clip ? tuning.current.get(clip) : undefined
  /** O que o último ajuste deixou: com o mesmo conteúdo e movimento, o próximo emenda o passo. */
  const last = useRef<{ content: MoldaSceneDocument; id: string } | null>(null)
  const speed = current && clip ? Math.round((baseDuration(current) / clip.duration) * 10) / 10 : 1
  const strength = known?.amount ?? 1
  const arms = known?.arms ?? 0
  // Fora do "No lugar", o quadril termina o ciclo mais à frente do que começou.
  const inPlace = !clip?.tracks.some(
    (track) =>
      track.channel === 'translation' &&
      track.keys.length > 1 &&
      Math.hypot(
        ...track.keys.at(-1)!.value.map((value, axis) => value - track.keys[0]!.value[axis]!),
      ) > 1e-6,
  )
  const savable =
    !!clip &&
    !builtIn &&
    clip.tracks.some((track) => track.channel === 'rotation' && allJoints.has(track.nodeId))

  /** Ossos colocados sozinhos nesta sessão: o painel oferece ajustar à mão. */
  const [auto, setAuto] = useState(false)

  function save(
    choice: MotionChoice,
    settings: Settings,
    replaces?: SceneAnimationClip,
    rigging?: { ids: readonly string[]; layout: ReturnType<typeof layoutCharacterSkeleton> },
  ) {
    const now = live.current
    const was = animation.getSnapshot()
    const same = !!replaces && was.source?.clip.id === replaces.id
    const fraction = same ? was.time / Math.max(was.source!.clip.duration, 1e-9) : 0
    const playing = same ? was.playing : !still()
    const amend =
      !!replaces &&
      last.current?.id === replaces.id &&
      sameSceneContent(last.current.content, now.document)
    // Refazendo um clipe, vale o esqueleto que ele mexe, não a escolha do momento.
    const owner = replaces?.tracks.find((track) => allJoints.has(track.nodeId))?.nodeId
    let id = replaces?.id
    const next = now.run(
      (source) => {
        // Ossos e movimento no mesmo passo: um desfazer tira os dois.
        const base = rigging
          ? buildCharacterRig(source, rigging.ids, rigging.layout).document
          : source
        const built = createCharacterMotion(base, owner ? [owner] : now.selected, {
          ...(choice.kind === 'custom'
            ? { kind: 'custom', data: choice.data }
            : { kind: choice.kind }),
          name: nameOf(choice),
          duration: settings.duration,
          amount: settings.amount,
          arms: settings.arms,
          inPlace: settings.inPlace,
          replaces: replaces?.id,
        })
        id ??= built.animations!.at(-1)!.id
        return keepSceneThumb(built, source)
      },
      undefined,
      amend,
    )
    if (!next || !id) return false
    const content = editor.getState().content
    const kept = id
    last.current = { content, id: kept }
    const made = content.animations?.find((item) => item.id === kept)
    if (made) tuning.current.set(made, { amount: settings.amount, arms: settings.arms })
    try {
      animation.setClip(content, kept)
      animation.seek(fraction * settings.duration)
      if (playing) animation.play()
    } catch (error) {
      animation.reportError(error)
    }
    return true
  }
  const defaults = (choice: MotionChoice): Settings => ({
    duration: baseDuration(choice),
    amount: 1,
    arms: 0,
    inPlace: true,
  })

  // Arrastar um controle dispara muitos eventos: refaz uma vez por quadro, com o valor mais novo.
  const queued = useRef<{ change: TuneChange; frame: number } | null>(null)
  const settle = useRef<() => void>(() => {})
  settle.current = () => {
    const pending = queued.current
    queued.current = null
    if (!pending || !current || !clip) return
    const change = pending.change
    save(
      current,
      {
        duration: baseDuration(current) / (change.speed ?? speed),
        amount: change.strength ?? strength,
        arms: change.arms ?? arms,
        inPlace: change.inPlace ?? inPlace,
      },
      clip,
    )
  }
  useEffect(
    () => () => {
      if (queued.current) cancelAnimationFrame(queued.current.frame)
    },
    [],
  )

  return {
    /** Há um esqueleto de personagem na criação. */
    rigged: rigs.length > 0,
    /** O movimento de personagem que está na linha do tempo agora (pronto ou meu). */
    current,
    /** Chave de comparação com os botões da galeria: o tipo, ou `meu:<id>`. */
    currentKey: current ? (current.kind === 'custom' ? `meu:${current.id}` : current.kind) : null,
    controls: (current
      ? current.kind === 'custom'
        ? CUSTOM_CONTROLS
        : CHARACTER_MOTION_INFO[current.kind].controls
      : []) as readonly CharacterMotionControl[],
    loop: clip?.loop ?? true,
    auto,
    speed,
    strength,
    arms,
    inPlace,
    /** O clipe deste movimento no personagem da escolha, se ele já tem. */
    clipOf(choice: MotionChoice) {
      return document.animations?.find((item) =>
        isCharacterMotionClip(item, nameOf(choice), joints),
      )
    },
    /** Um guardado só volta para a linha do tempo; um novo é criado com o padrão. */
    choose(choice: MotionChoice) {
      const now = live.current
      const rigNow = (() => {
        try {
          return characterRigFor(now.document, now.selected)
        } catch {
          return null
        }
      })()
      const existing = now.document.animations?.find((item) =>
        isCharacterMotionClip(item, nameOf(choice), jointsOf(rigNow)),
      )
      if (!existing) {
        save(choice, defaults(choice))
        return
      }
      try {
        animation.setClip(editor.getState().content, existing.id)
        if (!still()) animation.play()
      } catch (error) {
        animation.reportError(error)
      }
    },
    /** Os pontos que a silhueta acha (nulo quando não parece um corpo). */
    guess(): Vec3[] | null {
      const now = live.current
      try {
        const points = guessCharacterMarks(now.document, now.selected)
        layoutCharacterSkeleton(now.document, now.selected, points, true)
        return points
      } catch {
        return null
      }
    },
    /** Peças da escolha que já têm ossos (montar troca esses ossos e leva os movimentos deles). */
    replaced() {
      const now = live.current
      try {
        return characterRigTarget(now.document, now.selected).replaced
      } catch {
        return 0
      }
    },
    /**
     * Sem esqueleto, como no Mixamo: põe os ossos achados na silhueta e o movimento de uma vez.
     * Falso quando não deu.
     */
    rigAndChoose(choice: MotionChoice, points: readonly Vec3[]) {
      const now = live.current
      const ids = now.selected
      let layout: ReturnType<typeof layoutCharacterSkeleton>
      try {
        layout = layoutCharacterSkeleton(now.document, ids, points, true)
      } catch {
        return false
      }
      if (!save(choice, defaults(choice), undefined, { ids, layout })) return false
      setAuto(true)
      return true
    },
    tune(change: TuneChange) {
      if (!current || !clip) return
      if (queued.current) {
        queued.current.change = { ...queued.current.change, ...change }
        return
      }
      // O primeiro ajuste vale na hora; os que chegam no mesmo quadro esperam o próximo.
      queued.current = { change, frame: 0 }
      settle.current()
      queued.current = {
        change: {},
        frame: requestAnimationFrame(() => {
          if (queued.current && Object.keys(queued.current.change).length) settle.current()
          else queued.current = null
        }),
      }
    },
    /**
     * Um movimento feito à mão no personagem (não um dos prontos), lido como dados para guardar em
     * Meus movimentos. Nulo quando não há o que guardar.
     */
    readable(): CharacterMotionData | null {
      if (!clip || builtIn) return null
      try {
        // Lê pelo esqueleto que o clipe mexe, não pela escolha do momento.
        const owner = clip.tracks.find((track) => allJoints.has(track.nodeId))?.nodeId
        const data = characterMotionFromClip(
          live.current.document,
          clip.id,
          owner ? [owner] : live.current.selected,
        )
        return data.keys.some((key) => Object.keys(key.pose).length) ? data : null
      } catch {
        return null
      }
    },
    /** Dá para guardar: o movimento da linha do tempo não é pronto e mexe ossos de personagem. */
    savable,
  }
}
