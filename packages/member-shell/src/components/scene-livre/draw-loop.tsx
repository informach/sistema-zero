'use client'

import {
  castText,
  discoveryGuidance,
  drawLoopOnScreen,
  type SceneState,
  sceneStepSeconds,
} from '@sistemazero/core/learning/scene'
import { Eraser, Footprints, Layers, Pause, Pin, Play, StepForward } from 'lucide-react'
import { ExplorationStage } from '../exploration-stage'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, LinhaDaIdeia, Numeros, useMetasLivres } from './nave-a-comum'

/**
 * A experiência `draw-loop` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de
 * `Door`, `Memory` e dos Poderes. Duas escolhas: QUANDO desenhar ("Desenhar só no começo" ×
 * "Desenhar em todo quadro") e se a tela é apagada antes ("Não apagar a tela" × "Apagar a tela antes
 * de desenhar"). O nome do bloco do Estúdio ("Limpar a tela") fica para a montagem. O que cada jeito
 * mostra (a tela parada, o rastro, a nave andando) só aparece depois de a criança testar aquele jeito.
 */

/** O que comparar, por meta. Com "o Dino" para o elenco vestir ("a nave"). */
const O_QUE_COMPARAR: Record<string, string> = {
  frozen: 'Compare a tela e o x do Dino quando o jogo desenha o Dino só no começo.',
  trail: 'Compare a tela quando o jogo desenha o Dino em todo quadro, sem apagar a tela.',
  moving: 'Compare a tela quando o jogo desenha o Dino em todo quadro, apagando a tela antes.',
}

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`):
 * a escolha que falta para o jeito proposto, ou avançar um quadro com ele já escolhido.
 */
export type GestoDoDesenho = 'avancar' | 'comeco' | 'cada' | 'apagar' | 'naoApagar' | null
export function proximoGestoDoDesenho(
  fala: string | undefined,
  r: Pick<SceneState['render'], 'loop' | 'erase'>,
): GestoDoDesenho {
  switch (fala) {
    case 'draw-loop-start':
    case 'draw-loop-try-once':
    case 'draw-loop-try-every':
    case 'draw-loop-try-erase':
    case 'draw-loop-try-clear':
      return 'avancar'
    case 'draw-loop-frozen':
    case 'draw-loop-empty':
      return r.loop ? 'avancar' : 'cada'
    case 'draw-loop-frozen-erase':
      return !r.loop ? 'cada' : !r.erase ? 'apagar' : 'avancar'
    case 'draw-loop-trail':
      return r.erase ? 'avancar' : 'apagar'
    case 'draw-loop-trail-once':
      return r.loop ? 'comeco' : 'avancar'
    case 'draw-loop-moving-once':
      // Primeiro "Não apagar": sem desenhar e apagando, a tela ficaria vazia no caminho.
      return r.erase ? 'naoApagar' : r.loop ? 'comeco' : 'avancar'
    case 'draw-loop-moving-trail':
      return r.erase ? 'naoApagar' : 'avancar'
    default:
      return null
  }
}

export function LivreDrawLoop() {
  const { activity, state, dispatch, instruction, running, setRunning } = useDiscovery()
  const r = state.render
  const { tem, goals, completed, done } = useMetasLivres(O_QUE_COMPARAR)
  const gesto = proximoGestoDoDesenho(discoveryGuidance(activity, state)?.id, r)
  const vestir = (texto: string) => castText(texto, activity.cast)
  const quadro = sceneStepSeconds('draw-loop') ?? 0.25
  const escolha = (ativo: boolean, qual: GestoDoDesenho) =>
    gesto === qual && !ativo ? 'gesto' : ativo ? 'ligado' : 'ferramenta'
  return (
    <Frame
      title="Por que o desenho se repete"
      kind="draw-loop"
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
      hud={
        <Numeros
          itens={[
            ['Quadro', String(r.frames)],
            [vestir('x do Dino'), String(r.x)],
            [vestir('Dinos na tela'), String(drawLoopOnScreen(state))],
          ]}
        />
      }
      stage={<ExplorationStage activity={activity} state={state} />}
      after={
        <figure className="sz-scene-regra door-rule">
          <figcaption className="sz-scene-regra-titulo">O que cada quadro faz</figcaption>
          <p className="sz-discovery-small">
            {`Em cada quadro: ${r.erase ? 'a tela é apagada' : 'a tela não é apagada'}, e ${vestir(
              r.loop ? 'o jogo desenha o Dino de novo' : 'o jogo não desenha o Dino de novo',
            )}.`}
          </p>
          <div className="memory-actions">
            <LinhaDaIdeia
              icone={<Pin size={19} />}
              caso="Desenhar só no começo, sem apagar"
              agora={!r.loop && !r.erase}
              revelado={tem('frozen')}
              resultado={vestir('O x do Dino muda, e a tela continua igual.')}
            />
            <LinhaDaIdeia
              icone={<Layers size={19} />}
              caso="Desenhar em todo quadro, sem apagar"
              agora={r.loop && !r.erase}
              revelado={tem('trail')}
              resultado={vestir('Os desenhos velhos ficam: a tela vai juntando Dinos.')}
            />
            <LinhaDaIdeia
              icone={<Footprints size={19} />}
              caso="Desenhar em todo quadro, apagando antes"
              agora={r.loop && r.erase}
              revelado={tem('moving')}
              resultado={vestir('Um Dino só, no lugar novo: o Dino anda.')}
            />
          </div>
        </figure>
      }
    >
      <fieldset className="sz-discovery-choices">
        <legend className="frame-controls-label">{vestir('Quando desenhar o Dino?')}</legend>
        <SceneButton
          aria-pressed={!r.loop}
          tom={escolha(!r.loop, 'comeco')}
          onClick={() => r.loop && dispatch({ type: 'loop', on: false })}
        >
          Desenhar só no começo
        </SceneButton>
        <SceneButton
          aria-pressed={r.loop}
          tom={escolha(r.loop, 'cada')}
          onClick={() => !r.loop && dispatch({ type: 'loop', on: true })}
        >
          Desenhar em todo quadro
        </SceneButton>
      </fieldset>
      <fieldset className="sz-discovery-choices">
        <legend className="frame-controls-label">Antes de desenhar</legend>
        <SceneButton
          aria-pressed={!r.erase}
          tom={escolha(!r.erase, 'naoApagar')}
          onClick={() => r.erase && dispatch({ type: 'erase', on: false })}
        >
          Não apagar a tela
        </SceneButton>
        <SceneButton
          aria-pressed={r.erase}
          tom={escolha(r.erase, 'apagar')}
          onClick={() => !r.erase && dispatch({ type: 'erase', on: true })}
        >
          <Eraser size={16} /> Apagar a tela antes de desenhar
        </SceneButton>
      </fieldset>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'avancar' && !running ? 'gesto' : 'ferramenta'}
          onClick={() => {
            setRunning(false)
            dispatch({ type: 'advance', seconds: quadro })
          }}
        >
          <StepForward size={16} /> Avançar 1 quadro
        </SceneButton>
        <SceneButton
          aria-pressed={running}
          tom={running ? 'ligado' : 'ferramenta'}
          onClick={() => setRunning(!running)}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}{' '}
          {running ? 'Parar os quadros' : 'Passar os quadros'}
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        As escolhas valem a partir do próximo quadro. Suas descobertas continuam marcadas.
      </p>
      <DicaLivre />
    </Frame>
  )
}
