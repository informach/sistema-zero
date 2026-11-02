import {
  discoveryGuidance,
  type SceneAction,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import { KeyRound, NotebookPen, Pause, Play, RotateCcw, StepForward } from 'lucide-react'
import { useState } from 'react'
import { Medida } from './scene-bench'
import { SceneCenarioProvider } from './scene-cenario-context'
import { CollectionMemoryStage } from './scene-collect-and-remember'
import { Frame, Note, SceneButton, useDiscovery } from './scene-discovery-frame'
import {
  DoorRule,
  EdgeComparison,
  MemoryRule,
  MovementRule,
  OrderRule,
  WalkPicture,
} from './scene-discovery-visuals'
import { LighthouseKeyStage } from './scene-lighthouse-key'
import { LighthousePositionStage } from './scene-lighthouse-position'
import { LighthouseWalkStage } from './scene-lighthouse-walk'

type Kind = 'quadro' | 'limite' | 'memoria' | 'porta' | 'posicao'
export function Stage({
  kind,
  state,
}: {
  kind: Kind
  state: ReturnType<typeof useDiscovery>['state']
}) {
  return (
    <SceneCenarioProvider cenario="farol">
      {kind === 'limite' ? (
        <LighthouseWalkStage state={state} />
      ) : kind === 'memoria' ? (
        <CollectionMemoryStage state={state} />
      ) : kind === 'porta' ? (
        <LighthouseKeyStage state={state} />
      ) : (
        <LighthousePositionStage state={state} />
      )}
    </SceneCenarioProvider>
  )
}
function useExploration(_kind: Kind) {
  const context = useDiscovery()
  const aliases: Record<string, string> = {
    'no-command': 'no-movement-command',
    still: 'still-without-arrow',
    movement: 'moves-each-frame',
    release: 'stopped-after-release',
    'without-memory': 'collected-without-memory',
    'with-memory': 'collected-with-memory',
    away: 'remembered-after-leaving',
    restart: 'reset-after-remembering',
    'without-key': 'locked-without-key',
    'with-key': 'opened-with-key',
  }
  const seen: Record<string, boolean> = {}
  for (const id of context.state.evidence.discoveries) seen[id] = true
  for (const [alias, id] of Object.entries(aliases)) seen[alias] = !!seen[id]
  return {
    ...context,
    command: context.state.walk.movement !== false,
    seen,
    reset: () => context.dispatch({ type: 'reset' }),
    dispatch: (a: SceneAction | { type: 'frames'; count: number }) => {
      if (a.type === 'frames') {
        context.setRunning(false)
        context.dispatch({ type: 'walk-frames', count: a.count === 10 ? 10 : 1 })
      } else context.dispatch(a)
    },
  }
}
function ControlsHint() {
  return (
    <p className="sz-discovery-free-hint">
      Experimente à vontade. Os destaques sugerem um próximo teste; você escolhe a ordem.
    </p>
  )
}

export function Walk({ boundary = false }: { boundary?: boolean }) {
  const kind = boundary ? 'limite' : 'quadro',
    m = useExploration(kind),
    w = m.state.walk
  const { running, setRunning } = useDiscovery()
  const order = w.order ?? 'correct',
    result = w.orderResult ?? false,
    orders = w.testedOrders ?? []
  const setOrder = (value: 'correct' | 'reverse') =>
    m.dispatch({ type: 'walk-order', order: value })
  const completed = boundary
    ? [!!m.seen['left-the-screen'], !!m.seen['stayed-inside'], orders.length === 2]
    : [!!m.seen['no-command'], !!m.seen.still, !!m.seen.movement, !!m.seen.release]
  const goals = boundary
    ? [
        'Compare o que acontece sem limite.',
        'Compare o que acontece com limite.',
        'Teste as duas ordens dos comandos.',
      ]
    : [
        'Teste a tecla apertada sem o bloco de movimento.',
        'Teste o bloco com a tecla solta.',
        'Veja vários quadros com o bloco e a tecla apertada.',
        'Depois de andar, solte a tecla e avance outro quadro.',
      ]
  const text = m.instruction
  const restart = () => {
    setRunning(false)
    m.dispatch({ type: 'restart-walk' })
  }
  return (
    <Frame
      title={boundary ? 'Até onde ele pode ir?' : 'Como o personagem anda'}
      kind={kind}
      activity={m.activity}
      state={m.state}
      text={text}
      goals={goals}
      done={completed.filter(Boolean).length}
      completed={completed}
      reset={() => {
        setRunning(false)
        m.reset()
      }}
      hud={
        <div className="walk-hud">
          <strong>Quadro {w.frame}</strong>
          <span>{w.arrow ? 'Tecla → apertada' : 'Tecla → solta'}</span>
        </div>
      }
      stage={
        boundary ? (
          <Stage kind="limite" state={m.state} />
        ) : (
          <WalkPicture state={m.state} command={m.command} />
        )
      }
      after={
        boundary && w.x > 480 ? (
          <Note label="Fora da tela" tone="gold">
            Ele passou da borda. Adicione o bloco de limite e avance um quadro, ou volte ao início
            para outro teste.
          </Note>
        ) : undefined
      }
    >
      <MovementRule
        held={w.arrow}
        frame={w.frame}
        command={m.command}
        boundary={boundary}
        limited={w.keepInside}
      />
      <div
        className="sz-discovery-controls free-controls rule-editor"
        role="group"
        aria-label="Editar a regra"
      >
        {!boundary && (
          <SceneButton
            tom={!m.command ? 'gesto' : 'ferramenta'}
            onClick={() => m.dispatch({ type: 'movement-command', enabled: !m.command })}
          >
            {m.command ? 'Retirar bloco de mover' : 'Adicionar bloco de mover'}
          </SceneButton>
        )}
        {boundary && (
          <SceneButton
            tom={!w.keepInside ? 'gesto' : 'ferramenta'}
            onClick={() => m.dispatch({ type: 'keep-on-screen', enabled: !w.keepInside })}
          >
            {w.keepInside ? 'Retirar bloco de limite' : 'Adicionar bloco de limite'}
          </SceneButton>
        )}
      </div>
      <div className="test-keyboard" role="group" aria-label="Teclado de teste">
        <strong>Teclado de teste</strong>
        <p>Este botão faz o papel da tecla →. Clique para apertar; clique de novo para soltar.</p>
        <SceneButton
          tom={w.arrow ? 'ligado' : 'ferramenta'}
          aria-pressed={w.arrow}
          onClick={() => m.dispatch({ type: 'hold-arrow', held: !w.arrow })}
        >
          {w.arrow ? 'Soltar tecla →' : 'Apertar tecla →'}
        </SceneButton>
        <span className="test-key-state">
          {w.arrow ? '→ apertada neste teste' : 'Nenhuma tecla apertada'}
        </span>
      </div>
      <div className="frame-controls-label">
        Passagem dos quadros{' '}
        <small>O teste espera você avançar. No jogo rodando, os quadros passam sozinhos.</small>
      </div>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={!running ? 'gesto' : 'ferramenta'}
          onClick={() => {
            setRunning(false)
            m.dispatch({ type: 'frames', count: 1 })
          }}
        >
          <StepForward size={16} />
          Avançar 1 quadro
        </SceneButton>
        <SceneButton
          onClick={() => {
            setRunning(false)
            m.dispatch({ type: 'frames', count: 10 })
          }}
        >
          Avançar 10 quadros
        </SceneButton>
        <SceneButton
          tom={running ? 'gesto' : 'ferramenta'}
          aria-pressed={running}
          onClick={() => setRunning(!running)}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}{' '}
          {running ? 'Pausar quadros' : 'Passar quadros automaticamente'}
        </SceneButton>
        <SceneButton onClick={restart}>
          <RotateCcw size={16} /> Voltar ao início
        </SceneButton>
      </div>
      <ControlsHint />
      {boundary && (
        <details className="sz-discovery-details free-order">
          <summary>Experimentar a ordem dos comandos</summary>
          <p>
            Este teste separado começa junto à borda, com a tecla → apertada. Troque a ordem dos
            blocos e compare o próximo quadro.
          </p>
          <div className="sz-discovery-choices">
            <SceneButton
              aria-pressed={order === 'correct'}
              tom={order === 'correct' ? 'ligado' : 'ferramenta'}
              onClick={() => {
                setOrder('correct')
              }}
            >
              Mover → limitar
            </SceneButton>
            <SceneButton
              aria-pressed={order === 'reverse'}
              tom={order === 'reverse' ? 'ligado' : 'ferramenta'}
              onClick={() => {
                setOrder('reverse')
              }}
            >
              Limitar → mover
            </SceneButton>
          </div>
          <OrderRule correct={order === 'correct'} />
          <SceneButton
            tom="gesto"
            onClick={() => {
              m.dispatch({ type: 'test-walk-order' })
            }}
          >
            Avançar nessa ordem
          </SceneButton>
          <EdgeComparison result={result} correct={order === 'correct'} />
        </details>
      )}
    </Frame>
  )
}

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (full review de 02/11/2026): com
 * regras soltas por botão, quem começava com a memória ligada via "Afastar" aceso enquanto o
 * Zappy pedia uma partida nova com a memória desligada.
 */
export type GestoDaMemoria = 'memoria' | 'encostar' | 'afastar' | 'recomecar' | null
export function proximoGestoDaMemoria(
  fala: string | undefined,
  c: SceneState['collection'],
): GestoDaMemoria {
  const encostarOuRecomecar = c.keyPresent ? 'encostar' : 'recomecar'
  switch (fala) {
    case 'memory-first':
    case 'memory-first-saved':
      return 'encostar'
    case 'memory-compare':
      return c.remember ? encostarOuRecomecar : 'memoria'
    case 'memory-compare-off':
      return c.remember ? 'memoria' : encostarOuRecomecar
    case 'memory-edited':
      return 'recomecar'
    case 'memory-away':
      if (c.hasKey && c.position === 'touching') return 'afastar'
      return c.remember ? encostarOuRecomecar : 'memoria'
    case 'memory-restart':
      if (c.hasKey && !c.keyPresent) return 'recomecar'
      return c.remember ? encostarOuRecomecar : 'memoria'
    default:
      return null
  }
}

export function Memory() {
  const m = useExploration('memoria'),
    c = m.state.collection
  const gesto = proximoGestoDaMemoria(discoveryGuidance(m.activity, m.state)?.id, c)
  const tom = (qual: GestoDaMemoria) => (gesto === qual ? 'gesto' : 'ferramenta')
  const completed = ['without-memory', 'with-memory', 'away', 'restart'].map((id) => !!m.seen[id])
  const goals = [
    'Compare uma coleta com a memória desligada.',
    'Compare uma coleta com a memória ligada.',
    'Afaste o personagem depois de guardar e observe temChave.',
    'Comece uma partida nova depois de guardar e observe temChave.',
  ]
  const text = m.instruction
  return (
    <Frame
      title="O jogo guardou a chave?"
      stage={<Stage kind="memoria" state={m.state} />}
      kind="memoria"
      activity={m.activity}
      state={m.state}
      text={text}
      goals={goals}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={m.reset}
      after={
        <div className="memory-change" data-saved={c.hasKey}>
          <span>O que você vê e o que o jogo guarda</span>
          <div>
            <KeyRound size={19} />
            <p>
              {c.keyPresent
                ? 'Chave no chão'
                : c.position === 'away'
                  ? 'Chave retirada · personagem afastado'
                  : 'Chave retirada · aviso mudou'}
            </p>
          </div>
          <div className="memory-saved">
            <NotebookPen size={23} />
            <strong>{c.hasKey ? 'Coleta guardada' : 'Coleta não guardada'}</strong>
            <span>temChave = {c.hasKey ? 'verdadeiro' : 'falso'}</span>
          </div>
        </div>
      }
    >
      <MemoryRule
        remember={c.remember}
        collected={!c.keyPresent}
        saved={c.hasKey}
        revealed={{
          any: completed[0] === true || completed[1] === true,
          on: completed[1] === true,
        }}
      />
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          aria-pressed={c.remember}
          tom={tom('memoria')}
          onClick={() => m.dispatch({ type: 'remember-collection', enabled: !c.remember })}
        >
          {c.remember ? 'Desligar a memória da chave' : 'Ligar a memória da chave'}
        </SceneButton>
        <SceneButton
          tom={tom('encostar')}
          disabled={!c.keyPresent}
          onClick={() => m.dispatch({ type: 'collect-key' })}
        >
          Encostar na chave
        </SceneButton>
        <SceneButton
          tom={tom('afastar')}
          disabled={c.position !== 'touching'}
          onClick={() => m.dispatch({ type: 'leave-key' })}
        >
          Afastar
        </SceneButton>
        <SceneButton
          tom={tom('recomecar')}
          onClick={() => m.dispatch({ type: 'restart-collection' })}
        >
          Recomeçar a partida
        </SceneButton>
      </div>
      {!c.keyPresent && (
        <p className="sz-discovery-small">
          A chave já saiu do chão. Recomeçar a partida traz outra chave; suas descobertas continuam
          marcadas.
        </p>
      )}
      <ControlsHint />
    </Frame>
  )
}

export function Door() {
  const m = useExploration('porta'),
    l = m.state.lighthouse
  const completed = ['without-key', 'with-key'].map((id) => !!m.seen[id])
  // O caso de agora já foi testado? Então o destaque vai para o outro caso, como pede o Zappy.
  const casoTestado = l.hasKey ? completed[1] : completed[0]
  const text = m.instruction
  return (
    <Frame
      title="O que a porta precisa?"
      stage={<Stage kind="porta" state={m.state} />}
      kind="porta"
      activity={m.activity}
      state={m.state}
      text={text}
      goals={['Teste a porta sem a chave.', 'Teste a mesma porta com a chave.']}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={m.reset}
    >
      <DoorRule
        checked={l.checkedKey ?? null}
        revealed={{ yes: completed[1] === true, no: completed[0] === true }}
      />
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={casoTestado && !completed.every(Boolean) ? 'gesto' : 'ferramenta'}
          aria-pressed={l.hasKey}
          onClick={() => m.dispatch({ type: 'key-state', hasKey: !l.hasKey })}
        >
          {l.hasKey ? 'Tirar a chave do personagem' : 'Dar a chave ao personagem'}
        </SceneButton>
        <SceneButton
          tom={!casoTestado ? 'gesto' : 'ferramenta'}
          onClick={() => m.dispatch({ type: 'try-lighthouse-door' })}
        >
          Testar a porta
        </SceneButton>
        <SceneButton onClick={() => m.dispatch({ type: 'key-state', hasKey: l.hasKey })}>
          Preparar outra tentativa
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        Dar ou tirar a chave prepara uma situação de teste. No jogo, o personagem precisa encontrar
        a chave. A resposta da porta só aparece quando você testa a porta.
      </p>
      <ControlsHint />
    </Frame>
  )
}

export function Position() {
  const m = useExploration('posicao'),
    p = m.state.keyPosition
  const [target, setTarget] = useState(false)
  const completed = ['x-minus', 'x-plus', 'y-minus', 'y-plus'].map((id) => !!m.seen[id])
  const reached = Math.abs(p.x - 280) <= 12 && Math.abs(p.y - 250) <= 12
  const move = (axis: 'x' | 'y', value: number) =>
    m.dispatch({
      type: 'key-position',
      axis,
      value: Math.max(0, Math.min(axis === 'x' ? 448 : 328, value)),
    })
  const text = m.instruction
  const stage = (
    <div className="sz-discovery-position-stage">
      <Stage kind="posicao" state={m.state} />
      <svg className="sz-discovery-axis-overlay" viewBox="0 0 480 360" aria-hidden="true">
        <g opacity=".65">
          <rect
            x="211"
            y="53"
            width="32"
            height="32"
            rx="4"
            fill="none"
            stroke="#865900"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <text x="227" y="47" textAnchor="middle" fontSize="15" fontWeight="800" fill="#654500">
            Início
          </text>
        </g>
        {target && (
          <>
            <rect
              x="276"
              y="246"
              width="40"
              height="40"
              rx="8"
              fill="none"
              stroke={reached ? '#096647' : '#7b4600'}
              strokeWidth="3"
              strokeDasharray="5 3"
            />
            <text x="296" y="305" textAnchor="middle" fontSize="17" fontWeight="800" fill="#654500">
              Alvo
            </text>
          </>
        )}
      </svg>
    </div>
  )
  return (
    <Frame
      title="Como escolher um lugar para a chave"
      kind="posicao"
      activity={m.activity}
      state={m.state}
      text={text}
      goals={[
        'Diminua o x e observe a chave.',
        'Aumente o x e observe a chave.',
        'Diminua o y e observe a chave.',
        'Aumente o y e observe a chave.',
      ]}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => {
        m.reset()
        setTarget(false)
      }}
      stage={stage}
      hud={
        <div className="position-hud">
          <span>
            ↔ x <b>{p.x}</b>
          </span>
          <span>
            ↕ y <b>{p.y}</b>
          </span>
        </div>
      }
      after={
        <Note label="O que mudou" tone="blue">
          {m.state.caption ||
            'A marca dourada guarda o lugar inicial. O pontilhado mostra de onde veio o último movimento.'}
        </Note>
      }
    >
      {(['x', 'y'] as const).map((axis) => (
        <Medida
          key={axis}
          label={axis === 'x' ? 'Horizontal x' : 'Vertical y'}
          value={p[axis]}
          min={0}
          max={axis === 'x' ? 448 : 328}
          passo={axis === 'x' ? 60 : 40}
          digitavel
          onChange={(value) => move(axis, value)}
        />
      ))}
      <div className="sz-discovery-controls">
        <SceneButton onClick={() => m.dispatch({ type: 'restart-key-position' })}>
          <RotateCcw size={15} />
          Voltar ao lugar inicial
        </SceneButton>
        <SceneButton aria-pressed={target} onClick={() => setTarget((v) => !v)}>
          {target ? 'Esconder alvo' : 'Mostrar um alvo'}
        </SceneButton>
      </div>
      {target && (
        <Note
          label={reached ? 'Você chegou ao alvo!' : 'Desafio opcional'}
          tone={reached ? 'green' : 'gold'}
        >
          {reached
            ? 'Pode continuar explorando ou voltar ao início para tentar de outro jeito.'
            : 'Escolha os movimentos para levar a chave até o alvo. Todos os controles continuam livres.'}
        </Note>
      )}
      <ControlsHint />
    </Frame>
  )
}
