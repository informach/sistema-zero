import {
  discoveryGuidance,
  discoverySpeech,
  type SceneAction,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import { Pause, Play, RotateCcw, SkipBack, StepForward } from 'lucide-react'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { SONS } from '../lib/scene-sons'
import { SceneCenarioProvider } from './scene-cenario-context'
import { CollectionMemoryStage } from './scene-collect-and-remember'
import {
  alvoDeTexto,
  BotaoGrande,
  Caderninho,
  type Cartao,
  Cruzeta,
  type FotoDe,
  Frame,
  Interruptor,
  Modulo,
  Note,
  Redondo,
  SceneButton,
  semNoSeuJogo,
  useAndarLivre,
  useDiscovery,
  useFotinhos,
  useNaTela,
} from './scene-discovery-frame'
import { EdgeComparison, MovementRule, OrderRule, WalkPicture } from './scene-discovery-visuals'
import { AVISOS_DO_FAROL } from './scene-farol'
import {
  type BalaoDaPorta,
  CENTRO_DA_CHAVE,
  CENTRO_DA_PORTA,
  distancia,
  ENCOSTA,
  INICIO_NO_MAPA,
  LIMITES_DO_MAPA,
  PalcoFarolLivre,
  peDoPersonagem,
} from './scene-farol-palco'
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
      Experimente à vontade. Os destaques mostram o próximo teste, e você pode repetir quando
      quiser.
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

/* ════════════ A MOLDURA NOVA (08/11/2026): memória, porta e posição do Farol ════════════ */

const sn = (b: boolean) => (b ? 'SIM' : 'NÃO')

/** O personagem olha para o lado em que anda (a última seta segurada para um dos lados). */
function useOlhar(segurando: ReadonlySet<string>) {
  const [esquerda, setEsquerda] = useState(false)
  useEffect(() => {
    if (segurando.has('esquerda') && !segurando.has('direita')) setEsquerda(true)
    else if (segurando.has('direita') && !segurando.has('esquerda')) setEsquerda(false)
  }, [segurando])
  return esquerda
}

/** O módulo Andar das telas de andar livre: as quatro setas (e o WASD do teclado). */
function ModuloAndarLivre({
  raiz,
  andar,
  mao,
}: {
  raiz: RefObject<HTMLDivElement | null>
  andar: ReturnType<typeof useAndarLivre>
  mao: boolean
}) {
  return (
    <Modulo
      titulo="Andar"
      icone="🎮"
      dica={
        <>
          Segure as setas.
          <span className="sz-discovery-so-teclado"> No teclado: setas ou W A S D</span>
        </>
      }
    >
      <Cruzeta
        raiz={raiz}
        segurando={andar.segurando}
        segurar={andar.segurar}
        soltar={andar.soltar}
        mao={mao}
      />
    </Modulo>
  )
}

const CARTOES_MEMORIA: Cartao[] = [
  {
    id: 'collected-without-memory',
    emoji: '📓',
    pergunta: 'Pegou a chave com o lápis desligado. O caderninho mudou?',
    descoberta: 'pegou, mas o jogo não anotou.',
  },
  {
    id: 'collected-with-memory',
    emoji: '✏️',
    pergunta: 'E com o jogo anotando?',
    descoberta: 'com o lápis ligado, o caderninho escreve SIM.',
  },
  {
    id: 'remembered-after-leaving',
    emoji: '🚶',
    pergunta: 'Se o personagem se afastar, continua anotado?',
    descoberta: 'o que está anotado continua.',
  },
  {
    id: 'reset-after-remembering',
    emoji: '🔄',
    pergunta: 'E numa partida nova?',
    descoberta: 'partida nova, página nova: NÃO.',
  },
]
const fotoMemoria: FotoDe = (antes, depois, acao) => {
  const c = depois.collection
  if (acao.type === 'collect-key')
    return {
      titulo: antes.collection.remember ? 'Lápis ligado' : 'Lápis desligado',
      texto: `pegou a chave → caderninho ${sn(c.hasKey)}`,
    }
  if (acao.type === 'leave-key')
    return { titulo: 'Longe da chave', texto: `caderninho ${sn(c.hasKey)}` }
  if (acao.type === 'restart-collection')
    return {
      titulo: 'Partida nova',
      texto: `caderninho ${sn(antes.collection.hasKey)} → ${sn(c.hasKey)}`,
    }
  return null
}

/**
 * ⭐⭐ A memória (Farol, Dia 2): o personagem anda LIVRE pelo mapa e PEGA a chave encostando nela; o
 * caderninho do jogo mostra o que o jogo anotou, e o lápis liga e desliga a anotação. O lugar do
 * personagem vira as ações do motor: encostar na chave (`collect-key`) e se afastar dela
 * (`leave-key`). "Jogar de novo" é a partida nova (`restart-collection`).
 */
export function Memory() {
  const andar = useAndarLivre({ inicio: INICIO_NO_MAPA, limites: LIMITES_DO_MAPA })
  const p = useFotinhos({ fotoDe: fotoMemoria })
  const c = p.state.collection
  const raiz = useRef<HTMLDivElement>(null)
  const olhaEsquerda = useOlhar(andar.segurando)
  const pe = peDoPersonagem(andar.pos)
  const perto = distancia(pe, CENTRO_DA_CHAVE) < ENCOSTA
  const longe = distancia(pe, CENTRO_DA_CHAVE) > 110
  const { dispatch } = p
  useEffect(() => {
    if (perto && c.keyPresent) dispatch({ type: 'collect-key' })
  }, [perto, c.keyPresent, dispatch])
  useEffect(() => {
    if (longe && !c.keyPresent && c.position === 'touching') dispatch({ type: 'leave-key' })
  }, [longe, c.keyPresent, c.position, dispatch])
  // Os sons do jogo: pegar a chave e o lápis escrevendo.
  const tinhaChave = useRef(c.keyPresent)
  useEffect(() => {
    if (tinhaChave.current && !c.keyPresent) SONS.pegar()
    tinhaChave.current = c.keyPresent
  }, [c.keyPresent])
  const anotou = useRef(c.hasKey)
  useEffect(() => {
    if (!anotou.current && c.hasKey) setTimeout(SONS.escreve, 250)
    anotou.current = c.hasKey
  }, [c.hasKey])
  const jogarDeNovo = () => {
    andar.voltar()
    dispatch({ type: 'restart-collection' })
  }
  // O que pulsa é o gesto que a fala do Zappy pede agora (`proximoGestoDaMemoria`).
  const gesto = proximoGestoDaMemoria(discoveryGuidance(p.activity, p.state)?.id, c)
  return (
    <Frame
      arranjo="faisca"
      raiz={raiz}
      title="O jogo guarda que pegou a chave"
      kind="memoria"
      activity={p.activity}
      state={p.state}
      text={p.instruction}
      reset={() => {
        andar.voltar()
        dispatch({ type: 'reset' })
      }}
      cartoes={CARTOES_MEMORIA}
      fotos={p.fotos}
      ideia={discoverySpeech('memory-idea')}
      ponte={semNoSeuJogo(discoverySpeech('memory-bridge'))}
      stage={
        <PalcoFarolLivre
          pos={andar.pos}
          andando={andar.andando}
          olhaEsquerda={olhaEsquerda}
          chaveNoChao={c.keyPresent}
          carregaChave={false}
          aceso={false}
          mostrarPorta={false}
          aviso={c.keyPresent ? AVISOS_DO_FAROL.inicio : AVISOS_DO_FAROL.coleta}
        />
      }
      movimento={
        <ModuloAndarLivre raiz={raiz} andar={andar} mao={p.fotos.length === 0 && !andar.andando} />
      }
      controles={
        <>
          <Modulo compacto titulo="O jogo guarda" icone="📓" dica="O caderninho do jogo.">
            <Caderninho sim={c.hasKey} lapis={c.remember} />
          </Modulo>
          <Modulo compacto titulo="O lápis" icone="✏️" dica="Com o lápis ligado, o jogo anota.">
            <Interruptor
              ligado={c.remember}
              rotulo="✏️ O jogo anota?"
              estado={(on) => (on ? 'Lápis ligado' : 'Lápis desligado')}
              pulsar={gesto === 'memoria'}
              onClick={() => dispatch({ type: 'remember-collection', enabled: !c.remember })}
            />
          </Modulo>
          <Modulo compacto titulo="Partida" icone="🔄" dica="A chave volta para o chão.">
            <BotaoGrande pulsar={gesto === 'recomecar'} onClick={jogarDeNovo}>
              <span aria-hidden>🔄</span> Jogar de novo
            </BotaoGrande>
          </Modulo>
        </>
      }
    />
  )
}

const CARTOES_PORTA: Cartao[] = [
  {
    id: 'locked-without-key',
    emoji: '🔒',
    pergunta: 'Sem a chave, o que a porta faz?',
    descoberta: 'caderninho NÃO: a porta fica trancada.',
  },
  {
    id: 'opened-with-key',
    emoji: '🔑',
    pergunta: 'E com a chave?',
    descoberta: 'caderninho SIM: a mesma pergunta abre a porta.',
  },
]
const fotoPorta: FotoDe = (antes, depois, acao) => {
  const l = depois.lighthouse
  if (acao.type === 'try-lighthouse-door')
    return {
      titulo: `Caderninho ${sn(l.hasKey)}`,
      texto: `a porta perguntou → ${l.door === 'open' ? 'abriu' : 'trancada'}`,
    }
  if (acao.type === 'key-state' && !antes.lighthouse.hasKey && l.hasKey)
    return { titulo: 'Pegou a chave', texto: 'caderninho NÃO → SIM' }
  return null
}
function avisoDaPorta(l: SceneState['lighthouse']) {
  if (l.door === 'open') return AVISOS_DO_FAROL.acendeu
  if (l.checkedKey === false) return AVISOS_DO_FAROL.faltaChave
  return l.hasKey ? AVISOS_DO_FAROL.coleta : AVISOS_DO_FAROL.inicio
}

/**
 * ⭐⭐ A porta (Farol, Dia 3): o personagem anda livre; pegar a chave é andar até ela, e a porta
 * pergunta "Você tem a chave?" quando ele chega nela (o balão da cena responde). Sair de perto da
 * porta TRANCADA prepara outra tentativa; o farol aceso fica aceso até "Jogar de novo" (apagar ao
 * dar as costas parecia um defeito).
 */
export function Door() {
  const andar = useAndarLivre({ inicio: INICIO_NO_MAPA, limites: LIMITES_DO_MAPA })
  const p = useFotinhos({ fotoDe: fotoPorta })
  const l = p.state.lighthouse
  const f = (id: string) => p.state.evidence.discoveries.includes(id)
  const raiz = useRef<HTMLDivElement>(null)
  const olhaEsquerda = useOlhar(andar.segurando)
  const pe = peDoPersonagem(andar.pos)
  const naChave = distancia(pe, CENTRO_DA_CHAVE) < ENCOSTA
  const naPorta = distancia(pe, CENTRO_DA_PORTA) < ENCOSTA
  const longeDaPorta = distancia(pe, CENTRO_DA_PORTA) > 100
  const testou = typeof l.checkedKey === 'boolean'
  const { dispatch } = p
  useEffect(() => {
    if (naChave && !l.hasKey) dispatch({ type: 'key-state', hasKey: true })
  }, [naChave, l.hasKey, dispatch])
  useEffect(() => {
    if (naPorta && !testou) dispatch({ type: 'try-lighthouse-door' })
  }, [naPorta, testou, dispatch])
  useEffect(() => {
    if (longeDaPorta && testou && l.door !== 'open')
      dispatch({ type: 'key-state', hasKey: l.hasKey })
  }, [longeDaPorta, testou, l.hasKey, l.door, dispatch])
  const jogarDeNovo = () => {
    andar.voltar()
    dispatch({ type: 'key-state', hasKey: false })
  }
  const tinha = useRef(l.hasKey)
  useEffect(() => {
    if (!tinha.current && l.hasKey && naChave) {
      SONS.pegar()
      setTimeout(SONS.escreve, 250)
    }
    tinha.current = l.hasKey
  }, [l.hasKey, naChave])
  useEffect(() => {
    if (!testou) return
    if (l.door === 'open') SONS.abre()
    else SONS.tranca()
  }, [testou, l.door])
  const pertoDaPorta = distancia(pe, CENTRO_DA_PORTA) < 140
  const balao: BalaoDaPorta | null = testou
    ? l.door === 'open'
      ? { texto: 'Tem a chave! Pode entrar.', tom: 'sim' }
      : { texto: 'Sem a chave, não abro.', tom: 'nao' }
    : pertoDaPorta
      ? { texto: 'Você tem a chave?', tom: 'pergunta' }
      : null
  return (
    <Frame
      arranjo="faisca"
      raiz={raiz}
      title="A porta do farol"
      kind="porta"
      activity={p.activity}
      state={p.state}
      text={p.instruction}
      reset={() => {
        andar.voltar()
        dispatch({ type: 'reset' })
      }}
      cartoes={CARTOES_PORTA}
      fotos={p.fotos}
      ideia={discoverySpeech('door-idea')}
      ponte={semNoSeuJogo(discoverySpeech('door-bridge'))}
      stage={
        <PalcoFarolLivre
          pos={andar.pos}
          andando={andar.andando}
          olhaEsquerda={olhaEsquerda}
          chaveNoChao={!l.hasKey}
          carregaChave={l.hasKey}
          aceso={l.door === 'open'}
          mostrarPorta={!testou}
          balao={balao}
          aviso={avisoDaPorta(l)}
        />
      }
      movimento={
        <ModuloAndarLivre raiz={raiz} andar={andar} mao={p.fotos.length === 0 && !andar.andando} />
      }
      controles={
        <>
          <Modulo compacto titulo="O jogo guarda" icone="📓" dica="A porta olha aqui.">
            <Caderninho sim={l.hasKey} />
          </Modulo>
          <Modulo compacto titulo="Partida" icone="🔄" dica="A chave volta para o chão.">
            <BotaoGrande
              pulsar={testou && l.door === 'open' && !f('locked-without-key')}
              onClick={jogarDeNovo}
            >
              <span aria-hidden>🔄</span> Jogar de novo
            </BotaoGrande>
          </Modulo>
        </>
      }
    />
  )
}

const CARTOES_POSICAO: Cartao[] = [
  {
    id: 'x-minus',
    emoji: '⬅️',
    pergunta: 'E se o x diminuir?',
    descoberta: 'a chave vai para a esquerda.',
  },
  {
    id: 'x-plus',
    emoji: '➡️',
    pergunta: 'E se o x aumentar?',
    descoberta: 'a chave vai para a direita.',
  },
  { id: 'y-minus', emoji: '⬆️', pergunta: 'E se o y diminuir?', descoberta: 'a chave sobe.' },
  {
    id: 'y-plus',
    emoji: '⬇️',
    pergunta: 'Se o y aumentar, a chave sobe ou desce?',
    descoberta: 'desce! O y começa em 0 lá no alto.',
  },
]
const PASSO = { x: 60, y: 40 } as const
const MAXIMO = { x: 448, y: 328 } as const
const PARA_ONDE = { 'x+': 'a direita', 'x-': 'a esquerda', 'y+': 'baixo', 'y-': 'cima' } as const
const fotoPosicao: FotoDe = (antes, depois, acao) => {
  if (acao.type !== 'key-position') return null
  const eixo = acao.axis
  const de = antes.keyPosition[eixo]
  const para = depois.keyPosition[eixo]
  if (de === para) return null
  const sinal = para > de ? '+' : '-'
  return {
    titulo: `${eixo} ${sinal === '+' ? 'aumentou' : 'diminuiu'}`,
    texto: `${eixo} ${de} → ${para} · foi para ${PARA_ONDE[`${eixo}${sinal}` as keyof typeof PARA_ONDE]}`,
  }
}
/** O alvo do desafio extra: alcançável com os passos de 60 e 40. */
export const ALVO_DA_POSICAO = { x: 271, y: 253 } as const

/**
 * ⭐⭐ A posição (Farol, Dia 3): os dois números da chave com − e +, as réguas nas bordas da tela do
 * jogo (0,0 no canto de cima), o rastro do último movimento e o aviso de borda (o número não passa
 * do 0 nem do fim da tela). Antes do primeiro "y +", o PALPITE grande embaixo da cena ("sobe ou
 * desce?"). Teclado: setas e WASD movem; + e − mudam o número em destaque; X e Y escolhem. Com as 4
 * descobertas, o desafio do alvo.
 */
export function Position() {
  const p = useFotinhos({ fotoDe: fotoPosicao })
  const k = p.state.keyPosition
  const f = (id: string) => p.state.evidence.discoveries.includes(id)
  const todas = CARTOES_POSICAO.every((c) => f(c.id))
  const raiz = useRef<HTMLDivElement>(null)
  const visivel = useNaTela(raiz)
  const [eixo, setEixo] = useState<'x' | 'y'>('x')
  const [palpite, setPalpite] = useState<'sobe' | 'desce' | null>(null)
  const [reagindo, setReagindo] = useState(false)
  const [pedindo, setPedindo] = useState(false)
  const [borda, setBorda] = useState<string | null>(null)
  const [antes, setAntes] = useState<{ x: number; y: number } | null>(null)
  const [desafio, setDesafio] = useState(false)
  const noAlvo = desafio && k.x === ALVO_DA_POSICAO.x && k.y === ALVO_DA_POSICAO.y
  const ultimo = useRef({ x: k.x, y: k.y })
  useEffect(() => {
    if (ultimo.current.x !== k.x || ultimo.current.y !== k.y) setAntes(ultimo.current)
    ultimo.current = { x: k.x, y: k.y }
  }, [k.x, k.y])
  useEffect(() => {
    if (!borda) return
    const t = setTimeout(() => setBorda(null), 2200)
    return () => clearTimeout(t)
  }, [borda])
  const mover = (e: 'x' | 'y', d: 1 | -1, comPalpite = false) => {
    setEixo(e)
    // O y é a surpresa: antes do primeiro "y +", o palpite grande embaixo da cena.
    if (e === 'y' && d === 1 && !comPalpite && !f('y-plus') && palpite === null) {
      setPedindo(true)
      return
    }
    if (!comPalpite) setReagindo(false)
    const novo = k[e] + d * PASSO[e]
    // ⚠️ O passo que passaria da borda NÃO é cortado no 0 nem no fim da tela: cortado, a chave
    // saía da grade dos passos (60 e 40) e o alvo do desafio ficava impossível de alcançar.
    // Na borda, o aviso diz por que o número não muda, em vez de não fazer nada.
    if (novo < 0 || novo > MAXIMO[e]) {
      setBorda(
        d < 0
          ? `O ${e} não fica menor que 0: é a borda da tela. Use o +.`
          : `O ${e} já está perto do fim da tela. Use o −.`,
      )
      SONS.borda()
      return
    }
    setBorda(null)
    SONS.quadro()
    p.dispatch({ type: 'key-position', axis: e, value: novo })
  }
  const escolherPalpite = (qual: 'sobe' | 'desce') => {
    setPalpite(qual)
    setPedindo(false)
    setReagindo(true)
    mover('y', 1, true)
  }
  const fns = useRef({ mover, eixo })
  fns.current = { mover, eixo }
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (!visivel.current || alvoDeTexto(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      const { mover: m, eixo: atual } = fns.current
      const mapa: Record<string, () => void> = {
        ArrowLeft: () => m('x', -1),
        KeyA: () => m('x', -1),
        ArrowRight: () => m('x', 1),
        KeyD: () => m('x', 1),
        ArrowUp: () => m('y', -1),
        KeyW: () => m('y', -1),
        ArrowDown: () => m('y', 1),
        KeyS: () => m('y', 1),
        NumpadAdd: () => m(atual, 1),
        NumpadSubtract: () => m(atual, -1),
        KeyX: () => setEixo('x'),
        KeyY: () => setEixo('y'),
      }
      const acao =
        mapa[e.code] ??
        (e.key === '+' || e.key === '='
          ? () => m(atual, 1)
          : e.key === '-'
            ? () => m(atual, -1)
            : undefined)
      if (!acao) return
      e.preventDefault()
      acao()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [visivel])
  // As falas que só esta tela conhece (o palpite e o alvo) vêm do registro do motor, com voz.
  const fala = noAlvo
    ? discoverySpeech('position-target-done')
    : desafio
      ? discoverySpeech('position-target')
      : todas
        ? p.instruction
        : pedindo
          ? discoverySpeech('position-guess')
          : reagindo && palpite === 'sobe'
            ? discoverySpeech('position-guess-up')
            : reagindo && palpite === 'desce'
              ? discoverySpeech('position-guess-down')
              : p.instruction
  const passoDe = (e: 'x' | 'y') => (
    <div
      className="sz-discovery-passos"
      data-ativo={eixo === e}
      role="group"
      aria-label={`Número ${e}: ${k[e]}`}
      onFocusCapture={() => setEixo(e)}
    >
      <span className="sz-discovery-eixo">{e === 'x' ? '↔ x' : '↕ y'}</span>
      <button
        type="button"
        aria-label={`${e} menos ${PASSO[e]}`}
        data-limite={k[e] === 0}
        onClick={() => mover(e, -1)}
      >
        −
      </button>
      <strong>{k[e]}</strong>
      <button
        type="button"
        aria-label={`${e} mais ${PASSO[e]}`}
        data-limite={k[e] === MAXIMO[e]}
        onClick={() => mover(e, 1)}
      >
        +
      </button>
    </div>
  )
  return (
    <Frame
      arranjo="faisca"
      raiz={raiz}
      title="Onde a chave aparece"
      kind="posicao"
      activity={p.activity}
      state={p.state}
      text={fala}
      reset={() => {
        setAntes(null)
        setPalpite(null)
        setReagindo(false)
        setPedindo(false)
        setDesafio(false)
        p.dispatch({ type: 'reset' })
      }}
      cartoes={CARTOES_POSICAO}
      fotos={p.fotos}
      ideia={discoverySpeech('position-idea')}
      ponte={semNoSeuJogo(discoverySpeech('position-bridge'))}
      mostrarIdeia={!desafio}
      stage={
        <div className="sz-discovery-position-stage">
          <SceneCenarioProvider cenario="farol">
            <LighthousePositionStage state={p.state} />
          </SceneCenarioProvider>
          <Reguas
            x={k.x}
            y={k.y}
            antes={antes}
            alvo={desafio ? ALVO_DA_POSICAO : null}
            noAlvo={noAlvo}
          />
        </div>
      }
      noPalco={
        borda ? (
          <span className="sz-discovery-borda" role="status">
            {borda}
          </span>
        ) : null
      }
      ferramentas={
        <Redondo
          rotulo="Voltar a chave ao lugar do começo"
          texto="Começo"
          onClick={() => {
            setAntes(null)
            p.dispatch({ type: 'restart-key-position' })
          }}
        >
          <SkipBack size={16} />
        </Redondo>
      }
      abaixoDoPalco={
        pedindo ? (
          <div className="sz-discovery-palpite-grande" role="group" aria-label="Seu palpite">
            <strong>Antes de testar: se o y aumentar, a chave…</strong>
            <span>
              <button type="button" onClick={() => escolherPalpite('sobe')}>
                ⬆️ sobe
              </button>
              <button type="button" onClick={() => escolherPalpite('desce')}>
                ⬇️ desce
              </button>
            </span>
          </div>
        ) : null
      }
      controles={
        <>
          <Modulo
            titulo="Os números da chave"
            icone="🔢"
            largo
            dica={
              <span className="sz-discovery-so-teclado">
                No teclado: setas ou W A S D; + e − mudam o número em destaque.
              </span>
            }
          >
            <div className="sz-discovery-linha">
              {passoDe('x')}
              {passoDe('y')}
            </div>
          </Modulo>
          {todas ? (
            <Modulo titulo="Desafio" icone="🎯" dica="Leve a chave até o alvo.">
              <BotaoGrande pulsar={!desafio} onClick={() => setDesafio((d) => !d)}>
                <span aria-hidden>🎯</span> {desafio ? 'Esconder o alvo' : 'Mostrar o alvo'}
              </BotaoGrande>
            </Modulo>
          ) : null}
        </>
      }
    />
  )
}

/** As réguas nas bordas da tela do jogo (0 no alto e à esquerda) e o rastro do último movimento. */
function Reguas({
  x,
  y,
  antes,
  alvo,
  noAlvo,
}: {
  x: number
  y: number
  antes: { x: number; y: number } | null
  alvo: { x: number; y: number } | null
  noAlvo: boolean
}) {
  const MEIO = 16
  // O 0 dos dois números mora no canto ("0,0").
  const xs = [112, 224, 336, 448]
  const ys = [82, 164, 246, 328]
  return (
    <svg className="sz-discovery-reguas" viewBox="0 0 480 360" aria-hidden>
      <rect x="0" y="0" width="480" height="22" fill="rgba(255,253,243,.6)" />
      <rect x="0" y="0" width="34" height="360" fill="rgba(255,253,243,.6)" />
      <rect x="2" y="2" width="30" height="18" rx="9" fill="#0a2a7a" />
      <text x="17" y="15" textAnchor="middle" fontSize="11" fontWeight="800" fill="#ffd25e">
        0,0
      </text>
      <text x="474" y="36" textAnchor="end" fontSize="11" fontWeight="800" fill="#0a2a7a">
        x cresce →
      </text>
      <text x="40" y="352" fontSize="11" fontWeight="800" fill="#0a2a7a">
        y cresce ↓
      </text>
      {xs.map((v) => (
        <g key={`x${v}`}>
          <line x1={v + MEIO} x2={v + MEIO} y1={14} y2={22} stroke="#0a2a7a" strokeWidth="2" />
          <text
            x={Math.max(42, Math.min(470, v + MEIO))}
            y={11}
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fill="#0a2a7a"
          >
            {v}
          </text>
        </g>
      ))}
      {ys.map((v) => (
        <g key={`y${v}`}>
          <line x1={26} x2={34} y1={v + MEIO} y2={v + MEIO} stroke="#0a2a7a" strokeWidth="2" />
          <text
            x={23}
            y={Math.max(44, v + MEIO + 4)}
            textAnchor="end"
            fontSize="11"
            fontWeight="800"
            fill="#0a2a7a"
          >
            {v}
          </text>
        </g>
      ))}
      {alvo ? (
        <g>
          <rect
            x={alvo.x - 4}
            y={alvo.y - 4}
            width="40"
            height="40"
            rx="8"
            fill={noAlvo ? 'rgba(11,122,84,.25)' : 'none'}
            stroke={noAlvo ? '#0b7a54' : '#c8246f'}
            strokeWidth="3"
            strokeDasharray={noAlvo ? undefined : '6 4'}
          />
          <text
            x={alvo.x + 16}
            y={alvo.y + 52}
            textAnchor="middle"
            fontSize="12"
            fontWeight="800"
            fill="#c8246f"
          >
            alvo
          </text>
        </g>
      ) : null}
      {antes ? (
        <>
          <rect
            x={antes.x}
            y={antes.y}
            width="32"
            height="32"
            rx="6"
            fill="none"
            stroke="#865900"
            strokeWidth="2.5"
            strokeDasharray="5 4"
          />
          <line
            x1={antes.x + MEIO}
            y1={antes.y + MEIO}
            x2={x + MEIO}
            y2={y + MEIO}
            stroke="#865900"
            strokeWidth="3"
            strokeDasharray="6 5"
          />
        </>
      ) : null}
      <line
        x1={x + MEIO}
        x2={x + MEIO}
        y1={22}
        y2={y}
        stroke="#0a2a7a"
        strokeOpacity=".35"
        strokeDasharray="3 4"
      />
      <line
        x1={34}
        x2={x}
        y1={y + MEIO}
        y2={y + MEIO}
        stroke="#0a2a7a"
        strokeOpacity=".35"
        strokeDasharray="3 4"
      />
      <rect
        x={Math.min(408, Math.max(36, x + MEIO - 34))}
        y={y > 280 ? y - 22 : y + 36}
        width="68"
        height="18"
        rx="9"
        fill="#0a2a7a"
        stroke="#fff"
        strokeWidth="2"
      />
      <text
        x={Math.min(442, Math.max(70, x + MEIO))}
        y={y > 280 ? y - 9 : y + 49}
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill="#fff"
      >
        {x} · {y}
      </text>
    </svg>
  )
}
