'use client'

import type {
  MeshLevel,
  SceneAction,
  SceneCast,
  SceneId,
  SceneState,
} from '@sistemazero/core/learning/scene'
import {
  castText,
  MESH_LEVELS,
  MESH_SKIN_LABELS,
  SCENE_LIMITS,
} from '@sistemazero/core/learning/scene'
import type { ReactNode } from 'react'
import { SceneButton } from './exploration-stage'
import { Chave, Escolha, Medida, type MetasDaBancada, metaAberta } from './scene-bench'

/**
 * A bancada do MOTOR e da PORTA DO 3D (lote 5 do Raio-X, 16/09/2026): `pool`, `entity-state`,
 * `delta-time`, `circle-collision`, `axis-z`, `camera-3d`, `mesh` e `pick-ray`. Saiu do
 * `scene-engine-controls` junto com o redesenho dos palcos (`scene-motor-stages`, `scene-3d-stages`).
 *
 * ⚠️ A régua desta casa vale aqui inteira: toque, teclado e leitor de tela levam ao MESMO lugar, e o
 * vocabulário é o da bancada (`Medida`, `Chave`, `Escolha`). ⚠️ Nenhum controle do 3D é de arrasto
 * livre: a câmera decide o que se vê, e isso pede voltas contáveis, não gesto contínuo.
 */

/**
 * A grade das TRÊS medidas: no máximo duas lado a lado, e a terceira embaixo.
 * ⚠️ Com três colunas, a coluna da cena (até 680px) deixava o deslizante de cada medida com uns 20px
 * entre os botões −/+ (conferido na banca do lote 5). ⚠️⚠️ Consulta de contêiner (`@container`) foi
 * tentada e REPROVADA: no Chromium a grade colapsava para largura zero no primeiro gesto que trocava um
 * rótulo, e a bancada sumia da tela e do leitor de tela.
 */
function TresMedidas({ children }: { children: ReactNode }) {
  return <div className="sz-scene-pecas">{children}</div>
}

/** As três alturas da câmera do 3D, em palavra. Espelha o `ALTURA` da faixa de estado. */
const ALTURA: Record<number, string> = { 0: 'por baixo', 1: 'no meio', 2: 'por cima' }

/**
 * ⚠️ No feminino, porque quem tem estado é a TORRE: a legenda "A 1ª está" forma frase com o botão
 * ("A 1ª está parada"). O id do motor não muda.
 */
const ESTADOS = [
  { id: 'parado', label: 'parada' },
  { id: 'mirar', label: 'mirando' },
  { id: 'atirar', label: 'atirando' },
  { id: 'recarregar', label: 'recarregando' },
] as const

/**
 * ⚠️⚠️ "A pele: inteira · transparente · sem pele" (consertos do review da onda B do lote 5): "Ver os
 * pontos: nada · metade · tudo" respondia a previsão ("do que um modelo 3D é feito?"). Os ids da ação
 * não mudam; as palavras são as do core (`MESH_SKIN_LABELS`), as mesmas da faixa.
 */
const NIVEIS_DA_PELE: readonly { id: MeshLevel; label: string }[] = MESH_LEVELS.map((id) => ({
  id,
  label: MESH_SKIN_LABELS[id],
}))

// ⚠️⚠️ Os deslizantes daqui decidem metas pelo LUGAR: na `camera-3d` arrastar a volta de 2 a 6 passava por
// "de frente" e derrubava `one-face` (o `revealOn` da previsão); na `pick-ray` arrastar o x passava por
// "onde uma cobre a outra". Quem segura isso é a própria `Medida` (o valor vai ao motor quando o gesto
// termina), e não uma constante daqui: ver `scene-bench.tsx`.

/** Os atalhos da mira, nas coordenadas das caixas do motor (`PICK_BOXES`). */
const MIRAS = {
  sozinha: { x: 100, y: 125 },
  cobre: { x: 330, y: 155 },
  vazio: { x: 440, y: 40 },
} as const

export function MotorSceneControls({
  scene,
  state,
  dispatch,
  cast,
  goals = [],
}: {
  scene: SceneId
  state: SceneState
  dispatch: (action: SceneAction) => void
  cast?: SceneCast
  /** As metas da atividade: quem abre os controles fechados é `metaAberta` (ver `scene-bench`). */
  goals?: MetasDaBancada
}) {
  const L = SCENE_LIMITS
  const aberta = metaAberta(goals, state)
  // ⚠️ TODO rótulo passa pelo elenco, inclusive os que hoje não têm personagem.
  const nome = (texto: string) => castText(texto, cast)
  switch (scene) {
    case 'pool':
      return (
        <Chave
          // ⚠️ O nome do GESTO (lote 5 do Raio-X): "O fio da reciclagem" não tinha fio nenhum.
          label={nome('Reciclar quem saiu')}
          ligado={state.nursery.recycling}
          ligadoTexto="ligado"
          desligadoTexto="desligado"
          // ⚠️⚠️ FECHADA até 3 cactos passarem (consertos do review da onda B do lote 5), como a cópia
          // da `enemy-type`: ligada antes de tudo, o nº 1 passava de novo e de novo com "fabricados: 1",
          // que é o palpite ingênuo ("Só 1, o que está na tela") confirmado pela tela. ⚠️ Nunca fechada
          // LIGADA: um caso que abre reciclando precisa conseguir desligar.
          disabled={!aberta('grows') && !state.nursery.recycling}
          nota={
            !aberta('grows') && !state.nursery.recycling
              ? nome('Abre depois que 3 cactos passarem.')
              : undefined
          }
          onToggle={(enabled) => dispatch({ type: 'connect', port: 'recycle', enabled })}
        />
      )
    case 'entity-state':
      return (
        <div className="space-y-3">
          {/* ⭐⭐ A crença errada, testável (lote 5): com o estado "no jogo", mudar uma torre muda as três. */}
          <Chave
            label={nome('O estado mora')}
            ligado={state.brains.shared}
            ligadoTexto="no jogo"
            desligadoTexto="em cada torre"
            seletor
            onToggle={(shared) => dispatch({ type: 'brain-scope', shared })}
          />
          <div className="sz-scene-pecas sz-scene-pecas--tres">
            {state.brains.states.map((atual, i) => (
              <Escolha
                // biome-ignore lint/suspicious/noArrayIndexKey: são três torres fixas, 1ª à 3ª.
                key={`torre-${i + 1}`}
                label={`A ${i + 1}ª está`}
                valor={atual}
                opcoes={ESTADOS}
                onChange={(estado) => dispatch({ type: 'brain', id: i + 1, state: estado })}
              />
            ))}
          </div>
        </div>
      )
    case 'delta-time':
      return (
        <Chave
          label={nome('O Dino anda')}
          ligado={state.machines.mode === 'seconds'}
          ligadoTexto="a cada segundo"
          desligadoTexto="a cada quadro"
          seletor
          // ⚠️ Dito ANTES do gesto (lote 5): trocar volta os dois para a largada, e sem aviso parecia
          // que os dois tinham "chegado juntos" de repente.
          nota="Trocar recomeça a corrida."
          onToggle={(segundos) =>
            dispatch({ type: 'count', kind: segundos ? 'seconds' : 'frames' })
          }
        />
      )
    case 'circle-collision':
      return (
        <TresMedidas>
          {/* ⚠️⚠️ A distância é CONTROLE, não só consequência do relógio: ele só aproxima, e sem um
              jeito de afastar a meta da conta ficava impossível depois de ~6 segundos de ▶. */}
          <Medida
            label={nome('distância entre os centros')}
            value={Math.round(state.circles.distance)}
            min={L.centers.min}
            max={L.centers.max}
            passo={10}
            tom="text-muted-foreground"
            onChange={(distance) => dispatch({ type: 'approach', distance })}
          />
          {/* ⚠️ O passo do raio é 10 (consertos do review da onda B do lote 5): com 5, diminuir um raio
              abria um vão de só 8px entre a ponta da fila e o outro centro. */}
          <Medida
            label={nome('raio do azul')}
            value={state.circles.a}
            min={L.radius.min}
            max={L.radius.max}
            passo={10}
            onChange={(value) => dispatch({ type: 'radius', which: 'a', value })}
          />
          <Medida
            label={nome('raio do laranja')}
            value={state.circles.b}
            min={L.radius.min}
            max={L.radius.max}
            passo={10}
            tom="text-scene-b-ink"
            onChange={(value) => dispatch({ type: 'radius', which: 'b', value })}
          />
        </TresMedidas>
      )
    case 'axis-z': {
      // ⚠️ Um eixo por vez: a cena só registra a descoberta quando UM número muda, e é por isso que
      // cada deslizante manda os outros dois como estão.
      const lugar = (eixo: 'x' | 'y' | 'z', valor: number): SceneAction => ({
        type: 'place3d',
        x: eixo === 'x' ? valor : state.space.x,
        y: eixo === 'y' ? valor : state.space.y,
        z: eixo === 'z' ? valor : state.space.z,
      })
      /**
       * ⚠️⚠️ O SENTIDO do eixo só aparece no rótulo DEPOIS de a criança ver (lote 2 do Raio-X): "y (para
       * cima)" à vista durante a previsão era a resposta dela. ⚠️ "z (negativo é o fundo)" (consertos do
       * review da onda B do lote 5): o sentido do z saiu de DENTRO do desenho, onde o rótulo cobria o cubo
       * e a sombra, e mora aqui e na faixa. ⚠️ Cada número na cor do SEU eixo, as do Estúdio (x vermelho,
       * y verde, z azul): o y era cinza.
       */
      const viu = aberta
      return (
        <TresMedidas>
          <Medida
            label={nome('x')}
            value={state.space.x}
            min={L.spaceX.min}
            max={L.spaceX.max}
            passo={20}
            tom="text-scene-alert"
            onChange={(v) => dispatch(lugar('x', v))}
          />
          <Medida
            label={nome(viu('up') ? 'y (altura)' : 'y')}
            value={state.space.y}
            min={L.spaceY.min}
            max={L.spaceY.max}
            passo={20}
            tom="text-scene-leaf"
            onChange={(v) => dispatch(lugar('y', v))}
          />
          <Medida
            label={nome(viu('depth') ? 'z (negativo é o fundo)' : 'z')}
            value={state.space.z}
            min={L.spaceZ.min}
            max={L.spaceZ.max}
            passo={20}
            tom="text-scene-a"
            onChange={(v) => dispatch(lugar('z', v))}
          />
        </TresMedidas>
      )
    }
    case 'camera-3d':
      return (
        <div className="space-y-3">
          <div className="sz-scene-pecas">
            <Medida
              label={nome('volta da câmera')}
              value={state.orbit.yaw}
              min={L.yaw.min}
              max={L.yaw.max}
              // ⚠️ De 1 a 8 (lote 5): "volta 0" não é uma volta para a criança, e o mapa conta assim.
              // ⚠️ Função do valor: o texto acompanha o dedo antes de o motor receber.
              texto={(v) => `${v + 1} de 8`}
              onChange={(yaw) => dispatch({ type: 'orbit', yaw, pitch: state.orbit.pitch })}
            />
            <Medida
              label={nome('altura da câmera')}
              value={state.orbit.pitch}
              min={L.pitch.min}
              max={L.pitch.max}
              // ⚠️ Sem isto o leitor de tela anuncia "altura da câmera, 2".
              texto={(v) => ALTURA[v] ?? 'no meio'}
              tom="text-scene-b-ink"
              onChange={(pitch) => dispatch({ type: 'orbit', yaw: state.orbit.yaw, pitch })}
            />
          </div>
          {/* ⚠️ "onde a câmera começou", e não "a vista de sempre" (consertos do review da onda B do
              lote 5): a criança não conhece o canto do começo como "de sempre". */}
          <SceneButton onClick={() => dispatch({ type: 'recenter' })}>
            Voltar para onde a câmera começou
          </SceneButton>
        </div>
      )
    case 'mesh':
      return (
        <div className="sz-scene-pecas">
          {/* ⭐ Três degraus (lote 5): no do meio a pele fica transparente, com os pontos logo embaixo. */}
          <Escolha
            label={nome('A pele')}
            valor={state.model.see}
            opcoes={NIVEIS_DA_PELE}
            onChange={(level) => dispatch({ type: 'see-points', level })}
          />
          <Medida
            label={nome('girar o modelo')}
            value={state.model.yaw}
            min={L.yaw.min}
            max={L.yaw.max}
            texto={`${state.model.yaw + 1} de 8`}
            onChange={(yaw) => dispatch({ type: 'orbit', yaw, pitch: 1 })}
          />
        </div>
      )
    case 'pick-ray':
      return (
        <div className="space-y-3">
          <div className="sz-scene-pecas">
            <Medida
              label={nome('a mira, para os lados')}
              value={state.ray.x}
              min={L.pointX.min}
              max={L.pointX.max}
              passo={20}
              onChange={(x) => dispatch({ type: 'point', x, y: state.ray.y })}
            />
            <Medida
              label={nome('a mira, para cima e para baixo')}
              value={state.ray.y}
              min={L.pointY.min}
              max={L.pointY.max}
              passo={20}
              tom="text-scene-b-ink"
              onChange={(y) => dispatch({ type: 'point', x: state.ray.x, y })}
            />
          </div>
          {/* ⚠️ Os atalhos existem para quem não vai achar o alinhamento no deslizante: caçá-lo no
              tato deixaria de fora justamente quem depende do teclado. */}
          <div className="flex flex-wrap gap-2">
            <SceneButton onClick={() => dispatch({ type: 'point', ...MIRAS.cobre })}>
              Mirar onde uma cobre a outra
            </SceneButton>
            <SceneButton onClick={() => dispatch({ type: 'point', ...MIRAS.sozinha })}>
              Mirar na caixa sozinha
            </SceneButton>
            <SceneButton onClick={() => dispatch({ type: 'point', ...MIRAS.vazio })}>
              Mirar no vazio
            </SceneButton>
          </div>
        </div>
      )
    default:
      return null
  }
}
