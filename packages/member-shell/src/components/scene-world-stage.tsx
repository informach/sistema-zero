'use client'

import type { SceneCast, SceneState } from '@sistemazero/core/learning/scene'
import { DinoFigure, TreeFigure } from './exploration-stage'
import { SceneCanvas } from './scene-canvas'

/**
 * `world` — criar e mostrar são a mesma coisa?
 *
 * ⭐⭐ **A comparação virou ESTRUTURA (lote 5).** Esta é a primeira experimentação da primeira
 * aula do curso carro-chefe, e o assunto dela é *bastidores × tela*. Até 15/09/2026 os dois
 * NUNCA apareciam juntos: o palco desenhava só a tela do jogo, "bastidores" era um controle lá
 * embaixo, e a criança LIA que o Dino existia sem aparecer. Foi o item 2 do diagnóstico do print
 * que a dona mandou.
 *
 * Agora são dois painéis lado a lado, com nome. A criança cria o Dino e o vê aparecer **num
 * lado só** — a descoberta acontece na imagem, não na frase abaixo dela.
 *
 * ⚠️ O enquadramento é METADE do palco compartilhado (300 × 310 contra 600 × 310): cada lado é
 * uma coluna, e o desenho de dentro é feito nessas unidades. O chão, a linha e o Dino ficam nos
 * mesmos lugares relativos dos outros palcos para a cena não parecer de outro jogo.
 */
const LADO = { w: 300, h: 310 } as const

/** O papel de um lado: céu, chão e a linha. O mesmo do palco compartilhado, em meia largura. */
function Papel({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <rect className="fill-scene-sky" width={LADO.w} height={LADO.h} />
      <path className="fill-scene-grass" d={`M0 238H${LADO.w}V${LADO.h}H0Z`} />
      <path className="stroke-scene-line" d={`M0 238H${LADO.w}`} strokeWidth="2" />
      {children}
    </>
  )
}

export function WorldStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { created, drawn } = state.world
  return (
    <SceneCanvas
      view={LADO}
      cast={cast}
      titulo="Os bastidores e a tela do jogo, lado a lado"
      descricao={
        created
          ? drawn
            ? 'O Dino está guardado nos bastidores E desenhado na tela.'
            : 'O Dino está guardado nos bastidores, e a tela do jogo continua vazia.'
          : 'Os bastidores estão vazios e a tela do jogo também.'
      }
      rodape={
        created
          ? drawn
            ? 'O mesmo Dino: guardado de um lado, desenhado do outro.'
            : 'Ele existe de um lado e não aparece do outro. Criar e mostrar são duas coisas.'
          : 'Os dois lados esperam alguém criar o Dino.'
      }
      comparacao={[
        {
          titulo: 'Nos bastidores',
          descricao: created
            ? 'Uma caixa com o Dino guardado dentro.'
            : 'Uma caixa vazia, esperando.',
          desenho: (
            <>
              <Papel />
              {/* A caixa dos bastidores: o Dino existe AQUI antes de existir na tela. */}
              <rect
                className="fill-scene-card stroke-scene-card-line"
                x="40"
                y="96"
                width="220"
                height="150"
                rx="16"
                strokeWidth="2"
                strokeDasharray={created ? undefined : '8 8'}
              />
              {created ? (
                <g className="text-primary">
                  <DinoFigure x={150} y={228} />
                </g>
              ) : (
                <text
                  className="fill-scene-ink-soft"
                  x="150"
                  y="176"
                  textAnchor="middle"
                  fontSize="15"
                >
                  ainda vazio
                </text>
              )}
            </>
          ),
        },
        {
          titulo: 'Na tela do jogo',
          descricao: drawn
            ? 'A tela do jogo com o Dino desenhado entre as árvores.'
            : 'A tela do jogo com as árvores, e ninguém desenhado.',
          desenho: (
            <>
              <Papel>
                {[70, 150, 230].map((x, i) => (
                  <TreeFigure key={x} x={x} y={i === 1 ? 238 : 253} dark={i === 1} />
                ))}
              </Papel>
              {drawn ? (
                <g className="text-primary">
                  <DinoFigure x={150} y={238} />
                </g>
              ) : (
                <text
                  className="fill-scene-ink-soft"
                  x="150"
                  y="150"
                  textAnchor="middle"
                  fontSize="15"
                >
                  {created ? 'Existe. E aqui?' : 'Quem vai morar aqui?'}
                </text>
              )}
            </>
          ),
        },
      ]}
    />
  )
}
