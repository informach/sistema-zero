'use client'

import { discoveryGuidance, type SceneState, sceneTargets } from '@sistemazero/core/learning/scene'
import { ArrowLeft, Equal, Flag, RotateCcw, Sparkles } from 'lucide-react'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { NumberLineStage } from '../scene-number-line'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * A experiência `number-line` em exploração livre (Corre Dino, aula 13, 02/11/2026): só a IDEIA. A
 * reta dos números negativos, somar −1 e a pergunta "a velocidade é ___ −9?" com o sinal que a
 * criança escolhe. Os sinais e os números negativos são conceito e aparecem; o "valor da base" do
 * Estúdio sai (a criança anda pela reta com o −1 e volta ao começo).
 *
 * ⚠️ "Voltar ao começo" é a ação `restart-case`: o marcador volta ao −5 com o sinal escolhido, e as
 * descobertas ficam (o "Recomeçar experiência" do rodapé apaga tudo).
 */

const O_QUE_COMPARAR: Record<string, string> = {
  colder: 'Some -1 três vezes e observe para que lado o marcador anda.',
  greater: 'Com o marcador no -5, escolha o sinal > e observe a resposta.',
  stops: 'Com o sinal >, leve o marcador até o -9 e compare a resposta.',
  silent: 'Com o sinal =, ande do -5 até o -9 e acompanhe a resposta a cada casa.',
}

/** Os sinais da pergunta, com o nome que a tela mostra. */
export const SINAIS = [
  { id: '>', rotulo: '> maior que' },
  { id: '=', rotulo: '= igual a' },
  { id: '<', rotulo: '< menor que' },
] as const
type Sinal = (typeof SINAIS)[number]['id']

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDaReta = 'somar' | 'voltar' | Sinal | null
export function proximoGestoDaReta(
  fala: string | undefined,
  r: Pick<SceneState['numberLine'], 'value' | 'operator' | 'equalPresses'>,
): GestoDaReta {
  switch (fala) {
    case 'number-line-start':
      return r.value <= -12 ? 'voltar' : 'somar'
    case 'number-line-maior':
    case 'number-line-maior-first':
      if (r.value !== -5) return 'voltar'
      return r.operator === '>' ? null : '>'
    case 'number-line-para':
    case 'number-line-para-first':
      if (r.operator !== '>') return '>'
      if (r.value < -9) return 'voltar'
      return r.value > -9 ? 'somar' : null
    case 'number-line-igual':
    case 'number-line-igual-first': {
      // A caminhada do igual vale desde o −5: quem trocou o sinal no meio do caminho volta ao começo.
      const caminhouComIgual = r.operator === '=' && r.equalPresses === -5 - r.value
      if (r.value !== -5 && !caminhouComIgual) return 'voltar'
      if (r.operator !== '=') return '='
      return r.value > -9 ? 'somar' : null
    }
    default:
      return null
  }
}

/** A ideia: o que somar −1 e cada pergunta mostram, revelado depois do teste. */
function IdeiaDaReta({ metas, tem }: { metas: readonly string[]; tem: (m: string) => boolean }) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">A reta e a pergunta</figcaption>
      <div className="memory-actions">
        {metas.includes('colder') && (
          <LinhaDaIdeia
            icone={<ArrowLeft size={20} />}
            caso="Somar -1, três vezes"
            revelado={tem('colder')}
            resultado="O marcador anda uma casa para a esquerda a cada vez: o número fica menor"
          />
        )}
        {metas.includes('greater') && (
          <LinhaDaIdeia
            icone={<Sparkles size={20} />}
            caso="-5 > -9?"
            revelado={tem('greater')}
            resultado="Sim: o -5 mora à direita do -9, então é maior"
          />
        )}
        {metas.includes('stops') && (
          <LinhaDaIdeia
            icone={<Flag size={20} />}
            caso="-9 > -9?"
            revelado={tem('stops')}
            resultado="Não: -9 não é maior que -9"
          />
        )}
        {metas.includes('silent') && (
          <LinhaDaIdeia
            icone={<Equal size={20} />}
            caso="O sinal =, do -5 ao -9"
            revelado={tem('silent')}
            resultado="Não, não, não, não e, só no -9, sim"
          />
        )}
      </div>
    </figure>
  )
}

export function LivreNumberLine() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const r = state.numberLine
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDaReta(discoveryGuidance(activity, state)?.id, r)
  return (
    <Frame
      title="A reta dos números negativos"
      kind="reta"
      activity={activity}
      state={state}
      text={instruction}
      goals={goals}
      completed={completed}
      done={done}
      reset={() => dispatch({ type: 'reset' })}
      hud={
        <Numeros
          itens={[
            ['Marcador', r.value],
            ['Pergunta', `velocidade ${r.operator} -9?`],
            ['Somar -1', `${r.presses} vezes`],
          ]}
        />
      }
      stage={<NumberLineStage state={state} />}
      after={<IdeiaDaReta metas={sceneTargets(activity)} tem={tem} />}
    >
      <fieldset className="sz-discovery-choices">
        <legend className="frame-controls-label">O sinal da pergunta</legend>
        {SINAIS.map((s) => (
          <SceneButton
            key={s.id}
            aria-pressed={r.operator === s.id}
            tom={gesto === s.id ? 'gesto' : r.operator === s.id ? 'ligado' : 'ferramenta'}
            onClick={() => dispatch({ type: 'compare-op', operator: s.id })}
          >
            {s.rotulo}
          </SceneButton>
        ))}
      </fieldset>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'somar' ? 'gesto' : 'ferramenta'}
          fechado={r.value <= -12}
          onClick={() => dispatch({ type: 'sum-minus-one' })}
        >
          <ArrowLeft size={16} /> Somar -1
        </SceneButton>
        <SceneButton
          tom={gesto === 'voltar' ? 'gesto' : 'ferramenta'}
          onClick={() => dispatch({ type: 'restart-case' })}
        >
          <RotateCcw size={15} /> Voltar ao começo
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        Voltar ao começo leva o marcador ao -5 e guarda o sinal; suas descobertas continuam
        marcadas.
      </p>
      <DicaLivre />
    </Frame>
  )
}
