'use client'

import type { SceneTwoClocks } from '@sistemazero/core/learning/scene'
import { Baby, Pause, Play, RefreshCw, RotateCcw, Timer } from 'lucide-react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { Frame, SceneButton } from '../scene-discovery-frame'
import { TwoClocksStage } from '../scene-two-clocks'
import { DicaLivre, EscolhaLivre, FaixaLivre, IdeiaRevelada, useTelaLivre } from './meu-jeito-e'

/**
 * A experiência `two-clocks` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de `Door`,
 * `Memory` (`scene-discovery-controls.tsx`) e dos Poderes (`scene-poder-*.tsx`).
 *
 * ⚠️ Exceção decidida pela responsável (02/11/2026): na Aula 7 o conceito é o dos dois relógios, o do jogo e
 * o da animação, que aparecem pelo nome. ⚠️⚠️ "Quadro" é só o do jogo; o desenho da animação de cada pedra é
 * "desenho 1"/"desenho 2" (`TwoClocksStage` com `livre`).
 *
 * As metas pedem o relógio escolhido DESDE o começo (`birthAtStart`/`rateAtStart`, régua do motor): mudar
 * no meio pede "Voltar ao começo", e o destaque mostra isso.
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DOS_RELOGIOS = ['more-rocks', 'faster-spin', 'each-one'] as const
const OBJETIVOS_DOS_RELOGIOS = [
  'Mude só o relógio de nascer, para 20 quadros, e deixe o tempo passar desde o começo.',
  'Mude só o giro, para 16 desenhos por segundo, e deixe o tempo passar desde o começo.',
  'Deixe nascer três pedras e olhe o desenho de cada uma quando ela entra.',
]
type Nascer = SceneTwoClocks['birthEvery']
type Giro = SceneTwoClocks['animationRate']
const NASCER: Nascer[] = [20, 40, 80]
const GIRO: Giro[] = [2, 8, 16]

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDosRelogios =
  | { gesto: 'nascer'; quadros: Nascer }
  | { gesto: 'girar'; porSegundo: Giro }
  | { gesto: 'comeco' | 'tempo' | 'esperar' }
  | null
export function proximoGestoDosRelogios(
  fala: string | undefined,
  c: SceneTwoClocks,
  rodando: boolean,
): GestoDosRelogios {
  const passar: GestoDosRelogios = rodando ? { gesto: 'esperar' } : { gesto: 'tempo' }
  /** Os dois relógios no caso pedido, desde o começo, e o tempo andando. */
  const caso = (nascer: Nascer, giro: Giro): GestoDosRelogios => {
    if (c.birthEvery !== nascer) return { gesto: 'nascer', quadros: nascer }
    if (c.animationRate !== giro) return { gesto: 'girar', porSegundo: giro }
    if (c.birthAtStart !== nascer || c.rateAtStart !== giro) return { gesto: 'comeco' }
    return passar
  }
  if (!fala || fala === 'two-clocks-complete') return null
  if (fala === 'two-clocks-start' || fala.endsWith('-each')) return passar
  if (fala.endsWith('-more')) return caso(20, 8)
  if (fala.endsWith('-faster')) return caso(40, 16)
  return null
}

export function LivreTwoClocks() {
  const { activity, state, dispatch, instruction, has, fala, running, setRunning } = useTelaLivre()
  const c = state.twoClocks
  const completed = METAS_DOS_RELOGIOS.map(has)
  const g = proximoGestoDosRelogios(fala, c, running)
  return (
    <Frame
      title="Dois relógios ao mesmo tempo"
      kind="relogios"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS_DOS_RELOGIOS}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => {
        setRunning(false)
        dispatch({ type: 'reset' })
      }}
      hud={
        <FaixaLivre
          itens={[
            ['Quadro do jogo', c.frames],
            ['Pedras que nasceram', c.born],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <TwoClocksStage state={state} cast={activity.cast} livre />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaRevelada
          titulo="Os dois relógios"
          casos={[
            {
              gesto: 'O relógio de nascer',
              resposta: 'Mais rápido, nasce mais pedra; o giro de cada uma fica igual',
              visto: completed[0] ?? false,
              icone: <Baby size={20} />,
            },
            {
              gesto: 'O relógio do giro',
              resposta: 'Mais rápido, cada pedra gira mais rápido; a hora de nascer fica igual',
              visto: completed[1] ?? false,
              icone: <RefreshCw size={20} />,
            },
            {
              gesto: 'Cada pedra que nasce',
              resposta: 'Começa no desenho 1: o giro dela começa quando ela nasce',
              visto: completed[2] ?? false,
              icone: <Timer size={20} />,
            },
          ]}
        />
      }
    >
      <EscolhaLivre<Nascer>
        legenda="Relógio de nascer (conta os quadros do jogo)"
        valor={c.birthEvery}
        gesto={g?.gesto === 'nascer' ? g.quadros : null}
        opcoes={NASCER.map((q) => ({ id: q, rotulo: `A cada ${q} quadros` }))}
        onEscolher={(frames) => dispatch({ type: 'birth-every', frames })}
      />
      <EscolhaLivre<Giro>
        legenda="Relógio do giro (troca o desenho de cada pedra)"
        valor={c.animationRate}
        gesto={g?.gesto === 'girar' ? g.porSegundo : null}
        opcoes={GIRO.map((r) => ({ id: r, rotulo: `${r} desenhos por segundo` }))}
        onEscolher={(perSecond) => dispatch({ type: 'rate', perSecond })}
      />
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={g?.gesto === 'tempo' ? 'gesto' : 'ferramenta'}
          aria-pressed={running}
          onClick={() => setRunning(!running)}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}{' '}
          {running ? 'Pausar o tempo' : 'Passar o tempo'}
        </SceneButton>
        <SceneButton
          tom={g?.gesto === 'comeco' ? 'gesto' : 'ferramenta'}
          // ⚠️ `restart-case`, nunca `reset`: na exploração livre o `reset` é o "Recomeçar
          // experiência", que apaga as descobertas e os relógios escolhidos.
          onClick={() => {
            setRunning(false)
            dispatch({ type: 'restart-case' })
          }}
        >
          <RotateCcw size={16} /> Voltar ao começo
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        Voltar ao começo guarda os dois relógios que você escolheu e zera o tempo; suas descobertas
        continuam marcadas.
      </p>
      <DicaLivre />
    </Frame>
  )
}
