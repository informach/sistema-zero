'use client'

import type { SceneAction, SceneCast, SceneId, SceneState } from '@sistemazero/core/learning/scene'
import { castText, MAP_TILES, SCENE_LIMITS } from '@sistemazero/core/learning/scene'
import { SceneButton } from './exploration-stage'
import { Escolha, Medida } from './scene-bench'

/**
 * A bancada das onze cenas do núcleo do Iniciante 2D (15/09/2026).
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
    case 'velocity':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Medida
            label={nome('velocidade para o lado')}
            value={state.drive.vx}
            min={L.velocity.min}
            max={L.velocity.max}
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
    case 'hold-vs-press':
      return (
        <div className="flex flex-wrap items-center gap-3">
          <SceneButton tom="gesto" onClick={() => dispatch({ type: 'press' })}>
            Apertar uma vez
          </SceneButton>
          <SceneButton
            aria-pressed={state.input.holding}
            onPointerDown={() => dispatch({ type: 'hold', on: true })}
            onPointerUp={() => dispatch({ type: 'hold', on: false })}
            // ⚠️⚠️ Teclado e leitor de tela não têm "segurar": para eles o botão ALTERNA, e o
            // rótulo diz em que estado está. Sem isto, metade da cena ficaria fora do alcance
            // deles. Mas o `detail === 0` é obrigatório: um toque de mouse dispara os três
            // eventos em fila (down solta o `on`, up solta o `off`, e o click alternava o já
            // falso de volta para VERDADEIRO), então um clique simples terminava com a tecla
            // presa e o rótulo dizendo "Soltar a tecla" — o contrário do que tinha acontecido,
            // justo na cena que existe para separar acontecimento de estado.
            onClick={(e) => {
              if (e.detail === 0) dispatch({ type: 'hold', on: !state.input.holding })
            }}
          >
            {state.input.holding ? 'Soltar a tecla' : 'Segurar a tecla'}
          </SceneButton>
        </div>
      )
    case 'variable':
      return (
        <div className="space-y-3">
          <Medida
            label={nome('número guardado na caixa')}
            value={state.box.value}
            min={L.boxValue.min}
            max={L.boxValue.max}
            passo={5}
            onChange={(value) => dispatch({ type: 'store', value })}
          />
          <div className="flex flex-wrap items-center gap-3">
            <SceneButton onClick={() => dispatch({ type: 'change', by: 1 })}>
              Somar 1 ponto
            </SceneButton>
            <SceneButton onClick={() => dispatch({ type: 'change', by: 5 })}>
              Somar 5 pontos
            </SceneButton>
            <SceneButton
              aria-pressed={state.box.shown}
              onClick={() => dispatch({ type: 'show', on: !state.box.shown })}
            >
              {state.box.shown ? 'Parar de mostrar na tela' : 'Mostrar na tela'}
            </SceneButton>
          </div>
        </div>
      )
    case 'group-loop':
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {nome('Olhe cada cacto do grupo e depois escolha um.')}
          </p>
          <div className="flex flex-wrap gap-2">
            {state.hunt.distances.map((distancia, i) => {
              const alvo = i + 1
              return (
                <div key={alvo} className="flex items-center gap-1">
                  <SceneButton
                    aria-pressed={state.hunt.looked.includes(alvo)}
                    onClick={() => dispatch({ type: 'look', id: alvo })}
                  >
                    Olhar o {alvo}º
                  </SceneButton>
                  <SceneButton
                    tom={state.hunt.chosen === alvo ? 'ligado' : 'ferramenta'}
                    onClick={() => dispatch({ type: 'choose', id: alvo })}
                  >
                    Escolher ({distancia})
                  </SceneButton>
                </div>
              )
            })}
          </div>
        </div>
      )
    case 'enemy-type':
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Medida
              label={nome('velocidade na ficha')}
              value={state.blueprint.speed}
              min={L.typeSpeed.min}
              max={L.typeSpeed.max}
              onChange={(value) => dispatch({ type: 'define', field: 'speed', value })}
            />
            <Medida
              label={nome('vida na ficha')}
              value={state.blueprint.life}
              min={L.typeLife.min}
              max={L.typeLife.max}
              tom="text-scene-b-ink"
              onChange={(value) => dispatch({ type: 'define', field: 'life', value })}
            />
          </div>
          <SceneButton tom="gesto" onClick={() => dispatch({ type: 'spawnOne' })}>
            Fazer nascer mais um
          </SceneButton>
        </div>
      )
    case 'camera':
      return (
        <Medida
          label={nome('onde o Dino está no mundo')}
          value={state.view.heroX}
          min={L.worldX.min}
          max={L.worldX.max}
          step={10}
          passo={100}
          onChange={(x) => dispatch({ type: 'walk', x })}
        />
      )
    case 'contact':
      return (
        <div className="space-y-3">
          <Medida
            label={nome('distância do cacto')}
            value={state.hit.distance}
            min={L.approach.min}
            max={L.approach.max}
            step={5}
            passo={20}
            onChange={(distance) => dispatch({ type: 'approach', distance })}
          />
          <Escolha
            label="A pergunta que o jogo faz"
            valor={state.hit.mode}
            opcoes={[
              { id: 'ask' as const, label: 'Está encostando?' },
              { id: 'event' as const, label: 'Acabou de encostar' },
            ]}
            onChange={(kind) => dispatch({ type: 'mode', kind })}
          />
        </div>
      )
    case 'cooldown':
      return (
        <div className="space-y-3">
          <Medida
            label={nome('recarga entre dois tiros, em segundos')}
            value={state.weapon.seconds}
            min={L.recharge.min}
            max={L.recharge.max}
            step={0.5}
            onChange={(seconds) => dispatch({ type: 'recharge', seconds })}
          />
          <SceneButton tom="gesto" onClick={() => dispatch({ type: 'shoot' })}>
            Atirar
          </SceneButton>
        </div>
      )
    case 'aim':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Medida
            label={nome('alvo, de esquerda a direita')}
            value={state.sight.targetX}
            min={L.aimX.min}
            max={L.aimX.max}
            step={10}
            passo={40}
            onChange={(x) => dispatch({ type: 'target', x, y: state.sight.targetY })}
          />
          <Medida
            label={nome('alvo, de cima a baixo')}
            value={state.sight.targetY}
            min={L.aimY.min}
            max={L.aimY.max}
            step={10}
            passo={40}
            tom="text-scene-b-ink"
            onChange={(y) => dispatch({ type: 'target', x: state.sight.targetX, y })}
          />
        </div>
      )
    case 'diagonal':
      return (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">As setas que você aperta</legend>
          <div className="mx-auto grid w-40 grid-cols-3 gap-1">
            <span />
            <SceneButton
              aria-pressed={state.walkPad.dy === -1}
              onClick={() =>
                dispatch({
                  type: 'direction',
                  x: state.walkPad.dx,
                  y: state.walkPad.dy === -1 ? 0 : -1,
                })
              }
            >
              ↑
            </SceneButton>
            <span />
            <SceneButton
              aria-pressed={state.walkPad.dx === -1}
              onClick={() =>
                dispatch({
                  type: 'direction',
                  x: state.walkPad.dx === -1 ? 0 : -1,
                  y: state.walkPad.dy,
                })
              }
            >
              ←
            </SceneButton>
            <SceneButton onClick={() => dispatch({ type: 'direction', x: 0, y: 0 })}>✕</SceneButton>
            <SceneButton
              aria-pressed={state.walkPad.dx === 1}
              onClick={() =>
                dispatch({
                  type: 'direction',
                  x: state.walkPad.dx === 1 ? 0 : 1,
                  y: state.walkPad.dy,
                })
              }
            >
              →
            </SceneButton>
            <span />
            <SceneButton
              aria-pressed={state.walkPad.dy === 1}
              onClick={() =>
                dispatch({
                  type: 'direction',
                  x: state.walkPad.dx,
                  y: state.walkPad.dy === 1 ? 0 : 1,
                })
              }
            >
              ↓
            </SceneButton>
            <span />
          </div>
        </fieldset>
      )
    case 'tilemap': {
      const nomes: Record<string, string> = { '.': 'vazio', '#': 'bloco', o: 'moeda' }
      return (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">
            Toque numa casa para trocar a letra dela
          </legend>
          <div className="overflow-x-auto">
            <div className="inline-grid grid-cols-10 gap-1">
              {state.grid.rows.flatMap((linha, row) =>
                [...linha].map((tile, col) => {
                  const proximo =
                    MAP_TILES[
                      (MAP_TILES.indexOf(tile as (typeof MAP_TILES)[number]) + 1) % MAP_TILES.length
                    ] ?? '.'
                  return (
                    <button
                      // biome-ignore lint/suspicious/noArrayIndexKey: a grade é fixa, 6 por 10.
                      key={`${row}-${col}`}
                      type="button"
                      aria-label={`Linha ${row + 1}, casa ${col + 1}: ${nomes[tile] ?? tile}. Trocar para ${nomes[proximo] ?? proximo}`}
                      className="grid size-11 place-items-center rounded-lg border border-border font-mono text-lg hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      onClick={() => dispatch({ type: 'paint-tile', row, col, tile: proximo })}
                    >
                      {tile}
                    </button>
                  )
                }),
              )}
            </div>
          </div>
        </fieldset>
      )
    }
    default:
      return null
  }
}
