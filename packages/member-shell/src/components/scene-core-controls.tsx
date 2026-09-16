'use client'

import type { SceneAction, SceneCast, SceneId, SceneState } from '@sistemazero/core/learning/scene'
import { castText, SCENE_LIMITS } from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { Chave, Medida } from './scene-bench'

/**
 * A bancada das onze cenas do núcleo do Iniciante 2D (15/09/2026).
 *
 * ⚠️ Lote 5 do Raio-X (G5): nove delas saíram para `scene-nucleo-controls.tsx`, com o gesto que solta
 * o tempo. Aqui ficaram a `velocity` e a `variable`.
 *
 * ⚠️ A régua desta casa vale aqui inteira: toque, teclado e leitor de tela levam ao MESMO
 * lugar. Todo deslizante tem rótulo com o valor à vista, e todo botão diz o que faz — quem não
 * arrasta chega à mesma descoberta.
 *
 * ⚠️ Fica em arquivo próprio porque o `scene-activity` já carrega o player inteiro (sessão,
 * gravação, previsão, rodapé): onze bancadas ali dentro fariam dele um arquivo que ninguém lê.
 */

/**
 * ⚠️⚠️ A bancada recebe o ELENCO pela mesma razão que o palco: os rótulos dos controles são
 * texto que a criança lê, e ela lê os dois na MESMA tela. Sem isto uma turma de nave via
 * "distância do asteroide" na faixa de estado e "distância do cacto" no controle logo abaixo —
 * a regressão que o full review de 14/09/2026 já tinha corrigido no player, reintroduzida
 * quando a bancada saiu para arquivo próprio.
 */
export function CoreSceneControls({
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
  /** As metas desta atividade. A `velocity` fecha o eixo que a missão não cobra (lote 5). */
  goals?: readonly { id: string; complete: boolean }[]
}) {
  const L = SCENE_LIMITS
  // ⚠️ TODO rótulo passa por aqui, inclusive os que hoje não têm personagem: assim um nome
  // acrescentado depois já nasce vestido, em vez de depender de alguém lembrar.
  const nome = (texto: string) => castText(texto, cast)
  switch (scene) {
    case 'velocity': {
      // ⚠️⚠️ Uma variável por vez (lote 5 do Raio-X): numa missão que só cobra subir e descer (o Dia 2
      // do Desafio), o eixo do lado fica FECHADO, com o motivo. Fechado não é escondido, e sem metas
      // (demonstração, prévia) nada fecha. Nunca fechado com velocidade: dá para zerar o que o caso
      // deixou.
      const soVertical =
        goals.length > 0 &&
        goals.every((g) => g.id === 'up' || g.id === 'down') &&
        state.drive.vx === 0
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Medida
            label={nome('velocidade para o lado')}
            value={state.drive.vx}
            min={L.velocity.min}
            max={L.velocity.max}
            disabled={soVertical}
            nota={soVertical ? 'Hoje só para cima e para baixo.' : undefined}
            onChange={(vx) => dispatch({ type: 'velocity', vx, vy: state.drive.vy })}
          />
          <Medida
            label={nome('velocidade para baixo')}
            value={state.drive.vy}
            min={L.velocity.min}
            max={L.velocity.max}
            tom="text-scene-b-ink"
            onChange={(vy) => dispatch({ type: 'velocity', vx: state.drive.vx, vy })}
          />
        </div>
      )
    }
    case 'variable':
      /**
       * ⚠️⚠️ A língua dos BLOCOS do desenho (consertos do review da onda A do lote 5): o palco diz "Criar
       * variável pontos · Somar em pontos · Mostrar placar" e a bancada dizia "número guardado na caixa",
       * "Somar 1 ponto", "Somar 5 pontos" e "Mostrar na tela". "Somar 5" saiu: no jogo do Desafio cada
       * acerto soma 1, e a soma de 5 não tinha asteroide para explodir. O mostrar é uma chave, com o
       * estado no rótulo.
       */
      return (
        <div className="space-y-3">
          <Medida
            label={nome('número guardado em pontos')}
            value={state.box.value}
            min={L.boxValue.min}
            max={L.boxValue.max}
            passo={5}
            onChange={(value) => dispatch({ type: 'store', value })}
          />
          <div className="flex flex-wrap items-center gap-3">
            <SceneButton onClick={() => dispatch({ type: 'change', by: 1 })}>
              Somar 1 em pontos
            </SceneButton>
            <Chave
              label="Mostrar placar"
              ligado={state.box.shown}
              ligadoTexto="ligado"
              desligadoTexto="desligado"
              onToggle={(on) => dispatch({ type: 'show', on })}
            />
          </div>
        </div>
      )
    default:
      return null
  }
}
