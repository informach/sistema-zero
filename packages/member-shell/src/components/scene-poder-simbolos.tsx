'use client'

import {
  discoveryGuidance,
  type SceneState,
  SEQUENCE_SYMBOLS,
  type SequenceSymbol,
} from '@sistemazero/core/learning/scene'
import { farolSvgUrl } from '@sistemazero/studio/arte'
import { Hand, Hash } from 'lucide-react'
import { SceneCenarioProvider } from './scene-cenario-context'
import { Frame, SceneButton, useDiscovery } from './scene-discovery-frame'
import { SymbolSequenceStage } from './scene-symbol-sequence'

/**
 * A experiência do Poder "O baú dos símbolos" em exploração livre (Faísca, 02/11/2026): só a IDEIA,
 * no molde de `Door` e `Memory` (`scene-discovery-controls.tsx`). Cada símbolo pergunta "é a minha
 * vez?", e passo é o número que o jogo guarda para saber até onde a sequência chegou. Nada de
 * bloco, regra, Se, então nem senão: os blocos só aparecem na montagem do Estúdio.
 *
 * O que cada resposta faz ("sim" acende e passo anda; "não" volta passo a 0) fica com "?" até a
 * criança testar aquele caso, como a pergunta da porta do Farol.
 */

const FALADO: Record<SequenceSymbol, string> = { sol: 'o sol', lua: 'a lua', estrela: 'a estrela' }

/** O que comparar: a lista diz o propósito de cada teste, sem contar o resultado. */
export const SIMBOLOS_DESCOBERTAS = [
  'Toque o sol e depois a lua e observe passo.',
  'Toque os três símbolos na ordem da placa e observe o baú.',
  'Com o sol aceso, pule um símbolo e observe passo.',
  'Comece pelo meio, sem nada aceso, e observe passo.',
  'Depois de errar, tente a ordem da placa sem recomeçar a partida.',
  'No baú que só conta, toque os símbolos fora da ordem e compare.',
] as const
const METAS = [
  'step-moves',
  'right-order',
  'out-of-turn',
  'middle-start',
  'restart-works',
  'count-vs-order',
] as const

type Sequencia = SceneState['sequence']
export type GestoDosSimbolos = SequenceSymbol | 'recomecar' | 'ordem' | 'contar' | null

/** O próximo símbolo na ordem da placa, a partir de passo. */
const naVez = (passo: number): SequenceSymbol =>
  passo === 0 ? 'sol' : passo === 1 ? 'lua' : 'estrela'
/** Um símbolo fora da vez, a partir de passo. */
const foraDaVez = (passo: number): SequenceSymbol => (passo === 1 ? 'estrela' : 'lua')

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua do Farol, 02/11/2026).
 * Com o baú aberto, os símbolos não respondem: o gesto é recomeçar a partida.
 */
export function proximoGestoDosSimbolos(fala: string | undefined, q: Sequencia): GestoDosSimbolos {
  const aberto = q.chest === 'open'
  switch (fala) {
    case 'symbols-start':
    case 'symbols-retry':
      return 'sol'
    case 'symbols-sun':
    case 'symbols-sun-again':
      return 'lua'
    case 'symbols-moon':
      return 'estrela'
    case 'symbols-opened':
      return aberto ? 'recomecar' : q.passo === 1 ? 'estrela' : 'sol'
    case 'symbols-middle':
      return aberto || q.lit.length > 0 ? 'recomecar' : 'lua'
    case 'symbols-again':
      return aberto ? 'recomecar' : naVez(q.passo)
    case 'symbols-again-err':
      return aberto ? 'recomecar' : foraDaVez(q.passo)
    case 'symbols-count':
    case 'symbols-count-try':
      if (q.mode === 'order') return 'contar'
      if (aberto) return 'recomecar'
      return (['estrela', 'lua', 'sol'] as const).find((s) => !q.lit.includes(s)) ?? 'recomecar'
    case 'symbols-count-early':
    case 'symbols-count-back':
      return 'ordem'
    default:
      return null
  }
}

/** A resposta do último toque à pergunta "é a minha vez?" (só no baú que confere a vez). */
export function respostaDoToque(q: Sequencia): boolean | null {
  if (q.mode !== 'order' || q.at === null) return null
  if (q.at === 'sol') return true
  return !(q.passo === 0 && q.lit.length === 0)
}

function Bifurcacao({
  rotulo,
  revelado,
  escolhido,
  arte,
  texto,
  espera,
}: {
  rotulo: string
  revelado: boolean
  escolhido: boolean | null
  arte: string
  texto: string
  espera: string
}) {
  return (
    <div data-selected={escolhido === true} data-muted={escolhido === false}>
      <span>{rotulo}</span>
      {revelado ? (
        <img src={farolSvgUrl(arte)} alt="" />
      ) : (
        <b className="door-fork-unknown" aria-hidden="true">
          ?
        </b>
      )}
      <strong>{revelado ? texto : 'Teste para descobrir'}</strong>
      <small>
        {escolhido === true ? '✓ última resposta' : escolhido === false ? 'Não foi usada' : espera}
      </small>
    </div>
  )
}

/**
 * A figura da ideia: no baú que confere a vez, a pergunta de cada símbolo e as duas respostas; no
 * baú que só conta, quantos símbolos diferentes foram tocados.
 */
export function PerguntaDosSimbolos({
  q,
  revelado,
}: {
  q: Sequencia
  revelado: { sim: boolean; nao: boolean; conta: boolean; qualquerOrdem: boolean }
}) {
  if (q.mode === 'count') {
    const tres = q.lit.length === SEQUENCE_SYMBOLS.length
    const tocou = q.at !== null
    return (
      <figure className="sz-scene-regra door-rule" data-bau="conta">
        <figcaption className="sz-scene-regra-titulo">O baú que só conta</figcaption>
        <div className="movement-event">
          <Hand size={17} /> Tocar um símbolo
        </div>
        <div className="door-question">
          <Hash size={20} />
          <strong>Quantos símbolos diferentes foram tocados?</strong>
          <span>
            contados: {q.lit.length} de {SEQUENCE_SYMBOLS.length}
          </span>
        </div>
        <div className="door-forks">
          <Bifurcacao
            rotulo="Menos de três"
            revelado={tocou || revelado.conta}
            escolhido={tocou ? !tres : null}
            arte="bau-fechado"
            texto="O baú continua fechado"
            espera="Aguardando um toque"
          />
          <Bifurcacao
            rotulo="Os três"
            revelado={revelado.conta || (tres && q.chest === 'open')}
            escolhido={tocou ? tres : null}
            arte="bau-aberto"
            texto={revelado.qualquerOrdem ? 'O baú abre, em qualquer ordem' : 'O baú abre'}
            espera="Aguardando um toque"
          />
        </div>
      </figure>
    )
  }
  const resposta = respostaDoToque(q)
  return (
    <figure className="sz-scene-regra door-rule" data-bau="vez">
      <figcaption className="sz-scene-regra-titulo">A pergunta de cada símbolo</figcaption>
      <div className="movement-event">
        <Hand size={17} /> {q.at === null ? 'Tocar um símbolo' : `Você tocou ${FALADO[q.at]}`}
      </div>
      <div className="door-question">
        <Hash size={20} />
        <strong>É a minha vez?</strong>
        <span>passo agora: {q.passo}</span>
      </div>
      <div className="door-forks">
        <Bifurcacao
          rotulo="Sim"
          revelado={revelado.sim || resposta === true}
          escolhido={resposta}
          arte="pedra-sol-acesa"
          texto="O símbolo acende, e passo anda"
          espera="Aguardando um toque"
        />
        <Bifurcacao
          rotulo="Não"
          revelado={revelado.nao || resposta === false}
          escolhido={resposta === null ? null : !resposta}
          arte="pedra-lua"
          texto="passo volta a 0, e tudo apaga"
          espera="Aguardando um toque"
        />
      </div>
    </figure>
  )
}

export function SimbolosLivre() {
  const m = useDiscovery()
  const q = m.state.sequence
  const seen = (id: string) => m.state.evidence.discoveries.includes(id)
  const completed = METAS.map(seen)
  const gesto = proximoGestoDosSimbolos(discoveryGuidance(m.activity, m.state)?.id, q)
  const tom = (qual: GestoDosSimbolos) => (gesto === qual ? 'gesto' : 'ferramenta')
  const aberto = q.chest === 'open'
  const trocar = (mode: Sequencia['mode']) => {
    if (q.mode !== mode) m.dispatch({ type: 'sequence-mode', mode })
  }
  return (
    <Frame
      title="A ordem dos símbolos"
      stage={
        <SceneCenarioProvider cenario="farol">
          <SymbolSequenceStage state={m.state} />
        </SceneCenarioProvider>
      }
      kind="simbolos"
      activity={m.activity}
      state={m.state}
      text={m.instruction}
      goals={[...SIMBOLOS_DESCOBERTAS]}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => m.dispatch({ type: 'reset' })}
      // A figura da ideia mora embaixo do palco, no molde da `Memory` (full review de 02/11/2026):
      // na coluna da direita, ela empurrava o palco fixo para fora da tela.
      after={
        <PerguntaDosSimbolos
          q={q}
          revelado={{
            sim: seen('step-moves') || seen('right-order'),
            nao: seen('out-of-turn') || seen('middle-start'),
            conta: seen('count-vs-order'),
            qualquerOrdem: seen('count-vs-order'),
          }}
        />
      }
    >
      <div className="sz-discovery-controls free-controls">
        {SEQUENCE_SYMBOLS.map((s) => (
          <SceneButton
            key={s}
            tom={tom(s)}
            disabled={aberto}
            onClick={() => m.dispatch({ type: 'touch-symbol', symbol: s })}
          >
            {`Tocar ${FALADO[s]}`}
          </SceneButton>
        ))}
        <SceneButton tom={tom('recomecar')} onClick={() => m.dispatch({ type: 'restart-symbols' })}>
          Recomeçar a partida
        </SceneButton>
      </div>
      <fieldset className="sz-discovery-controls free-controls">
        <legend className="sz-discovery-small">Qual baú está no jogo</legend>
        <SceneButton
          tom={tom('ordem')}
          aria-pressed={q.mode === 'order'}
          onClick={() => trocar('order')}
        >
          O baú confere a vez
        </SceneButton>
        <SceneButton
          tom={tom('contar')}
          aria-pressed={q.mode === 'count'}
          onClick={() => trocar('count')}
        >
          O baú só conta
        </SceneButton>
      </fieldset>
      <p className="sz-discovery-small">
        {aberto
          ? 'O baú abriu. Recomeçar a partida fecha o baú e apaga os símbolos; suas descobertas continuam marcadas.'
          : 'Trocar de baú começa uma partida nova. Suas descobertas continuam marcadas.'}
      </p>
      <p className="sz-discovery-free-hint">
        Experimente à vontade. Os destaques sugerem um próximo teste; você escolhe a ordem.
      </p>
    </Frame>
  )
}
