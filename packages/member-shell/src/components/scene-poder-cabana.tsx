'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { farolSvgUrl } from '@sistemazero/studio/arte'
import { Hand, MessageCircle, NotebookPen } from 'lucide-react'
import { SceneCenarioProvider } from './scene-cenario-context'
import { Frame, SceneButton, useDiscovery } from './scene-discovery-frame'
import { TwoPiecesStage } from './scene-two-pieces'

/**
 * A experiência do Poder "O segredo da cabana" em exploração livre (Faísca, 02/11/2026): só a
 * IDEIA, no molde de `Door` e `Memory` (`scene-discovery-controls.tsx`). A cabana pede as duas
 * peças (a ideia do "e") ou uma das peças (a ideia do "ou"); nada de bloco, regra, Se, então nem
 * senão, que só aparecem na montagem do Estúdio.
 *
 * O que cada resposta faz (abrir a cabana ou avisar o que ela pede) fica com "?" até a criança
 * testar aquele caso, como a pergunta da porta do Farol.
 */

/** O que comparar: a lista diz o propósito de cada teste, sem contar o resultado. */
export const CABANA_DESCOBERTAS = [
  'Encoste na cabana sem nenhuma peça e observe.',
  'Encoste na cabana com uma peça só e observe.',
  'Encoste na cabana com as duas peças e observe.',
  'Compare começando pela chave e começando pelo emblema.',
  'Faça a cabana pedir uma das peças e teste com uma peça só.',
] as const
const METAS = ['none-closed', 'one-closed', 'both-open', 'any-order', 'and-vs-or'] as const

type Pecas = SceneState['pieces']
export type GestoDaCabana = 'chave' | 'emblema' | 'encostar' | 'recomecar' | 'duas' | 'uma' | null

/** A peça que falta ao personagem (a chave primeiro). */
const pecaQueFalta = (p: Pecas): GestoDaCabana =>
  !p.temChave ? 'chave' : !p.temEmblema ? 'emblema' : 'encostar'

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua do Farol, 02/11/2026).
 * Com a cabana aberta, encostar de novo não testa nada: o gesto é recomeçar a partida.
 */
export function proximoGestoDaCabana(fala: string | undefined, p: Pecas): GestoDaCabana {
  const pecas = Number(p.temChave) + Number(p.temEmblema)
  const aberta = p.door === 'open'
  switch (fala) {
    case 'cabin-start':
    case 'cabin-none':
    case 'cabin-one':
    case 'cabin-two':
    case 'cabin-order-try':
      return 'encostar'
    case 'cabin-after-none':
      return pecaQueFalta(p)
    case 'cabin-after-one':
      return pecas === 0 ? 'encostar' : 'recomecar'
    case 'cabin-after-closed':
      return aberta ? 'recomecar' : pecaQueFalta(p)
    case 'cabin-restart':
    case 'cabin-opened-closed':
      return 'recomecar'
    case 'cabin-opened': {
      if (aberta) return 'recomecar'
      // A outra ordem: começar pela peça que ainda não abriu a cabana primeiro.
      const primeira = p.opened.keyFirst ? 'emblem' : 'key'
      if (pecas === 0) return primeira === 'key' ? 'chave' : 'emblema'
      if (p.order[0] !== primeira) return 'recomecar'
      return pecas === 1 ? pecaQueFalta(p) : 'encostar'
    }
    case 'cabin-or':
      return 'uma'
    case 'cabin-or-try':
      if (aberta || pecas === 2) return 'recomecar'
      return pecas === 0 ? 'chave' : 'encostar'
    case 'cabin-back-and':
      return 'duas'
    default:
      return null
  }
}

const sim = (v: boolean) => (v ? 'verdadeiro' : 'falso')

/** A figura da ideia: o que a cabana pede, a pergunta e as duas respostas. */
export function PerguntaDaCabana({
  p,
  revelado,
}: {
  p: Pecas
  revelado: { sim: boolean; nao: boolean }
}) {
  const testou = p.at === 'door'
  const resposta = testou ? p.door === 'open' : null
  const estado = (escolhido: boolean) =>
    resposta === escolhido
      ? '✓ resposta deste teste'
      : resposta === !escolhido
        ? 'Não foi usada'
        : 'Aguardando um teste'
  return (
    <figure className="sz-scene-regra door-rule" data-pede={p.rule === 'and' ? 'duas' : 'uma'}>
      <figcaption className="sz-scene-regra-titulo">A pergunta da cabana</figcaption>
      <div className="movement-event">
        <Hand size={17} /> Encostar na cabana
      </div>
      <div className="door-question">
        <NotebookPen size={20} />
        <strong>
          {p.rule === 'and'
            ? 'A cabana pede as duas peças. O personagem tem as duas?'
            : 'A cabana pede uma das peças. O personagem tem pelo menos uma?'}
        </strong>
      </div>
      <p className="sz-discovery-small">
        temChave = {sim(p.temChave)} · temEmblema = {sim(p.temEmblema)}
      </p>
      <div className="door-forks">
        <div data-selected={resposta === true} data-muted={resposta === false}>
          <span>Sim</span>
          {revelado.sim || resposta === true ? (
            <img src={farolSvgUrl('cabana-aberta')} alt="" />
          ) : (
            <b className="door-fork-unknown" aria-hidden="true">
              ?
            </b>
          )}
          <strong>
            {revelado.sim || resposta === true ? 'Abrir a cabana' : 'Teste para descobrir'}
          </strong>
          <small>{estado(true)}</small>
        </div>
        <div data-selected={resposta === false} data-muted={resposta === true}>
          <span>Não</span>
          {revelado.nao || resposta === false ? (
            <MessageCircle size={34} />
          ) : (
            <b className="door-fork-unknown" aria-hidden="true">
              ?
            </b>
          )}
          <strong>
            {revelado.nao || resposta === false
              ? 'Avisar o que a cabana pede'
              : 'Teste para descobrir'}
          </strong>
          <small>{estado(false)}</small>
        </div>
      </div>
    </figure>
  )
}

export function CabanaLivre() {
  const m = useDiscovery()
  const p = m.state.pieces
  const seen = (id: string) => m.state.evidence.discoveries.includes(id)
  const completed = METAS.map(seen)
  const gesto = proximoGestoDaCabana(discoveryGuidance(m.activity, m.state)?.id, p)
  const tom = (qual: GestoDaCabana) => (gesto === qual ? 'gesto' : 'ferramenta')
  const aberta = p.door === 'open'
  return (
    <Frame
      title="A porta com duas peças"
      stage={
        <SceneCenarioProvider cenario="farol">
          <TwoPiecesStage state={m.state} />
        </SceneCenarioProvider>
      }
      kind="cabana"
      activity={m.activity}
      state={m.state}
      text={m.instruction}
      goals={[...CABANA_DESCOBERTAS]}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => m.dispatch({ type: 'reset' })}
      // A figura da ideia mora embaixo do palco, no molde da `Memory` (full review de 02/11/2026):
      // na coluna da direita, ela empurrava o palco fixo para fora da tela.
      after={
        <PerguntaDaCabana
          p={p}
          revelado={{
            sim: seen('both-open') || seen('and-vs-or'),
            nao: seen('none-closed') || seen('one-closed'),
          }}
        />
      }
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={tom('chave')}
          disabled={p.temChave}
          onClick={() => m.dispatch({ type: 'take-piece', piece: 'key' })}
        >
          Pegar a chave
        </SceneButton>
        <SceneButton
          tom={tom('emblema')}
          disabled={p.temEmblema}
          onClick={() => m.dispatch({ type: 'take-piece', piece: 'emblem' })}
        >
          Pegar o emblema
        </SceneButton>
        <SceneButton
          tom={tom('encostar')}
          disabled={aberta}
          onClick={() => m.dispatch({ type: 'try-cabin' })}
        >
          Encostar na cabana
        </SceneButton>
        <SceneButton tom={tom('recomecar')} onClick={() => m.dispatch({ type: 'restart-cabin' })}>
          Recomeçar a partida
        </SceneButton>
      </div>
      <fieldset className="sz-discovery-controls free-controls">
        <legend className="sz-discovery-small">O que a cabana pede</legend>
        <SceneButton
          tom={tom('duas')}
          aria-pressed={p.rule === 'and'}
          onClick={() => m.dispatch({ type: 'cabin-rule', rule: 'and' })}
        >
          A cabana pede as duas peças
        </SceneButton>
        <SceneButton
          tom={tom('uma')}
          aria-pressed={p.rule === 'or'}
          onClick={() => m.dispatch({ type: 'cabin-rule', rule: 'or' })}
        >
          A cabana pede uma das peças
        </SceneButton>
      </fieldset>
      <p className="sz-discovery-small">
        {aberta
          ? 'A cabana abriu. Recomeçar a partida fecha a cabana e devolve as peças ao chão; suas descobertas continuam marcadas.'
          : 'Mudar o que a cabana pede vale para o próximo encontro com ela. A resposta só aparece quando o personagem encosta na cabana.'}
      </p>
      <p className="sz-discovery-free-hint">
        Experimente à vontade. Os destaques sugerem um próximo teste; você escolhe a ordem.
      </p>
    </Frame>
  )
}
