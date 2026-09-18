'use client'

import type { SceneAction, SceneCast, SceneId, SceneState } from '@sistemazero/core/learning/scene'
import { castText, SCENE_LIMITS } from '@sistemazero/core/learning/scene'
import { Ear } from 'lucide-react'
import { SceneButton } from './exploration-stage'
import { AtelieSceneControls } from './scene-atelie-controls'
import { Escolha, Medida } from './scene-bench'
import { CoreSceneControls } from './scene-core-controls'
import { DinoNumbersControls } from './scene-dino-numbers-controls'
import { MotorSceneControls } from './scene-motor-controls'
import { NucleoSceneControls } from './scene-nucleo-controls'

/**
 * A BANCADA das cenas de aula: os controles de cada cena, fora do player.
 *
 * ⭐⭐ Eram QUATORZE bancadas escritas DENTRO do `scene-activity`, que já carrega o player
 * inteiro — sessão, gravação, previsão, pergunta anexa, rodapé. O arquivo passava de 1.900
 * linhas e ninguém o lia inteiro: foi assim que a caixa de botões vazia sobreviveu a quatro
 * revisões e que `stage-size` ficou com um "Um passo" que não fazia nada. As outras vinte e uma
 * cenas já tinham bancada própria (`scene-core-controls` e a do motor); estas eram as que
 * faltavam. ⚠️ Lote 5 do Raio-X: as do ateliê moram no `scene-atelie-controls` (G4), e o
 * `scene-engine-controls` acabou.
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
  tocando,
  onRunning,
  pontoPorAcerto = false,
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
  /** O relógio é do PLAYER: ligar a prévia de quadros liga o relógio dele, e não um segundo. */
  onRunning: (ligado: boolean) => void
  /**
   * O relógio do player está andando? Lote 5 do Raio-X (G4): na `frames` a Prévia é o relógio, e a
   * chave dela diz "tocando" só com ele andando de verdade.
   */
  tocando?: boolean
  /**
   * As `lives` do Desafio contam ponto pelo acerto do tiro (consertos do review da onda A do lote 5): o
   * "Agora é sua vez" dá o tiro na bancada. Ver `ExplorationPieces`.
   */
  pontoPorAcerto?: boolean
}) {
  const m = scene
  return (
    <>
      {/* ⚠️ O deslizante do impulso SAIU daqui (lote 5 do Raio-X): mora na bancada do Corre Dino
          (`scene-dino-controls`), com as marcas, e a `gravity` deixou de mostrá-lo travado. */}
      {/* A `velocity` e a `variable`, que ficaram no arquivo do núcleo. */}
      <CoreSceneControls scene={m} state={state} dispatch={dispatch} cast={cast} goals={goals} />
      {/* ⭐⭐ O núcleo do Iniciante 2D (lote 5 do Raio-X, G5): a tecla, o laço, a ficha, a câmera, o
          encosto, a recarga, a mira e a diagonal, com o gesto que solta o tempo. */}
      <NucleoSceneControls
        scene={m}
        state={state}
        dispatch={dispatch}
        cast={cast}
        goals={goals}
        onRunning={onRunning}
      />
      {/* Lote 5 do Raio-X: a bancada do motor e do 3D, em arquivo próprio. */}
      <MotorSceneControls scene={m} state={state} dispatch={dispatch} cast={cast} goals={goals} />
      {m === 'coordinates' && (
        /* ⭐ Os dois controles que a Aula 1 pedia e que o vídeo não dava. Cada eixo
         tem deslizante, botões de passo e o valor à vista — os três levam ao MESMO
         lugar, que é a régua desta casa desde a cena da colisão: quem não arrasta
         (teclado, leitor de tela) chega à mesma descoberta. */
        <div className="grid gap-3 sm:grid-cols-2">
          {/* ⚠️⚠️ Os rótulos são só "x" e "y" (lote 2 do Raio-X, 16/09/2026). "y, de cima a baixo"
              ficava à vista durante a previsão ("se o y AUMENTAR, para onde o Dino vai?") e era a
              resposta dela, na cena que a professora abre com "um dos dois pega todo mundo de
              surpresa". A régua do palco continua mostrando onde está o 0. */}
          {/* ⚠️ O máximo é a TELA DO CASO (lote 5): 480 × 270 no Corre Dino, 800 × 480 no Desafio. */}
          {[
            {
              eixo: 'x' as const,
              label: 'x',
              value: state.place.x,
              max: state.place.width,
              cor: 'text-scene-a',
            },
            {
              eixo: 'y' as const,
              label: 'y',
              value: state.place.y,
              max: state.place.height,
              cor: 'text-scene-b-ink',
            },
          ].map((item) => (
            <Medida
              key={item.eixo}
              label={item.label}
              value={item.value}
              min={0}
              max={item.max}
              // ⚠️ O passo segue a tela do CASO (consertos do review da onda A do lote 5): no Desafio
              // (800 × 480) um toque de 20 eram 12px, a nave quase não saía do fantasma e a atividade
              // obrigatória fechava nesse toque. 40 lá, 20 no Corre Dino.
              passo={state.place.width > 480 ? 40 : 20}
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
          {/* ⚠️⚠️ A BORDA vem primeiro (lote 5 do Raio-X): é a primeira descoberta, e sem ela os
              números mudam a tela sem nada na tela mudar. */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4">
            {/* A criança lê a PRÓXIMA ação. O estado continua no `aria-pressed`, que é a camada
                acessível própria de um botão alternável. */}
            <SceneButton
              tom={state.stage.border ? 'ligado' : 'ferramenta'}
              aria-pressed={state.stage.border}
              onClick={() => dispatch({ type: 'border', visible: !state.stage.border })}
            >
              {state.stage.border ? 'Desligue a borda' : 'Ligue a borda'}
            </SceneButton>
            {/* ⚠️⚠️ O atalho "Usar 480 por 270" SAIU (lote 5): ele fazia pela criança justamente a
                ligação número × formato, e fechava duas metas num toque. */}
          </div>
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
                // ⚠️ No Estúdio a criança DIGITA o número: de 800 a 480 eram 32 toques no "−".
                digitavel
                // ⚠️⚠️ Fechados até a borda aparecer (lote 5): fechado não é escondido.
                disabled={!state.stage.border}
                nota={state.stage.border ? undefined : 'Abre quando a borda estiver à vista.'}
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
        </div>
      )}
      {m === 'draw-loop' && (
        <div className="w-full space-y-3">
          {/* ⭐⭐ "Desenhar o Dino: só no começo / a cada quadro" (lote 5 do Raio-X). Com "a cada
              quadro: desligado" a cena abria com o Dino na tela, e a `world` da mesma aula acabava de
              mostrar que desenho desligado é tela vazia. O Dino da abertura foi desenhado UMA vez, no
              começo: a escolha diz isso, e é uma ESCOLHA (os dois valores estão vivos). */}
          <Escolha
            label={castText('Desenhar o Dino', cast)}
            valor={state.render.loop ? 'cada' : 'comeco'}
            opcoes={[
              { id: 'comeco' as const, label: 'Só no começo' },
              { id: 'cada' as const, label: 'A cada quadro' },
            ]}
            onChange={(quando) => dispatch({ type: 'loop', on: quando === 'cada' })}
          />
          <div className="flex flex-wrap items-center gap-3">
            {/* ⚠️ "Limpar a tela antes", o nome do bloco do Estúdio ("Limpar a tela"). */}
            <SceneButton
              aria-pressed={state.render.erase}
              tom={state.render.erase ? 'ligado' : 'ferramenta'}
              onClick={() => dispatch({ type: 'erase', on: !state.render.erase })}
            >
              Limpar a tela antes: {state.render.erase ? 'ligado' : 'desligado'}
            </SceneButton>
          </div>
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
          {/* ⚠️ A nota "O programa lê o que estiver escrito. Ele não enxerga o desenho." SAIU (lote 2
              do Raio-X): era a resposta da previsão da cena, logo abaixo dela. */}
        </div>
      )}
      {/* ⭐⭐ O ateliê de O Jogo do Meu Jeito (lote 5 do Raio-X, G4): `frames`, `onion-skin`,
          `symmetry`, `pixel-vector`, `sheet-vs-sprite`, `fill-stroke` e `shading`, com os nomes do
          Pinta, em arquivo próprio. */}
      <AtelieSceneControls
        scene={m}
        state={state}
        dispatch={dispatch}
        cast={cast}
        goals={goals}
        tocando={tocando}
        onRunning={onRunning}
      />
      {/* ⭐ A segunda metade do Corre Dino e os números (lote 5 do Raio-X): `restart`, `score`,
          `random`, `acceleration`, `hitbox` e `lives` têm bancada própria. */}
      <DinoNumbersControls
        scene={m}
        state={state}
        dispatch={dispatch}
        cast={cast}
        goals={goals}
        onRunning={onRunning}
        pontoPorAcerto={pontoPorAcerto}
      />
    </>
  )
}
