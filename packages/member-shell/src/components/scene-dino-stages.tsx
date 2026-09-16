'use client'

import {
  actorFigure,
  castText,
  decimal,
  quantos,
  type SceneAction,
  type SceneCast,
  type SceneState,
  type SceneWorldKind,
  sceneCactiOnScreen,
  sceneWorld,
} from '@sistemazero/core/learning/scene'
import { type KeyboardEvent, type ReactNode, useId, useRef } from 'react'
import { SceneButton } from './exploration-stage'
import { SceneCanvas, Texto, usePalco } from './scene-canvas'
import { ActorFigure, CENARIO_UNICO, FundoEspaco, pisoDoMundo } from './scene-figures'

/**
 * Os palcos do Corre Dino, primeira metade (lote 5 do Raio-X, 16/09/2026): `layers`, `jump-sound`,
 * `spawn`, `cleanup`, `game-state` e `controls`. `gravity` e `impulse` continuam no laboratório de
 * saltos (`experience-scene.tsx`), que mede altura.
 *
 * ⭐⭐ Eles moravam no palco COMPARTILHADO do `exploration-stage`, e o compartilhado desenhava a
 * mesma pista para todas: o triângulo cinza sem função, "removidos" desde a abertura, o Dino
 * atravessando a parede de cactos e uma floresta que escondia o Dino inteiro. Cada cena agora
 * desenha o que a descoberta dela precisa ver: a ordem de desenhar, a linha do tempo dos pulos e
 * dos sons, a parede e o espaço entre os cactos, a tela ao lado dos bastidores, a peça dentro do
 * relógio e o convite com os dois jeitos de começar.
 *
 * ⚠️ O enquadramento é o do palco do Corre Dino (600 × 310): o chão em 238, as figuras nos mesmos
 * lugares relativos. Uma aula passa de uma cena à outra sem o mundo mudar de tamanho.
 * ⚠️ Toda figura de papel passa por `ActorFigure(actorFigure(cast, papel))` (lote 3): nunca o Dino
 * direto, e o que cada palco desenha é a tabela `SCENE_ROLES` do core.
 */

const STAGE = { w: 600, h: 310 } as const
/** O chão da pista, como no palco compartilhado. */
const CHAO = 238

/** O fundo da pista: grama e pontinhos na terra, céu de estrelas no espaço. */
function Pista({
  mundo,
  semEstrelas,
  chaoNoEspaco,
}: {
  mundo: SceneWorldKind
  semEstrelas?: readonly { x: number; y: number; w: number; h: number }[]
  chaoNoEspaco?: number
}) {
  const id = useId()
  if (mundo === 'espaco')
    return (
      <FundoEspaco w={STAGE.w} h={STAGE.h} chao={chaoNoEspaco} semEstrelas={semEstrelas ?? []} />
    )
  return (
    <>
      <defs>
        <pattern id={`${id}-dots`} width="24" height="24" patternUnits="userSpaceOnUse">
          <circle className="fill-scene-grid" cx="2" cy="2" r="1" />
        </pattern>
      </defs>
      <rect width={STAGE.w} height={STAGE.h} fill={`url(#${id}-dots)`} opacity="0.35" />
      <path className="fill-scene-grass" d={`M0 ${CHAO}H${STAGE.w}V${STAGE.h}H0Z`} />
      <path className="stroke-scene-line" d={`M0 ${CHAO}H${STAGE.w}`} strokeWidth="2" />
    </>
  )
}

/**
 * A marca do controle da BANCADA que recebe o foco quando a partida começa pelo palco.
 *
 * ⚠️⚠️ Consertos do review da onda A do lote 5 (T3): na `restart`, na `game-state` e na `controls` a tela
 * de início inteira (ou o "Toque para começar") é um botão que SOME quando a partida começa, e quem usa
 * Enter recomeçava o Tab do alto da página, sem ouvir o que aconteceu. O palco não conhece a bancada,
 * então ele procura a marca na mesma `<section>` da cena (a do player e a do "Agora é sua vez").
 */
export const FOCO_DEPOIS_DE_COMECAR = 'data-foco-depois-de-comecar'

export function focarNaBancadaDepoisDeComecar(origem: HTMLElement) {
  const secao = origem.closest('section')
  if (!secao || origem.ownerDocument.activeElement !== origem) return
  // Depois do render: o botão do palco já saiu, e o da bancada já abriu.
  setTimeout(() => {
    secao.querySelector<HTMLElement>(`[${FOCO_DEPOIS_DE_COMECAR}]`)?.focus()
  }, 0)
}

/** O selo no alto do palco: o que ESTE palco mostra, na língua da criança. */
function Selo({ children }: { children: ReactNode }) {
  // ⚠️ No canto do enquadramento EM USO: com o recorte de perto do estreito (a `layers`), em (20, 28) do
  // palco inteiro ele ficaria fora do desenho.
  const { view } = usePalco()
  return (
    <Texto
      className="fill-scene-ink"
      x={(view.x ?? 0) + 20}
      y={(view.y ?? 0) + 28}
      tamanho={13}
      fontWeight="600"
    >
      {children}
    </Texto>
  )
}

/* ── layers ─────────────────────────────────────────────────────────────────────────────────── */

/**
 * Onde o Dino fica: logo à DIREITA da árvore escura. A folhagem estreita para cima, então a árvore
 * cobre o corpo e o rabo (embaixo, à esquerda) e deixa a cabeça com o olho de fora.
 */
const DINO_DO_LAYERS = 248
/** O recorte da `layers` no estreito: a árvore escura, o Dino e o cenário único, com o chão embaixo. */
const LAYERS_DE_PERTO = { x: 130, y: 44, w: 290, h: 236 } as const

/**
 * `layers` — quem fica na frente?
 *
 * ⚠️⚠️ O Dino abre MEIO escondido (lote 5 do Raio-X): a floresta cobria o Dino inteiro e sobrava
 * uma lasca azul entre as árvores, e a primeira pista ("onde está o Dino?") pressupunha que a
 * criança tinha visto um Dino. Agora a cabeça aparece num vão da folhagem e o corpo fica atrás.
 * ⚠️ Sem o triângulo cinza e sem texto que diga quem cobre quem: a ordem está na faixa e na lista
 * da bancada, e o efeito, no desenho.
 * ⚠️ O cenário que não é floresta é UMA figura só (`CENARIO_UNICO`, a chama do Meu Jeito), um pouco
 * à direita, e deixa à vista o lado esquerdo da pedra com a cratera.
 */
export function LayersStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const heroi = actorFigure(cast, 'hero')
  const cenario = actorFigure(cast, 'scenery')
  const mundo = sceneWorld(cast, 'layers')
  const piso = pisoDoMundo(mundo, CHAO)
  const frente = state.world.front
  const floresta =
    cenario === 'floresta' ? (
      <g>
        {/* ⚠️ A árvore escura fica um pouco à FRENTE do chão do Dino e 38 à esquerda dele: a folhagem
            cobre o corpo e deixa a cabeça de fora. As outras ficam longe da cabeça. */}
        <ActorFigure figure="floresta" x={110} y={250} />
        <ActorFigure figure="floresta" x={DINO_DO_LAYERS - 38} y={266} escala={1.12} escuro />
        <ActorFigure figure="floresta" x={340} y={262} />
        <ActorFigure figure="floresta" x={440} y={250} />
      </g>
    ) : (
      <ActorFigure
        figure={cenario}
        x={DINO_DO_LAYERS + CENARIO_UNICO.dx}
        y={piso}
        escala={CENARIO_UNICO.escala}
      />
    )
  const dino = (
    <g className="text-primary">
      <ActorFigure figure={heroi} x={DINO_DO_LAYERS} y={piso} />
    </g>
  )
  return (
    <SceneCanvas
      view={STAGE}
      // ⭐ De PERTO no estreito (conserto "letra no celular"): a pista inteira num celular deixava a
      // cabeça do Dino com ~16px, e "quem cobre quem" quase não se via.
      viewEstreito={LAYERS_DE_PERTO}
      cast={cast}
      mundo={mundo}
      titulo="A ordem de desenhar, no desenho"
      // ⚠️ O que o desenho MOSTRA (é o que quem não enxerga recebe no lugar dele), sem a regra.
      // ⚠️ Sem adjetivo solto depois do nome (consertos do review da onda A do lote 5): "O Dino aparece
      // inteiro" virava "A pedra aparece inteiro" no Meu Jeito, porque o elenco não flexiona o que vem
      // longe do nome.
      descricao={
        frente
          ? 'Nada fica na frente do Dino, e a floresta fica atrás.'
          : 'A floresta fica na frente, e só um pedaço do Dino aparece.'
      }
    >
      <Pista mundo={mundo} semEstrelas={[{ x: 14, y: 8, w: 240, h: 30 }]} />
      <Selo>{castText('Quem fica na frente', cast)}</Selo>
      {frente ? floresta : dino}
      {frente ? dino : floresta}
    </SceneCanvas>
  )
}

/* ── jump-sound ─────────────────────────────────────────────────────────────────────────────── */

/** As colunas da linha do tempo: uma por aperto que fez alguma coisa. */
// ⚠️ Tudo grande de propósito: num celular o palco de 600 vira ~300px, e a letra de 12 sumia.
const TRILHA = { x0: 176, passo: 56, pulos: 186, sons: 262 } as const

/**
 * `jump-sound` — a linha do tempo dos pulos e dos sons.
 *
 * ⭐⭐ Palco PRÓPRIO (lote 5 do Raio-X): era o laboratório de ALTURA, com régua, impulso e gravidade
 * numa cena sobre som, e "som sem pulo" era só a diferença entre dois números pequenos no pé do
 * desenho. Agora cada aperto que fez alguma coisa é uma COLUNA, com ↑ na trilha dos pulos e ♪ na dos
 * sons. Quando os dois andam juntos a coluna está completa; um sem o outro ganha um aro âmbar e um
 * lugar vazio tracejado, e é isso que a criança compara com a peça em cada caixa.
 * ⚠️ O Dino pequeno no alto pula de verdade: tocar nele é o toque, e Espaço com ele em foco é a
 * tecla. O caminho de teclado continua sendo a bancada e os botões do mundo.
 */
export function JumpSoundStage({
  state,
  cast,
  onJump,
}: {
  state: SceneState
  cast?: SceneCast
  onJump?: (input: 'key' | 'tap') => void
}) {
  const heroi = actorFigure(cast, 'hero')
  const mundo = sceneWorld(cast, 'jump-sound')
  const { beats, jumps, count } = state.sound
  const chaoDoDino = 120
  const subida = Math.min(70, state.flight.y * 0.4)
  const ultima = beats.at(-1)
  /**
   * ⚠️⚠️ O teclado já pulou no `keydown` (consertos do review da onda A do lote 5, B5): o clique só era
   * toque com `detail > 0`, e um leitor de tela que ativa pela ação padrão gera clique com `detail 0`,
   * e nada acontecia. Agora o clique que NÃO veio de uma tecla tratada é toque, com qualquer `detail`.
   */
  const teclaTratada = useRef(false)
  const tecla = (e: KeyboardEvent<SVGGElement>) => {
    if (!onJump) return
    // ⚠️ Espaço é a TECLA do jogo; Enter é o "clique" de quem usa teclado, e vale como toque.
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault()
      teclaTratada.current = true
      setTimeout(() => {
        teclaTratada.current = false
      }, 0)
      if (!e.repeat) onJump(e.code === 'Space' ? 'key' : 'tap')
    }
  }
  return (
    <SceneCanvas
      view={STAGE}
      cast={cast}
      mundo={mundo}
      interativo={Boolean(onJump)}
      titulo="A linha do tempo dos pulos e dos sons"
      descricao={`${quantos(jumps, 'pulo', 'pulos')} e ${quantos(count, 'som', 'sons')}. ${
        !ultima
          ? 'A linha do tempo está vazia.'
          : ultima.pulo && ultima.som
            ? 'No último aperto, o pulo e o som vieram juntos.'
            : ultima.pulo
              ? 'No último aperto, o Dino pulou e nenhum som tocou.'
              : 'No último aperto, o som tocou e o Dino não pulou.'
      }`}
    >
      {mundo === 'espaco' ? (
        <FundoEspaco
          w={STAGE.w}
          h={STAGE.h}
          chao={chaoDoDino}
          semEstrelas={[{ x: 0, y: 150, w: 600, h: 160 }]}
        />
      ) : (
        <>
          <rect className="fill-scene-sky" width={STAGE.w} height={chaoDoDino} />
          <path className="stroke-scene-line" d={`M0 ${chaoDoDino}H${STAGE.w}`} strokeWidth="2" />
        </>
      )}
      <g
        // ⚠️ O contorno de foco só pelo teclado (consertos do review da onda A do lote 5): um quadrado
        // ficava em volta do Dino depois do clique com o mouse.
        className="text-primary outline-none focus-visible:outline-2 focus-visible:outline-primary"
        style={{ cursor: onJump ? 'pointer' : undefined }}
        role={onJump ? 'button' : undefined}
        tabIndex={onJump ? 0 : undefined}
        aria-label={onJump ? castText('Tocar no Dino para pular', cast) : undefined}
        onClick={() => {
          if (!onJump) return
          if (teclaTratada.current) {
            teclaTratada.current = false
            return
          }
          onJump('tap')
        }}
        onKeyDown={tecla}
      >
        <ActorFigure figure={heroi} x={80} y={chaoDoDino - subida} />
        {onJump && (
          <rect
            x="40"
            y={chaoDoDino - subida - 64}
            width="80"
            height="72"
            rx="12"
            fill="transparent"
          />
        )}
      </g>
      {/* As duas trilhas, com o nome e a conta à esquerda. ⚠️ `aria-hidden` nas trilhas e nas colunas
          (consertos do review da onda A do lote 5): o palco é um grupo interativo, e o leitor lia os
          ícones soltos ("↑ pulos 2 pulos ♪ sons 2 sons ↑ ♪ ♪ ↑"). Quem ouve recebe a `descricao`. */}
      {[
        { y: TRILHA.pulos, nome: '↑ pulos', n: quantos(jumps, 'pulo', 'pulos') },
        { y: TRILHA.sons, nome: '♪ sons', n: quantos(count, 'som', 'sons') },
      ].map((t) => (
        <g key={t.nome} aria-hidden>
          <path
            className="stroke-scene-rule"
            d={`M${TRILHA.x0 - 26} ${t.y}H${STAGE.w - 16}`}
            strokeWidth="2"
            strokeDasharray="3 6"
          />
          <NomeDaTrilha y={t.y} nome={t.nome} conta={t.n} />
        </g>
      ))}
      {beats.map((b, i) => {
        const x = TRILHA.x0 + i * TRILHA.passo
        const sozinho = b.pulo !== b.som
        return (
          // ⚠️ A chave é a POSIÇÃO: a linha só guarda as últimas batidas e elas andam para a
          // esquerda quando uma nova entra, então cada coluna é um lugar, e não uma batida fixa.
          // biome-ignore lint/suspicious/noArrayIndexKey: a coluna é o lugar na linha do tempo
          <g key={i} aria-hidden>
            {b.pulo && b.som && (
              <path
                className="stroke-scene-a"
                d={`M${x} ${TRILHA.pulos + 24}V${TRILHA.sons - 24}`}
                strokeWidth="3"
              />
            )}
            <Batida x={x} y={TRILHA.pulos} simbolo="↑" tem={b.pulo} sozinho={sozinho} />
            <Batida x={x} y={TRILHA.sons} simbolo="♪" tem={b.som} sozinho={sozinho} />
          </g>
        )
      })}
    </SceneCanvas>
  )
}

/**
 * O nome de uma trilha e a conta embaixo dele. ⚠️ A conta desce com a LETRA (conserto "letra no
 * celular"): no celular as duas linhas chegam a 23 unidades, e em `y + 20` a conta encostava no nome.
 */
function NomeDaTrilha({ y, nome, conta }: { y: number; nome: string; conta: string }) {
  const { letra } = usePalco()
  return (
    <>
      <Texto className="fill-scene-ink" x="16" y={y - 2} tamanho={20} fontWeight="700">
        {nome}
      </Texto>
      <Texto
        className="fill-scene-ink-soft"
        x="16"
        y={y + Math.max(20, letra(15) + 5)}
        tamanho={15}
      >
        {conta}
      </Texto>
    </>
  )
}

/** Um ícone da linha do tempo, ou o lugar vazio dele quando só o outro aconteceu. */
function Batida({
  x,
  y,
  simbolo,
  tem,
  sozinho,
}: {
  x: number
  y: number
  simbolo: string
  tem: boolean
  sozinho: boolean
}) {
  if (!tem)
    return (
      <circle
        className="fill-scene-card stroke-scene-rule"
        cx={x}
        cy={y}
        r="18"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
    )
  return (
    <g>
      {/* ⚠️ O aro âmbar marca o que veio SOZINHO: um pulo sem som, ou um som sem pulo. */}
      {sozinho && (
        <circle className="stroke-scene-b" cx={x} cy={y} r="26" strokeWidth="4" fill="none" />
      )}
      <circle className="fill-scene-a" cx={x} cy={y} r="21" />
      <Texto
        x={x}
        y={y + 8}
        textAnchor="middle"
        tamanho={24}
        fontWeight="700"
        className="fill-scene-card"
      >
        {simbolo}
      </Texto>
    </g>
  )
}

/* ── spawn e game-state: os cactos na pista ─────────────────────────────────────────────────── */

/**
 * Os cactos da tela, prontos para desenhar.
 *
 * ⚠️⚠️ A PAREDE é uma fileira contínua (lote 5 do Raio-X): nascendo a cada quadro, dois cactos ficam
 * a 3 unidades um do outro, e a primeira versão empilhava todos em cinco fileiras, que viravam um
 * borrão ("parece um ônibus"). Com o vão menor que o tronco, desenha um de cada tantos cactos numa
 * fileira só: os troncos se encostam e se lê "uma parede de cactos". O número de verdade está na
 * faixa, e não no desenho.
 * ⚠️ O subconjunto sai do `id`, e não da posição na lista: os cactos andam e saem da tela a cada
 * quadro, e uma escolha por índice faria a parede tremer.
 */
function cactosParaDesenhar<C extends { id: number; x: number }>(cactos: readonly C[]): C[] {
  const xs = cactos.map((c) => c.x).sort((a, b) => a - b)
  let menorVao = Number.POSITIVE_INFINITY
  for (let i = 1; i < xs.length; i++) menorVao = Math.min(menorVao, (xs[i] ?? 0) - (xs[i - 1] ?? 0))
  const pulo = menorVao < 14 ? Math.ceil(14 / Math.max(menorVao, 1)) : 1
  return pulo === 1 ? [...cactos] : cactos.filter((c) => c.id % pulo === 0)
}

/** A régua de "na tela" do core (0 a 480), em lista. */
const naTela = (state: SceneState) => state.crowd.cacti.filter((c) => c.x >= 0 && c.x <= 480)

/**
 * `spawn` — a parede e o espaço entre os cactos.
 *
 * ⚠️ Sem o triângulo e sem "removidos": o que a cena compara é quantos nascem, e a comparação que
 * FICA (sem relógio × com relógio) mora na faixa. O personagem é desenhado DEPOIS dos cactos: o
 * cacto que o alcança passa por trás dele.
 */
export function SpawnStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const heroi = actorFigure(cast, 'hero')
  const obstaculo = actorFigure(cast, 'obstacle')
  const mundo = sceneWorld(cast, 'spawn')
  const piso = pisoDoMundo(mundo, CHAO)
  const tela = naTela(state)
  const desenho = cactosParaDesenhar(tela)
  const parede = desenho.length < tela.length
  return (
    <SceneCanvas
      view={STAGE}
      cast={cast}
      mundo={mundo}
      // ⚠️ "na tela", e não "na pista" (consertos do review da onda A do lote 5): no Desafio e no Meu
      // Jeito o leitor ouvia "Os asteroides que nascem na pista".
      titulo="Os cactos que nascem na tela"
      descricao={
        tela.length === 0
          ? 'Nenhum cacto na tela.'
          : parede
            ? `${quantos(tela.length, 'cacto', 'cactos')} na tela, colados uns nos outros.`
            : `${quantos(tela.length, 'cacto', 'cactos')} na tela, com espaço entre um e outro.`
      }
    >
      <Pista mundo={mundo} semEstrelas={[{ x: 14, y: 8, w: 260, h: 30 }]} />
      <Selo>{castText('Os cactos que nascem', cast)}</Selo>
      {desenho.map((c) => (
        <ActorFigure key={c.id} figure={obstaculo} x={60 + c.x} y={piso} />
      ))}
      <g className="text-primary">
        <ActorFigure figure={heroi} x={170} y={piso} />
      </g>
    </SceneCanvas>
  )
}

/**
 * `game-state` — Criar cacto dentro de Se jogando.
 *
 * ⭐ O contador GRANDE dos cactos criados (lote 5 do Raio-X): na tela de início com a peça dentro do
 * Se ele fica cinza e diz "esperando", que é o que a descoberta afirma. A pista é limpa na troca da
 * peça e na volta ao início (motor), então nenhum cacto velho passa pela tela de início.
 * ⚠️ Um jeito só de começar à vista ("Toque para começar", sem o ▶ que é o do tempo): o Enter é
 * assunto da `controls`, e dois jeitos aqui não importavam.
 */
export function GameStateStage({
  state,
  cast,
  dispatch,
}: {
  state: SceneState
  cast?: SceneCast
  dispatch?: (action: SceneAction) => void
}) {
  const heroi = actorFigure(cast, 'hero')
  const obstaculo = actorFigure(cast, 'obstacle')
  const mundo = sceneWorld(cast, 'game-state')
  const piso = pisoDoMundo(mundo, CHAO)
  const tela = naTela(state)
  const inicio = state.match.screen === 'start'
  /**
   * ⚠️⚠️ "esperando" só DEPOIS de o tempo passar (consertos do review da onda A do lote 5): a palavra
   * aparecia no instante da troca da peça, afirmando o resultado antes de o relógio andar. Até lá o
   * contador mostra o 0 em cinza, e embaixo o tempo que a tela de início já esperou.
   */
  const dentro = inicio && state.match.guarded
  const esperando = dentro && state.match.scoreIdle > 0
  return (
    <SceneCanvas
      className="relative"
      view={STAGE}
      cast={cast}
      mundo={mundo}
      titulo="A tela do jogo e os cactos criados"
      descricao={`${inicio ? 'Tela de início' : 'Tela da partida'}, com ${quantos(tela.length, 'cacto', 'cactos')} à vista. ${
        esperando
          ? 'O contador de cactos criados está esperando.'
          : `O contador marca ${quantos(state.crowd.born, 'cacto criado', 'cactos criados')}.`
      }`}
      overlay={
        inicio && dispatch ? (
          <div className="absolute left-[34%] top-[36%] -translate-x-1/2 -translate-y-1/2">
            <SceneButton
              onClick={(e) => {
                focarNaBancadaDepoisDeComecar(e.currentTarget)
                dispatch({ type: 'start', input: 'tap' })
              }}
            >
              Toque para começar
            </SceneButton>
          </div>
        ) : undefined
      }
    >
      <Pista
        mundo={mundo}
        semEstrelas={[
          { x: 14, y: 8, w: 200, h: 30 },
          { x: 396, y: 34, w: 190, h: 110 },
        ]}
      />
      <Selo>{inicio ? 'INÍCIO' : 'JOGANDO'}</Selo>
      {tela.map((c) => (
        <ActorFigure key={c.id} figure={obstaculo} x={60 + c.x} y={piso} />
      ))}
      <g className="text-primary">
        <ActorFigure figure={heroi} x={120} y={piso} />
      </g>
      {/* O contador: grande, e cinza com "esperando" quando a peça espera a partida. */}
      <g transform="translate(404 42)">
        <rect
          className={
            dentro ? 'fill-scene-card stroke-scene-rule' : 'fill-scene-card stroke-scene-a'
          }
          width="176"
          height="96"
          rx="16"
          strokeWidth="2"
        />
        <Texto className="fill-scene-ink-soft" x="88" y="28" textAnchor="middle" tamanho={16}>
          {castText('cactos criados', cast)}
        </Texto>
        <Texto
          className={dentro ? 'fill-scene-ink-soft' : 'fill-scene-a'}
          x="88"
          y={esperando ? 64 : 76}
          textAnchor="middle"
          tamanho={esperando ? 22 : 40}
          fontWeight="700"
        >
          {esperando ? 'esperando' : state.crowd.born}
        </Texto>
        {esperando && (
          <Texto className="fill-scene-ink-soft" x="88" y="86" textAnchor="middle" tamanho={14}>
            no início há {decimal(Math.floor(state.match.scoreIdle * 10) / 10)} s
          </Texto>
        )}
      </g>
    </SceneCanvas>
  )
}

/* ── cleanup ────────────────────────────────────────────────────────────────────────────────── */

/** Cada lado da comparação da `cleanup`. */
const LADO = { w: 300, h: 250 } as const
/** Quantos mini-cactos cabem na prateleira antes de virar "+N". */
const PRATELEIRA = 16

/**
 * `cleanup` — a tela do jogo AO LADO dos bastidores do grupo.
 *
 * ⭐⭐ Lado a lado (lote 5 do Raio-X), no modo comparação do `SceneCanvas`: o selo dizia "A pista e os
 * bastidores" e só a pista era desenhada. O cacto sumia na linha tracejada tanto guardado quanto
 * removido, e a diferença morava em números. Agora os dois lugares EXISTEM ao mesmo tempo (a régua
 * de quando usar lado a lado): quem sai pela esquerda da tela aparece na prateleira dos bastidores,
 * que enche; com a regra ligada, quem sai cai na caixa dos removidos e a prateleira para de encher.
 * ⚠️ Sem o Dino: a cena é sobre o GRUPO de cactos (`SCENE_ROLES`).
 */
export function CleanupStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const obstaculo = actorFigure(cast, 'obstacle')
  const mundo = sceneWorld(cast, 'cleanup')
  const tela = naTela(state)
  const noGrupo = state.crowd.born - state.crowd.removed
  const fora = Math.max(0, noGrupo - sceneCactiOnScreen(state.crowd))
  const removidos = state.crowd.removed
  const regra = state.crowd.cleanup
  const mostraRemovidos = regra || removidos > 0
  const escala = LADO.w / 480
  const chao = 200
  return (
    <SceneCanvas
      view={LADO}
      cast={cast}
      mundo={mundo}
      titulo="A tela do jogo e os bastidores do grupo, lado a lado"
      descricao={`${quantos(tela.length, 'cacto', 'cactos')} na tela e ${noGrupo} no grupo.`}
      comparacao={[
        {
          titulo: 'Tela do jogo',
          descricao: `${quantos(tela.length, 'cacto', 'cactos')} na tela. A saída é a borda da esquerda.`,
          desenho: (
            <>
              {mundo === 'espaco' ? (
                <FundoEspaco w={LADO.w} h={LADO.h} />
              ) : (
                <>
                  <rect className="fill-scene-sky" width={LADO.w} height={LADO.h} />
                  <path className="fill-scene-grass" d={`M0 ${chao}H${LADO.w}V${LADO.h}H0Z`} />
                  <path className="stroke-scene-line" d={`M0 ${chao}H${LADO.w}`} strokeWidth="2" />
                </>
              )}
              {tela.map((c) => (
                <ActorFigure
                  key={c.id}
                  figure={obstaculo}
                  x={c.x * escala}
                  y={pisoDoMundo(mundo, chao)}
                  escala={0.8}
                />
              ))}
              {/* ⚠️ A saída é a BORDA da tela, e não uma linha 60 unidades para dentro. */}
              <path
                className="stroke-scene-b"
                d={`M3 18V${LADO.h - 6}`}
                strokeWidth="4"
                strokeDasharray="8 6"
              />
              <Texto className="fill-scene-b-ink" x="12" y="30" tamanho={14} fontWeight="600">
                ← saída
              </Texto>
            </>
          ),
        },
        {
          titulo: 'Bastidores: o grupo',
          descricao: `${quantos(fora, 'cacto', 'cactos')} na prateleira, fora da tela.${
            mostraRemovidos ? ` ${quantos(removidos, 'cacto removido', 'cactos removidos')}.` : ''
          }`,
          desenho: (
            <>
              {mundo === 'espaco' ? (
                <FundoEspaco w={LADO.w} h={LADO.h} />
              ) : (
                <rect className="fill-scene-sky" width={LADO.w} height={LADO.h} />
              )}
              {/* A prateleira: quem saiu da tela e continua no grupo. */}
              <Texto className="fill-scene-ink" x="18" y="30" tamanho={14} fontWeight="600">
                {castText('Fora da tela, no grupo', cast)}
              </Texto>
              <rect
                className="fill-scene-card stroke-scene-card-line"
                x="14"
                y="40"
                width="272"
                height="96"
                rx="12"
                strokeWidth="2"
              />
              <path className="stroke-scene-bark" d="M22 124H278" strokeWidth="4" />
              {Array.from({ length: Math.min(fora, PRATELEIRA) }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: a prateleira é uma fila de lugares
                <g key={i} className="text-scene-ink">
                  <ActorFigure
                    figure={obstaculo}
                    x={36 + (i % 8) * 32}
                    y={i < 8 ? 122 : 80}
                    escala={0.42}
                  />
                </g>
              ))}
              {fora > PRATELEIRA && (
                <Texto
                  className="fill-scene-ink"
                  x="270"
                  y="60"
                  textAnchor="end"
                  tamanho={14}
                  fontWeight="700"
                >
                  +{fora - PRATELEIRA}
                </Texto>
              )}
              {fora === 0 && (
                <Texto
                  className="fill-scene-ink-soft"
                  x="150"
                  y="94"
                  textAnchor="middle"
                  tamanho={13}
                >
                  vazia
                </Texto>
              )}
              {/* ⚠️ A caixa dos removidos só aparece com a regra (ou depois dela): escrita desde a
                  abertura, ela já dizia que sair da tela é diferente de sair do grupo. */}
              {mostraRemovidos && (
                <g>
                  {/* ⚠️ Na cor NEUTRA da cena (consertos do review da onda A do lote 5): o vermelho de
                      alerta lia como erro, e remover quem saiu é o jeito certo. */}
                  <Texto className="fill-scene-ink" x="18" y="166" tamanho={14} fontWeight="600">
                    Removidos do grupo: {removidos}
                  </Texto>
                  <path
                    className="fill-scene-card stroke-scene-card-line"
                    d="M96 176H204L194 238H106Z"
                    strokeWidth="2"
                  />
                  {Array.from({ length: Math.min(removidos, 6) }, (_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: a caixa é uma fila de lugares
                    <g key={i} opacity="0.7">
                      <ActorFigure figure={obstaculo} x={116 + i * 14} y={232} escala={0.36} />
                    </g>
                  ))}
                </g>
              )}
            </>
          ),
        },
      ]}
    />
  )
}

/** As tentativas da `controls`: como a partida começou (ou não) a cada gesto. */
type Tentativa = SceneState['match']['tries'][number]

const textoDoSelo = (t: Tentativa) =>
  `${t.input === 'tap' ? '✋ tocou' : '⌨ Enter'}: ${t.began ? 'começou' : 'nada aconteceu'}`

/** Os selos no canto do desenho, na coluna do computador. */
function SelosNoDesenho({ tries }: { tries: readonly Tentativa[] }) {
  const { estreito } = usePalco()
  if (estreito) return null
  return (
    <>
      {tries.map((t, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: os selos são os últimos lugares da fila
        <g key={i} transform={`translate(398 ${56 + i * 40})`}>
          <rect
            className={
              t.began ? 'fill-scene-a-wash stroke-scene-a' : 'fill-scene-b-wash stroke-scene-b'
            }
            width="196"
            height="32"
            rx="16"
            strokeWidth="2"
          />
          <Texto
            className={t.began ? 'fill-scene-a' : 'fill-scene-b-ink'}
            x="98"
            y="21"
            textAnchor="middle"
            tamanho={13}
            fontWeight="700"
          >
            {textoDoSelo(t)}
          </Texto>
        </g>
      ))}
    </>
  )
}

/**
 * Os mesmos selos em HTML, embaixo do desenho, no celular. ⚠️ Na mesma ordem (o mais recente embaixo) e
 * nas mesmas cores do par; `aria-hidden` porque a frase da situação já diz o que a última tentativa fez.
 */
function SelosEmTexto({ tries }: { tries: readonly Tentativa[] }) {
  return (
    <ul aria-hidden data-selos-das-tentativas="" className="flex flex-col gap-1.5 px-3 pb-3">
      {tries.map((t, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: os selos são os últimos lugares da fila
          key={i}
          className={`w-fit rounded-full border-2 px-3 py-0.5 text-sm font-bold ${
            t.began
              ? 'border-scene-a bg-scene-a-wash text-scene-a'
              : 'border-scene-b bg-scene-b-wash text-scene-b-ink'
          }`}
        >
          {textoDoSelo(t)}
        </li>
      ))}
    </ul>
  )
}

/* ── controls ───────────────────────────────────────────────────────────────────────────────── */

/**
 * `controls` — o convite com os dois jeitos de começar.
 *
 * ⭐⭐ O convite diz os DOIS caminhos (lote 5 do Raio-X), e a tela de início INTEIRA é a área de
 * toque: a instrução e a primeira pista falavam de dois caminhos, e o desenho dizia só "Toque para
 * começar", num botão que o Enter do teclado também acionava como se fosse toque.
 * ⚠️⚠️ Na área de toque, Enter é a TECLA do jogo (a partida começa se a peça permitir) e Espaço é o
 * "toque" de quem usa teclado; o clique do mouse ou do dedo é o toque. O botão "Apertar Enter"
 * (na BANCADA, com o "Voltar ao início") existe para quem não tem teclado. ⚠️ Os dois moravam
 * embaixo do palco e ficavam grudados na borda da moldura do player.
 * ⭐ Cada tentativa deixa um SELO no palco: âmbar quando nada aconteceu, azul quando começou.
 */
export function ControlsStage({
  state,
  cast,
  dispatch,
}: {
  state: SceneState
  cast?: SceneCast
  dispatch?: (action: SceneAction) => void
}) {
  const heroi = actorFigure(cast, 'hero')
  const mundo = sceneWorld(cast, 'controls')
  const piso = pisoDoMundo(mundo, CHAO)
  const inicio = state.match.screen === 'start'
  const tries = state.match.tries
  /** O teclado já tratou esta ativação (ver `JumpSoundStage`, B5 dos consertos da onda A). */
  const teclaTratada = useRef(false)
  return (
    <SceneCanvas
      className="relative"
      view={STAGE}
      cast={cast}
      mundo={mundo}
      titulo={inicio ? 'A tela de início, com o convite' : 'A tela da partida'}
      // ⭐⭐ No estreito os selos das tentativas moram AQUI, embaixo do desenho (conserto "letra no
      // celular"): eles são a comparação da cena ("tocou: nada aconteceu" × "Enter: começou"), e no
      // canto de um palco de 314px os três não cabiam com a letra de 12px. O resto do desenho fica.
      legenda={(palco) =>
        palco.estreito && tries.length > 0 ? <SelosEmTexto tries={tries} /> : null
      }
      descricao={
        inicio
          ? 'A tela de início diz: Toque na tela ou aperte Enter.'
          : 'A partida está acontecendo.'
      }
      overlay={
        inicio && dispatch ? (
          <button
            type="button"
            aria-label="Tocar na tela de início"
            // ⚠️ Só a área do DESENHO (a proporção dele), e não a moldura inteira: embaixo dela moram os
            // selos no celular, e tocar num selo não é tocar na tela do jogo.
            className="absolute inset-x-0 top-0 cursor-pointer rounded-2xl focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-primary"
            style={{ aspectRatio: `${STAGE.w} / ${STAGE.h}` }}
            onClick={(e) => {
              // O clique do dedo ou do mouse é o toque. O do teclado é tratado no `onKeyDown`.
              // ⚠️ Pelo ref, e não por `detail > 0` (consertos do review da onda A do lote 5, B5): o
              // leitor de tela que ativa pela ação padrão gera clique com `detail 0`.
              if (teclaTratada.current) {
                teclaTratada.current = false
                return
              }
              if (state.match.touch) focarNaBancadaDepoisDeComecar(e.currentTarget)
              dispatch({ type: 'start', input: 'tap' })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                teclaTratada.current = true
                setTimeout(() => {
                  teclaTratada.current = false
                }, 0)
                if (e.repeat) return
                const input = e.key === 'Enter' ? 'key' : 'tap'
                // ⚠️ Só o Enter começa sem a peça no toque: o foco vai para a bancada quando a tela SAI.
                if (input === 'key' || state.match.touch)
                  focarNaBancadaDepoisDeComecar(e.currentTarget)
                dispatch({ type: 'start', input })
              }
            }}
          />
        ) : undefined
      }
    >
      <Pista
        mundo={mundo}
        semEstrelas={[
          { x: 30, y: 46, w: 360, h: 104 },
          { x: 390, y: 46, w: 206, h: 130 },
        ]}
      />
      <Selo>{inicio ? 'INÍCIO' : 'JOGANDO'}</Selo>
      {inicio && (
        <g>
          <rect
            className="fill-scene-card stroke-scene-card-line"
            x="40"
            y="56"
            width="340"
            height="84"
            rx="18"
            strokeWidth="2"
          />
          <Texto
            className="fill-scene-ink"
            x="210"
            y="92"
            textAnchor="middle"
            tamanho={24}
            fontWeight="700"
          >
            Toque na tela
          </Texto>
          <Texto
            className="fill-scene-ink"
            x="210"
            y="122"
            textAnchor="middle"
            tamanho={19}
            fontWeight="600"
          >
            ou aperte Enter
          </Texto>
        </g>
      )}
      <g className="text-primary">
        <ActorFigure figure={heroi} x={inicio ? 150 : 220} y={piso} />
      </g>
      {/* Os selos das tentativas, o mais recente embaixo. */}
      <SelosNoDesenho tries={tries} />
    </SceneCanvas>
  )
}
