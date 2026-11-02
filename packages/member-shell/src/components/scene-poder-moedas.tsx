'use client'

import {
  COIN_COUNTER,
  type CoinIndex,
  discoveryGuidance,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import { Coins, MessageCircle, NotebookPen, PackageOpen, Sparkles } from 'lucide-react'
import { SceneCenarioProvider } from './scene-cenario-context'
import { CoinCounterStage } from './scene-coin-counter'
import { Frame, SceneButton, useDiscovery } from './scene-discovery-frame'

/**
 * A experiência do Poder "Moedas no caminho" em exploração livre (Faísca, 02/11/2026): só a IDEIA,
 * no molde de `Door` e `Memory` (`scene-discovery-controls.tsx`). A tela fala do número moedas, que
 * cresce como um cofrinho, do sumiço da moeda e da pergunta do baú ("pelo menos" ou "exatamente");
 * o grupo, o somar, o Se, o então e o senão ficam para a montagem do Estúdio. O que cada coisa faz
 * só aparece depois de a criança testar.
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DAS_MOEDAS = [
  'each-adds',
  'no-double',
  'counts-again',
  'kept',
  'below-goal',
  'compare-rules',
] as const
const OBJETIVOS_DAS_MOEDAS = [
  'Encoste em duas moedas diferentes e observe moedas.',
  'Com o sumiço ligado, volte a uma moeda que já pegou e observe moedas.',
  'Com o sumiço desligado, volte a uma moeda que já pegou e observe moedas.',
  'Afaste o personagem das moedas e observe moedas.',
  'Tente o baú com menos de 5 moedas.',
  'Com mais de 5 moedas, compare as perguntas Pelo menos 5 e Exatamente 5.',
]

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`).
 * Quando o gesto é encostar numa moeda, `moeda` diz qual: uma nova para somar, ou uma já pega para
 * voltar ao lugar dela.
 */
export type GestoDasMoedas =
  | { gesto: 'moeda'; moeda: number }
  | { gesto: 'afastar' | 'bau' | 'sumico' | 'regra' | 'recomecar' }
  | null
export function proximoGestoDasMoedas(
  fala: string | undefined,
  c: SceneState['coins'],
): GestoDasMoedas {
  const outra = (cabe: (i: number) => boolean) => {
    for (let i = 0; i < COIN_COUNTER.coins; i++) if (i !== c.at && cabe(i)) return i
    return undefined
  }
  const nova = outra((i) => !!c.present[i] && !c.counted[i]) ?? outra((i) => !!c.present[i])
  const moeda = (i: number | undefined): GestoDasMoedas =>
    i === undefined ? { gesto: 'recomecar' } : { gesto: 'moeda', moeda: i }
  switch (fala) {
    case 'coin-start':
    case 'coin-first':
      return moeda(nova)
    case 'coin-away':
      return c.at === null ? moeda(nova) : { gesto: 'afastar' }
    case 'coin-back':
      return moeda(outra((i) => !!c.counted[i]) ?? nova)
    case 'coin-compare-off':
      if (c.disappear) return { gesto: 'sumico' }
      return moeda(outra((i) => !!c.counted[i] && !!c.present[i]) ?? nova)
    case 'coin-compare-on':
      if (!c.disappear) return { gesto: 'sumico' }
      return moeda(outra((i) => !!c.counted[i] && !c.present[i]) ?? nova)
    case 'coin-chest':
      if (c.moedas === 0) return moeda(nova)
      return c.moedas < COIN_COUNTER.goal ? { gesto: 'bau' } : { gesto: 'recomecar' }
    case 'coin-rules':
    case 'coin-rules-equals':
    case 'coin-rules-atleast': {
      if (c.moedas <= COIN_COUNTER.goal) return moeda(nova)
      const falta = c.rule === 'at-least' ? !c.compared.atLeast : !c.compared.equals
      return falta ? { gesto: 'bau' } : { gesto: 'regra' }
    }
    default:
      return null
  }
}

/** A ideia das moedas: o encontro, o sumiço e a pergunta do baú, com as respostas reveladas no teste. */
function IdeiaDasMoedas({
  c,
  visto,
}: {
  c: SceneState['coins']
  visto: { soma: boolean; umaVez: boolean; deNovo: boolean; sim: boolean; nao: boolean }
}) {
  const resposta = c.at === 'chest' ? c.chest === 'open' : null
  const estado = (escolhido: boolean) =>
    resposta === escolhido
      ? '✓ escolhido'
      : resposta === !escolhido
        ? 'Não foi usado'
        : 'Aguardando teste'
  const descobrir = 'Teste para descobrir'
  const sumico = c.disappear
    ? visto.umaVez
      ? 'A moeda que sumiu não conta de novo'
      : descobrir
    : visto.deNovo
      ? 'A mesma moeda conta de novo'
      : descobrir
  return (
    <figure className="sz-scene-regra door-rule coin-idea">
      <figcaption className="sz-scene-regra-titulo">O que acontece com as moedas</figcaption>
      <div className="memory-actions">
        <div data-lit={visto.soma}>
          <Coins size={20} />
          <span>
            Encostar numa moeda
            <small>{visto.soma ? 'moedas soma 1: o número de antes, mais 1' : descobrir}</small>
          </span>
        </div>
        <div data-lit={c.disappear ? visto.umaVez : visto.deNovo}>
          <Sparkles size={20} />
          <span>
            Sumiço da moeda: {c.disappear ? 'ligado' : 'desligado'}
            <small>{sumico}</small>
          </span>
        </div>
      </div>
      <div className="door-question">
        <NotebookPen size={20} />
        <strong>
          No baú: moedas é {c.rule === 'at-least' ? 'pelo menos' : 'exatamente'} {COIN_COUNTER.goal}
          ?
        </strong>
      </div>
      <div className="door-forks">
        <div data-selected={resposta === true} data-muted={resposta === false}>
          <span>Sim</span>
          {visto.sim ? (
            <PackageOpen size={34} />
          ) : (
            <b className="door-fork-unknown" aria-hidden="true">
              ?
            </b>
          )}
          <strong>{visto.sim ? 'Abrir o baú' : descobrir}</strong>
          <small>{estado(true)}</small>
        </div>
        <div data-selected={resposta === false} data-muted={resposta === true}>
          <span>Não</span>
          {visto.nao ? (
            <MessageCircle size={34} />
          ) : (
            <b className="door-fork-unknown" aria-hidden="true">
              ?
            </b>
          )}
          <strong>{visto.nao ? 'Avisar o que falta' : descobrir}</strong>
          <small>{estado(false)}</small>
        </div>
      </div>
    </figure>
  )
}

export function MoedasLivre() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const c = state.coins
  const has = (id: string) => state.evidence.discoveries.includes(id)
  const completed = METAS_DAS_MOEDAS.map(has)
  const g = proximoGestoDasMoedas(discoveryGuidance(activity, state)?.id, c)
  const tom = (qual: string) => (g?.gesto === qual ? 'gesto' : 'ferramenta')
  const regra = (rule: 'at-least' | 'equals') => (
    <SceneButton
      aria-pressed={c.rule === rule}
      tom={
        g?.gesto === 'regra' && c.rule !== rule
          ? 'gesto'
          : c.rule === rule
            ? 'ligado'
            : 'ferramenta'
      }
      onClick={() => dispatch({ type: 'chest-rule', rule })}
    >
      {rule === 'at-least' ? 'Pelo menos 5' : 'Exatamente 5'}
    </SceneButton>
  )
  return (
    <Frame
      title="O contador de moedas"
      kind="moedas"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS_DAS_MOEDAS}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => dispatch({ type: 'reset' })}
      stage={
        <SceneCenarioProvider cenario="farol">
          <CoinCounterStage state={state} />
        </SceneCenarioProvider>
      }
      // A figura fica embaixo do palco, como na `Memory`: na coluna dos controles, ela empurrava o
      // palco fixo para baixo e abria um vão em cima dele (full review de 02/11/2026).
      after={
        <IdeiaDasMoedas
          c={c}
          visto={{
            soma: completed[0] ?? false,
            umaVez: completed[1] ?? false,
            deNovo: completed[2] ?? false,
            // Derivado do estado (e não de um estado da tela): o Desfazer volta a revelação junto.
            sim: c.chest === 'open' || c.compared.atLeast,
            nao:
              (completed[4] ?? false) ||
              c.compared.equals ||
              (c.at === 'chest' && c.chest === 'closed'),
          }}
        />
      }
    >
      <fieldset>
        <legend className="frame-controls-label">Encostar na moeda</legend>
        <div className="grid grid-cols-3 gap-2 min-[700px]:grid-cols-6">
          {Array.from({ length: COIN_COUNTER.coins }, (_, i) => {
            const n = i + 1
            const saiu = !c.present[i]
            return (
              <SceneButton
                // biome-ignore lint/suspicious/noArrayIndexKey: as seis moedas são lugares fixos.
                key={i}
                tom={g?.gesto === 'moeda' && g.moeda === i ? 'gesto' : 'ferramenta'}
                aria-label={saiu ? `Moeda ${n}, vazio: voltar ao lugar` : `Encostar na moeda ${n}`}
                data-ja-saiu={saiu ? '' : undefined}
                disabled={c.at === i}
                onClick={() => dispatch({ type: 'touch-coin', coin: i as CoinIndex })}
              >
                {saiu ? `${n} · vazio` : n}
              </SceneButton>
            )
          })}
        </div>
      </fieldset>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={tom('afastar')}
          disabled={c.at === null}
          onClick={() => dispatch({ type: 'leave-coin' })}
        >
          Afastar
        </SceneButton>
        <SceneButton tom={tom('bau')} onClick={() => dispatch({ type: 'try-chest' })}>
          Encostar no baú
        </SceneButton>
        <SceneButton tom={tom('recomecar')} onClick={() => dispatch({ type: 'restart-coins' })}>
          Recomeçar a partida
        </SceneButton>
      </div>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          aria-pressed={c.disappear}
          tom={tom('sumico')}
          onClick={() => dispatch({ type: 'coin-disappears', enabled: !c.disappear })}
        >
          {c.disappear ? 'Desligar o sumiço da moeda' : 'Ligar o sumiço da moeda'}
        </SceneButton>
      </div>
      <fieldset className="sz-discovery-choices">
        <legend className="frame-controls-label">O que o baú pergunta?</legend>
        {regra('at-least')}
        {regra('equals')}
      </fieldset>
      <p className="sz-discovery-small">
        Mudar o sumiço ou a pergunta do baú vale para o próximo encontro. Recomeçar a partida traz
        as seis moedas de volta e zera moedas; suas descobertas continuam marcadas.
      </p>
      <p className="sz-discovery-free-hint">
        Experimente à vontade. Os destaques sugerem um próximo teste; você escolhe a ordem.
      </p>
    </Frame>
  )
}
