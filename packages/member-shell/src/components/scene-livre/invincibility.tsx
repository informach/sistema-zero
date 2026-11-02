'use client'

import {
  discoveryGuidance,
  type SceneState,
  sceneStepSeconds,
} from '@sistemazero/core/learning/scene'
import { RotateCcw, Shield, ShieldOff, StepForward, Timer } from 'lucide-react'
import { useId } from 'react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { InvincibilityStage } from '../scene-invincibility'
import {
  BotaoDoTempo,
  DicaLivre,
  LinhaDaIdeia,
  Numeros,
  useDescobertas,
  useTempo,
} from './nave-b-comum'

/**
 * A experiência `invincibility` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde dos
 * Poderes. "Um tempinho de proteção depois de bater", que conta para trás em quadros; a montagem fica
 * para o Estúdio. Quantas vidas sobram com cada proteção só aparece depois de a criança testar aquela
 * proteção até a terceira pedra.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'no-shield': 'Sem proteção, deixe as três pedras baterem e conte as vidas.',
  window: 'Com 45 quadros de proteção, deixe as três pedras baterem e compare as vidas.',
  expires: 'Com 15 quadros de proteção, observe quando a proteção acaba e quantas vidas sobram.',
}

/** As proteções que a tela oferece, na ordem da aula de mostrar (0, depois a longa, depois a curta). */
export const PROTECOES = [0, 15, 45] as const
type Protecao = (typeof PROTECOES)[number]
const ROTULO: Record<Protecao, string> = { 0: 'Nenhuma', 15: '15 quadros', 45: '45 quadros' }

type Escudo = Pick<SceneState['invincibility'], 'protection' | 'struck'>

/** As três pedras já bateram: o tempo não tem mais o que mostrar. */
export function batidasAcabaram(sh: Pick<Escudo, 'struck'>): boolean {
  return sh.struck.length >= 3
}

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`):
 * a proteção que falta testar, ou avançar pedra por pedra com ela já escolhida.
 */
export type GestoDaProtecao = Protecao | 'avancar' | 'voltar' | null
export function proximoGestoDaProtecao(fala: string | undefined, sh: Escudo): GestoDaProtecao {
  const seguir: GestoDaProtecao = batidasAcabaram(sh) ? 'voltar' : 'avancar'
  const escolher = (p: Protecao): GestoDaProtecao => (sh.protection === p ? seguir : p)
  switch (fala) {
    case 'invincibility-start':
    case 'invincibility-try':
    case 'invincibility-running':
      return seguir
    case 'invincibility-none':
    case 'invincibility-none-short':
      return escolher(45)
    case 'invincibility-long':
    case 'invincibility-short':
    case 'invincibility-long-short':
      return escolher(0)
    case 'invincibility-none-long':
      return escolher(15)
    default:
      return null
  }
}

/** A ideia: quantas vidas cada proteção deixa, revelado depois do teste dela. */
function IdeiaDaProtecao({
  visto,
}: {
  visto: { nenhuma: boolean; longa: boolean; curta: boolean }
}) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">
        O tempinho de proteção depois de bater
      </figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<ShieldOff size={20} />}
          caso="Sem proteção"
          revelado={visto.nenhuma}
          resultado="Cada pedra tirou uma vida: as três batidas levaram as três vidas"
        />
        <LinhaDaIdeia
          icone={<Shield size={20} />}
          caso="Proteção de 45 quadros"
          revelado={visto.longa}
          resultado="Só a primeira pedra tirou vida: as outras chegaram com a nave protegida"
        />
        <LinhaDaIdeia
          icone={<Timer size={20} />}
          caso="Proteção de 15 quadros"
          revelado={visto.curta}
          resultado="A proteção acabou antes da terceira pedra, e ela tirou outra vida"
        />
      </div>
    </figure>
  )
}

export function LivreInvincibility() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const sh = state.invincibility
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDaProtecao(discoveryGuidance(activity, state)?.id, sh)
  const acabou = batidasAcabaram(sh)
  const tempo = useTempo(acabou)
  const ajuda = useId()
  const quadro = sceneStepSeconds('invincibility') ?? 1 / 30
  // "Voltar ao começo" (no meio dos controles) recomeça o caso e GUARDA as descobertas; o
  // "Recomeçar experiência" do rodapé é o `reset`, que na exploração livre apaga tudo.
  const voltar = () => {
    tempo.parar()
    dispatch({ type: 'restart-case' })
  }
  return (
    <Frame
      title="O tempinho de proteção"
      kind="protecao"
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
            ['Quadro', sh.frames],
            ['Vidas', sh.hearts],
            ['Proteção restando', `${sh.remaining} quadros`],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <InvincibilityStage state={state} cast={activity.cast} />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaDaProtecao
          visto={{ nenhuma: tem('no-shield'), longa: tem('window'), curta: tem('expires') }}
        />
      }
    >
      <fieldset className="sz-discovery-choices" aria-describedby={ajuda}>
        <legend className="frame-controls-label">Proteção depois de bater</legend>
        {PROTECOES.map((p) => (
          <SceneButton
            key={p}
            aria-pressed={sh.protection === p}
            tom={gesto === p ? 'gesto' : sh.protection === p ? 'ligado' : 'ferramenta'}
            onClick={() => {
              tempo.parar()
              dispatch({ type: 'shield', frames: p })
            }}
          >
            {ROTULO[p]}
          </SceneButton>
        ))}
      </fieldset>
      <p className="sz-discovery-small" id={ajuda}>
        As pedras batem nos quadros 1, 10 e 30. A proteção conta para trás, um quadro de cada vez.
        Trocar a proteção recomeça as batidas; suas descobertas continuam marcadas.
      </p>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'avancar' ? 'gesto' : 'ferramenta'}
          fechado={acabou}
          onClick={() => {
            tempo.parar()
            dispatch({ type: 'advance-to' })
          }}
        >
          Avançar até a próxima pedra
        </SceneButton>
        <SceneButton fechado={acabou} onClick={() => tempo.passar(quadro)}>
          <StepForward size={16} /> Avançar 1 quadro
        </SceneButton>
        <BotaoDoTempo running={tempo.running} fechado={acabou} onClick={tempo.alternar} />
        <SceneButton tom={gesto === 'voltar' ? 'gesto' : 'ferramenta'} onClick={voltar}>
          <RotateCcw size={15} /> Voltar ao começo
        </SceneButton>
      </div>
      <DicaLivre />
    </Frame>
  )
}
