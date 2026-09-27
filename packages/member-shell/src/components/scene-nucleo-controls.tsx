'use client'

import type { SceneAction, SceneCast, SceneId, SceneState } from '@sistemazero/core/learning/scene'
import {
  AIM_TARGET_MARGIN,
  CAMERA_WALK_MAX,
  CAMERA_WALK_STEP,
  COOLDOWN_REFUSED_SECONDS,
  castText,
  rechargeFrames,
  rechargeWords,
  SCENE_LIMITS,
} from '@sistemazero/core/learning/scene'
import { type KeyboardEvent, type PointerEvent, useEffect, useId, useRef, useState } from 'react'
import { SceneButton } from './exploration-stage'
import { Chave, Medida, type MetasDaBancada, metaAberta } from './scene-bench'

/**
 * A bancada do NÚCLEO do Iniciante 2D, redesenhada no lote 5 do Raio-X (G5, 16/09/2026): `hold-vs-press`,
 * `group-loop`, `enemy-type`, `camera`, `contact`, `cooldown`, `aim` e `diagonal`. A `tilemap` não tem
 * bancada: as letras do texto SÃO os controles, com a paleta ao lado delas (`scene-nucleo-stages`).
 *
 * ⚠️ A régua desta casa vale aqui inteira: toque, teclado e leitor de tela levam ao MESMO lugar.
 *
 * ⚠️⚠️ O gesto que só se VÊ com o tempo passando solta o ▶ (`onRunning`): segurar a tecla, ligar o laço,
 * fazer nascer um cacto, mexer na distância, atirar. Com o relógio parado esses gestos mudavam um
 * número na faixa e nada andava no palco.
 *
 * ⚠️⚠️ Cada cena é um componente próprio: a tecla e o "Andar" guardam o gesto em `useRef`, e hook
 * dentro de um `switch` muda de ordem quando a cena muda.
 */
export function NucleoSceneControls({
  scene,
  state,
  dispatch,
  cast,
  goals = [],
  onRunning,
}: {
  scene: SceneId
  state: SceneState
  dispatch: (action: SceneAction) => void
  cast?: SceneCast
  /** As metas da atividade: quem abre os controles fechados é `metaAberta` (ver `scene-bench`). */
  goals?: MetasDaBancada
  /** O relógio é do PLAYER: o gesto que só se vê com o tempo passando liga o dele. */
  onRunning: (ligado: boolean) => void
}) {
  const props = { state, dispatch, cast, onRunning, aberta: metaAberta(goals, state) }
  switch (scene) {
    case 'hold-vs-press':
      return <BancadaDaTecla {...props} />
    case 'group-loop':
      return <BancadaDoLaco {...props} />
    case 'enemy-type':
      return <BancadaDaFicha {...props} />
    case 'camera':
      return <BancadaDaCamera {...props} />
    case 'contact':
      return <BancadaDoEncosto {...props} />
    case 'cooldown':
      return <BancadaDaRecarga {...props} />
    case 'aim':
      return <BancadaDaMira {...props} />
    case 'diagonal':
      return <BancadaDaDiagonal {...props} />
    default:
      return null
  }
}

interface Bancada {
  state: SceneState
  dispatch: (action: SceneAction) => void
  cast?: SceneCast
  onRunning: (ligado: boolean) => void
  /** A meta que abre um controle já aconteceu? (`metaAberta`) */
  aberta: (meta: string) => boolean
}

/**
 * Segura o ponteiro no botão: o `pointerup` chega aqui mesmo com o dedo escorregando para fora.
 * ⚠️ Em try: um ponteiro que o navegador já não conhece lança, e o gesto não pode morrer por isso.
 */
function capturar(e: PointerEvent<HTMLButtonElement>) {
  try {
    e.currentTarget.setPointerCapture?.(e.pointerId)
  } catch {
    // Sem captura, o `pointerup` e o `pointercancel` continuam soltando.
  }
}

/** As teclas que "apertam" um botão pelo teclado. */
const ehTeclaDeApertar = (e: KeyboardEvent) => e.key === ' ' || e.key === 'Enter'

/**
 * O botão que se SEGURA com o dedo (a tecla e o "Andar"). ⚠️⚠️ Consertos do review da onda B do lote 5:
 * sem `touch-action: none` o dedo que escorregava uns 30 px virava rolagem da página, o navegador mandava
 * `pointercancel` e a tecla voltava a "solta" com o dedo ainda apertado; sem `user-select` e o
 * `touch-callout`, o toque longo do iOS e do Android abre a seleção ou o menu no meio do "conte até três".
 * O `pointercancel` continua soltando: é o certo quando o navegador tira o dedo por outro motivo.
 */
const SEGURAVEL = 'touch-none select-none [-webkit-touch-callout:none]'
const semMenuDoToqueLongo = (e: { preventDefault: () => void }) => e.preventDefault()

/**
 * UMA tecla, que as duas raquetes escutam (lote 5 do Raio-X). Antes eram dois botões ("Apertar uma
 * vez" e "Segurar a tecla"), e a cena ensinava que são duas teclas diferentes: no jogo é a MESMA tecla,
 * e o que muda é a pergunta que cada raquete faz a ela.
 *
 * ⚠️⚠️ Segurar é um gesto de verdade para os três caminhos:
 * - o dedo e o mouse seguram no `pointerdown` e soltam no `pointerup` (ou quando o dedo sai do botão);
 * - o teclado segura no `keydown` de Espaço ou Enter e solta no `keyup` (a repetição automática da tecla
 *   é ignorada, senão cada repetição seria um aperto novo);
 * - o leitor de tela, que ativa o botão sem tecla nem ponteiro (`click` com `detail === 0` e sem
 *   `keydown` antes), ALTERNA: o rótulo diz o estado.
 * O `click` de um toque de mouse (`detail > 0`) e o `click` que o navegador gera depois do Espaço são
 * ignorados: foram o `pointerdown`/`keydown` que já seguraram. Sem isto um clique simples terminava com
 * a tecla presa, o contrário do que tinha acontecido.
 *
 * ⚠️⚠️ Pelo leitor de tela, segurar NÃO solta o ▶ (consertos do review da onda B do lote 5, MÉDIO-2).
 * Quem usa leitor não reativa um botão em menos de meio segundo, e com o tempo correndo a de baixo já
 * tinha andado dois passos: "toque rápido" (`one-step`) ficava fora do alcance dele (0 de 50 com
 * ativações a 0,5 s). Parado, a segunda ativação é o toque rápido; a segurada longa é o ▶ do player e
 * depois a segunda ativação. Pelo mesmo motivo, perder o foco só solta a tecla segurada pelo DEDO ou pelo
 * TECLADO: o NVDA leva o foco junto quando anda, e a segurada do leitor morria no caminho.
 */
function BancadaDaTecla({ state, dispatch, onRunning }: Bancada) {
  const segurando = useRef(false)
  const pelaTecla = useRef(false)
  const pelaLeitura = useRef(false)
  const avisoId = useId()
  const [aviso, setAviso] = useState('')
  const holding = state.input.holding
  // O estado manda: um "Recomeçar" solta a tecla sem passar por aqui.
  useEffect(() => {
    segurando.current = holding
    if (!holding) {
      pelaLeitura.current = false
      setAviso('')
    }
  }, [holding])
  const segurar = (soltaOTempo: boolean) => {
    if (segurando.current) return
    segurando.current = true
    dispatch({ type: 'hold', on: true })
    if (soltaOTempo) onRunning(true)
  }
  const soltar = () => {
    if (!segurando.current) return
    segurando.current = false
    pelaLeitura.current = false
    setAviso('')
    dispatch({ type: 'hold', on: false })
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SceneButton
        tom={holding ? 'ligado' : 'gesto'}
        aria-pressed={holding}
        aria-describedby={avisoId}
        // ⚠️ `min-w` do rótulo mais largo: "segurada" é maior que "solta", e o botão crescia no aperto.
        className={`min-h-14 min-w-56 px-8 text-base ${SEGURAVEL}`}
        onContextMenu={semMenuDoToqueLongo}
        onPointerDown={(e) => {
          capturar(e)
          segurar(true)
        }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onLostPointerCapture={soltar}
        onKeyDown={(e) => {
          if (!ehTeclaDeApertar(e)) return
          e.preventDefault()
          pelaTecla.current = true
          if (!e.repeat) segurar(true)
        }}
        onKeyUp={(e) => {
          if (!ehTeclaDeApertar(e)) return
          e.preventDefault()
          soltar()
          // O `click` que o navegador gera com a tecla chega na MESMA tarefa; depois dela, um `click`
          // sem tecla volta a ser o do leitor de tela.
          setTimeout(() => {
            pelaTecla.current = false
          }, 0)
        }}
        onBlur={() => {
          if (!pelaLeitura.current) soltar()
        }}
        onClick={(e) => {
          if (e.detail !== 0) return
          if (pelaTecla.current) {
            pelaTecla.current = false
            return
          }
          if (segurando.current) {
            soltar()
            return
          }
          pelaLeitura.current = true
          segurar(false)
          setAviso('Tecla segurada. Ative de novo para soltar, ou solte o tempo e conte até três.')
        }}
      >
        A tecla: {holding ? 'segurada' : 'solta'}
      </SceneButton>
      <p className="text-sm text-muted-foreground">
        Toque rápido, ou segure. Com o teclado, segure Espaço.
      </p>
      {/* ⚠️ Sempre montada: região viva que nasce junto com o texto não é anunciada. */}
      <p id={avisoId} className="sr-only" aria-live="polite">
        {aviso}
      </p>
    </div>
  )
}

/**
 * Medir cada cacto, escolher um, e o laço (lote 5 do Raio-X). ⚠️ "Olhar" virou "Medir": o palco traça
 * a régua da torre até aquele cacto, e o número só aparece depois dela.
 */
function BancadaDoLaco({ state, dispatch, cast, onRunning, aberta }: Bancada) {
  const nome = (texto: string) => castText(texto, cast)
  const { distances, looked, chosen, auto, measured } = state.hunt
  const descobriu = aberta('nearest')
  const base = useId()
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {distances.map((_, i) => {
          const alvo = i + 1
          const medida = measured[i] ?? 0
          return (
            <div key={alvo} className="flex items-center gap-1">
              <SceneButton
                tom={looked.includes(alvo) ? 'ligado' : 'ferramenta'}
                // ⚠️ O leitor ouve se já mediu, e quanto (consertos do review da onda B do lote 5): a
                // diferença entre medido e não medido era só a cor do botão.
                aria-describedby={`${base}-medida-${alvo}`}
                onClick={() => dispatch({ type: 'look', id: alvo })}
              >
                {/* ⚠️ O nome não muda depois de medir: medir de novo mede o número de AGORA. */}
                Medir o {alvo}º
              </SceneButton>
              <span id={`${base}-medida-${alvo}`} className="sr-only">
                {medida > 0 ? `medido: ${medida}` : 'ainda sem medida'}
              </span>
              {/* ⚠️ Sem a distância no botão (lote 2 do Raio-X): o número dava o mais perto sem medir. */}
              {/* ⚠️⚠️ Fechado com o laço ligado (consertos do review da onda B do lote 5, MÉDIO-1): quem
                  escolhe é o laço, e a escolha à mão durava um quadro. */}
              <SceneButton
                aria-current={chosen === alvo ? 'true' : undefined}
                tom={chosen === alvo ? 'ligado' : 'ferramenta'}
                fechado={auto}
                aria-describedby={auto ? `${base}-laco` : undefined}
                onClick={() => dispatch({ type: 'choose', id: alvo })}
              >
                Escolher o {alvo}º
              </SceneButton>
            </div>
          )
        })}
      </div>
      {auto && (
        <p id={`${base}-laco`} className="text-sm text-muted-foreground">
          O laço está escolhendo sozinho.
        </p>
      )}
      <Chave
        label={nome('O laço')}
        ligado={auto}
        ligadoTexto="ligado"
        desligadoTexto="desligado"
        // ⚠️ Fechado até ela escolher o mais perto MEDINDO, que é a ordem da instrução. ⚠️⚠️ O motivo
        // não diz "medir todos": com a bancada à vista durante o palpite, era a resposta da pergunta.
        disabled={!descobriu && !auto}
        nota={
          !descobriu && !auto ? nome('Abre depois que você achar o cacto mais perto.') : undefined
        }
        onToggle={(enabled) => {
          dispatch({ type: 'connect', port: 'loop', enabled })
          // O laço só troca a escolha com os cactos andando.
          if (enabled) onRunning(true)
        }}
      />
    </div>
  )
}

/** A ficha, o nascimento e a chave da cópia (lote 5 do Raio-X). */
function BancadaDaFicha({ state, dispatch, cast, onRunning, aberta }: Bancada) {
  const nome = (texto: string) => castText(texto, cast)
  const L = SCENE_LIMITS
  const { speed, life, copy } = state.blueprint
  const descobriu = aberta('all-change')
  return (
    <div className="space-y-3">
      <div className="sz-scene-pecas">
        <Medida
          label={nome('velocidade na ficha')}
          value={speed}
          min={L.typeSpeed.min}
          max={L.typeSpeed.max}
          onChange={(value) => dispatch({ type: 'define', field: 'speed', value })}
        />
        <Medida
          label={nome('vida na ficha')}
          value={life}
          min={L.typeLife.min}
          max={L.typeLife.max}
          tom="text-scene-b-ink"
          onChange={(value) => dispatch({ type: 'define', field: 'life', value })}
        />
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <SceneButton
          tom="gesto"
          onClick={() => {
            dispatch({ type: 'spawnOne' })
            onRunning(true)
          }}
        >
          Fazer nascer mais um
        </SceneButton>
        {/* ⚠️⚠️ As duas regras do jogo, com a palavra do Corre Dino: o cacto que LÊ a ficha muda junto; o
            que COPIA ao nascer conserva o que recebeu (a `acceleration`). Fechada até a criança ver a
            primeira regra: comparar pede ter visto as duas. */}
        <Chave
          label={nome('Copiar a ficha ao nascer')}
          ligado={copy}
          ligadoTexto="ligado"
          desligadoTexto="desligado"
          disabled={!descobriu && !copy}
          nota={
            !descobriu && !copy
              ? nome('Abre depois que você mudar a ficha com os cactos andando.')
              : undefined
          }
          onToggle={(enabled) => dispatch({ type: 'connect', port: 'copy', enabled })}
        />
      </div>
    </div>
  )
}

/**
 * Andar no mundo e a chave da câmera (lote 5 do Raio-X). ⚠️ "Andar" no lugar do deslizante: com o
 * deslizante o Dino se TELETRANSPORTAVA, e a janela da câmera pulava junto sem nenhum marco passar pela
 * tela. Segurar o botão continua andando; o teclado anda um passo por aperto.
 */
function BancadaDaCamera({ state, dispatch, cast }: Bancada) {
  const nome = (texto: string) => castText(texto, cast)
  const L = SCENE_LIMITS
  const x = useRef(state.view.heroX)
  x.current = state.view.heroX
  const repetir = useRef<ReturnType<typeof setInterval> | null>(null)
  const parar = () => {
    if (repetir.current) clearInterval(repetir.current)
    repetir.current = null
  }
  // Sair da cena no meio de uma segurada não deixa o Dino andando sozinho.
  useEffect(
    () => () => {
      if (repetir.current) clearInterval(repetir.current)
    },
    [],
  )
  const passo = (sentido: -1 | 1) => {
    // ⚠️ Até `CAMERA_WALK_MAX`, um passo antes do fim do mundo (consertos do review da onda B do lote 5):
    // em 1200 o Dino ficava cortado pela metade na borda da tela.
    const alvo = Math.max(
      L.worldX.min,
      Math.min(CAMERA_WALK_MAX, x.current + sentido * CAMERA_WALK_STEP),
    )
    if (alvo === x.current) return
    x.current = alvo
    dispatch({ type: 'walk', x: alvo })
  }
  const andar = (sentido: -1 | 1, rotulo: string, texto: string) => (
    <SceneButton
      tom="gesto"
      aria-label={nome(rotulo)}
      className={SEGURAVEL}
      onContextMenu={semMenuDoToqueLongo}
      onPointerDown={(e) => {
        capturar(e)
        passo(sentido)
        parar()
        repetir.current = setInterval(() => passo(sentido), 160)
      }}
      onPointerUp={parar}
      onPointerCancel={parar}
      onLostPointerCapture={parar}
      onClick={(e) => {
        // O toque já andou no `pointerdown`; o teclado e o leitor de tela andam aqui.
        if (e.detail === 0) passo(sentido)
      }}
    >
      {texto}
    </SceneButton>
  )
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {andar(-1, 'Andar com o Dino para a esquerda', '← Andar')}
        {andar(1, 'Andar com o Dino para a direita', 'Andar →')}
      </div>
      {/* ⚠️ Aberta desde o começo: "a câmera trouxe o Dino de volta" só cai depois de ele SUMIR com a
          câmera parada, então ligar cedo não pula descoberta nenhuma. */}
      <Chave
        label={nome('A câmera segue o Dino')}
        ligado={state.view.follow}
        // ⚠️ "ligada/desligada", como as outras chaves (full review de experiência, B9): "sim/não" era o
        // único liga e desliga com outras palavras.
        ligadoTexto="ligada"
        desligadoTexto="desligada"
        onToggle={(enabled) => dispatch({ type: 'connect', port: 'camera', enabled })}
      />
    </div>
  )
}

/**
 * A distância do cacto, que as DUAS pistas usam ao mesmo tempo (lote 5 do Raio-X). ⚠️ A escolha "a
 * pergunta que o jogo faz" saiu: com uma pergunta por vez, a criança nunca via as duas regras lado a
 * lado, e trocar a pergunta no meio zerava o encosto.
 */
function BancadaDoEncosto({ state, dispatch, cast, onRunning }: Bancada) {
  const nome = (texto: string) => castText(texto, cast)
  const L = SCENE_LIMITS
  const mover = (distance: number) => {
    dispatch({ type: 'approach', distance })
    // Os corações só caem com o tempo passando: é o quadro que pergunta.
    onRunning(true)
  }
  return (
    <div className="space-y-3">
      <Medida
        label={nome('distância do cacto')}
        value={state.hit.distance}
        min={L.approach.min}
        max={L.approach.max}
        step={5}
        passo={20}
        onChange={mover}
      />
      <div className="flex flex-wrap gap-3">
        <SceneButton tom="gesto" onClick={() => mover(0)}>
          {nome('Encostar o cacto no Dino')}
        </SceneButton>
        <SceneButton onClick={() => mover(100)}>{nome('Afastar o cacto')}</SceneButton>
      </div>
    </div>
  )
}

/** A recarga e o "Atirar" (lote 5 do Raio-X). */
function BancadaDaRecarga({ state, dispatch, cast, onRunning }: Bancada) {
  const nome = (texto: string) => castText(texto, cast)
  const L = SCENE_LIMITS
  // ⚠️ Em palavras e em QUADROS: o bloco do Estúdio é "fazer no máximo uma vez a cada … quadros".
  const texto = (s: number) =>
    s > 0 ? `${rechargeWords(s)} (${rechargeFrames(s)} quadros)` : rechargeWords(s)
  const { refusedAt, time } = state.weapon
  // ⚠️⚠️ O aperto recusado aparece AO LADO do botão (consertos do review da onda B do lote 5): no palco
  // ele nascia na boca da arma, ~560 px acima do botão que a criança olhava, e sumia antes de ela olhar.
  // Sem animação (vale também com menos movimento), e `aria-hidden`: a frase do motor já é anunciada.
  const recusou = refusedAt >= 0 && time - refusedAt < COOLDOWN_REFUSED_SECONDS
  return (
    <div className="space-y-3">
      <Medida
        label={nome('recarga entre dois tiros')}
        value={state.weapon.seconds}
        min={L.recharge.min}
        max={L.recharge.max}
        step={0.5}
        texto={texto}
        onChange={(seconds) => dispatch({ type: 'recharge', seconds })}
      />
      <div className="flex flex-wrap items-center gap-3">
        <SceneButton
          tom="gesto"
          className="min-h-14 px-8 text-base"
          onClick={() => {
            dispatch({ type: 'shoot' })
            onRunning(true)
          }}
        >
          Atirar
        </SceneButton>
        {recusou && (
          <p
            data-nao-saiu-na-bancada
            aria-hidden="true"
            className="text-sm font-bold text-scene-b-ink"
          >
            ✕ Não saiu: recarregando
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * O alvo, a mira e o "Atirar" (lote 5 do Raio-X). ⚠️ O alvo também se arrasta no palco; os deslizantes
 * são o caminho do teclado. A chave e o botão têm os nomes do bloco do Estúdio ("Apontar o sprite para").
 */
function BancadaDaMira({ state, dispatch, cast, onRunning }: Bancada) {
  const nome = (texto: string) => castText(texto, cast)
  const L = SCENE_LIMITS
  const { targetX, targetY, chasing } = state.sight
  return (
    <div className="space-y-3">
      <div className="sz-scene-pecas">
        {/* ⚠️ Com folga da borda (`AIM_TARGET_MARGIN`, consertos do review da onda B do lote 5): em y 0 o
            alvo ficava metade fora da tela do jogo. */}
        <Medida
          label={nome('alvo, x')}
          value={targetX}
          min={L.aimX.min + AIM_TARGET_MARGIN}
          max={L.aimX.max - AIM_TARGET_MARGIN}
          step={10}
          passo={40}
          onChange={(x) => dispatch({ type: 'target', x, y: targetY })}
        />
        <Medida
          label={nome('alvo, y')}
          value={targetY}
          min={L.aimY.min + AIM_TARGET_MARGIN}
          max={L.aimY.max - AIM_TARGET_MARGIN}
          step={10}
          passo={40}
          tom="text-scene-b-ink"
          onChange={(y) => dispatch({ type: 'target', x: targetX, y })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {/* ⚠️ Aberta desde o começo: o tiro reto e o tiro pela seta são as duas metades da comparação,
            e nenhuma cai por ligar a mira antes. */}
        <Chave
          label={nome('A mira')}
          ligado={chasing}
          ligadoTexto="ligada"
          desligadoTexto="desligada"
          onToggle={(enabled) => dispatch({ type: 'connect', port: 'aim', enabled })}
        />
        <SceneButton
          tom="gesto"
          className="min-h-14 px-8 text-base"
          onClick={() => {
            dispatch({ type: 'shoot' })
            onRunning(true)
          }}
        >
          Atirar
        </SceneButton>
      </div>
    </div>
  )
}

/**
 * As setas, "Andar 1 segundo" e a correção (lote 5 do Raio-X). ⚠️ O relógio saiu da cena: cada andada é
 * UM segundo a partir do começo, e o palco guarda o lugar de cada tipo para comparar.
 */
function BancadaDaDiagonal({ state, dispatch, cast, aberta }: Bancada) {
  const nome = (texto: string) => castText(texto, cast)
  const { dx, dy, even } = state.walkPad
  const descobriu = aberta('faster')
  const seta = (x: -1 | 0 | 1, y: -1 | 0 | 1, rotulo: string, desenho: string) => {
    const apertada = (x !== 0 && dx === x) || (y !== 0 && dy === y)
    return (
      <SceneButton
        aria-label={rotulo}
        aria-pressed={apertada}
        tom={apertada ? 'ligado' : 'ferramenta'}
        className="min-w-11 text-lg"
        onClick={() =>
          dispatch({
            type: 'direction',
            x: x !== 0 ? (apertada ? 0 : x) : dx,
            y: y !== 0 ? (apertada ? 0 : y) : dy,
          })
        }
      >
        {desenho}
      </SceneButton>
    )
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <fieldset>
          <legend className="text-sm font-semibold">As setas apertadas</legend>
          <div className="mt-2 grid w-40 grid-cols-3 gap-1">
            <span />
            {seta(0, -1, 'Seta para cima', '↑')}
            <span />
            {seta(-1, 0, 'Seta para a esquerda', '←')}
            <SceneButton
              aria-label="Soltar as setas"
              className="min-w-11"
              onClick={() => dispatch({ type: 'direction', x: 0, y: 0 })}
            >
              ✕
            </SceneButton>
            {seta(1, 0, 'Seta para a direita', '→')}
            <span />
            {seta(0, 1, 'Seta para baixo', '↓')}
            <span />
          </div>
        </fieldset>
        <SceneButton tom="gesto" onClick={() => dispatch({ type: 'stride' })}>
          Andar 1 segundo
        </SceneButton>
      </div>
      <Chave
        label={nome('A correção da diagonal')}
        ligado={even}
        ligadoTexto="ligada"
        desligadoTexto="desligada"
        // ⚠️ Fechada até a diagonal SEM correção ter passado do círculo: corrigir o que ela ainda não viu
        // dar errado faria "com a correção, parou no círculo" cair sem comparação nenhuma.
        disabled={!descobriu && !even}
        nota={
          !descobriu && !even
            ? 'Abre depois que você andar reto e depois com duas setas juntas.'
            : undefined
        }
        onToggle={(enabled) => dispatch({ type: 'connect', port: 'even', enabled })}
      />
    </div>
  )
}
