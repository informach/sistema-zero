'use client'

import type { SceneCast, SceneState } from '@sistemazero/core/learning/scene'
import { actorFigure, quantos, sceneWorld } from '@sistemazero/core/learning/scene'
import { SceneCanvas, Texto } from './scene-canvas'
import { ActorFigure, FundoEspaco, pisoDoMundo } from './scene-figures'

/**
 * O palco da cena das VIDAS (o Dia 4 do Desafio e o Corre Dino).
 *
 * ⚠️⚠️ As cinco cenas de desenho que moravam aqui (`frames`, `onion-skin`, `symmetry`,
 * `pixel-vector`, `sheet-vs-sprite`) SAÍRAM no lote 5 do Raio-X (16/09/2026, G4), junto com o
 * redesenho: estão no `scene-atelie-stages.tsx`, com `fill-stroke` e `shading`. O nome do arquivo
 * ficou, e ele guarda só a `lives`.
 */

/**
 * ⚠️⚠️ O palco das vidas é mais BAIXO que o enquadramento comum (`SCENE_VIEW`, 560 × 300), então o
 * `SceneCanvas` daqui passa o `view`: sem ele o desenho seria emoldurado numa caixa 40 unidades mais
 * alta e tudo sairia deslocado para cima.
 */
const VIEW = { w: 560, h: 260 } as const
/** O chão do palco, para a nave e o obstáculo apoiarem nele. */
const CHAO = VIEW.h - 40

/** A explosão de um acontecimento (o acerto ou a batida), centrada no ponto dado. */
const EXPLOSAO = 'M0 -16L5 -5L16 -7L8 1L15 11L3 7L0 18L-4 7L-15 11L-8 1L-16 -7L-5 -5Z'

/**
 * As vidas e o placar.
 *
 * ⚠️ As duas contagens ficam lado a lado e GRANDES: a cena é sobre elas mudarem por motivos
 * diferentes, e isso só se vê quando as duas estão à vista no mesmo instante da batida.
 *
 * ⭐⭐ Redesenho do lote 5 do Raio-X (16/09/2026). A nave e o asteroide ficavam parados a 230 px um
 * do outro, e "bater" só mudava a faixa e os corações: a CAUSA de cada contagem não estava no
 * desenho. Agora o último acontecimento (`lifeline.last`) é desenhado com a seta até o que ele mudou:
 * - o ACERTO (`shoot`, o ponto do jogo do Desafio): o tiro sai do herói, o obstáculo explode e uma
 *   seta leva "+1" até o placar;
 * - a BATIDA: o obstáculo encosta no herói, os risquinhos da tremida aparecem e, quando uma vida
 *   saiu, a seta vai até o coração apagado.
 * ⚠️ A tremida é DESENHADA (risquinhos parados), e não animada: vale igual com menos movimento.
 * ⚠️ O tiro é uma bolinha simples, e não uma figura de elenco: `SCENE_ROLES.lives` desenha só o
 * herói e o obstáculo.
 */
export function LivesStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { lives, points, hits, onHit, last } = state.lifeline
  const acabou = lives === 0
  const mundo = sceneWorld(cast, 'lives')
  const piso = pisoDoMundo(mundo, CHAO)
  const heroi = actorFigure(cast, 'hero')
  const obstaculo = actorFigure(cast, 'obstacle')
  const acertou = last === 'tiro'
  const bateu = last === 'batida'
  // O coração que a última batida apagou: só existe se a batida custou uma vida.
  const coracaoPerdido = bateu && onHit && lives < 3 ? lives : null
  const alturaDoMeio = piso - 30
  const acontecimento = acabou
    ? 'A partida acabou.'
    : acertou
      ? 'O último tiro acertou.'
      : bateu
        ? 'Acabou de haver uma batida.'
        : `Batidas até agora: ${hits}.`
  return (
    <SceneCanvas
      view={VIEW}
      cast={cast}
      mundo={mundo}
      titulo="A tela do jogo com o placar e os corações"
      descricao={`${quantos(lives, 'vida', 'vidas')} e ${quantos(points, 'ponto', 'pontos')}. ${acontecimento}`}
      // ⚠️ SEM rodapé (lote 2 do Raio-X): "O fio da vida está solto: bater não muda nenhuma das
      // duas contagens" antecipava a etapa 2 da demonstração desde a abertura, e a frase embaixo do
      // palco repetia a mesma coisa pela terceira vez.
    >
      {(palco) => (
        <>
          {mundo === 'espaco' ? (
            // Sem estrelinhas atrás dos dois placares e do FIM: elas viravam pontuação.
            <FundoEspaco
              w={VIEW.w}
              h={VIEW.h}
              semEstrelas={[
                { x: 14, y: 18, w: 122, h: 60 },
                { x: 460, y: 8, w: 92, h: 70 },
                { x: 190, y: 100, w: 180, h: 44 },
              ]}
            />
          ) : (
            <>
              <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
              <rect className="fill-scene-ground" y={CHAO} width={VIEW.w} height={VIEW.h - CHAO} />
              <path className="stroke-scene-line" d={`M0 ${CHAO}h${VIEW.w}`} strokeWidth="2" />
            </>
          )}
          {/* Os corações: três lugares FIXOS, com o que já foi perdido em contorno. Sumir com eles
          esconderia de quanto se partiu, que é metade da comparação. */}
          <g>
            {[0, 1, 2].map((i) => (
              <path
                key={i}
                className={i < lives ? 'fill-scene-alert' : 'fill-none stroke-scene-alert'}
                strokeWidth="2"
                opacity={i < lives ? 1 : 0.5}
                transform={`translate(${24 + i * 34} 30) scale(1.1)`}
                d="M10 18C10 18 1 12 1 6.5A4.5 4.5 0 0 1 10 4A4.5 4.5 0 0 1 19 6.5C19 12 10 18 10 18Z"
              />
            ))}
            {/* ⚠️ "restam" e "placar", e não "vidas" e "pontos": as duas palavras já são os rótulos
            da faixa de estado logo acima, e repetir o mesmo nome no desenho faz a criança (e o
            teste) tomar os dois lugares por um só. Aqui é o HUD do jogo. */}
            {/* ⚠️ No estreito, à DIREITA dos corações (conserto "letra no celular"): embaixo deles, na letra de
            12px, "restam" encostava nos corações e a seta da batida caía em cima dele. */}
            <Texto
              className="fill-scene-ink-soft"
              x={palco.estreito ? 24 + 3 * 34 + 8 : 24}
              y={palco.estreito ? 47 : 68}
              tamanho={11}
            >
              restam
            </Texto>
          </g>
          <g>
            <Texto
              className="fill-scene-b-ink"
              x={VIEW.w - 24}
              y={44}
              textAnchor="end"
              tamanho={30}
              fontWeight="700"
            >
              {points}
            </Texto>
            {/* ⚠️ No estreito, à ESQUERDA do número, na mesma linha: embaixo dele encostava nele. */}
            <Texto
              className="fill-scene-ink-soft"
              x={
                palco.estreito
                  ? VIEW.w - 24 - palco.larguraDoTexto(String(points), 30) - 10
                  : VIEW.w - 24
              }
              y={palco.estreito ? 40 : 68}
              textAnchor="end"
              tamanho={11}
            >
              placar
            </Texto>
          </g>
          <g className="text-primary" opacity={acabou ? 0.4 : 1}>
            <ActorFigure figure={heroi} x={120} y={piso} />
          </g>
          {/* O acerto: o rastro do tiro, a bolinha chegando e o obstáculo explodindo. */}
          {acertou && (
            <g>
              <path
                className="stroke-scene-b"
                d={`M156 ${alturaDoMeio}H372`}
                strokeWidth="2"
                strokeDasharray="3 7"
              />
              <circle className="fill-scene-b" cx={376} cy={alturaDoMeio} r="6" />
              <g opacity={0.35}>
                <ActorFigure figure={obstaculo} x={410} y={piso} />
              </g>
              <path
                className="fill-scene-flame"
                transform={`translate(410 ${alturaDoMeio})`}
                d={EXPLOSAO}
              />
              {/* A causa até o que ela mudou: acerto → placar. */}
              <path
                className="stroke-scene-b"
                d={`M420 ${alturaDoMeio - 24}Q470 70 516 80`}
                fill="none"
                strokeWidth="2.5"
                strokeDasharray="6 4"
              />
              <path className="fill-scene-b" d="M524 76l-12 -6l2 13Z" />
              <Texto className="fill-scene-b-ink" x={452} y={120} tamanho={16} fontWeight="700">
                +1
              </Texto>
              <Texto
                className="fill-scene-ink-soft"
                x={452}
                y={palco.estreito ? 120 + palco.letra(11) + 4 : 136}
                tamanho={11}
              >
                acerto
              </Texto>
            </g>
          )}
          {/* A batida: o obstáculo encostado no herói, a explosão no encontro e a tremida. */}
          {bateu && (
            <g>
              <ActorFigure figure={obstaculo} x={186} y={piso} />
              <path
                className="fill-scene-flame"
                transform={`translate(154 ${alturaDoMeio})`}
                d={EXPLOSAO}
              />
              <path
                className="stroke-scene-alert"
                d={`M76 ${piso - 52}l-10 -4M72 ${piso - 34}h-12M76 ${piso - 16}l-10 4`}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {coracaoPerdido !== null && (
                <>
                  {/* A causa até o que ela mudou: batida → o coração apagado. */}
                  <path
                    className="stroke-scene-alert"
                    d={`M150 ${alturaDoMeio - 26}Q${70 + coracaoPerdido * 34} 110 ${35 + coracaoPerdido * 34} 60`}
                    fill="none"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                  />
                  <path
                    className="fill-scene-alert"
                    transform={`translate(${35 + coracaoPerdido * 34} 56)`}
                    d="M0 0l-6 11l12 1Z"
                  />
                  <Texto className="fill-scene-ink-soft" x={170} y={112} tamanho={11}>
                    batida
                  </Texto>
                </>
              )}
            </g>
          )}
          {/* Sem acontecimento, o obstáculo espera longe. */}
          {!acertou && !bateu && <ActorFigure figure={obstaculo} x={410} y={piso} />}
          {acabou && (
            <Texto
              className="fill-scene-alert"
              x={VIEW.w / 2}
              y={VIEW.h / 2}
              textAnchor="middle"
              tamanho={26}
              fontWeight="700"
              letterSpacing="2"
            >
              FIM
            </Texto>
          )}
        </>
      )}
    </SceneCanvas>
  )
}
