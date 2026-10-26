import { useEffect, useReducer, useState } from 'react'
import { Frame, Note, SceneButton, Stage } from './shared'
import { items, source } from './data'
import {
  WalkPicture,
  MovementRule,
  EdgeComparison,
  OrderRule,
  MemoryRule,
  DoorRule,
} from './visuals'
import { begin, explore, type Kind, type Action } from './exploration-model'
import { KeyRound, NotebookPen, RotateCcw, Play, Pause, StepForward } from 'lucide-react'

function useExploration(kind: Kind) {
  const [model, dispatch] = useReducer(
    (s: ReturnType<typeof begin>, a: Action) => explore(kind, s, a),
    kind,
    begin,
  )
  return {
    ...model,
    dispatch,
    activity: source(kind).activity,
    reset: () => dispatch({ type: 'reset-all' }),
  }
}
function ControlsHint() {
  return (
    <p className="farol-free-hint">
      Experimente à vontade. Os destaques sugerem um próximo teste; você escolhe a ordem.
    </p>
  )
}

export function Walk({
  boundary = false,
  active = true,
}: {
  boundary?: boolean
  active?: boolean
}) {
  const kind = boundary ? 'limite' : 'quadro',
    m = useExploration(kind),
    w = m.state.walk
  const [running, setRunning] = useState(false),
    [order, setOrder] = useState<'correct' | 'reverse'>('correct'),
    [result, setResult] = useState(false),
    [orders, setOrders] = useState<string[]>([])
  useEffect(() => {
    if (!running || !active) return
    const timer = setInterval(() => m.dispatch({ type: 'frames', count: 1 }), boundary ? 35 : 120)
    return () => clearInterval(timer)
  }, [running, boundary, active])
  useEffect(() => {
    if (!active) setRunning(false)
  }, [active])
  // Once outside the actual game screen, pause the clock; individual frames and configuration remain free.
  useEffect(() => {
    if (boundary && w.x >= 560) setRunning(false)
  }, [boundary, w.x])
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
  let text: string
  if (boundary) {
    text = !completed[0]
      ? w.keepInside
        ? 'O bloco de limite já está na regra. Você pode retirá-lo e comparar o que acontece na borda.'
        : 'O bloco de mover já está na regra. Aperte a tecla no teclado de teste e avance os quadros. Observe a borda.'
      : !completed[1]
        ? w.keepInside
          ? 'Avance mais quadros junto à borda. Veja como o bloco de limite mantém o personagem dentro da tela.'
          : 'Ele saiu da tela. Adicione o bloco de limite e avance outro quadro. O que muda?'
        : !completed[2]
          ? 'Você comparou com e sem o bloco de limite. Abra o teste das duas ordens para ver por que a ordem importa.'
          : 'Você comparou as duas regras e as duas ordens. Pode repetir os testes e continuar explorando.'
  } else {
    text = !m.command
      ? w.arrow
        ? 'A tecla está apertada, mas falta o comando de mover. Avance um quadro para testar. Depois adicione o bloco e compare.'
        : 'A regra está vazia. Você pode apertar a tecla no teclado de teste e avançar um quadro, ou começar adicionando o bloco.'
      : !w.arrow
        ? 'O bloco está na regra, mas a tecla está solta. Avance um quadro para comparar. Apertar a tecla não muda os blocos.'
        : 'Bloco na regra e tecla apertada. Avance um ou vários quadros e observe os passos. Você pode retirar o bloco ou soltar a tecla para comparar.'
    if (completed.every(Boolean))
      text =
        'Você comparou o comando, a tecla e a passagem dos quadros. Continue experimentando: todas as opções permanecem livres.'
  }
  const restart = () => {
    setRunning(false)
    m.dispatch({ type: 'restart-walk' })
  }
  return (
    <Frame
      title={items.find((i) => i.id === kind)!.title}
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
        setOrders([])
        setResult(false)
        setOrder('correct')
      }}
      hud={
        <div className="walk-hud">
          <strong>Quadro {w.frame}</strong>
          <span>{w.arrow ? 'Tecla → apertada' : 'Tecla → solta'}</span>
        </div>
      }
      stage={boundary ? undefined : <WalkPicture state={m.state} command={m.command} />}
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
      <div className="farol-controls free-controls rule-editor" aria-label="Editar a regra">
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
      <div className="test-keyboard" aria-label="Teclado de teste">
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
      <div className="farol-controls free-controls">
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
          onClick={() => setRunning((v) => !v)}
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
        <details className="farol-details free-order">
          <summary>Experimentar a ordem dos comandos</summary>
          <p>
            Este teste separado começa junto à borda, com a tecla → apertada. Troque a ordem dos
            blocos e compare o próximo quadro.
          </p>
          <div className="farol-choices">
            <SceneButton
              aria-pressed={order === 'correct'}
              tom={order === 'correct' ? 'ligado' : 'ferramenta'}
              onClick={() => {
                setOrder('correct')
                setResult(false)
              }}
            >
              Mover → limitar
            </SceneButton>
            <SceneButton
              aria-pressed={order === 'reverse'}
              tom={order === 'reverse' ? 'ligado' : 'ferramenta'}
              onClick={() => {
                setOrder('reverse')
                setResult(false)
              }}
            >
              Limitar → mover
            </SceneButton>
          </div>
          <OrderRule correct={order === 'correct'} />
          <SceneButton
            tom="gesto"
            onClick={() => {
              setResult(true)
              setOrders((v) => (v.includes(order) ? v : [...v, order]))
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

export function Memory() {
  const m = useExploration('memoria'),
    c = m.state.collection
  const completed = ['without-memory', 'with-memory', 'away', 'restart'].map((id) => !!m.seen[id])
  const goals = [
    'Compare uma coleta sem guardar.',
    'Compare uma coleta guardando a informação.',
    'Afaste-se depois de guardar e observe o valor.',
    'Comece outra partida depois de guardar.',
  ]
  let text =
    !c.keyPresent && m.last === 'remember-collection'
      ? 'Você mudou a regra para o próximo encontro. A coleta que já aconteceu continua como estava. Recomece a partida para testar a mudança.'
      : !completed[0] && c.remember
        ? 'Pode começar guardando a coleta. Depois experimente outra partida sem a ação de guardar e compare.'
        : !completed[0]
          ? 'Encoste na chave e compare o que some com o que fica guardado. Você pode mudar a regra e repetir em outra partida.'
          : !completed[1]
            ? 'Você viu a chave sumir sem guardar. Experimente adicionar a ação de guardar e encostar numa chave de uma nova partida.'
            : !completed[2]
              ? 'Você comparou os dois modos. Depois de uma coleta guardada, afaste o personagem e observe se a memória muda.'
              : !completed[3]
                ? 'Afastar não apagou a memória. Quando quiser, recomece uma partida depois de guardar a coleta.'
                : 'Você comparou os quatro casos. Continue adicionando ou retirando a ação de guardar, recolhendo a chave e recomeçando.'
  return (
    <Frame
      title="O jogo guardou a chave?"
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
      <MemoryRule remember={c.remember} collected={!c.keyPresent} saved={c.hasKey} />
      <div className="farol-controls free-controls">
        <SceneButton
          aria-pressed={c.remember}
          tom={!completed[1] && !c.remember ? 'gesto' : 'ferramenta'}
          onClick={() => m.dispatch({ type: 'remember-collection', enabled: !c.remember })}
        >
          {c.remember ? 'Retirar ação de guardar' : 'Adicionar ação de guardar'}
        </SceneButton>
        <SceneButton
          tom={c.keyPresent ? 'gesto' : 'ferramenta'}
          disabled={!c.keyPresent}
          onClick={() => m.dispatch({ type: 'collect-key' })}
        >
          Encostar na chave
        </SceneButton>
        <SceneButton
          tom={!completed[2] && c.hasKey && c.position === 'touching' ? 'gesto' : 'ferramenta'}
          disabled={c.position !== 'touching'}
          onClick={() => m.dispatch({ type: 'leave-key' })}
        >
          Afastar
        </SceneButton>
        <SceneButton
          tom={!c.keyPresent && (c.position === 'away' || !c.hasKey) ? 'gesto' : 'ferramenta'}
          onClick={() => m.dispatch({ type: 'restart-collection' })}
        >
          Recomeçar a partida
        </SceneButton>
      </div>
      {!c.keyPresent && (
        <p className="farol-small">
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
  const text = completed.every(Boolean)
    ? 'Você testou com e sem chave. Pode mudar de situação e testar a porta quantas vezes quiser.'
    : l.checkedKey == null
      ? `Neste teste, o personagem está ${l.hasKey ? 'com' : 'sem'} a chave. Teste a porta quando quiser. Também pode mudar a situação antes de testar.`
      : !completed[0]
        ? 'A porta abriu com a chave. Tire a chave do personagem e teste outra vez para comparar.'
        : 'Sem chave, a porta avisou. Experimente dar a chave ao personagem e testar novamente. Você também pode repetir este caso.'
  return (
    <Frame
      title="A porta precisa da chave"
      kind="porta"
      activity={m.activity}
      state={m.state}
      text={text}
      goals={['Teste a porta sem a chave.', 'Teste a mesma regra com a chave.']}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={m.reset}
    >
      <DoorRule checked={l.checkedKey} />
      <div className="farol-controls free-controls">
        <SceneButton
          tom={l.checkedKey !== null && !completed.every(Boolean) ? 'gesto' : 'ferramenta'}
          aria-pressed={l.hasKey}
          onClick={() => m.dispatch({ type: 'key-state', hasKey: !l.hasKey })}
        >
          {l.hasKey ? 'Tirar a chave do personagem' : 'Dar a chave ao personagem'}
        </SceneButton>
        <SceneButton
          tom={l.checkedKey == null ? 'gesto' : 'ferramenta'}
          onClick={() => m.dispatch({ type: 'try-lighthouse-door' })}
        >
          Testar a porta
        </SceneButton>
        <SceneButton onClick={() => m.dispatch({ type: 'key-state', hasKey: l.hasKey })}>
          Preparar outra tentativa
        </SceneButton>
      </div>
      <p className="farol-small">
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
  const text = completed.every(Boolean)
    ? 'Você explorou as quatro direções. Continue escolhendo lugares. Se quiser um desafio, mostre um alvo e leve a chave até ele.'
    : !completed[0] || !completed[1]
      ? 'O x muda o lugar para os lados. Experimente ir e voltar. O y também está livre: você escolhe o que explorar primeiro.'
      : 'Você comparou os lados. Agora experimente aumentar e diminuir o y, observando a altura. Pode continuar mexendo no x também.'
  const stage = (
    <div className="farol-position-stage">
      <Stage kind="posicao" state={m.state} />
      <svg className="farol-axis-overlay" viewBox="0 0 480 360" aria-hidden="true">
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
        'Experimente levar a chave para a esquerda.',
        'Experimente levar a chave para a direita.',
        'Experimente levar a chave para cima.',
        'Experimente levar a chave para baixo.',
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
        <div className="farol-axis" data-active="true" key={axis}>
          <span>
            {axis === 'x' ? '↔ Horizontal · x' : '↕ Vertical · y'}
            <b>{p[axis]}</b>
          </span>
          <input
            className="explore-range"
            aria-label={axis === 'x' ? 'Mover horizontalmente' : 'Mover verticalmente'}
            type="range"
            min="0"
            max={axis === 'x' ? 448 : 328}
            step="1"
            value={p[axis]}
            onChange={(e) => move(axis, Number(e.target.value))}
          />
          <div>
            <SceneButton onClick={() => move(axis, p[axis] - (axis === 'x' ? 60 : 40))}>
              {axis === 'x' ? '← Menos x' : '↑ Menos y'}
            </SceneButton>
            <SceneButton onClick={() => move(axis, p[axis] + (axis === 'x' ? 60 : 40))}>
              {axis === 'x' ? 'Mais x →' : 'Mais y ↓'}
            </SceneButton>
          </div>
        </div>
      ))}
      <div className="farol-controls">
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
      <details className="farol-details">
        <summary>Escolher os números</summary>
        <div className="farol-number-fields">
          {(['x', 'y'] as const).map((axis) => (
            <label key={axis}>
              {axis === 'x' ? 'Horizontal x' : 'Vertical y'}
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max={axis === 'x' ? 448 : 328}
                value={p[axis]}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isFinite(n)) move(axis, n)
                }}
              />
            </label>
          ))}
        </div>
      </details>
      <ControlsHint />
    </Frame>
  )
}
