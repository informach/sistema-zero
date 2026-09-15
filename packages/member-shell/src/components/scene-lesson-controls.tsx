'use client'

import type { SceneAction, SceneCast, SceneId, SceneState } from '@sistemazero/core/learning/scene'
import { castText, SCENE_LIMITS } from '@sistemazero/core/learning/scene'
import { Ear } from 'lucide-react'
import { useState } from 'react'
import { SceneButton } from './exploration-stage'
import { Escolha, Medida } from './scene-bench'
import { CoreSceneControls } from './scene-core-controls'
import { EngineSceneControls } from './scene-engine-controls'

/**
 * A BANCADA das cenas de aula: os controles de cada cena, fora do player.
 *
 * ⭐⭐ Eram QUATORZE bancadas escritas DENTRO do `scene-activity`, que já carrega o player
 * inteiro — sessão, gravação, previsão, pergunta anexa, rodapé. O arquivo passava de 1.900
 * linhas e ninguém o lia inteiro: foi assim que a caixa de botões vazia sobreviveu a quatro
 * revisões e que `stage-size` ficou com um "Um passo" que não fazia nada. As outras vinte e uma
 * cenas já tinham bancada própria (`scene-core-controls`, `scene-engine-controls`); estas eram
 * as que faltavam.
 *
 * ⚠⚠ **A bancada recebe o ELENCO**, pela mesma razão que o palco: os rótulos dos controles são
 * texto que a criança lê, e ela lê os dois na MESMA tela. Sem isto uma turma de nave via
 * "distância do asteroide" na faixa de estado e "Distância do cacto" no controle logo abaixo.
 *
 * ⚠ A régua desta casa vale aqui inteira: toque, teclado e leitor de tela levam ao MESMO lugar.
 * Todo deslizante tem rótulo com o valor à vista, e todo botão diz o que faz.
 */
export function LessonSceneControls({
  scene,
  state,
  dispatch,
  cast,
  goals,
  onRunning,
}: {
  scene: SceneId
  state: SceneState
  dispatch: (action: SceneAction) => void
  cast?: SceneCast
  /**
   * As metas desta atividade, já avaliadas. ⚠⚠ Uma variável por vez: na `hitbox` a largura da
   * área nasce FECHADA e abre com a primeira descoberta sobre distância. Fechado não é
   * escondido — o controle fica na tela com o motivo escrito.
   */
  goals: readonly { id: string; complete: boolean }[]
  /** O relógio é do PLAYER: ligar a troca de quadros liga o ▶ dele, e não um segundo relógio. */
  onRunning: (ligado: boolean) => void
}) {
  const m = scene
  /**
   * A coluna escolhida na cena do espelho. Ela é do CONTROLE, não do mundo: enquanto a criança
   * arrasta o deslizante nada é pintado, e o motor só recebe o traço no clique.
   *
   * ⚠ Mora AQUI desde que a bancada saiu do player: é estado de um controle, e ninguém mais o lê.
   */
  const [coluna, setColuna] = useState(3)
  return (
    <>
      {(m === 'impulse' || m === 'gravity') && (
        <Medida
          label="Impulso do salto"
          value={state.flight.force}
          min={SCENE_LIMITS.impulse.min}
          max={SCENE_LIMITS.impulse.max}
          tom="text-scene-b-ink"
          disabled={m === 'gravity'}
          nota={m === 'gravity' ? 'O impulso fica igual para comparar a gravidade.' : undefined}
          onChange={(force) => dispatch({ type: 'impulse', force })}
        />
      )}
      {/* A bancada das onze cenas do núcleo do Iniciante 2D, em arquivo próprio. */}
      <CoreSceneControls scene={m} state={state} dispatch={dispatch} cast={cast} />
      <EngineSceneControls scene={m} state={state} dispatch={dispatch} cast={cast} />
      {m === 'coordinates' && (
        /* ⭐ Os dois controles que a Aula 1 pedia e que o vídeo não dava. Cada eixo
         tem deslizante, botões de passo e o valor à vista — os três levam ao MESMO
         lugar, que é a régua desta casa desde a cena da colisão: quem não arrasta
         (teclado, leitor de tela) chega à mesma descoberta. */
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              eixo: 'x' as const,
              label: 'x, de esquerda a direita',
              value: state.place.x,
              max: SCENE_LIMITS.placeX.max,
              cor: 'text-scene-a',
            },
            {
              eixo: 'y' as const,
              label: 'y, de cima a baixo',
              value: state.place.y,
              max: SCENE_LIMITS.placeY.max,
              cor: 'text-scene-b-ink',
            },
          ].map((item) => (
            <Medida
              key={item.eixo}
              label={item.label}
              value={item.value}
              min={0}
              max={item.max}
              passo={20}
              tom={item.cor}
              onChange={(valor) =>
                dispatch({
                  type: 'place',
                  // ⚠️ Um eixo por vez: o outro vem do estado, nunca do controle. É o que faz a
                  // descoberta ser sobre UM número.
                  x: item.eixo === 'x' ? valor : state.place.x,
                  y: item.eixo === 'y' ? valor : state.place.y,
                })
              }
            />
          ))}
        </div>
      )}
      {m === 'stage-size' && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                eixo: 'width' as const,
                label: 'largura da tela',
                value: state.stage.width,
                min: SCENE_LIMITS.stageWidth.min,
                max: SCENE_LIMITS.stageWidth.max,
                cor: 'text-scene-a',
              },
              {
                eixo: 'height' as const,
                label: 'altura da tela',
                value: state.stage.height,
                min: SCENE_LIMITS.stageHeight.min,
                max: SCENE_LIMITS.stageHeight.max,
                cor: 'text-scene-b-ink',
              },
            ].map((item) => (
              <Medida
                key={item.eixo}
                label={item.label}
                value={item.value}
                min={item.min}
                max={item.max}
                step={10}
                tom={item.cor}
                onChange={(valor) =>
                  dispatch({
                    type: 'stage',
                    width: item.eixo === 'width' ? valor : state.stage.width,
                    height: item.eixo === 'height' ? valor : state.stage.height,
                  })
                }
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
            {/* ⚠️ O ESTADO no rótulo, o mesmo molde da `Chave` das bancadas novas:
                o rótulo com a AÇÃO ("Mostrar a borda") num botão PINTADO de primário
                com `aria-pressed="false"` fazia as três camadas contarem histórias
                diferentes — o desenho dizia ligado, o texto dizia ligar. */}
            <SceneButton
              tom={state.stage.border ? 'ligado' : 'ferramenta'}
              aria-pressed={state.stage.border}
              onClick={() => dispatch({ type: 'border', visible: !state.stage.border })}
            >
              A borda da tela: {state.stage.border ? 'à vista' : 'escondida'}
            </SceneButton>
            <SceneButton onClick={() => dispatch({ type: 'stage', width: 480, height: 270 })}>
              Usar 480 por 270
            </SceneButton>
          </div>
        </div>
      )}
      {m === 'draw-loop' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
          {/* ⚠️ Uma chave de cada vez, e o relógio à parte: é avançando o tempo que a
            criança vê a diferença entre congelado, rastro e movimento. */}
          <SceneButton
            aria-pressed={state.render.loop}
            tom={state.render.loop ? 'ligado' : 'ferramenta'}
            onClick={() => dispatch({ type: 'loop', on: !state.render.loop })}
          >
            Desenhar a cada quadro: {state.render.loop ? 'ligado' : 'desligado'}
          </SceneButton>
          <SceneButton
            aria-pressed={state.render.erase}
            tom={state.render.erase ? 'ligado' : 'ferramenta'}
            onClick={() => dispatch({ type: 'erase', on: !state.render.erase })}
          >
            Limpar antes: {state.render.erase ? 'ligado' : 'desligado'}
          </SceneButton>
        </div>
      )}
      {m === 'screen-reader' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
          {/* ⚠️ Ícone de ESCUTA, não de som: "Ligar som" (o efeito sonoro da cena)
            fica no mesmo rodapé, e dois botões com o mesmo alto-falante na mesma
            tela leem como o mesmo controle. */}
          <SceneButton tom="gesto" onClick={() => dispatch({ type: 'listen' })}>
            <Ear size={16} />
            Ouvir a tela
          </SceneButton>
          <span className="text-sm text-muted-foreground">
            O programa lê o que estiver escrito. Ele não enxerga o desenho.
          </span>
        </div>
      )}
      {m === 'frames' && (
        <div className="w-full space-y-3">
          {/* ⚠ Sem borda na fileira: a `Escolha` traz a caixa dela, e duas caixas aninhadas
              desenham uma moldura dentro da outra. */}
          <div className="flex flex-wrap items-center gap-3">
            <Escolha
              label="Quadro à vista"
              valor={state.animation.frame}
              opcoes={[
                { id: 1, label: 'Quadro 1' },
                { id: 2, label: 'Quadro 2' },
              ]}
              onChange={(index) => dispatch({ type: 'frame', index })}
            />
            {/* ⚠️ Ligar a troca LIGA O RELÓGIO junto (e parar para). Sem isso a
              criança apertava "Ligar a troca", nada se mexia e a saída era descobrir
              sozinha que faltava apertar o play ali do lado: dois interruptores para
              uma coisa só. O passo e a pausa continuam à mão, para ela olhar uma
              troca de cada vez. */}
            <SceneButton
              tom="gesto"
              aria-pressed={state.animation.playing}
              onClick={() => {
                const ligando = !state.animation.playing
                dispatch({ type: 'play', on: ligando })
                onRunning(ligando)
              }}
            >
              {state.animation.playing ? 'Parar a troca' : 'Ligar a troca'}
            </SceneButton>
          </div>
          <Medida
            label="trocas por segundo"
            value={state.animation.rate}
            min={SCENE_LIMITS.rate.min}
            max={SCENE_LIMITS.rate.max}
            tom="text-scene-b-ink"
            onChange={(perSecond) => dispatch({ type: 'rate', perSecond })}
          />
        </div>
      )}
      {m === 'onion-skin' && (
        <div className="w-full space-y-3">
          {/* ⚠ Sem borda na fileira: a `Escolha` traz a caixa dela, e duas caixas aninhadas
              desenham uma moldura dentro da outra. */}
          <div className="flex flex-wrap items-center gap-3">
            <Escolha
              label="Quadro à vista"
              valor={state.animation.frame}
              opcoes={[
                { id: 1, label: 'Quadro 1' },
                { id: 2, label: 'Quadro 2' },
              ]}
              onChange={(index) => dispatch({ type: 'frame', index })}
            />
            <SceneButton
              aria-pressed={state.animation.onion}
              tom={state.animation.onion ? 'ligado' : 'ferramenta'}
              onClick={() => dispatch({ type: 'onion', on: !state.animation.onion })}
            >
              Fantasma: {state.animation.onion ? 'ligado' : 'desligado'}
            </SceneButton>
          </div>
          {/* ⚠️ Uma variável por vez, como na cena da colisão: o passo é do desenho do
            quadro 2, então no quadro 1 ele fica fechado COM O MOTIVO escrito. Mexer
            nele ali mudaria um desenho que não está na tela. */}
          <Medida
            label="passo do quadro 2"
            value={state.animation.shift}
            min={SCENE_LIMITS.shift.min}
            max={SCENE_LIMITS.shift.max}
            step={4}
            tom="text-scene-b-ink"
            disabled={state.animation.frame !== 2}
            nota={
              state.animation.frame !== 2
                ? 'Vá para o quadro 2 para mover o desenho dele.'
                : undefined
            }
            onChange={(offset) => dispatch({ type: 'shift', offset })}
          />
        </div>
      )}
      {m === 'symmetry' && (
        <div className="w-full space-y-3">
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border p-4">
            <div className="min-w-40 flex-1">
              <Medida
                label="coluna do traço"
                value={coluna}
                min={SCENE_LIMITS.column.min}
                max={SCENE_LIMITS.column.max}
                onChange={setColuna}
              />
            </div>
            <SceneButton tom="gesto" onClick={() => dispatch({ type: 'paint', column: coluna })}>
              Pintar aqui
            </SceneButton>
            <SceneButton
              aria-pressed={state.mirror.on}
              tom={state.mirror.on ? 'ligado' : 'ferramenta'}
              onClick={() =>
                dispatch({
                  type: 'mirror',
                  on: !state.mirror.on,
                  line: state.mirror.line,
                })
              }
            >
              Espelho: {state.mirror.on ? 'ligado' : 'desligado'}
            </SceneButton>
          </div>
          <Medida
            label="linha do eixo"
            value={state.mirror.line}
            min={SCENE_LIMITS.mirrorLine.min}
            max={SCENE_LIMITS.mirrorLine.max}
            tom="text-scene-b-ink"
            disabled={!state.mirror.on}
            onChange={(line) =>
              dispatch({
                type: 'mirror',
                on: state.mirror.on,
                line,
              })
            }
            nota={!state.mirror.on ? 'Ligue o espelho para escolher onde ele fica.' : undefined}
          />
        </div>
      )}
      {m === 'pixel-vector' && (
        <div className="w-full space-y-3">
          <Escolha
            label="Qual pedra olhar"
            valor={state.pixels.kind}
            opcoes={[
              { id: 'pixel' as const, label: 'Olhar a de pixel' },
              { id: 'vector' as const, label: 'Olhar a de vetor' },
            ]}
            onChange={(kind) => dispatch({ type: 'inspect', kind, zoom: state.pixels.zoom })}
          />
          <Medida
            label="lupa"
            value={state.pixels.zoom}
            min={SCENE_LIMITS.zoom.min}
            max={SCENE_LIMITS.zoom.max}
            texto={`${state.pixels.zoom} vezes`}
            tom="text-scene-b-ink"
            onChange={(zoom) => dispatch({ type: 'inspect', kind: state.pixels.kind, zoom })}
          />
        </div>
      )}
      {m === 'sheet-vs-sprite' && (
        <div className="w-full space-y-3">
          <Escolha
            label="Pedaço recortado da folha"
            valor={state.sheet.cell}
            opcoes={[1, 2, 3, 4].map((cell) => ({ id: cell, label: `Pedaço ${cell}` }))}
            onChange={(cell) => dispatch({ type: 'cut', cell })}
          />
          <Medida
            label="tamanho no jogo"
            value={state.sheet.size}
            min={SCENE_LIMITS.sprite.min}
            max={SCENE_LIMITS.sprite.max}
            step={8}
            tom="text-scene-b-ink"
            onChange={(size) => dispatch({ type: 'sprite', size })}
          />
        </div>
      )}
      {m === 'lives' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
          <SceneButton
            tom="gesto"
            disabled={state.lifeline.lives === 0}
            onClick={() => dispatch({ type: 'collide' })}
          >
            {castText('Bater no cacto', cast)}
          </SceneButton>
          <span className="text-sm text-muted-foreground">
            {state.lifeline.lives === 0
              ? 'Sem vidas. Use Recomeçar para jogar de novo.'
              : 'Os fios ficam logo abaixo: eles decidem o que a batida faz.'}
          </span>
        </div>
      )}
      {m === 'hitbox' && (
        /* ⭐ Uma variável por vez. Os dois controles nasciam abertos, e duas medidas
         soltas ao mesmo tempo não ensinam qual causou o quê: a criança aproximava
         o cacto, alargava a área e ficava sem saber qual das duas fez as áreas
         encostarem. A largura abre depois da PRIMEIRA descoberta sobre distância
         (`contact` ou `separate`), que é justamente quando a pergunta seguinte
         ("e se o desenho ficar igual e só a área mudar?") passa a fazer sentido.
         ⚠️ Fechado NÃO é escondido: o controle continua na tela, com o motivo
         escrito. Sumir com ele faria a cena parecer outra a cada descoberta. */
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              // ⚠️ Os rótulos dos controles TAMBÉM passam pelo elenco: sem isto a
              // criança de uma turma de nave lia "distância do asteroide" na faixa
              // de estado e "Distância do cacto" no controle logo abaixo, na mesma
              // tela. Achado do full review de 14/09/2026.
              label: castText('Distância do cacto', cast),
              value: state.contact.distance,
              min: 20,
              max: 260,
              field: 'distance',
              locked: false,
            },
            {
              label: castText('Largura da área do Dino', cast),
              value: state.contact.width,
              min: 24,
              max: 120,
              field: 'width',
              locked: !goals.some((g) => (g.id === 'contact' || g.id === 'separate') && g.complete),
            },
          ].map((item) => (
            <Medida
              key={item.field}
              label={item.label}
              value={item.value}
              min={item.min}
              max={item.max}
              tom={item.field === 'width' ? 'text-scene-b-ink' : 'text-scene-a'}
              disabled={item.locked}
              nota={item.locked ? 'Abre quando você descobrir o que a distância faz.' : undefined}
              onChange={(valor) =>
                dispatch(
                  item.field === 'width'
                    ? { type: 'resize', width: valor }
                    : { type: 'move', distance: valor },
                )
              }
            />
          ))}
        </div>
      )}
    </>
  )
}
