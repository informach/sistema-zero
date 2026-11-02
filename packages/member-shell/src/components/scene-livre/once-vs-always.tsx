'use client'

import {
  casoDoOnceVsAlways,
  castText,
  discoveryGuidance,
  fichaDoOnceVsAlways,
  type OnceArea,
  type OnceVsAlwaysPreset,
  oncePreset,
  onceRunFinished,
  type SceneOnce,
} from '@sistemazero/core/learning/scene'
import { Keyboard, Pause, Play, Repeat, RotateCcw, Sunrise } from 'lucide-react'
import { useId } from 'react'
import { ExplorationStage } from '../exploration-stage'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, LinhaDaIdeia, Numeros, useMetasLivres } from './nave-a-comum'

/**
 * A experiência `once-vs-always` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de
 * `Door`, `Memory` (`scene-discovery-controls.tsx`) e dos Poderes (`scene-poder-*.tsx`). A criança
 * escolhe QUANDO uma coisa acontece no jogo: "Uma vez, no começo", "Sempre, em todo quadro" ou "Na
 * hora em que algo acontece". As áreas do Estúdio, os blocos e as fichas ficam para a montagem.
 * O que cada jeito faz só aparece na figura depois de a criança testar aquele jeito.
 *
 * Três casos da Nave (`casoDoOnceVsAlways`): a nave que anda (Primeira nave), o tiro (Dia 2) e as
 * vidas (Dia 4). As falas do Zappy estão em `guia-livre/once-vs-always.ts`.
 */

/** O nome de cada jeito: os botões, a figura e as falas usam as mesmas palavras. */
export const JEITOS: Record<OnceArea, string> = {
  start: 'Uma vez, no começo',
  loop: 'Sempre, em todo quadro',
  event: 'Na hora em que algo acontece',
}

/** O que comparar, por caso e meta. Com "o Dino" para o elenco vestir ("a nave"). */
const O_QUE_COMPARAR = {
  nave: {
    once: 'Compare o Dino e os quadros quando o Dino anda uma vez, no começo.',
    always: 'Compare o Dino e os quadros quando o Dino anda sempre, em todo quadro.',
  },
  vidas: {
    once: 'Compare as vidas e as batidas quando as vidas chegam uma vez, no começo.',
    'lives-loop': 'Compare as vidas e as batidas quando as vidas chegam sempre, em todo quadro.',
  },
  tiro: {
    'on-event':
      'Compare os tiros quando o tiro espera a hora em que algo acontece e ninguém aperta a tecla.',
    'key-fires': 'Compare os tiros quando o tiro espera e você aperta a tecla.',
    flood: 'Compare os tiros quando o tiro sai sempre, em todo quadro.',
  },
} as const

/** A pergunta de cada caso, acima dos jeitos. */
const PERGUNTA = {
  nave: 'Quando o Dino anda um pouquinho?',
  vidas: 'Quando o Dino ganha três vidas?',
  tiro: 'Quando sai um tiro?',
} as const

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`):
 * escolher um jeito, começar o jogo, jogar de novo ou apertar a tecla.
 */
export type GestoDoOnce = 'uma' | 'sempre' | 'evento' | 'comecar' | 'jogarDeNovo' | 'tecla' | null
export function proximoGestoDoOnce(
  fala: string | undefined,
  once: SceneOnce,
  preset: OnceVsAlwaysPreset,
  visto: (meta: string) => boolean,
): GestoDoOnce {
  const ficha = fichaDoOnceVsAlways(preset)
  const usada = once.frames > 0 || once.fires[ficha] > once.firedAtPlacement[ficha]
  const testar: GestoDoOnce = onceRunFinished(once, preset) ? 'jogarDeNovo' : 'comecar'
  switch (fala) {
    case 'once-vs-always-nave-start':
    case 'once-vs-always-vidas-start':
    case 'once-vs-always-nave-always':
    case 'once-vs-always-vidas-always':
      return 'uma'
    case 'once-vs-always-nave-once':
    case 'once-vs-always-vidas-once':
    case 'once-vs-always-tiro-event-flood':
      return 'sempre'
    case 'once-vs-always-tiro-start':
    case 'once-vs-always-tiro-flood':
      return 'evento'
    case 'once-vs-always-tiro-once':
      return visto('flood') ? 'evento' : 'sempre'
    case 'once-vs-always-nave-try-once':
    case 'once-vs-always-nave-try-always':
    case 'once-vs-always-vidas-try-once':
    case 'once-vs-always-vidas-try-always':
    case 'once-vs-always-tiro-try-event':
    case 'once-vs-always-tiro-try-loop':
    case 'once-vs-always-tiro-try-start':
      return testar
    case 'once-vs-always-tiro-event':
      return 'tecla'
    case 'once-vs-always-tiro-key':
      return usada ? 'jogarDeNovo' : 'comecar'
    default:
      return null
  }
}

export function LivreOnceVsAlways() {
  const { activity, state, dispatch, instruction, running, setRunning } = useDiscovery()
  const preset = oncePreset(activity.setup?.preset)
  const caso = casoDoOnceVsAlways(preset)
  const ficha = fichaDoOnceVsAlways(preset)
  const o = state.once
  const lugar = o.placement[ficha]
  const { tem, goals, completed, done } = useMetasLivres(O_QUE_COMPARAR[caso])
  const gesto = proximoGestoDoOnce(discoveryGuidance(activity, state)?.id, o, preset, tem)
  const tom = (qual: GestoDoOnce) => (gesto === qual ? 'gesto' : 'ferramenta')
  const cast = activity.cast
  const vestir = (texto: string) => castText(texto, cast)
  const acabou = onceRunFinished(o, preset)
  const escolhido = lugar !== 'outside'
  const vezes = o.fires[ficha] - o.firedAtPlacement[ficha]
  const usada = o.frames > 0 || vezes > 0
  const pergunta = useId()
  const escolher = (area: OnceArea) => {
    if (lugar === area) return
    dispatch({ type: 'place-in-area', card: ficha, area })
  }
  /** Uma partida nova com o mesmo jeito (o motor recomeça ao receber o MESMO jeito de novo). */
  const jogarDeNovo = () => {
    setRunning(false)
    if (escolhido) dispatch({ type: 'place-in-area', card: ficha, area: lugar })
  }
  const jeito = (area: OnceArea, gestoDoJeito: GestoDoOnce) => (
    <SceneButton
      key={area}
      aria-pressed={lugar === area}
      tom={
        gesto === gestoDoJeito && lugar !== area
          ? 'gesto'
          : lugar === area
            ? 'ligado'
            : 'ferramenta'
      }
      onClick={() => escolher(area)}
    >
      {JEITOS[area]}
    </SceneButton>
  )
  // O tiro do jeito "uma vez" não é meta: ele aparece na figura enquanto está à vista.
  const tiroDoComeco = lugar === 'start' && o.frames > 0 && o.fires[ficha] > 0
  const revelado: Record<OnceArea, boolean> =
    caso === 'tiro'
      ? { start: tiroDoComeco, loop: tem('flood'), event: tem('on-event') || tem('key-fires') }
      : { start: tem('once'), loop: tem(caso === 'vidas' ? 'lives-loop' : 'always'), event: false }
  const resultado: Record<OnceArea, string> =
    caso === 'nave'
      ? {
          start: vestir(
            'O Dino anda um pouquinho no primeiro quadro, e nos outros quadros não sai do lugar.',
          ),
          loop: vestir('O Dino anda mais um pouquinho em todo quadro, até sair da tela.'),
          event: '',
        }
      : caso === 'vidas'
        ? {
            start: 'As três vidas chegam uma vez, e cada batida tira uma.',
            loop: 'As vidas voltam a três em todo quadro, mesmo depois das batidas.',
            event: '',
          }
        : {
            start: 'Sai um tiro só, no primeiro quadro.',
            loop: 'Sai um tiro novo em todo quadro.',
            event:
              tem('on-event') && tem('key-fires')
                ? 'O tiro espera e sai na hora em que a tecla é apertada.'
                : tem('on-event')
                  ? 'Sem a tecla, nenhum tiro sai.'
                  : 'Com a tecla, sai um tiro na hora.',
          }
  const icone = {
    start: <Sunrise size={19} />,
    loop: <Repeat size={19} />,
    event: <Keyboard size={19} />,
  }
  const numeros: [string, string][] = [
    ['Quadro', String(o.frames)],
    ...(caso === 'vidas'
      ? ([
          ['Vidas', String(o.hearts)],
          ['Batidas', String(o.hits)],
        ] as [string, string][])
      : caso === 'tiro'
        ? ([['Tiros', String(o.shots)]] as [string, string][])
        : ([[vestir('O Dino andou'), `${vezes} ${vezes === 1 ? 'vez' : 'vezes'}`]] as [
            string,
            string,
          ][])),
  ]
  return (
    <Frame
      title={vestir(PERGUNTA[caso])}
      kind="once-vs-always"
      activity={activity}
      state={state}
      text={instruction}
      goals={goals.map(vestir)}
      completed={completed}
      done={done}
      reset={() => {
        setRunning(false)
        dispatch({ type: 'reset' })
      }}
      hud={<Numeros itens={numeros} />}
      stage={<ExplorationStage activity={activity} state={state} />}
      after={
        <figure className="sz-scene-regra door-rule">
          <figcaption className="sz-scene-regra-titulo">{vestir(PERGUNTA[caso])}</figcaption>
          <div className="memory-actions">
            {preset.areas.map((area) => (
              <LinhaDaIdeia
                key={area}
                icone={icone[area]}
                caso={JEITOS[area]}
                agora={lugar === area}
                revelado={revelado[area]}
                resultado={resultado[area]}
              />
            ))}
          </div>
        </figure>
      }
    >
      <fieldset className="sz-discovery-choices" aria-describedby={pergunta}>
        <legend className="frame-controls-label" id={pergunta}>
          {vestir(PERGUNTA[caso])}
        </legend>
        {preset.areas.includes('start') && jeito('start', 'uma')}
        {preset.areas.includes('loop') && jeito('loop', 'sempre')}
        {preset.areas.includes('event') && jeito('event', 'evento')}
      </fieldset>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          aria-pressed={running}
          tom={running ? 'ligado' : tom('comecar')}
          fechado={!escolhido || (acabou && !running)}
          onClick={() => setRunning(!running)}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}{' '}
          {running
            ? 'Pausar o jogo'
            : acabou
              ? 'Jogo terminado'
              : o.frames > 0
                ? 'Continuar o jogo'
                : 'Começar o jogo'}
        </SceneButton>
        {usada && (
          <SceneButton tom={tom('jogarDeNovo')} onClick={jogarDeNovo}>
            <RotateCcw size={16} /> Jogar de novo
          </SceneButton>
        )}
        {preset.areas.includes('event') && (
          <SceneButton
            tom={tom('tecla')}
            fechado={lugar !== 'event'}
            onClick={() => dispatch({ type: 'trigger' })}
          >
            <Keyboard size={16} /> Apertar a tecla
          </SceneButton>
        )}
      </div>
      {!escolhido && (
        <p className="sz-discovery-small">Escolha um jeito para o jogo poder começar.</p>
      )}
      {acabou && (
        <p className="sz-discovery-small">
          Este jogo terminou. Jogar de novo começa outra partida com o mesmo jeito; trocar de jeito
          também. Suas descobertas continuam marcadas.
        </p>
      )}
      <DicaLivre />
    </Frame>
  )
}
