'use client'

import {
  actorFigure,
  castText,
  decimal,
  gameStatePreset,
  isSpawnPreset,
  SCENE_LIMITS,
  type SceneAction,
  type SceneActivity,
  type SceneCast,
  type ScenePilha,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import { type PointerEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'
import { ExperienceConnection } from './experience-connection'
import { SceneButton } from './exploration-stage'
import { Chave, Escolha, Medida } from './scene-bench'
import { ActorFigure } from './scene-figures'

/**
 * A BANCADA do Corre Dino, primeira metade (lote 5 do Raio-X, 16/09/2026): `layers`, `gravity`,
 * `impulse`, `jump-sound`, `spawn`, `cleanup`, `game-state` e `controls`.
 *
 * ⭐⭐ **A peça que muda de caixa** (`PecaQueMudaDeCaixa`) é o gesto do Estúdio nas Aulas 4, 5, 7 e
 * 8: MOVER um bloco para dentro de outro evento ou rotina ("Mova o mesmo Tocar efeito para dentro
 * de Quando o dino pular", "mova a criação do cacto para dentro do Se"). As cenas usavam três
 * metáforas para esse mesmo gesto (o fio, a peça que vai para uma zona e os cartões Antes/Depois), e
 * o fio ainda ficava ESCONDIDO até a primeira meta. Decisão da dona: as quatro trocam o fio pela
 * peça, à vista desde a abertura, no molde da `ConditionPiece`.
 *
 * ⚠️⚠️ Toque, arrasto e teclado levam ao MESMO lugar. Cada caixa que não tem a peça mostra um
 * "Colocar aqui" que funciona sempre (é o caminho do teclado e do leitor de tela, com o nome da peça
 * e da caixa no rótulo). Arrastar a peça até uma caixa faz o mesmo. Tocar na peça sem arrastar a
 * ESCOLHE: as outras caixas acendem e o "Colocar aqui" vira o gesto em destaque.
 */

/** O dedo precisa andar isto para o gesto ser arrasto, e não toque (o mesmo da `ConditionPiece`). */
const LIMIAR_DO_ARRASTE = 10

/**
 * O símbolo do começo de um nome ("♪ Tocar efeito", "◷ No relógio, a cada 1 s", "＋ Somar ponto").
 *
 * ⚠️ Ele fica à vista e FORA do nome acessível (consertos do review da onda A do lote 5): o leitor de
 * tela lia "nota musical Tocar efeito" e "triângulo branco Começar" no meio de cada rótulo.
 */
export function separarSimbolo(texto: string): { simbolo: string; nome: string } {
  const m = /^([^\p{L}\p{N}\s]+)\s+(.+)$/u.exec(texto)
  return m ? { simbolo: m[1] ?? '', nome: m[2] ?? texto } : { simbolo: '', nome: texto }
}

/** O texto com o símbolo à vista e escondido de quem ouve. */
function ComSimbolo({ texto }: { texto: string }) {
  const { simbolo, nome } = separarSimbolo(texto)
  if (!simbolo) return <>{nome}</>
  return (
    <>
      <span aria-hidden>{simbolo}</span> {nome}
    </>
  )
}

/**
 * O som da `jump-sound`, como CHAVE da bancada (consertos do review da onda A do lote 5): numa cena sobre
 * som, ele nascia desligado num "Ligar som" discreto do rodapé, e a instrução mandava contar os sons. O
 * player a monta acima da peça (o player não escreve peça da bancada: `scene-identity`).
 */
export function SomDaBancada({ ligado, onToggle }: { ligado: boolean; onToggle: () => void }) {
  return (
    <Chave
      label="Som"
      ligado={ligado}
      ligadoTexto="ligado"
      desligadoTexto="desligado"
      onToggle={() => onToggle()}
    />
  )
}

interface Caixa<K extends string> {
  id: K
  titulo: string
  /** Controles que moram DENTRO da caixa (o intervalo do relógio). */
  dentro?: ReactNode
}

export function PecaQueMudaDeCaixa<K extends string>({
  legenda,
  peca,
  caixas,
  atual,
  aninhada = false,
  emDestaque = true,
  onMover,
}: {
  /** O nome do grupo inteiro, como a criança lê ("Onde está Tocar efeito"). */
  legenda: string
  /** O nome da peça, que é o nome do bloco no Estúdio. Um símbolo no começo fica fora da fala. */
  peca: string
  /**
   * As caixas. ⚠️ Com `aninhada`, a SEGUNDA mora dentro da primeira: é o Se jogando dentro do
   * relógio, como no Estúdio.
   */
  caixas: readonly [Caixa<K>, Caixa<K>, ...Caixa<K>[]]
  atual: K
  aninhada?: boolean
  /**
   * A peça é o azul cheio da bancada? ⚠️ Na `jump-sound` não (full review de experiência, B18): o gesto
   * "Tocar para pular" já é o azul cheio, e dois azuis cheios lado a lado não diziam qual era o gesto.
   * Ali a peça fica em contorno, e volta ao azul cheio quando escolhida.
   */
  emDestaque?: boolean
  onMover: (caixa: K) => void
}) {
  const ajuda = useId()
  const [escolhida, setEscolhida] = useState(false)
  const refs = useRef(new Map<K, HTMLDivElement>())
  const pecaRef = useRef<HTMLButtonElement>(null)
  const escolhidaAoEncostar = useRef(false)
  /**
   * ⚠️⚠️ O ARRASTO COM MOUSE devolvia a peça (consertos do review da onda A do lote 5, T1). Depois do
   * `pointerup` que move, o navegador dispara um `click` no mesmo `<button>`, e o React tinha
   * reaproveitado aquele nó para o "Colocar aqui" da caixa de origem (mesma posição, mesmo tipo): o
   * clique movia a peça de VOLTA. Com o dedo e pelo teclado não acontecia, e o happy-dom não dispara
   * `click` depois de ponteiro, então os testes passavam. Duas travas, porque cada uma sozinha depende
   * de detalhe do navegador: as `key` separam os dois botões, e este ref engole o `click` que vem
   * logo depois de um arrasto (ele se apaga sozinho na tarefa seguinte, se o clique não vier).
   */
  const acabouDeArrastar = useRef(false)
  /** O foco vai para a peça na caixa nova quando quem moveu foi a bancada (e não um desfazer). */
  const focarAPeca = useRef(false)
  const [arrasto, setArrasto] = useState<{
    ponteiro: number
    x: number
    y: number
    inicioX: number
    inicioY: number
    sobre: K | null
  } | null>(null)
  // ⚠️ A peça que já mudou de caixa deixa de estar escolhida: sem isto o "Colocar aqui" da caixa de
  // onde ela saiu nascia aceso, como se a criança ainda estivesse no meio do gesto.
  // ⚠️ E o foco acompanha a peça (consertos do review da onda A do lote 5): o "Colocar aqui" que
  // recebeu o toque SOME quando a peça chega, e o foco do teclado caía no `body`.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o gatilho é a peça mudar de caixa
  useEffect(() => {
    setEscolhida(false)
    if (!focarAPeca.current) return
    focarAPeca.current = false
    pecaRef.current?.focus()
  }, [atual])
  /**
   * A caixa debaixo do dedo. ⚠️ A de DENTRO primeiro: no relógio aninhado as duas contêm o ponto, e
   * soltar no Se jogando não pode cair no relógio de fora.
   */
  const caixaEm = (x: number, y: number): K | null => {
    const ordem = aninhada ? [caixas[1], caixas[0]] : caixas
    for (const c of ordem) {
      const r = refs.current.get(c.id)?.getBoundingClientRect()
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return c.id
    }
    return null
  }
  const mover = (caixa: K) => {
    setEscolhida(false)
    if (caixa === atual) return
    focarAPeca.current = true
    onMover(caixa)
  }
  const nomeDaPeca = separarSimbolo(peca).nome
  const botaoDaPeca = (
    <SceneButton
      key="peca"
      ref={pecaRef}
      tom={emDestaque || escolhida ? 'gesto' : 'ferramenta'}
      aria-pressed={escolhida}
      aria-describedby={ajuda}
      className={cn('touch-none', escolhida && 'ring-4 ring-primary/30')}
      onClick={(e) => {
        // Teclado: Enter e Espaço alternam a escolha, como o `aria-pressed` promete.
        if (e.detail === 0) setEscolhida((v) => !v)
      }}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
        if (e.button !== 0) return
        escolhidaAoEncostar.current = escolhida
        e.currentTarget.setPointerCapture(e.pointerId)
        setArrasto({
          ponteiro: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          inicioX: e.clientX,
          inicioY: e.clientY,
          sobre: null,
        })
      }}
      onPointerMove={(e) => {
        if (arrasto?.ponteiro !== e.pointerId) return
        setArrasto({ ...arrasto, x: e.clientX, y: e.clientY, sobre: caixaEm(e.clientX, e.clientY) })
      }}
      onPointerUp={(e) => {
        if (arrasto?.ponteiro !== e.pointerId) return
        const andou =
          Math.hypot(e.clientX - arrasto.inicioX, e.clientY - arrasto.inicioY) > LIMIAR_DO_ARRASTE
        setArrasto(null)
        // ⚠️ Toque sem arrasto ALTERNA a escolha, e não "solta a peça no lugar" (review do lote 1).
        if (!andou) {
          setEscolhida(!escolhidaAoEncostar.current)
          return
        }
        acabouDeArrastar.current = true
        setTimeout(() => {
          acabouDeArrastar.current = false
        }, 0)
        const alvo = caixaEm(e.clientX, e.clientY)
        if (alvo) mover(alvo)
      }}
      onPointerCancel={() => setArrasto(null)}
      onLostPointerCapture={() => setArrasto(null)}
    >
      <ComSimbolo texto={peca} />
    </SceneButton>
  )
  const caixa = (c: Caixa<K>, filha?: ReactNode) => {
    const temPeca = c.id === atual
    // ⚠️ No aninhado o relógio de fora CONTÉM o Se: com a peça lá dentro ele continua sendo o bloco
    // em que ela mora, e não uma caixa vazia tracejada.
    const contemPeca = temPeca || (aninhada && c.id === caixas[0].id && atual === caixas[1].id)
    const acesa = arrasto?.sobre === c.id || (escolhida && !temPeca)
    const nomeDaCaixa = separarSimbolo(c.titulo).nome
    return (
      <div
        key={c.id}
        ref={(el) => {
          if (el) refs.current.set(c.id, el)
          else refs.current.delete(c.id)
        }}
        role="group"
        aria-label={nomeDaCaixa}
        data-caixa={c.id}
        className={cn(
          'min-h-24 space-y-2 rounded-2xl border-2 p-3 transition-colors',
          contemPeca
            ? 'border-primary/60 bg-primary/5'
            : 'border-dashed border-border bg-background',
          acesa && 'border-primary bg-primary/10 ring-4 ring-primary/15',
        )}
      >
        <p className="text-sm font-semibold">
          <ComSimbolo texto={c.titulo} />
        </p>
        {temPeca ? (
          botaoDaPeca
        ) : (
          /* ⚠️ "Colocar aqui" à vista e NO COMEÇO do nome (consertos do review da onda A do lote 5): o
             nome era "Colocar ▷ Começar em Quando apertar Enter", e quem usa controle por voz dizia o
             que lia na tela ("Colocar aqui") e nada respondia (WCAG 2.5.3). */
          <SceneButton
            key="colocar"
            tom={escolhida ? 'gesto' : 'ferramenta'}
            onClick={() => mover(c.id)}
          >
            Colocar aqui
            <span className="sr-only">
              : {nomeDaPeca} em {nomeDaCaixa}
            </span>
          </SceneButton>
        )}
        {c.dentro}
        {filha}
      </div>
    )
  }
  return (
    <div
      role="group"
      aria-label={separarSimbolo(legenda).nome}
      className="space-y-2 rounded-2xl border border-border p-3"
      onClickCapture={(e) => {
        if (!acabouDeArrastar.current) return
        acabouDeArrastar.current = false
        e.preventDefault()
        e.stopPropagation()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setArrasto(null)
          setEscolhida(false)
        }
      }}
    >
      <p className="text-sm font-semibold">{legenda}</p>
      {aninhada ? (
        caixa(caixas[0], caixa(caixas[1]))
      ) : (
        <div className="sz-scene-pecas">{caixas.map((c) => caixa(c))}</div>
      )}
      <p id={ajuda} className="text-sm text-muted-foreground">
        {`Arraste ${nomeDaPeca} para a outra caixa. Ou toque em Colocar aqui.`}
      </p>
      {arrasto &&
        Math.hypot(arrasto.x - arrasto.inicioX, arrasto.y - arrasto.inicioY) > LIMIAR_DO_ARRASTE &&
        createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-primary bg-background px-5 py-3 text-sm font-semibold text-primary shadow-lg"
            style={{ left: arrasto.x, top: arrasto.y }}
          >
            {peca}
          </div>,
          document.body,
        )}
    </div>
  )
}

/**
 * `layers` — a ORDEM DE DESENHAR, como a pilha de blocos do Estúdio ou o painel Camadas do Pinta.
 *
 * ⚠️⚠️ Vertical e numerada (lote 5 do Raio-X), 1º em cima: logo depois, a fala da aula pede "Coloque
 * a floresta entre Limpar a tela e Desenhar o sprite", numa pilha VERTICAL, e os cartões Antes/Depois
 * lado a lado não se transferiam para esse gesto. Cada peça tem o botão do lugar que falta (Descer ou
 * Subir), sem a seleção invisível de antes, e as duas se arrastam uma para o lugar da outra.
 *
 * ⚠️⚠️ Com `pilha: 'camadas'` (full review de experiência, A1) a lista é a do painel Camadas do Pinta: a
 * da FRENTE em cima, sem números, e os botões com os nomes do Pinta ("Uma camada para a frente" e "Uma
 * camada para trás"). A mesma pilha servia às duas ferramentas, e no Meu Jeito Aula 5 ensinava "suba a
 * chama para a chama ir para trás", o contrário do que o Pinta faz dois minutos depois.
 */
function OrdemDeDesenhar({
  front,
  cast,
  pilha,
  onTrocar,
}: {
  front: boolean
  cast?: SceneCast
  pilha?: ScenePilha
  onTrocar: () => void
}) {
  const titulo = useId()
  const lista = useRef<HTMLOListElement>(null)
  const [arrasto, setArrasto] = useState<{
    ponteiro: number
    y: number
    inicio: number
    peca: 'dino' | 'floresta'
  } | null>(null)
  /**
   * ⚠️ O foco acompanha a peça que o botão moveu (consertos do review da onda A do lote 5): a troca
   * reordena os `<li>`, e em metade das vezes o foco do teclado se perdia no `body`.
   */
  const botoes = useRef(new Map<'dino' | 'floresta', HTMLButtonElement>())
  const focar = useRef<'dino' | 'floresta' | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: o gatilho é a ordem mudar
  useEffect(() => {
    if (!focar.current) return
    botoes.current.get(focar.current)?.focus()
    focar.current = null
  }, [front])
  const camadas = pilha === 'camadas'
  const nome = (peca: 'dino' | 'floresta') => castText(peca === 'dino' ? 'Dino' : 'Floresta', cast)
  /** A ordem de DESENHAR: a primeira é desenhada antes (fica atrás no desenho). */
  const desenho: ('dino' | 'floresta')[] = front ? ['floresta', 'dino'] : ['dino', 'floresta']
  // ⚠️ No Pinta a lista se lê AO CONTRÁRIO: a de cima é a da frente, a desenhada por último.
  const ordem = camadas ? [...desenho].reverse() : desenho
  /** O lugar da linha, para quem usa leitor de tela ("1º a desenhar", ou "Na frente" no Pinta). */
  const lugar = (i: number) =>
    camadas ? (i === 0 ? 'Na frente' : 'Atrás') : `${i + 1}º a desenhar`
  const ouvido = (peca: 'dino' | 'floresta') => nome(peca)
  /** O botão de cada linha: o que se LÊ e o nome acessível (que começa pelo que se lê, WCAG 2.5.3). */
  const botao = (i: number, peca: 'dino' | 'floresta') =>
    camadas
      ? i === 0
        ? { texto: 'Uma camada para trás', nome: `Uma camada para trás: ${ouvido(peca)}` }
        : { texto: 'Uma camada para a frente', nome: `Uma camada para a frente: ${ouvido(peca)}` }
      : i === 0
        ? { texto: '↓ Descer', nome: `Descer ${ouvido(peca)} para o 2º lugar` }
        : { texto: '↑ Subir', nome: `Subir ${ouvido(peca)} para o 1º lugar` }
  return (
    <div className="space-y-2 rounded-2xl border border-border p-3">
      <p id={titulo} className="text-sm font-semibold">
        {camadas ? 'Camadas' : 'A ordem de desenhar'}
      </p>
      <ol
        ref={lista}
        aria-labelledby={titulo}
        data-pilha={camadas ? 'camadas' : 'blocos'}
        className="space-y-2"
      >
        {ordem.map((peca, i) => (
          <li
            key={peca}
            data-peca={peca}
            className={cn(
              'flex touch-none items-center gap-3 rounded-xl border-2 bg-background p-2',
              // ⚠️ Só a peça ARRASTADA fica tracejada (consertos do review da onda A do lote 5): as duas
              // tracejadas não diziam qual ia.
              arrasto?.peca === peca && Math.abs(arrasto.y - arrasto.inicio) > LIMIAR_DO_ARRASTE
                ? 'border-dashed border-primary'
                : 'border-border',
            )}
            onPointerDown={(e) => {
              // ⚠️ O botão da própria peça não começa arrasto: é clique.
              if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
              e.currentTarget.setPointerCapture(e.pointerId)
              setArrasto({ ponteiro: e.pointerId, y: e.clientY, inicio: e.clientY, peca })
            }}
            onPointerMove={(e) => {
              if (arrasto?.ponteiro === e.pointerId) setArrasto({ ...arrasto, y: e.clientY })
            }}
            onPointerUp={(e) => {
              if (arrasto?.ponteiro !== e.pointerId) return
              const desceu = e.clientY - arrasto.inicio
              setArrasto(null)
              const meio = lista.current?.getBoundingClientRect()
              if (!meio || Math.abs(desceu) <= LIMIAR_DO_ARRASTE) return
              const passouDoMeio = e.clientY > meio.top + meio.height / 2
              // A primeira desce para a metade de baixo, a segunda sobe para a de cima.
              if ((i === 0 && passouDoMeio) || (i === 1 && !passouDoMeio)) onTrocar()
            }}
            onPointerCancel={() => setArrasto(null)}
            onLostPointerCapture={() => setArrasto(null)}
          >
            {/* ⚠️ Sem número no Pinta: o painel Camadas não numera as formas. */}
            {!camadas && (
              <span aria-hidden className="w-8 text-center text-lg font-bold tabular-nums">
                {i + 1}º
              </span>
            )}
            <svg viewBox="0 0 70 64" className="h-12 w-14 shrink-0 text-primary" aria-hidden="true">
              {/* ⚠️ A peça mostra a MESMA figura do palco (lote 3 do Raio-X). */}
              {peca === 'dino' ? (
                <ActorFigure figure={actorFigure(cast, 'hero')} x={37} y={58} />
              ) : actorFigure(cast, 'scenery') === 'floresta' ? (
                <>
                  <ActorFigure figure="floresta" x={26} y={60} escala={0.4} />
                  <ActorFigure figure="floresta" x={48} y={60} escala={0.32} escuro />
                </>
              ) : (
                <ActorFigure figure={actorFigure(cast, 'scenery')} x={35} y={62} />
              )}
            </svg>
            <span className="min-w-0 flex-1 text-sm font-semibold">
              <span className="sr-only">{lugar(i)}:</span>
              <span>{nome(peca)}</span>
            </span>
            <SceneButton
              ref={(el) => {
                if (el) botoes.current.set(peca, el)
                else botoes.current.delete(peca)
              }}
              aria-label={botao(i, peca).nome}
              onClick={() => {
                focar.current = peca
                onTrocar()
              }}
            >
              <span aria-hidden>{botao(i, peca).texto}</span>
            </SceneButton>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted-foreground">
        {camadas
          ? 'A de cima fica na frente. Arraste uma forma ou use Uma camada para a frente e Uma camada para trás.'
          : 'O jogo desenha a lista de cima para baixo. Arraste uma peça, ou use Descer e Subir.'}
      </p>
    </div>
  )
}

/**
 * A bancada das oito cenas, montada pelo `ExplorationPieces` junto dos outros fios e peças.
 */
export function DinoSceneControls({
  activity,
  state,
  dispatch,
  more,
}: {
  activity: SceneActivity
  state: SceneState
  dispatch: (action: SceneAction) => void
  /** A prévia pode mostrar tudo aberto para inspeção. */
  more: boolean
}) {
  const m = activity.scene
  const cast = activity.cast
  const t = (texto: string) => castText(texto, cast)
  const descobriu = (meta: string) => state.evidence.discoveries.includes(meta)
  switch (m) {
    case 'layers':
      return (
        <OrdemDeDesenhar
          front={state.world.front}
          cast={cast}
          pilha={activity.pilha}
          onTrocar={() => dispatch({ type: 'layer', front: !state.world.front })}
        />
      )
    case 'gravity':
      return (
        <ExperienceConnection
          source="Gravidade"
          target={t('Dino')}
          alternative="Desligar a gravidade"
          enabled={state.flight.gravity}
          motivo={
            descobriu('floating') || state.flight.gravity || more
              ? undefined
              : // ⚠️ O que a meta pede (`floating`): pular e ESPERAR, sem "subir", que responderia a
                // previsão ("o Dino volta ou continua subindo?").
                t('Abre depois que você fizer o Dino pular e esperar.')
          }
          onConnect={(enabled) => dispatch({ type: 'connect', port: 'gravity', enabled })}
        />
      )
    case 'impulse':
      return (
        <div className="w-full space-y-3">
          <Medida
            label="Impulso do salto"
            value={state.flight.force}
            min={SCENE_LIMITS.impulse.min}
            max={SCENE_LIMITS.impulse.max}
            tom="text-scene-b-ink"
            onChange={(force) => dispatch({ type: 'impulse', force })}
          />
          {/* ⚠️ As MARCAS do deslizante (lote 5 do Raio-X): o 9 de abertura, o 14 que a previsão
              pergunta e o 5, o salto mais baixo. Um toque em cada, para quem não arrasta. */}
          <Escolha
            label="Marcas do impulso"
            valor={state.flight.force}
            opcoes={[5, 9, 14].map((force) => ({ id: force, label: `Impulso ${force}` }))}
            onChange={(force) => dispatch({ type: 'impulse', force })}
          />
        </div>
      )
    case 'jump-sound':
      return (
        <PecaQueMudaDeCaixa
          legenda="Onde está Tocar efeito"
          peca="♪ Tocar efeito"
          caixas={[
            { id: 'tecla', titulo: 'Quando apertar Espaço' },
            { id: 'pulo', titulo: t('Quando o Dino pular') },
          ]}
          atual={state.sound.onJump ? 'pulo' : 'tecla'}
          emDestaque={false}
          onMover={(caixa) =>
            dispatch({ type: 'connect', port: 'sound', enabled: caixa === 'pulo' })
          }
        />
      )
    case 'spawn': {
      const quadros = isSpawnPreset(activity.setup?.preset) && activity.setup.preset.falling
      const intervalo = quadros ? Math.round(state.crowd.interval * 30) : state.crowd.interval
      const opcoes = quadros ? [20, 40, 80] : [0.5, 1, 1.4, 2]
      /**
       * ⚠️⚠️ O intervalo fica FECHADO com a peça fora do relógio (consertos do review da onda A do lote
       * 5): tocar "2 s" ali recomeçava a pista sem relógio nenhum, apagava a parede e o "sem relógio"
       * nunca aparecia. Fechado não é escondido: as opções ficam, com o motivo.
       */
      const intervaloAberto = state.crowd.timer || more
      return (
        <PecaQueMudaDeCaixa
          legenda={t('Onde está Criar cacto')}
          peca={t('Criar cacto')}
          caixas={[
            { id: 'quadro', titulo: 'A cada quadro' },
            {
              id: 'relogio',
              titulo: quadros
                ? `◷ A cada quadros: ${intervalo}`
                : `◷ No relógio, a cada ${decimal(state.crowd.interval)} s`,
              dentro: (
                <Escolha
                  label={quadros ? 'Intervalo em quadros' : 'De quanto em quanto tempo'}
                  valor={intervalo}
                  // ⚠️ O 1,4 s é o do projeto da Aula 5 (lote 5 do Raio-X): a cena não o tinha.
                  opcoes={opcoes.map((value) => ({
                    id: value,
                    label: quadros ? `${value} quadros` : `${decimal(value)} s`,
                    fechado: !intervaloAberto,
                  }))}
                  nota={
                    intervaloAberto ? undefined : t('Abre quando Criar cacto estiver no relógio.')
                  }
                  onChange={(value) =>
                    dispatch({ type: 'interval', seconds: quadros ? value / 30 : value })
                  }
                />
              ),
            },
          ]}
          atual={state.crowd.timer ? 'relogio' : 'quadro'}
          onMover={(caixa) =>
            dispatch({ type: 'connect', port: 'timer', enabled: caixa === 'relogio' })
          }
        />
      )
    }
    case 'cleanup': {
      /**
       * ⚠️ Uma CHAVE, com o nome do bloco do Estúdio (lote 5 do Raio-X): eram cinco nomes para uma
       * regra, e o fio ia da ação para o acontecimento, ao contrário das outras cenas. Fechada até
       * a prateleira ter o que mostrar, com o motivo; ⚠️ nunca fechada LIGADA.
       */
      const aberta = descobriu('invisible-stored') || state.crowd.cleanup || more
      return (
        <Chave
          label="Tirar do grupo quem sair da tela"
          ligado={state.crowd.cleanup}
          ligadoTexto="ligado"
          desligadoTexto="desligado"
          disabled={!aberta}
          nota={aberta ? undefined : t('Abre depois que dois cactos saírem da tela.')}
          onToggle={(enabled) => dispatch({ type: 'connect', port: 'cleanup', enabled })}
        />
      )
    }
    case 'game-state':
      return (
        <div className="space-y-3">
          {/* ⚠️ "Fechado não é escondido": na tela de início o botão fica, fechado. ⚠️ E recebe o foco
              quando a partida começa pelo palco (`FOCO_DEPOIS_DE_COMECAR`, consertos da onda A). */}
          <SceneButton
            data-foco-depois-de-comecar=""
            fechado={state.match.screen === 'start'}
            onClick={() => dispatch({ type: 'home' })}
          >
            Voltar ao início
          </SceneButton>
          <PecaQueMudaDeCaixa
            legenda={t('Onde está Criar cacto')}
            peca={t('Criar cacto')}
            aninhada
            caixas={[
              {
                id: 'relogio',
                titulo:
                  gameStatePreset(activity.setup?.preset).clockFrames === 40
                    ? '◷ No relógio, a cada 40 quadros'
                    : '◷ No relógio, a cada 0,6 s',
              },
              { id: 'se', titulo: 'Se o estado do jogo é jogando' },
            ]}
            atual={state.match.guarded ? 'se' : 'relogio'}
            onMover={(caixa) =>
              dispatch({ type: 'connect', port: 'condition', enabled: caixa === 'se' })
            }
          />
        </div>
      )
    case 'score':
      /**
       * ⚠️⚠️ A `score` passou para a PEÇA QUE MUDA DE CAIXA (consertos do review da onda A do lote 5): era
       * a última cena com a peça antiga, cujo "Colocar aqui" era `disabled` nativo (fora do Tab, sem
       * motivo) e sem o nome da peça e da caixa, quatro aulas depois de a `game-state` fazer o mesmo
       * gesto com a peça nova. Mesma ação de antes (`connect condition`).
       */
      return (
        <PecaQueMudaDeCaixa
          legenda="Onde está Somar ponto"
          peca="＋ Somar ponto"
          caixas={[
            { id: 'solto', titulo: 'Solto' },
            { id: 'quadro', titulo: 'A cada quadro do jogo' },
            { id: 'segundo', titulo: 'A cada 1 segundos' },
            {
              id: 'quadro-se',
              titulo: 'A cada quadro, dentro do bloco “o estado do jogo é jogando ?”',
            },
            {
              id: 'segundo-se',
              titulo: 'A cada 1 segundos, dentro do bloco “o estado do jogo é jogando ?”',
            },
          ]}
          atual={
            state.match.guarded
              ? state.match.scoreClock === 'frame'
                ? 'quadro-se'
                : 'segundo-se'
              : state.match.scoreClock === 'frame'
                ? 'quadro'
                : state.match.scoreClock === 'second'
                  ? 'segundo'
                  : 'solto'
          }
          onMover={(caixa) =>
            dispatch({
              type: 'score-place',
              clock: caixa === 'solto' ? 'loose' : caixa.startsWith('quadro') ? 'frame' : 'second',
              guarded: caixa.endsWith('-se'),
            })
          }
        />
      )
    case 'controls': {
      const inicio = state.match.screen === 'start'
      return (
        <div className="space-y-3">
          {/* O "Apertar Enter" é o caminho de quem não tem teclado; a área do palco é o toque. */}
          <div className="flex flex-wrap gap-2">
            <SceneButton
              fechado={!inicio}
              onClick={() => dispatch({ type: 'start', input: 'key' })}
            >
              <span aria-hidden>⌨</span> Apertar Enter
            </SceneButton>
            <SceneButton
              data-foco-depois-de-comecar=""
              fechado={inicio}
              onClick={() => dispatch({ type: 'home' })}
            >
              Voltar ao início
            </SceneButton>
          </div>
          <PecaQueMudaDeCaixa
            legenda="Onde está Começar"
            peca="▷ Começar"
            caixas={[
              { id: 'enter', titulo: 'Quando apertar a tecla' },
              { id: 'toque', titulo: 'Quando apertar qualquer tecla ou tocar na tela' },
            ]}
            atual={state.match.touch ? 'toque' : 'enter'}
            onMover={(caixa) =>
              dispatch({ type: 'connect', port: 'touch', enabled: caixa === 'toque' })
            }
          />
        </div>
      )
    }
    default:
      return null
  }
}

/** As cenas desta bancada: o `ExplorationPieces` a monta só para elas. */
export const CENAS_DO_CORRE_DINO = [
  'layers',
  'gravity',
  'impulse',
  'jump-sound',
  'spawn',
  'cleanup',
  'game-state',
  'controls',
  // A peça do placar (consertos do review da onda A do lote 5); o resto da bancada da `score` mora em
  // `scene-dino-numbers-controls.tsx`.
  'score',
] as const
