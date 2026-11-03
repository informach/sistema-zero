'use client'

import {
  discoveryGuidance,
  onionFireZone,
  SCENE_LIMITS,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import { ExplorationStage } from '../exploration-stage'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, IdeiaDoAtelie } from './atelie-comum'

/**
 * A experiência `onion-skin` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de
 * `Door`, `Memory` (`scene-discovery-controls.tsx`) e dos Poderes (`scene-poder-*.tsx`). O palco é o
 * de sempre (a nave com o fogo, e o Fantasma tracejado); os controles são os do Pinta: os quadros, o
 * Fantasma e o tamanho do fogo 2, um quadradinho por clique. ⚠️ O fogo 2 é do quadro 2: no quadro 1
 * os dois botões do fogo ficam fechados com o motivo (uma variável por vez, como na bancada antiga).
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DO_FANTASMA = ['blind-move', 'ghost-on', 'even-step'] as const
const OBJETIVOS = [
  'No quadro 2, mude o fogo 2 com o Fantasma desligado.',
  'No quadro 2, ligue o Fantasma e observe.',
  'Com o Fantasma, deixe o fogo 2 um pouco maior que o fogo 1.',
]
/** Um clique muda o fogo 2 em um quadradinho (a régua `onionFireLength`: 4 do `shift` por quadradinho). */
const UM_QUADRADINHO = 4

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDoFantasma = 'quadro2' | 'fantasma' | 'menor' | 'maior' | null
export function proximoGestoDoFantasma(
  fala: string | undefined,
  a: SceneState['animation'],
): GestoDoFantasma {
  const mudarOFogo = (): GestoDoFantasma =>
    a.shift >= SCENE_LIMITS.shift.max
      ? 'menor'
      : a.shift <= SCENE_LIMITS.shift.min
        ? 'maior'
        : onionFireZone(a.shift) === 'quase'
          ? 'maior'
          : 'menor'
  switch (fala) {
    case 'onion-skin-start':
    case 'onion-skin-blind-late':
      if (a.frame !== 2) return 'quadro2'
      return a.onion ? 'fantasma' : mudarOFogo()
    case 'onion-skin-ghost':
      return a.frame !== 2 ? 'quadro2' : 'fantasma'
    case 'onion-skin-step':
      if (a.frame !== 2) return 'quadro2'
      if (!a.onion) return 'fantasma'
      return mudarOFogo()
    default:
      return null
  }
}

export function LivreOnionSkin() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const a = state.animation
  const completed = METAS_DO_FANTASMA.map((id) => state.evidence.discoveries.includes(id))
  const gesto = proximoGestoDoFantasma(discoveryGuidance(activity, state)?.id, a)
  const tom = (qual: GestoDoFantasma) => (gesto === qual ? 'gesto' : 'ferramenta')
  const noUm = a.frame !== 2
  const fogo = (shift: number) =>
    dispatch({
      type: 'shift',
      offset: Math.min(SCENE_LIMITS.shift.max, Math.max(SCENE_LIMITS.shift.min, shift)),
    })
  return (
    <Frame
      title="O fantasma do quadro de antes"
      kind="fantasma"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => dispatch({ type: 'reset' })}
      stage={<ExplorationStage activity={activity} state={state} dispatch={dispatch} />}
      after={
        <IdeiaDoAtelie
          titulo="O que o Fantasma mostra"
          casos={[
            {
              rotulo: 'O fogo 2, sem o Fantasma',
              visto: completed[0] ?? false,
              resposta: 'Só o fogo 2 na tela: o fogo 1 fica na memória',
            },
            {
              rotulo: 'O Fantasma ligado no quadro 2',
              visto: completed[1] ?? false,
              resposta: 'O fogo 1 aparece tracejado, só para comparar',
            },
            {
              rotulo: 'O fogo 2 um pouco maior',
              visto: completed[2] ?? false,
              resposta: 'Cresce um pouco e cabe no quadro',
            },
          ]}
        />
      }
    >
      <fieldset className="rounded-2xl border border-border px-2.5 py-2 text-sm font-semibold">
        <legend className="px-1">Quadro à vista</legend>
        <div className="flex flex-wrap gap-2">
          {([1, 2] as const).map((index) => (
            <SceneButton
              key={index}
              className="min-w-11"
              aria-current={a.frame === index ? 'true' : undefined}
              tom={
                index === 2 && gesto === 'quadro2'
                  ? 'gesto'
                  : a.frame === index
                    ? 'ligado'
                    : 'ferramenta'
              }
              onClick={() => dispatch({ type: 'frame', index })}
            >
              Quadro {index}
            </SceneButton>
          ))}
        </div>
      </fieldset>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          aria-pressed={a.onion}
          tom={gesto === 'fantasma' ? 'gesto' : a.onion ? 'ligado' : 'ferramenta'}
          onClick={() => dispatch({ type: 'onion', on: !a.onion })}
        >
          Fantasma: {a.onion ? 'ligado' : 'desligado'}
        </SceneButton>
      </div>
      <fieldset className="rounded-2xl border border-border px-2.5 py-2 text-sm font-semibold">
        {/* ⚠️ Sem o número de quadradinhos (a régua da faixa, lote 5): com a medida à vista, a criança
            acertaria o tamanho sem o Fantasma, e "dá para saber sem ver o quadro 1?" perdia o sentido. */}
        <legend className="px-1">Tamanho do fogo 2</legend>
        <div className="flex flex-wrap gap-2">
          <SceneButton
            tom={tom('menor')}
            fechado={noUm || a.shift <= SCENE_LIMITS.shift.min}
            onClick={() => fogo(a.shift - UM_QUADRADINHO)}
          >
            Fogo 2 menor
          </SceneButton>
          <SceneButton
            tom={tom('maior')}
            fechado={noUm || a.shift >= SCENE_LIMITS.shift.max}
            onClick={() => fogo(a.shift + UM_QUADRADINHO)}
          >
            Fogo 2 maior
          </SceneButton>
        </div>
        {noUm ? (
          <p className="mt-2 font-normal text-muted-foreground">
            Vá para o quadro 2 para mudar o fogo dele.
          </p>
        ) : null}
      </fieldset>
      <DicaLivre />
    </Frame>
  )
}
