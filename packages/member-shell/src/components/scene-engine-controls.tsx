'use client'

import type { SceneAction, SceneCast, SceneId, SceneState } from '@sistemazero/core/learning/scene'
import { castText, SCENE_LIMITS } from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { Medida } from './scene-core-controls'

/**
 * A bancada das dez cenas do motor, do 3D e do ateliê (15/09/2026).
 *
 * ⚠️ A régua desta casa vale aqui inteira: toque, teclado e leitor de tela levam ao MESMO lugar.
 * Todo deslizante tem rótulo com o valor à vista, e todo botão diz o que faz — quem não arrasta
 * chega à mesma descoberta. O molde do deslizante vem do `scene-core-controls` de propósito:
 * duas cópias dele é como essa régua se perde em silêncio num dos arquivos.
 *
 * ⚠️ Nenhum controle daqui é de ARRASTO livre, inclusive os do 3D. Girar a câmera com o dedo
 * seria mais bonito e deixaria de fora quem usa teclado — e o que estas cenas ensinam (a câmera
 * decide o que se vê) não precisa de gesto contínuo: precisa de voltas contáveis.
 */

/**
 * Um interruptor com o ESTADO no rótulo — nunca a ação que o clique vai fazer.
 *
 * ⚠️⚠️ O rótulo que dizia "Desligar a reciclagem" com o botão pintado de primário (o visual de
 * "ativo" desta casa) e `aria-pressed="true"` fazia as três camadas contarem histórias
 * diferentes: o desenho dizia ligado, o texto dizia desligar, e só o `aria-pressed` estava
 * certo. É o mesmo molde do resto do player (`Desenhar a cada quadro: ligado`).
 */
function Chave({
  label,
  ligado,
  ligadoTexto = 'ligada',
  desligadoTexto = 'desligada',
  seletor = false,
  onToggle,
}: {
  label: string
  ligado: boolean
  ligadoTexto?: string
  desligadoTexto?: string
  /**
   * ⚠️ Dois VALORES em vez de ligado/desligado (a luz vem da esquerda ou da direita; o jogo
   * conta quadros ou segundos). Aqui não existe "desligado", e o `aria-pressed` dizia
   * "não pressionado" para um estado que está tão ligado quanto o outro — a única das três
   * camadas que ainda contava outra história.
   */
  seletor?: boolean
  onToggle: (valor: boolean) => void
}) {
  return (
    <div className="rounded-2xl border border-border p-4 text-sm font-semibold">
      <SceneButton
        aria-pressed={seletor ? undefined : ligado}
        className={
          !seletor && ligado ? '!border-primary !bg-primary/10 !text-primary' : '!border-primary'
        }
        onClick={() => onToggle(!ligado)}
      >
        {label}: {ligado ? ligadoTexto : desligadoTexto}
      </SceneButton>
    </div>
  )
}

/** As três alturas da câmera do 3D, em palavra. Espelha o `ALTURA` da faixa de estado. */
const ALTURA: Record<number, string> = { 0: 'por baixo', 1: 'no meio', 2: 'por cima' }

const ESTADOS = [
  { id: 'parado', label: 'parado' },
  { id: 'mirar', label: 'mirar' },
  { id: 'atirar', label: 'atirar' },
  { id: 'recarregar', label: 'recarregar' },
] as const

/** ⚠️ Recebe o elenco pela mesma razão do `CoreSceneControls` — ver a nota de lá. */
export function EngineSceneControls({
  scene,
  state,
  dispatch,
  cast,
}: {
  scene: SceneId
  state: SceneState
  dispatch: (action: SceneAction) => void
  cast?: SceneCast
}) {
  const L = SCENE_LIMITS
  // ⚠️ TODO rótulo passa por aqui, inclusive os que hoje não têm personagem: assim um nome
  // acrescentado depois já nasce vestido, em vez de depender de alguém lembrar.
  const nome = (texto: string) => castText(texto, cast)
  switch (scene) {
    case 'pool':
      return (
        <Chave
          label={nome('O fio da reciclagem')}
          ligado={state.nursery.recycling}
          // ⚠️ "fio" é masculino: o padrão feminino do `Chave` deixava "O fio da reciclagem:
          // ligada" na tela de quem está aprendendo a escrever.
          ligadoTexto="ligado"
          desligadoTexto="desligado"
          onToggle={(enabled) => dispatch({ type: 'connect', port: 'recycle', enabled })}
        />
      )
    case 'entity-state':
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {state.brains.states.map((atual, i) => (
            <fieldset
              // biome-ignore lint/suspicious/noArrayIndexKey: são três cérebros fixos, 1º ao 3º.
              key={`cerebro-${i + 1}`}
              className="rounded-2xl border border-border p-4"
            >
              <legend className="px-1 text-sm font-semibold">O {i + 1}º está</legend>
              <div className="flex flex-wrap gap-2">
                {ESTADOS.map((e) => (
                  <SceneButton
                    key={e.id}
                    aria-pressed={atual === e.id}
                    className={
                      atual === e.id
                        ? '!border-primary !bg-primary/10 !px-3 !text-primary'
                        : '!px-3'
                    }
                    onClick={() => dispatch({ type: 'brain', id: i + 1, state: e.id })}
                  >
                    {e.label}
                  </SceneButton>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )
    case 'delta-time':
      return (
        <Chave
          label={nome('O jogo conta')}
          ligado={state.machines.mode === 'seconds'}
          ligadoTexto="segundos"
          desligadoTexto="quadros"
          seletor
          onToggle={(segundos) =>
            dispatch({ type: 'count', kind: segundos ? 'seconds' : 'frames' })
          }
        />
      )
    case 'circle-collision':
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {/* ⚠️⚠️ A distância é CONTROLE, não só consequência do relógio. Ele apenas aproxima, e
              sem um jeito de afastar a meta da conta ficava impossível depois de ~6 segundos de
              ▶ — a pista mandando fazer o que já não funcionava, e nada dizendo para recomeçar. */}
          <Medida
            label={nome('distância entre os centros')}
            value={Math.round(state.circles.distance)}
            min={L.centers.min}
            max={L.centers.max}
            passo={20}
            tom="text-scene-ink-soft"
            onChange={(distance) => dispatch({ type: 'approach', distance })}
          />
          <Medida
            label={nome('raio do primeiro')}
            value={state.circles.a}
            min={L.radius.min}
            max={L.radius.max}
            passo={5}
            onChange={(value) => dispatch({ type: 'radius', which: 'a', value })}
          />
          <Medida
            label={nome('raio do segundo')}
            value={state.circles.b}
            min={L.radius.min}
            max={L.radius.max}
            passo={5}
            tom="text-scene-b-ink"
            onChange={(value) => dispatch({ type: 'radius', which: 'b', value })}
          />
        </div>
      )
    case 'axis-z': {
      // ⚠️ Um eixo por vez: a cena só registra a descoberta quando UM número muda, e é por isso
      // que cada deslizante manda os outros dois como estão.
      const lugar = (eixo: 'x' | 'y' | 'z', valor: number): SceneAction => ({
        type: 'place3d',
        x: eixo === 'x' ? valor : state.space.x,
        y: eixo === 'y' ? valor : state.space.y,
        z: eixo === 'z' ? valor : state.space.z,
      })
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <Medida
            label={nome('x (para os lados)')}
            value={state.space.x}
            min={L.spaceX.min}
            max={L.spaceX.max}
            passo={10}
            onChange={(v) => dispatch(lugar('x', v))}
          />
          <Medida
            label={nome('y (para cima)')}
            value={state.space.y}
            min={L.spaceY.min}
            max={L.spaceY.max}
            passo={10}
            tom="text-scene-b-ink"
            onChange={(v) => dispatch(lugar('y', v))}
          />
          <Medida
            label={nome('z (para o fundo)')}
            value={state.space.z}
            min={L.spaceZ.min}
            max={L.spaceZ.max}
            passo={10}
            tom="text-scene-ink-soft"
            onChange={(v) => dispatch(lugar('z', v))}
          />
        </div>
      )
    }
    case 'camera-3d':
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Medida
              label={nome('volta da câmera')}
              value={state.orbit.yaw}
              min={L.yaw.min}
              max={L.yaw.max}
              onChange={(yaw) => dispatch({ type: 'orbit', yaw, pitch: state.orbit.pitch })}
            />
            <Medida
              label={nome('altura da câmera')}
              value={state.orbit.pitch}
              min={L.pitch.min}
              max={L.pitch.max}
              // ⚠️ Sem isto o leitor de tela anuncia "altura da câmera, 2": a tradução para
              // "por cima" só existe na faixa de estado, que é `aria-hidden`.
              texto={ALTURA[state.orbit.pitch] ?? 'no meio'}
              tom="text-scene-b-ink"
              onChange={(pitch) => dispatch({ type: 'orbit', yaw: state.orbit.yaw, pitch })}
            />
          </div>
          <SceneButton onClick={() => dispatch({ type: 'recenter' })}>
            Voltar à vista de sempre
          </SceneButton>
        </div>
      )
    case 'mesh':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Chave
            label={nome('O raio-X do modelo')}
            ligado={state.model.wire}
            ligadoTexto="ligado"
            desligadoTexto="desligado"
            onToggle={(on) => dispatch({ type: 'wireframe', on })}
          />
          <Medida
            label={nome('girar o modelo')}
            value={state.model.yaw}
            min={L.yaw.min}
            max={L.yaw.max}
            onChange={(yaw) => dispatch({ type: 'orbit', yaw, pitch: 1 })}
          />
        </div>
      )
    case 'pick-ray':
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
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
          {/* ⚠️ Os atalhos existem para quem não vai achar o alinhamento no deslizante: mirar
              "onde há uma na frente da outra" é a descoberta da cena, e caçá-la no tato deixaria
              de fora justamente quem depende do teclado. */}
          <div className="flex flex-wrap gap-2">
            <SceneButton onClick={() => dispatch({ type: 'point', x: 110, y: 120 })}>
              Mirar na caixa sozinha
            </SceneButton>
            <SceneButton onClick={() => dispatch({ type: 'point', x: 330, y: 145 })}>
              Mirar onde uma cobre a outra
            </SceneButton>
            <SceneButton onClick={() => dispatch({ type: 'point', x: 40, y: 260 })}>
              Mirar no vazio
            </SceneButton>
          </div>
        </div>
      )
    case 'fill-stroke':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Chave
            label={nome('O miolo')}
            ligado={state.ink.fill}
            ligadoTexto="pintado"
            desligadoTexto="vazio"
            onToggle={(on) => dispatch({ type: 'ink', part: 'fill', on })}
          />
          <Chave
            label={nome('O contorno')}
            ligado={state.ink.stroke}
            ligadoTexto="à vista"
            desligadoTexto="sem cor"
            onToggle={(on) => dispatch({ type: 'ink', part: 'stroke', on })}
          />
        </div>
      )
    case 'shading':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Chave
            label={nome('A sombra da forma')}
            ligado={state.light.shade}
            onToggle={(on) => dispatch({ type: 'shade', on })}
          />
          <Chave
            label={nome('A luz vem da')}
            ligado={state.light.side === 'right'}
            ligadoTexto="direita"
            desligadoTexto="esquerda"
            seletor
            onToggle={(direita) => dispatch({ type: 'light', side: direita ? 'right' : 'left' })}
          />
        </div>
      )
    default:
      return null
  }
}
