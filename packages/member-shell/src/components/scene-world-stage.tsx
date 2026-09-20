'use client'

import {
  actorFigure,
  castText,
  cenarioTemChao,
  type SceneCast,
  type SceneCenarioId,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import { FundoDoCenario } from './scene-arte'
import { SceneCanvas, Texto } from './scene-canvas'
import { useSceneCenario } from './scene-cenario-context'
import { ActorFigure } from './scene-figures'

/**
 * `world` — criar e mostrar são duas coisas diferentes
 *
 * ⭐⭐ **A comparação virou ESTRUTURA (lote 5 do redesenho de 15/09).** Esta é a primeira
 * experimentação da primeira aula do curso carro-chefe, e o assunto dela é *bastidores × tela*.
 * São dois painéis lado a lado, com nome, e a criança vê o Dino aparecer num lado só.
 *
 * ⭐⭐ **Lote 5 do Raio-X (16/09/2026): os bastidores são uma FICHA, não outra tela.** O lado dos
 * bastidores tinha céu, grama e linha do horizonte, com a caixa pousada na grama: eram dois lugares
 * desenhados como duas telas de jogo, e a diferença que a cena ensina (guardado × mostrado) não
 * aparecia na forma. Hoje ele é papel liso com a ficha do personagem (a figura pequena, o nome e o
 * lugar), e a tela do jogo desenha ESSE personagem NESSE lugar, com a mesma cor. A ficha acende na
 * cor do desenho enquanto ele está ligado: "o mesmo" fica visível, e não só escrito na meta.
 *
 * ⚠️ O enquadramento é METADE do palco compartilhado (300 × 310 contra 600 × 310): cada lado é
 * uma coluna, e o desenho de dentro é feito nessas unidades.
 */
const LADO = { w: 300, h: 310 } as const
/**
 * Os recortes de cada lado quando os dois ficam EMPILHADOS (celular, consertos do lote "letra no
 * celular"): de pé, cada lado ocupa a largura inteira, e as duas vistas com a margem vazia em volta
 * passavam de ~700px, mais que uma tela de celular. A ficha vai de 70 a 250 e a tela do jogo, com o
 * rótulo do aro, de ~75 a ~235.
 */
const FICHA_EMPILHADA = { x: 0, y: 52, w: LADO.w, h: 216 } as const
const TELA_EMPILHADA = { x: 0, y: 58, w: LADO.w, h: 194 } as const

/**
 * O personagem no JOGO de cada CENÁRIO: a tela e o endereço que a criança digitou no Estúdio uma
 * seção antes. ⚠️ São os números dos cursos, e não enfeite: o Dino da Aula 1 é "x 110, y 150,
 * tamanho 64" numa tela de 480 × 270; a nave do Dia 1 é "x 400, y 410, largura 54 e altura 62"
 * numa de 800 × 480.
 *
 * ⚠️⚠️ É um `Record<SceneCenarioId, …>` de propósito, e não um objeto solto: cenário novo no core
 * passa a ser erro de TIPO aqui. Enquanto as chaves eram `terra`/`espaco`, um cenário novo caía em
 * `undefined` e o palco quebrava só em execução, num teste distante.
 */
const NO_JOGO: Record<
  SceneCenarioId,
  {
    tela: { w: number; h: number }
    x: number
    y: number
    caixa: { w: number; h: number; centro: number }
  }
> = {
  'corre-dino': {
    tela: { w: 480, h: 270 },
    x: 110,
    y: 150,
    caixa: { w: 64, h: 64, centro: 9.5 },
  },
  nave: { tela: { w: 800, h: 480 }, x: 400, y: 410, caixa: { w: 54, h: 62, centro: 0 } },
  // O gorila fica no alto de um prédio, numa tela do tamanho da do Corre Dino.
  gorilas: { tela: { w: 480, h: 270 }, x: 60, y: 120, caixa: { w: 30, h: 36, centro: 0 } },
  // A pedra do Meu Jeito divide a tela do Desafio: os dois jogos são no espaço.
  'meu-jeito': { tela: { w: 800, h: 480 }, x: 400, y: 410, caixa: { w: 44, h: 32, centro: 0 } },
}

export function WorldStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { created, drawn } = state.world
  // O palco repete a regra do motor: só um personagem criado pode aparecer na tela do jogo.
  const naTela = created && drawn
  const heroi = actorFigure(cast, 'hero')
  const mundo = useSceneCenario(cast, 'world')
  const espaco = !cenarioTemChao(mundo)
  const jogo = NO_JOGO[mundo]
  // ⚠️ O nome da ficha é o do BLOCO do Estúdio, em minúsculas ("dino", "nave").
  const nome = castText('Dino', cast).toLowerCase()
  const escala = (LADO.w - 40) / jogo.tela.w
  const tela = {
    x: 20,
    y: (LADO.h - jogo.tela.h * escala) / 2,
    w: jogo.tela.w * escala,
    h: jogo.tela.h * escala,
  }
  const ficha = { x: 50, y: 70, w: 200, h: 180 }
  return (
    <SceneCanvas
      view={LADO}
      cast={cast}
      mundo={mundo}
      titulo="Os bastidores e a tela do jogo, lado a lado"
      descricao={
        created
          ? drawn
            ? 'O Dino está nos bastidores e também na tela do jogo.'
            : 'O Dino está nos bastidores, e a tela do jogo continua vazia.'
          : 'Os bastidores estão vazios e a tela do jogo também.'
      }
      // ⚠️⚠️ SEM rodapé e SEM texto por cima do desenho, em estado nenhum (lote 1 do Raio-X e o review
      // dele): "Quem vai morar aqui?", "Existe. E aqui?", "Os dois lados esperam alguém criar o Dino"
      // e "Ele existe de um lado e não aparece do outro" diziam a resposta, ou mentiam, ou tinham
      // pronome que não concorda com a nave. Os nomes dos dois painéis dizem o que cada lado é.
      comparacao={[
        {
          titulo: 'Nos bastidores',
          viewEmpilhado: FICHA_EMPILHADA,
          descricao: created
            ? // ⚠️ "guardada" longe do nome: colado, o elenco o flexionaria pelo personagem.
              `Uma ficha guardada, do Dino: nome ${nome}, x ${jogo.x}, y ${jogo.y}.`
            : 'Nenhuma ficha guardada ainda.',
          desenho: (
            <>
              {/* Papel LISO: os bastidores não são uma tela de jogo. */}
              <rect className="fill-scene-card" width={LADO.w} height={LADO.h} />
              <rect
                data-ficha=""
                data-acesa={naTela ? '' : undefined}
                className={
                  created
                    ? naTela
                      ? 'fill-scene-card stroke-primary'
                      : 'fill-scene-card stroke-scene-card-line'
                    : 'fill-transparent stroke-scene-card-line'
                }
                x={ficha.x}
                y={ficha.y}
                width={ficha.w}
                height={ficha.h}
                rx="16"
                strokeWidth={naTela ? 4 : 2}
                strokeDasharray={created ? undefined : '8 8'}
              />
              {created ? (
                <>
                  <Texto
                    className="fill-scene-ink"
                    x={LADO.w / 2}
                    y={ficha.y + 32}
                    textAnchor="middle"
                    tamanho={16}
                    fontWeight="700"
                  >
                    nome: {nome}
                  </Texto>
                  <g className="text-primary">
                    <ActorFigure
                      figure={heroi}
                      x={LADO.w / 2 + jogo.caixa.centro * 0.9}
                      y={ficha.y + 120}
                      escala={0.9}
                    />
                  </g>
                  <Texto
                    className="fill-scene-ink-soft"
                    x={LADO.w / 2}
                    y={ficha.y + 158}
                    textAnchor="middle"
                    tamanho={15}
                    fontWeight="600"
                  >
                    {`x ${jogo.x} · y ${jogo.y}`}
                  </Texto>
                </>
              ) : (
                <Texto
                  className="fill-scene-ink-soft"
                  x={LADO.w / 2}
                  y={ficha.y + ficha.h / 2 + 5}
                  textAnchor="middle"
                  tamanho={15}
                >
                  ainda vazio
                </Texto>
              )}
            </>
          ),
        },
        {
          titulo: 'Na tela do jogo',
          viewEmpilhado: TELA_EMPILHADA,
          descricao: naTela
            ? espaco
              ? 'A tela do jogo com o Dino entre as estrelas.'
              : 'A tela do jogo com o Dino.'
            : espaco
              ? 'A tela do jogo só com as estrelas do fundo, sem o Dino.'
              : 'A tela do jogo sem o Dino.',
          desenho: (
            <>
              <rect className="fill-scene-card" width={LADO.w} height={LADO.h} />
              {/* A tela mantém só o cenário enquanto o Dino ainda está nos bastidores. */}
              <FundoDoCenario
                cenario={mundo}
                x={tela.x}
                y={tela.y}
                w={tela.w}
                h={tela.h}
                detalhe="calmo"
              />
              <rect
                className="stroke-scene-line"
                x={tela.x}
                y={tela.y}
                width={tela.w}
                height={tela.h}
                fill="none"
                strokeWidth="2"
              />
              {naTela && (
                <g className="text-primary">
                  {/* O MESMO lugar da ficha: o canto de cima da caixa em (x, y) do jogo. */}
                  <ActorFigure
                    figure={heroi}
                    x={tela.x + (jogo.x + jogo.caixa.w / 2 + jogo.caixa.centro) * escala}
                    y={tela.y + (jogo.y + jogo.caixa.h - 2) * escala}
                    escala={escala}
                  />
                </g>
              )}
              {/* ⚠️⚠️ O aro na cor da ficha e a etiqueta com o MESMO lugar dela (consertos do review da
                  onda A do lote 5): no Desafio a tela de 800 × 480 cabe em 260 unidades, e a nave virava
                  um pontinho no pé da tela, enquanto a ficha mostrava a nave grande. "O mesmo" dependia
                  de achar o pontinho. */}
              {naTela &&
                (() => {
                  const cx = tela.x + (jogo.x + jogo.caixa.w / 2) * escala
                  const cy = tela.y + (jogo.y + jogo.caixa.h / 2) * escala
                  const r = (Math.max(jogo.caixa.w, jogo.caixa.h) * escala) / 2 + 8
                  return (
                    <g data-aro-do-desenho="">
                      <circle
                        className="stroke-primary"
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        strokeWidth="3"
                      />
                      <Texto
                        className="fill-scene-ink"
                        x={cx}
                        y={cy - r - 6}
                        textAnchor="middle"
                        tamanho={13}
                        fontWeight="700"
                      >
                        {`x ${jogo.x} · y ${jogo.y}`}
                      </Texto>
                    </g>
                  )
                })()}
            </>
          ),
        },
      ]}
    />
  )
}
