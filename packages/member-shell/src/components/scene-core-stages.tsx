'use client'

import type { SceneCast, SceneState } from '@sistemazero/core/learning/scene'
import { actorFigure, numero, quantos, sceneCenario } from '@sistemazero/core/learning/scene'
import { FundoDoCenario } from './scene-arte'
import { SceneCanvas, Texto } from './scene-canvas'
import { ActorFigure } from './scene-figures'

/**
 * Os palcos das onze cenas do núcleo do Iniciante 2D (15/09/2026).
 *
 * Elas não cabem no palco compartilhado (chão, árvores, pista do Corre Dino) porque cada uma
 * mostra uma coisa que aquele mundo não tem: a régua do quanto se andou num quadro, duas
 * raquetes lado a lado, uma caixa com um número dentro, o mundo maior que a tela, o mapa
 * escrito com letras. Cada uma tem a própria moldura e o próprio enquadramento.
 *
 * ⚠️ O par de comparação continua FIXO nas duas cores de sempre (A azul `scene-a`, B laranja
 * `scene-b`): elas dizem QUAL medida é qual, e não são decoração.
 *
 * ⚠️ Lote 5 do Raio-X (G5): nove palcos saíram para `scene-nucleo-stages.tsx`. Aqui ficaram a
 * `velocity` e a `variable`.
 */

/**
 * O recorte do estreito: a tela, a faixa de fora, as réguas e a régua de passos, sem a coluna "Cada
 * quadro" (que vai para a legenda). Com ele o desenho cresce de 0,56 para 0,75 num celular de 390px.
 */
const VEL_ESTREITO = { w: 420, h: 300 } as const
/** Quantos quadros a lista mostra no celular: os últimos, numa linha só por fila. */
const VEL_NO_CELULAR = 4
/** A tela da `velocity` no desenho: 0,6 unidade por unidade do jogo, com a faixa FORA da tela. */
const VEL = { escala: 0.6, x0: 60, y0: 64 } as const
const velX = (x: number) => VEL.x0 + x * VEL.escala
const velY = (y: number) => VEL.y0 + y * VEL.escala

/** A conta de UM quadro num eixo: "400 − 5 = 395", ou "fica 540" quando a borda segurou. */
function contaDoQuadro(antes: number, velocidade: number, agora: number): string {
  const n = (v: number) => numero(Math.round(v))
  if (agora !== antes + velocidade) return `fica ${n(agora)}`
  return `${n(antes)} ${velocidade < 0 ? '−' : '+'} ${Math.abs(velocidade)} = ${n(agora)}`
}

/**
 * A velocidade: UM quadro é UMA soma, e o desenho escreve a conta.
 *
 * ⭐⭐ Redesenho do lote 5 do Raio-X (16/09/2026). O Dino flutuava no céu com a régua só do x e um
 * fantasma do quadro anterior quase todo escondido atrás dele (com vy 3 o passo era 3 px). Agora:
 * - a TELA do jogo (480 por 270) tem régua nos DOIS eixos e a faixa "fora da tela" em cima e à
 *   direita: o cacto nasce depois de 480 e a pedra do Desafio nasce em y negativo;
 * - o rastro são PONTINHOS, um por quadro (`drive.trailX/Y`), e o da velocidade anterior fica em
 *   cinza ao lado (−5 contra −6 na Aula 12);
 * - a CONTA do último quadro fica colada no personagem ("400 − 5 = 395");
 * - à direita, "cada quadro" lista os números do rastro, porque um passo de 5 são 3 pixels no
 *   desenho e os números iguais é que mostram "passos iguais".
 * ⚠️ Sem pronome em nada que o elenco veste: "a pedra", nunca "ela".
 */
export function VelocityStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { x, y, fromX, fromY, vx, vy, trailX, trailY, prevX, prevY, steps } = state.drive
  const heroi = actorFigure(cast, 'hero')
  const mundo = sceneCenario(cast, 'velocity')
  const px = velX(x)
  const py = velY(y)
  const andouX = x !== fromX
  const andouY = y !== fromY
  const variou = (fila: readonly number[]) => fila.some((v) => v !== fila[0])
  /**
   * ⚠️ O eixo é o do ÚLTIMO movimento, contando o rastro de antes (consertos do review da onda A do lote
   * 5): parada depois de descer, a pedra do Dia 3 trocava a lista para "x 240" e o y sumia. Sem movimento
   * nenhum (a abertura), os dois.
   */
  const moveuY = variou(trailY) || vy !== 0 || variou(prevY)
  const moveuX = variou(trailX) || vx !== 0 || variou(prevX)
  const eixoY = moveuY || !moveuX
  const eixoX = moveuX || !moveuY
  /**
   * A conta só depois de um quadro (sem quadro, não houve soma). ⚠️ Com a velocidade em ZERO o quadro
   * também soma (consertos do review da onda A do lote 5): "x: 400 + 0 = 400" é a resposta da parte 3,
   * e o palco parado não mostrava soma nenhuma.
   */
  const parado = vx === 0 && vy === 0
  const contas = [
    steps > 0 && eixoX && (andouX || vx !== 0 || parado)
      ? `x: ${contaDoQuadro(fromX, vx, x)}`
      : null,
    steps > 0 && eixoY && (andouY || vy !== 0 || parado)
      ? `y: ${contaDoQuadro(fromY, vy, y)}`
      : null,
  ].filter((c): c is string => c !== null)
  const valor = (fila: readonly number[], i: number, eixo: 'x' | 'y') =>
    `${eixo} ${numero(Math.round(fila[i] ?? (eixo === 'x' ? x : y)))}`
  const linha = (i: number) =>
    [eixoX ? valor(trailX, i, 'x') : null, eixoY ? valor(trailY, i, 'y') : null]
      .filter(Boolean)
      .join(' · ')
  /** Um eixo só na lista e na régua de passos (com os dois, a lista segue numa coluna). */
  const umEixo: 'x' | 'y' | null = eixoX && !eixoY ? 'x' : eixoY && !eixoX ? 'y' : null
  const antes = umEixo === 'x' ? prevX : umEixo === 'y' ? prevY : []
  const agora = umEixo === 'x' ? trailX : umEixo === 'y' ? trailY : []
  /**
   * ⭐⭐ A RÉGUA DE PASSOS, embaixo da tela (consertos do review da onda A do lote 5, ALTO). Na escala da
   * tela, um passo de 5 são 3 pixels: quatro quadros andavam 12 pixels, com os pontinhos atrás do cacto,
   * e o −5 contra o −6 da Aula 12 só se lia na lista. Aqui o trecho do rastro é AMPLIADO (até 14 pixels
   * por unidade), uma marquinha por quadro, com a fileira de antes em cima da de agora e a seta do
   * sentido. ⚠️ Só no x: no y o rastro já é uma coluna à vista (o tiro sobe, a pedra desce), e deitar o
   * y numa régua de lado trocaria "para cima" por "para a esquerda".
   */
  const fileiras =
    umEixo === 'x' && steps > 0
      ? [
          ...(antes.length > 1 ? [{ nome: 'antes', valores: antes, cor: 'rule' as const }] : []),
          { nome: antes.length > 1 ? 'agora' : 'passos', valores: agora, cor: 'a' as const },
        ]
      : []
  const todosOsValores = fileiras.flatMap((f) => f.valores)
  const menor = Math.min(...todosOsValores)
  const faixa = Math.max(...todosOsValores) - menor
  const REGUA = { de: 150, largura: 214 } as const
  const unidade = faixa > 0 ? Math.min(14, REGUA.largura / faixa) : 0
  const naRegua = (v: number) =>
    faixa > 0
      ? REGUA.de + (REGUA.largura - faixa * unidade) / 2 + (v - menor) * unidade
      : REGUA.de + REGUA.largura / 2
  /**
   * Os valores da lista "Cada quadro" em linhas: antes e agora de um eixo, ou x e y. ⚠️ No estreito ela
   * mora FORA do desenho (conserto "letra no celular"), com os últimos `VEL_NO_CELULAR` quadros de cada linha.
   */
  const linhasDaLista = (ultimos?: number) => {
    const corte = (fila: readonly number[]) =>
      (ultimos ? fila.slice(-ultimos) : fila).map((v) => numero(Math.round(v)))
    if (umEixo && antes.length > 1)
      return [
        { nome: `antes ${umEixo}`, valores: corte(antes), agora: false },
        { nome: `agora ${umEixo}`, valores: corte(agora), agora: true },
      ]
    if (umEixo) return [{ nome: umEixo, valores: corte(agora), agora: true }]
    return [
      { nome: 'x', valores: corte(trailX), agora: true },
      { nome: 'y', valores: corte(trailY), agora: true },
    ]
  }
  return (
    <SceneCanvas
      cast={cast}
      mundo={mundo}
      titulo="A tela do jogo, com o Dino e um pontinho por quadro"
      // ⚠️ "para o lado" e "para baixo", como o deslizante (consertos do review da onda A do lote 5):
      // o leitor ouvia "vx 0, vy 0", um terceiro nome para o mesmo número.
      descricao={`Velocidade para o lado ${numero(vx)} e para baixo ${numero(vy)}. O Dino está em x ${numero(Math.round(x))}, y ${numero(Math.round(y))}.${
        steps > 0 ? ` No último quadro: ${contas.join('; ')}.` : ''
      }`}
      // ⚠️ O rodapé só DÁ NOME ao que está desenhado (lote 2 do Raio-X).
      rodape="Cada pontinho é um quadro."
      // ⭐⭐ No estreito a lista "Cada quadro" sai do desenho e vem para cá, e o desenho mostra só a tela
      // com as réguas (conserto "letra no celular"): no canto de um palco de 314px as linhas de 13
      // unidades viravam 7px, e com a letra de 12px elas se encavalavam umas nas outras.
      viewEstreito={VEL_ESTREITO}
      legenda={(palco) =>
        palco.estreito ? (
          <div
            aria-hidden
            data-cada-quadro=""
            // ⚠️ A altura de DUAS linhas fica reservada: a lista não pode empurrar a bancada no meio do
            // gesto (a de um eixo só vira antes e agora quando a velocidade muda).
            className="min-h-[4.25rem] px-3 pb-1 text-sm text-scene-ink"
          >
            <p className="font-bold">Cada quadro</p>
            {linhasDaLista(VEL_NO_CELULAR).map((linha) => (
              <p key={linha.nome} className="flex flex-wrap items-baseline gap-x-2">
                <span
                  className={`min-w-[4.5rem] font-semibold ${linha.agora ? 'text-scene-a' : 'text-scene-ink-soft'}`}
                >
                  {linha.nome}
                </span>
                {linha.valores.map((valor, i) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: um valor por quadro, na ordem
                    key={i}
                    className={`tabular-nums ${
                      linha.agora
                        ? `text-scene-a ${i === linha.valores.length - 1 ? 'font-bold' : ''}`
                        : 'text-scene-ink-soft'
                    }`}
                  >
                    {valor}
                  </span>
                ))}
              </p>
            ))}
          </div>
        ) : null
      }
    >
      {(palco) => {
        /**
         * ⚠️ No estreito a caixa da conta tem a largura do texto na letra em uso e fica dentro do recorte, e
         * a régua de passos parada encosta no começo (a frase "N quadros no mesmo lugar" cabe depois dela).
         */
        const alturaDaLinha = palco.estreito ? palco.letra(13) + 4 : 18
        const larguraDaConta = palco.estreito
          ? Math.max(118, ...contas.map((c) => palco.larguraDoTexto(c, 13) + 16))
          : 118
        const contaX = palco.estreito
          ? Math.max(64, Math.min(palco.view.w - 6 - larguraDaConta, px + 14))
          : Math.max(64, Math.min(262, px + 14))
        const contaY = Math.max(6, py - (palco.estreito ? 26 + contas.length * alturaDaLinha : 58))
        const naReguaAqui = (v: number) =>
          faixa === 0 && palco.estreito ? REGUA.de + 4 : naRegua(v)
        return (
          <>
            {/* O fora da tela: em cima (y negativo) e à direita (depois de 480). */}
            <rect
              className="fill-scene-b-wash"
              x={velX(0)}
              y={velY(-60)}
              width={velX(540) - velX(0)}
              height={velY(0) - velY(-60)}
            />
            <rect
              className="fill-scene-b-wash"
              x={velX(480)}
              y={velY(0)}
              width={velX(540) - velX(480)}
              height={velY(270) - velY(0)}
            />
            {/* ⚠️ O nome da faixa fica no canto ESQUERDO: no meio (x 240) é onde o tiro e a pedra do
          Desafio nascem, e a conta do quadro encostava nele. */}
            <Texto
              className="fill-scene-b-ink"
              x={velX(8)}
              y={velY(-30) + 4}
              tamanho={12}
              fontWeight="600"
            >
              fora da tela
            </Texto>
            {/* A tela do jogo: céu e chão na terra, estrelas no espaço. */}
            {/* ⚠️ `calmo`: o rastro e os números do passo são escritos por cima desta tela. */}
            <FundoDoCenario
              cenario={mundo}
              x={velX(0)}
              y={velY(0)}
              w={velX(480) - velX(0)}
              h={velY(270) - velY(0)}
              chao={velY(240) - velY(0)}
              detalhe="calmo"
            />
            <rect
              className="stroke-scene-ink"
              x={velX(0)}
              y={velY(0)}
              width={velX(480) - velX(0)}
              height={velY(270) - velY(0)}
              fill="none"
              strokeWidth="2"
            />
            {/* As réguas: x embaixo, y à esquerda (o 0 do y fica no ALTO da tela). */}
            {[0, 120, 240, 360, 480].map((v) => (
              <g key={`x${v}`}>
                <path
                  className="stroke-scene-rule"
                  d={`M${velX(v)} ${velY(270)}v6`}
                  strokeWidth="1.5"
                />
                <Texto
                  className="fill-scene-ink-soft"
                  x={velX(v)}
                  y={velY(270) + 18}
                  textAnchor="middle"
                  tamanho={11}
                >
                  {v}
                </Texto>
              </g>
            ))}
            <Texto
              className="fill-scene-ink-soft"
              // ⚠️ No estreito, depois da faixa de fora: em 510, na letra de 12px, o "x" encostava no 480.
              x={palco.estreito ? velX(540) + 10 : velX(510)}
              y={velY(270) + 18}
              textAnchor={palco.estreito ? 'start' : 'middle'}
              tamanho={11}
              fontWeight="600"
            >
              x
            </Texto>
            {[-60, 0, 90, 180, 270].map((v) => (
              <g key={`y${v}`}>
                <path
                  className="stroke-scene-rule"
                  d={`M${velX(0) - 6} ${velY(v)}h6`}
                  strokeWidth="1.5"
                />
                <Texto
                  className="fill-scene-ink-soft"
                  x={velX(0) - 9}
                  y={velY(v) + 4}
                  textAnchor="end"
                  tamanho={11}
                >
                  {numero(v)}
                </Texto>
              </g>
            ))}
            <Texto
              className="fill-scene-ink-soft"
              x={velX(0) - 22}
              y={velY(135) + 4}
              textAnchor="middle"
              tamanho={11}
              fontWeight="600"
            >
              y
            </Texto>
            <g className="text-primary">
              <ActorFigure figure={heroi} x={px} y={py + 16} escala={0.55} />
            </g>
            {/* O rastro de antes, em cinza; o de agora, na cor do par. ⚠️ DEPOIS do personagem, com o
          contorno do papel (consertos do review da onda A do lote 5): desenhado antes, o cacto cobria
          os pontinhos e sobrava um pingo azul na borda dele. */}
            {prevX.map((v, i) => (
              <circle
                // biome-ignore lint/suspicious/noArrayIndexKey: o rastro é uma fila de quadros, na ordem
                key={`p${i}`}
                className="fill-scene-rule stroke-scene-card"
                cx={velX(v)}
                cy={velY(prevY[i] ?? y)}
                r="3"
                strokeWidth="1"
              />
            ))}
            {trailX.map((v, i) => (
              <circle
                // biome-ignore lint/suspicious/noArrayIndexKey: o rastro é uma fila de quadros, na ordem
                key={`t${i}`}
                className="fill-scene-a stroke-scene-card"
                cx={velX(v)}
                cy={velY(trailY[i] ?? y)}
                r="3.5"
                strokeWidth="1"
              />
            ))}
            {fileiras.map((fileira, f) => {
              const ry = 266 + (fileiras.length === 1 ? 10 : f * 22)
              const valores = fileira.valores
              const primeiro = valores[0] ?? 0
              const ultimo = valores[valores.length - 1] ?? primeiro
              const sentido = Math.sign(ultimo - primeiro)
              const ponta = naReguaAqui(ultimo) + sentido * 12
              return (
                <g key={fileira.nome} data-regua-de-passos={fileira.nome}>
                  <Texto
                    className={fileira.cor === 'a' ? 'fill-scene-a' : 'fill-scene-ink-soft'}
                    x={velX(0)}
                    y={ry + 4}
                    tamanho={12}
                    fontWeight="600"
                  >
                    {fileira.nome}
                  </Texto>
                  <path
                    className="stroke-scene-rule"
                    d={`M${naReguaAqui(Math.min(...valores))} ${ry}H${naReguaAqui(Math.max(...valores))}`}
                    strokeWidth="1.5"
                  />
                  {valores.map((v, i) => (
                    <circle
                      // biome-ignore lint/suspicious/noArrayIndexKey: uma marquinha por quadro, na ordem
                      key={i}
                      className={fileira.cor === 'a' ? 'fill-scene-a' : 'fill-scene-rule'}
                      cx={naReguaAqui(v)}
                      cy={ry}
                      r={i === valores.length - 1 ? 4.5 : 3.5}
                    />
                  ))}
                  {sentido !== 0 ? (
                    <path
                      className={fileira.cor === 'a' ? 'stroke-scene-a' : 'stroke-scene-rule'}
                      d={`M${ponta - sentido * 6} ${ry - 5}L${ponta} ${ry}L${ponta - sentido * 6} ${ry + 5}`}
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                    />
                  ) : (
                    valores.length > 1 &&
                    (() => {
                      /**
                       * ⚠️ No estreito a frase encurta ("5 quadros no lugar") e fica DENTRO do recorte:
                       * depois do ponto se couber, antes dele se não couber (conserto "letra no celular").
                       */
                      const texto = palco.estreito
                        ? `${quantos(valores.length, 'quadro', 'quadros')} no lugar`
                        : `${quantos(valores.length, 'quadro', 'quadros')} no mesmo lugar`
                      const ponto = naReguaAqui(primeiro)
                      const largura = palco.larguraDoTexto(texto, 12)
                      const direita = palco.view.w - 4
                      const depois = !palco.estreito || ponto + 12 + largura <= direita
                      return (
                        <Texto
                          className="fill-scene-ink-soft"
                          x={depois ? ponto + 12 : Math.max(ponto - 12, velX(0) + 60 + largura)}
                          y={ry + 4}
                          textAnchor={depois ? 'start' : 'end'}
                          tamanho={12}
                        >
                          {texto}
                        </Texto>
                      )
                    })()
                  )}
                </g>
              )
            })}
            {contas.length > 0 && (
              <g transform={`translate(${contaX} ${contaY})`}>
                <rect
                  className="fill-scene-card stroke-scene-a"
                  width={larguraDaConta}
                  height={10 + contas.length * alturaDaLinha}
                  rx="8"
                  strokeWidth="1.5"
                />
                {contas.map((c, i) => (
                  <Texto
                    key={c}
                    className="fill-scene-a"
                    x="8"
                    y={1 + alturaDaLinha * (i + 1)}
                    tamanho={13}
                    fontWeight="700"
                  >
                    {c}
                  </Texto>
                ))}
              </g>
            )}
            {/* "Cada quadro": os números do rastro, um embaixo do outro. ⚠️ Com o rastro de antes, DUAS
          colunas, antes (cinza) e agora (azul) (consertos do review da onda A do lote 5): a lista do −5
          sumia quando o −6 começava, e a comparação da Aula 12 ficava na memória. */}
            {!palco.estreito && (
              <g transform="translate(404 24)">
                <Texto className="fill-scene-ink" x="0" y="12" tamanho={13} fontWeight="700">
                  Cada quadro
                </Texto>
                {umEixo && antes.length > 1
                  ? [
                      { nome: 'antes', fila: antes, dx: 0 },
                      { nome: 'agora', fila: agora, dx: 76 },
                    ].map((coluna) => (
                      <g key={coluna.nome} data-coluna={coluna.nome}>
                        <Texto
                          className={
                            coluna.nome === 'agora' ? 'fill-scene-a' : 'fill-scene-ink-soft'
                          }
                          x={coluna.dx}
                          y="34"
                          tamanho={12}
                          fontWeight="600"
                        >
                          {coluna.nome}
                        </Texto>
                        {coluna.fila.map((_, i) => (
                          <Texto
                            // biome-ignore lint/suspicious/noArrayIndexKey: o rastro é uma fila de quadros, na ordem
                            key={i}
                            className={
                              coluna.nome === 'agora' ? 'fill-scene-a' : 'fill-scene-ink-soft'
                            }
                            x={coluna.dx}
                            y={54 + i * 18}
                            tamanho={13}
                            fontWeight={
                              coluna.nome === 'agora' && i === coluna.fila.length - 1 ? 700 : 400
                            }
                          >
                            {valor(coluna.fila, i, umEixo)}
                          </Texto>
                        ))}
                      </g>
                    ))
                  : trailX.map((_, i) => (
                      <Texto
                        // biome-ignore lint/suspicious/noArrayIndexKey: o rastro é uma fila de quadros, na ordem
                        key={i}
                        className={i === trailX.length - 1 ? 'fill-scene-a' : 'fill-scene-ink-soft'}
                        x="0"
                        y={36 + i * 20}
                        tamanho={13}
                        fontWeight={i === trailX.length - 1 ? 700 : 400}
                      >
                        {linha(i)}
                      </Texto>
                    ))}
              </g>
            )}
          </>
        )
      }}
    </SceneCanvas>
  )
}
/** Os três blocos do Estúdio que a `variable` acende, na ordem do jogo do Desafio. */
const BLOCOS_DA_CAIXA = ['Criar variável pontos', 'Somar em pontos', 'Mostrar placar'] as const
/** O recorte do estreito da `variable`: sem a fileira dos blocos (que vai para baixo do desenho). */
const VARIAVEL_ESTREITA = { x: 0, y: 44, w: 560, h: 196 } as const

/**
 * A caixa com um número dentro, e a tela do jogo ao lado.
 *
 * ⭐⭐ Redesenho do lote 5 do Raio-X (16/09/2026). Na demonstração do Dia 4 o gesto não aparecia (a
 * caixa "Observe a montagem" saía vazia) e os números não tinham história (guardar 10, somar 5).
 * Agora:
 * - os TRÊS BLOCOS do Estúdio ficam em fila no alto e acendem conforme acontecem (criar a caixa,
 *   somar, mostrar), então o gesto está no desenho;
 * - cada soma é um ACERTO: os alvos da tela do jogo vão sendo atingidos, e a caixa conta, com a tela
 *   ainda sem placar;
 * - a ligação caixa → tela fica SÓLIDA quando o placar é mostrado ("Pontos: 3", como no Estúdio).
 * ⚠️ Antes de criar, a caixa é um contorno tracejado: "ainda não existe" é diferente de "guarda 0".
 */
export function VariableStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { value, shown, changes, created } = state.box
  const mundo = sceneCenario(cast, 'variable')
  const obstaculo = actorFigure(cast, 'obstacle')
  const acesos = [created, changes > 0, shown]
  const acertos = Math.min(changes, 3)
  return (
    <SceneCanvas
      cast={cast}
      mundo={mundo}
      titulo="Os blocos, a caixa pontos e a tela do jogo"
      descricao={`${created ? `A caixa pontos guarda ${value}.` : 'A caixa pontos ainda não existe.'} A tela ${shown ? `mostra Pontos: ${value}` : 'não mostra placar'}.`}
      // ⚠️ SEM rodapé (lote 2 do Raio-X): "A caixa é o que o jogo GUARDA. A tela é o que ele
      // MOSTRA." era a conclusão da cena desde a abertura, com um pronome que o elenco não veste.
      // ⭐ No estreito os três blocos saem do desenho e vêm para baixo dele, acendendo do mesmo jeito
      // (conserto "letra no celular"): numa caixa de 166 unidades, "Criar variável pontos" na letra de
      // 12px passava das bordas e cobria o bloco do lado. O desenho perde a fileira de cima.
      viewEstreito={VARIAVEL_ESTREITA}
      legenda={(palco) =>
        palco.estreito ? (
          <ul aria-hidden data-blocos-da-caixa="" className="flex flex-wrap gap-2 px-3 pb-3">
            {BLOCOS_DA_CAIXA.map((bloco, i) => (
              <li
                key={bloco}
                data-aceso={acesos[i] ? '' : undefined}
                className={`rounded-xl px-3 py-1 text-sm font-bold ${
                  acesos[i]
                    ? 'border-[3px] border-scene-a bg-scene-a-wash text-scene-a'
                    : 'border-2 border-scene-card-line bg-scene-card text-scene-ink-soft'
                }`}
              >
                {bloco}
              </li>
            ))}
          </ul>
        ) : null
      }
    >
      {(palco) => (
        <>
          {/* ⚠️ No estreito a fileira dos blocos mora embaixo do desenho (a legenda). */}
          {!palco.estreito &&
            BLOCOS_DA_CAIXA.map((bloco, i) => (
              <g key={bloco} transform={`translate(${20 + i * 178} 14)`}>
                <rect
                  className={
                    acesos[i]
                      ? 'fill-scene-a-wash stroke-scene-a'
                      : 'fill-scene-card stroke-scene-card-line'
                  }
                  width="166"
                  height="38"
                  rx="12"
                  strokeWidth={acesos[i] ? 3 : 2}
                />
                <Texto
                  className={acesos[i] ? 'fill-scene-a' : 'fill-scene-ink-soft'}
                  x="83"
                  y="24"
                  textAnchor="middle"
                  tamanho={13}
                  fontWeight="700"
                >
                  {bloco}
                </Texto>
              </g>
            ))}
          <g>
            <rect
              className={
                created ? 'fill-scene-grass stroke-scene-a' : 'fill-none stroke-scene-rule'
              }
              x={40}
              y={80}
              width="180"
              height="150"
              rx="16"
              strokeWidth="3"
              strokeDasharray={created ? undefined : '8 6'}
            />
            <Texto className="fill-scene-ink-soft" x={130} y={110} textAnchor="middle" tamanho={13}>
              pontos
            </Texto>
            {created ? (
              <>
                <Texto
                  className="fill-scene-ink"
                  x={130}
                  y={178}
                  textAnchor="middle"
                  tamanho={58}
                  fontWeight="700"
                >
                  {value}
                </Texto>
                <Texto
                  className="fill-scene-ink-soft"
                  x={130}
                  y={212}
                  textAnchor="middle"
                  tamanho={12}
                >
                  mudou {quantos(changes, 'vez', 'vezes')}
                </Texto>
              </>
            ) : (
              // ⚠️ Em duas linhas no estreito: numa só, na letra de 12px, passava das bordas da caixa.
              <Texto
                className="fill-scene-ink-soft"
                x={130}
                y={165}
                textAnchor="middle"
                tamanho={13}
              >
                {palco.estreito ? (
                  <>
                    <tspan x={130} dy={-palco.letra(13) / 2}>
                      ainda não
                    </tspan>
                    <tspan x={130} dy={palco.letra(13) + 2}>
                      existe
                    </tspan>
                  </>
                ) : (
                  'ainda não existe'
                )}
              </Texto>
            )}
          </g>
          {/* A ligação da caixa com a tela: tracejada enquanto ninguém mostra, sólida com o placar. */}
          <path
            className={shown ? 'stroke-scene-a' : 'stroke-scene-rule'}
            d="M226 155H310"
            strokeWidth={shown ? 4 : 2}
            strokeDasharray={shown ? undefined : '5 4'}
          />
          {shown && <path className="fill-scene-a" d="M314 155l-10 -7v14Z" />}
          <g>
            {/* No espaço, a tela do jogo é o céu de estrelas; a caixa do placar continua caixa. */}
            {/* Sem estrelinhas atrás do placar da tela: uma delas virava parte do número. */}
            {/* A tela do jogo, dentro do palco. ⚠️ `calmo` e a zona: o valor guardado é escrito aqui. */}
            <FundoDoCenario
              cenario={mundo}
              x={320}
              y={80}
              w={210}
              h={150}
              detalhe="calmo"
              semDetalhe={[{ x: 6, y: 4, w: 110, h: 34 }]}
            />
            <rect
              className={`$'fill-none' stroke-scene-line`}
              x={320}
              y={80}
              width="210"
              height="150"
              rx="10"
              strokeWidth="2"
            />
            <Texto className="fill-scene-ink-soft" x={425} y={72} textAnchor="middle" tamanho={12}>
              a tela do jogo
            </Texto>
            {shown && (
              <Texto className="fill-scene-b-ink" x={332} y={108} tamanho={20} fontWeight="700">
                Pontos: {value}
              </Texto>
            )}
            {/* Os alvos: cada soma é um acerto, e o alvo acertado ganha a explosão. */}
            {[0, 1, 2].map((i) => {
              const x = 368 + i * 58
              const acertado = i < acertos
              return (
                <g key={i}>
                  <g opacity={acertado ? 0.35 : 1}>
                    <ActorFigure figure={obstaculo} x={x} y={168} escala={0.55} />
                  </g>
                  {acertado && (
                    <path
                      className="fill-scene-flame"
                      transform={`translate(${x} 152)`}
                      d="M0 -14L4 -4L14 -6L7 1L13 10L2 6L0 16L-3 6L-13 10L-7 1L-14 -6L-4 -4Z"
                    />
                  )}
                </g>
              )
            })}
            <g className="text-primary">
              <ActorFigure figure={actorFigure(cast, 'hero')} x={425} y={224} escala={0.8} />
            </g>
          </g>
        </>
      )}
    </SceneCanvas>
  )
}
