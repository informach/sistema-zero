'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { NotebookPen, RotateCcw, Users, Zap } from 'lucide-react'
import { useId } from 'react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { CollisionPairStage } from '../scene-collision-pair'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import {
  BotaoDoTempo,
  DESCOBRIR,
  DicaLivre,
  Numeros,
  useDescobertas,
  useTempo,
} from './nave-b-comum'

/**
 * A experiência `collision-pair` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde
 * de `Door` e dos Poderes. "Quando os dois se encostam", quem sai do jogo: o grupo inteiro, ou só o
 * tiro e a pedra que encostaram. O bloco da colisão e os nomes que ele dá a cada um ficam para a
 * montagem do Estúdio. O que cada escolha faz só aparece depois de a criança testar aquela escolha.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'whole-group':
    'Na trombada, tire o grupo dos tiros e o grupo das pedras, e observe os contadores.',
  'just-the-pair': 'Na trombada, tire só o tiro e a pedra que encostaram, e observe os contadores.',
  'others-stay':
    'Depois da trombada que tira só quem encostou, observe as outras pedras até a borda de baixo.',
}

/** Depois deste quadro as pedras já saíram pela borda de baixo: o tempo não tem o que mostrar. */
const FIM = 30

type Pair = Pick<SceneState['collisionPair'], 'shotTarget' | 'rockTarget' | 'frames'>

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`):
 * a escolha que falta trocar, ou passar o tempo com as duas escolhas já feitas.
 */
export type GestoDaTrombada =
  | 'tiro-grupo'
  | 'tiro-um'
  | 'pedra-grupo'
  | 'pedra-um'
  | 'passar'
  | 'voltar'
  | null
export function proximoGestoDaTrombada(fala: string | undefined, p: Pair): GestoDaTrombada {
  const passar: GestoDaTrombada = p.frames >= FIM ? 'voltar' : 'passar'
  const escolher = (alvo: 'group' | 'alias'): GestoDaTrombada => {
    if (p.shotTarget !== alvo) return alvo === 'group' ? 'tiro-grupo' : 'tiro-um'
    if (p.rockTarget !== alvo) return alvo === 'group' ? 'pedra-grupo' : 'pedra-um'
    return passar
  }
  switch (fala) {
    case 'collision-pair-start':
    case 'collision-pair-start-alias':
    case 'collision-pair-watch':
      return passar
    case 'collision-pair-mixed':
    case 'collision-pair-alias':
      return escolher('group')
    case 'collision-pair-group':
    case 'collision-pair-watch-again':
      return escolher('alias')
    default:
      return null
  }
}

/** A ideia: quem sai em cada escolha, revelado depois do teste daquela escolha. */
function IdeiaDaTrombada({
  p,
  visto,
}: {
  p: Pair
  visto: { grupos: boolean; par: boolean; outras: boolean }
}) {
  const caso = (grupos: boolean) => {
    const revelado = grupos ? visto.grupos : visto.par
    const alvo = grupos ? 'group' : 'alias'
    const escolhido = p.shotTarget === alvo && p.rockTarget === alvo
    return (
      <div data-selected={escolhido} data-muted={p.shotTarget === p.rockTarget && !escolhido}>
        <span>
          {grupos ? 'O grupo dos tiros e o das pedras' : 'O tiro e a pedra que encostaram'}
        </span>
        {revelado ? (
          grupos ? (
            <Users size={34} />
          ) : (
            <Zap size={34} />
          )
        ) : (
          <b className="door-fork-unknown" aria-hidden="true">
            ?
          </b>
        )}
        <strong>
          {!revelado
            ? DESCOBRIR
            : grupos
              ? 'Sai todo mundo dos grupos, até quem não encostou'
              : visto.outras
                ? 'Saem só os dois que se bateram; as outras pedras seguem o caminho'
                : 'Saem só os dois que se bateram'}
        </strong>
        <small>{escolhido ? '✓ escolhido' : 'Aguardando teste'}</small>
      </div>
    )
  }
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">Quem sai do jogo na trombada?</figcaption>
      <div className="door-question">
        <NotebookPen size={20} />
        <strong>Quando os dois se encostam, o jogo tira…</strong>
      </div>
      <div className="door-forks">
        {caso(true)}
        {caso(false)}
      </div>
    </figure>
  )
}

export function LivreCollisionPair() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const p = state.collisionPair
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDaTrombada(discoveryGuidance(activity, state)?.id, p)
  const fim = p.frames >= FIM
  const tempo = useTempo(fim)
  const ajuda = useId()
  const escolha = (
    subject: 'shot' | 'rock',
    target: 'group' | 'alias',
    rotulo: string,
    meu: GestoDaTrombada,
  ) => {
    const atual = subject === 'shot' ? p.shotTarget : p.rockTarget
    return (
      <SceneButton
        aria-pressed={atual === target}
        tom={gesto === meu ? 'gesto' : atual === target ? 'ligado' : 'ferramenta'}
        onClick={() => {
          tempo.parar()
          dispatch({ type: 'command-target', subject, target })
        }}
      >
        {rotulo}
      </SceneButton>
    )
  }
  // "Voltar ao começo" (no meio dos controles) recomeça o caso e GUARDA as descobertas; o
  // "Recomeçar experiência" do rodapé é o `reset`, que na exploração livre apaga tudo.
  const voltar = () => {
    tempo.parar()
    dispatch({ type: 'restart-case' })
  }
  return (
    <Frame
      title="Quem sai do jogo na trombada?"
      kind="trombada"
      activity={activity}
      state={state}
      text={instruction}
      goals={goals}
      completed={completed}
      done={done}
      reset={() => {
        tempo.parar()
        dispatch({ type: 'reset' })
      }}
      hud={
        <Numeros
          itens={[
            ['Tiros no grupo', p.shots.length],
            ['Pedras no grupo', p.rocks.length],
            ['Quadro', p.frames],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <CollisionPairStage state={state} cast={activity.cast} />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaDaTrombada
          p={p}
          visto={{
            grupos: tem('whole-group'),
            par: tem('just-the-pair'),
            outras: tem('others-stay'),
          }}
        />
      }
    >
      <fieldset className="sz-discovery-choices" aria-describedby={ajuda}>
        <legend className="frame-controls-label">Na trombada, quais tiros saem do jogo?</legend>
        {escolha('shot', 'group', 'O grupo dos tiros', 'tiro-grupo')}
        {escolha('shot', 'alias', 'O tiro que encostou', 'tiro-um')}
      </fieldset>
      <fieldset className="sz-discovery-choices" aria-describedby={ajuda}>
        <legend className="frame-controls-label">E quais pedras saem do jogo?</legend>
        {escolha('rock', 'group', 'O grupo das pedras', 'pedra-grupo')}
        {escolha('rock', 'alias', 'A pedra que encostou', 'pedra-um')}
      </fieldset>
      <p className="sz-discovery-small" id={ajuda}>
        O grupo é a lista de todos os tiros, ou de todas as pedras, que o jogo guarda. Trocar uma
        escolha depois de o tempo andar recomeça a trombada; suas descobertas continuam marcadas.
      </p>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'passar' ? 'gesto' : 'ferramenta'}
          fechado={fim}
          onClick={() => tempo.passar(1)}
        >
          Passar 1 segundo
        </SceneButton>
        <BotaoDoTempo running={tempo.running} fechado={fim} onClick={tempo.alternar} />
        <SceneButton tom={gesto === 'voltar' ? 'gesto' : 'ferramenta'} onClick={voltar}>
          <RotateCcw size={15} /> Voltar ao começo
        </SceneButton>
      </div>
      <DicaLivre />
    </Frame>
  )
}
