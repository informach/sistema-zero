'use client'

import type { SceneAction, SceneCast, SceneState } from '@sistemazero/core/learning/scene'
import {
  FOLHA_DA_NAVE,
  LUPA,
  mirrorAxes,
  NAVE_FOGO,
  onionFireLength,
  onionFireZone,
  PAPEL_DO_ESPELHO,
  quantos,
  sheetCropCell,
  symmetryCells,
} from '@sistemazero/core/learning/scene'
import { type PointerEvent, useEffect, useId, useRef, useState } from 'react'
// ⚠️ O enquadramento COMUM (560 × 300): as sete cenas nasceram de novo neste lote, e cena nova herda
// o `SCENE_VIEW` em vez de escolher o seu (`tests/scene-identity.test.ts`).
import { SceneCanvas, Texto, SCENE_VIEW as VIEW } from './scene-canvas'

/**
 * O ATELIÊ de O Jogo do Meu Jeito, redesenhado no lote 5 do Raio-X (16/09/2026, G4).
 *
 * ⭐⭐ As sete cenas de desenho são a PONTE entre a aula e o Pinta, e o desenho não era o da aula: o
 * Dino do Corre Dino ANDAVA entre os quadros (a Aula 3 chama isso de erro), o espelho tinha um eixo
 * que o Pinta não tem, a pedra de pixel tinha outra silhueta que a de vetor, a folha era de 64 × 64
 * com quatro Dinos, a sombra "da mesma cor" era verde-oliva. Aqui o desenho É o da aula:
 * - a NAVE 32 × 32 com o fogo pequeno e o grande (`frames`, `onion-skin`, `sheet-vs-sprite`), com o
 *   corpo sempre igual e só o fogo mudando;
 * - a grade 16 × 16 com o MEIO fixo e os dois espelhos do Pinta (`symmetry`);
 * - a MESMA curva em vetor e rasterizada em 16 × 16, numa lupa só (`pixel-vector`);
 * - a pedra do asteroide sobre o xadrez do "Sem cor" (`fill-stroke`) e a bola em três tons de azul
 *   (`shading`).
 *
 * ⚠️⚠️ Nenhuma delas desenha papel do ELENCO (`SCENE_ROLES` do core as lista vazias): o desenho é o
 * que a criança fez no Pinta, e não uma figura que troca de curso para curso.
 * ⚠️ As réguas (o tamanho do fogo, as marcas do espelho, a lupa, o recorte) moram no core
 * (`atelie.ts`): o motor, a faixa e este palco dizem a mesma coisa.
 * ⚠️ Rótulo dentro do SVG com 18 unidades ou mais: num celular de 360 px o palco encolhe a ~60%, e os
 * rótulos de 11 e 12 viravam 6 px (relatório g4).
 */

type Retangulo = readonly [number, number, number, number]

/* ── A nave 32 × 32 ───────────────────────────────────────────────────────────────────────────── */

/** O casco da nave na grade de 32: bico, cabeça, corpo e as duas asas. Simétrico em volta do 16. */
const CASCO: readonly Retangulo[] = [
  [15, 2, 2, 3],
  [13, 5, 6, 4],
  [11, 9, 10, 11],
  [5, 13, 6, 5],
  [21, 13, 6, 5],
]
/** As pontas vermelhas (o bico e as pontas das asas). */
const ALETAS: readonly Retangulo[] = [
  [15, 2, 2, 1],
  [5, 11, 2, 2],
  [25, 11, 2, 2],
]
const JANELA: Retangulo = [14, 8, 4, 5]

/** O fogo de `tamanho` linhas saindo do corpo na linha 20: largo, depois mais fino na ponta. */
function linhasDoFogo(tamanho: number): { fogo: Retangulo[]; miolo: Retangulo[] } {
  const fogo: Retangulo[] = []
  const miolo: Retangulo[] = []
  for (let r = 0; r < tamanho; r++) {
    const y = NAVE_FOGO.saida + r
    const resto = tamanho - r
    fogo.push(resto === 1 ? [15, y, 2, 1] : resto === 2 ? [14, y, 4, 1] : [13, y, 6, 1])
    if (r < Math.ceil(tamanho / 2)) miolo.push([15, y, 2, 1])
  }
  return { fogo, miolo }
}

const caminho = (retangulos: readonly Retangulo[]) =>
  retangulos.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}Z`).join('')

/** O corpo da nave, na origem da grade de 32. ⚠️ Pintado UMA vez: ele não muda entre os quadros. */
function CorpoDaNave() {
  return (
    <g data-corpo-da-nave>
      <path className="text-primary" fill="currentColor" d={caminho(CASCO)} />
      <path className="fill-scene-fin" d={caminho(ALETAS)} />
      <path className="fill-scene-window" d={caminho([JANELA])} />
    </g>
  )
}

/** O contorno de fora do fogo de `tamanho` linhas: desce pela direita e sobe pela esquerda. */
function contornoDoFogo(tamanho: number) {
  const { fogo } = linhasDoFogo(tamanho)
  const [x0 = 0, y0 = 0] = fogo[0] ?? []
  let d = `M${x0} ${y0}`
  for (const [x, y, w] of fogo) d += `H${x + w}V${y + 1}`
  for (const [x, y] of [...fogo].reverse()) d += `H${x}V${y}`
  return `${d}Z`
}

/** O fogo de uma nave, com `tamanho` linhas (`NAVE_FOGO.pequeno` ou `grande`, ou o do fantasma). */
function FogoDaNave({ tamanho, fantasma = false }: { tamanho: number; fantasma?: boolean }) {
  const { fogo, miolo } = linhasDoFogo(tamanho)
  if (fantasma)
    return (
      /* ⚠️⚠️ O fantasma é SÓ o contorno tracejado do fogo 1, POR CIMA do fogo 2 inteiro. No Pinta ele
         fica por baixo, mas lá o quadro novo costuma ter quadradinhos vazios; aqui o fogo 2 é sempre
         maior que o 1 e o cobriria inteiro. ⚠️⚠️ E SEM preenchimento (consertos do review da onda B do
         lote 5, A2): o claro a 55% cobria o começo do fogo 2, o laranja só aparecia embaixo dele, e a
         imagem lia "o fogo 2 é o 1 que DESCEU", o erro que a Aula 3 manda desfazer. */
      <g data-fogo={tamanho} data-fantasma>
        <path
          className="fill-none stroke-scene-a"
          d={contornoDoFogo(tamanho)}
          strokeWidth="2.5"
          strokeDasharray="5 3"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    )
  return (
    <g data-fogo={tamanho}>
      <path className="fill-scene-flame" d={caminho(fogo)} />
      <path className="fill-scene-flame-core" d={caminho(miolo)} />
    </g>
  )
}

/** A nave inteira de um quadro, na origem da grade de 32. */
function NaveDoQuadro({ quadro }: { quadro: number }) {
  return (
    <>
      <FogoDaNave tamanho={quadro === 2 ? NAVE_FOGO.grande : NAVE_FOGO.pequeno} />
      <CorpoDaNave />
    </>
  )
}

/** O papel de um quadro do Pinta: o fundo e a grade fina dos quadradinhos. */
function PapelDoQuadro({ tamanho }: { tamanho: number }) {
  const linhas = Array.from({ length: tamanho - 1 }, (_, i) => i + 1)
  return (
    <>
      <rect className="fill-scene-card" width={tamanho} height={tamanho} />
      <path
        className="stroke-scene-card-line"
        d={linhas.map((i) => `M${i} 0V${tamanho}M0 ${i}H${tamanho}`).join('')}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </>
  )
}

/* ── frames ───────────────────────────────────────────────────────────────────────────────────── */

/**
 * A faixa de quadros e a Prévia, como no Pinta: à esquerda as duas miniaturas (fogo pequeno, fogo
 * grande), à direita a prévia grande com o quadro que está na tela.
 *
 * ⚠️⚠️ O corpo é o MESMO nos dois quadros e só o fogo muda: com a troca rápida, o fogo pulsa e a
 * nave fica no lugar. O Dino de antes andava 40 unidades entre os quadros, que é o gesto que a Aula 3
 * manda desfazer.
 */
export function FramesStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { frame, playing, rate } = state.animation
  const miniatura = { x: 34, lado: 96, ys: [58, 172] }
  const previa = { x: 228, y: 58, escala: 7 }
  return (
    <SceneCanvas
      cast={cast}
      titulo="A faixa de quadros e a prévia da nave"
      descricao={`Quadro ${frame} na prévia: a nave com o fogo ${frame === 2 ? 'grande' : 'pequeno'}.${
        playing
          ? ` A prévia está trocando ${quantos(rate, 'quadro', 'quadros')} por segundo.`
          : ' A prévia está parada.'
      }`}
    >
      <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
      {/* A faixa de quadros, com as MINIATURAS: "cada quadradinho guarda um desenho inteiro" se vê. */}
      <rect
        className="fill-scene-card stroke-scene-card-line"
        x={16}
        y={12}
        width={132}
        height={276}
        rx={12}
        strokeWidth="2"
      />
      <Texto
        className="fill-scene-ink"
        x={82}
        y={42}
        textAnchor="middle"
        tamanho={18}
        fontWeight="700"
      >
        Quadros
      </Texto>
      {[1, 2].map((n, i) => {
        const y = miniatura.ys[i] ?? 0
        const atual = n === frame
        return (
          <g key={n} data-miniatura={n} data-atual={atual || undefined}>
            <g transform={`translate(${miniatura.x} ${y}) scale(${miniatura.lado / 32})`}>
              <PapelDoQuadro tamanho={32} />
              <NaveDoQuadro quadro={n} />
            </g>
            <rect
              className={atual ? 'fill-none stroke-scene-a' : 'fill-none stroke-scene-card-line'}
              x={miniatura.x}
              y={y}
              width={miniatura.lado}
              height={miniatura.lado}
              rx={6}
              strokeWidth={atual ? 5 : 2}
            />
            <circle
              className="fill-scene-card stroke-scene-ink-soft"
              cx={miniatura.x + 15}
              cy={y + 15}
              r={12}
              strokeWidth="1.5"
            />
            <Texto
              className="fill-scene-ink"
              x={miniatura.x + 15}
              y={y + 21}
              textAnchor="middle"
              tamanho={18}
              fontWeight="700"
            >
              {n}
            </Texto>
          </g>
        )
      })}
      {/* A Prévia: o nome do painel do Pinta. */}
      <Texto
        className="fill-scene-ink"
        x={previa.x + 112}
        y={42}
        textAnchor="middle"
        tamanho={18}
        fontWeight="700"
      >
        Prévia
      </Texto>
      <g
        data-previa
        data-quadro={frame}
        transform={`translate(${previa.x} ${previa.y}) scale(${previa.escala})`}
        shapeRendering="crispEdges"
      >
        <PapelDoQuadro tamanho={32} />
        <NaveDoQuadro quadro={frame} />
      </g>
      <rect
        className="fill-none stroke-scene-rule"
        x={previa.x}
        y={previa.y}
        width={32 * previa.escala}
        height={32 * previa.escala}
        strokeWidth="3"
      />
    </SceneCanvas>
  )
}

/* ── onion-skin ───────────────────────────────────────────────────────────────────────────────── */

/**
 * Um quadro da nave com a borda do quadro desenhada, e o fantasma do quadro 1 tracejado.
 *
 * ⚠️⚠️ Sem régua e sem número com o fantasma DESLIGADO: a régua "passo 52" dava a medida que a cena
 * diz que não dá para saber. Com o fantasma, o contorno do fogo 1 aparece tracejado sobre o fogo 2 (o
 * motivo está no `FogoDaNave`) e as duas PONTAS ganham marca: a do fogo 1 à esquerda, a do fogo 2 à
 * direita. O fogo que passa da borda é cortado nela, como na exportação do Pinta.
 */
export function OnionSkinStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const id = useId()
  const { frame, onion, shift } = state.animation
  const quadro = { x: 168, y: 40, escala: 7 }
  const lado = 32 * quadro.escala
  const noDois = frame === 2
  const fogo2 = onionFireLength(shift)
  const fantasma = onion && noDois
  const cortado = noDois && NAVE_FOGO.saida + fogo2 > NAVE_FOGO.borda
  const ponta = (tamanho: number) =>
    quadro.y + Math.min(NAVE_FOGO.saida + tamanho, NAVE_FOGO.borda) * quadro.escala
  const zona = onionFireZone(shift)
  const descricao = !noDois
    ? onion
      ? 'Quadro 1: a nave com o fogo pequeno. Não há quadro anterior para o fantasma mostrar.'
      : 'Quadro 1: a nave com o fogo pequeno.'
    : !onion
      ? `Quadro 2: só o fogo deste quadro está na tela.${cortado ? ' O fogo passa da borda e é cortado.' : ''}`
      : `Quadro 2, com o fantasma: o contorno do fogo 1 aparece tracejado sobre o fogo 2. ${
          zona === 'quase'
            ? 'O fogo 2 está quase igual a ele.'
            : zona === 'pouco'
              ? 'O fogo 2 é um pouco maior e cabe no quadro.'
              : 'O fogo 2 passa da borda do quadro.'
        }`
  return (
    <SceneCanvas
      cast={cast}
      titulo="Um quadro da nave, com o fantasma do quadro anterior"
      descricao={descricao}
    >
      <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
      <Texto
        className="fill-scene-ink"
        x={quadro.x + lado / 2}
        y={28}
        textAnchor="middle"
        tamanho={18}
        fontWeight="700"
      >
        {`Quadro ${frame}`}
      </Texto>
      <clipPath id={`${id}-borda`}>
        <rect width={32} height={32} />
      </clipPath>
      <g
        transform={`translate(${quadro.x} ${quadro.y}) scale(${quadro.escala})`}
        shapeRendering="crispEdges"
      >
        <PapelDoQuadro tamanho={32} />
        <g clipPath={`url(#${id}-borda)`}>
          <FogoDaNave tamanho={noDois ? fogo2 : NAVE_FOGO.pequeno} />
          {fantasma && <FogoDaNave tamanho={NAVE_FOGO.pequeno} fantasma />}
          <CorpoDaNave />
        </g>
      </g>
      {/* A BORDA do quadro: é ela que o fogo grande demais atravessa. */}
      <rect
        data-borda-do-quadro
        className="fill-none stroke-scene-rule"
        x={quadro.x}
        y={quadro.y}
        width={lado}
        height={lado}
        strokeWidth="3"
      />
      {cortado && (
        <g data-cortado>
          <path
            className="stroke-scene-alert"
            d={`M${quadro.x + 11 * quadro.escala} ${quadro.y + lado}h${10 * quadro.escala}`}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <Texto
            className="fill-scene-alert"
            x={quadro.x + lado / 2}
            y={quadro.y + lado + 26}
            textAnchor="middle"
            tamanho={18}
            fontWeight="700"
          >
            cortado na borda
          </Texto>
        </g>
      )}
      {/* As duas PONTAS, só com o fantasma à vista: a comparação que ele existe para permitir. */}
      {fantasma && (
        <g data-pontas>
          <path
            className="stroke-scene-a"
            d={`M${quadro.x - 44} ${ponta(NAVE_FOGO.pequeno)}H${quadro.x + 22 * quadro.escala}`}
            strokeWidth="3"
            strokeDasharray="6 4"
          />
          <Texto
            className="fill-scene-a"
            x={quadro.x - 50}
            y={ponta(NAVE_FOGO.pequeno) + 6}
            textAnchor="end"
            tamanho={18}
            fontWeight="700"
          >
            fogo 1
          </Texto>
          {/* ⚠️ Com o fogo cortado, a marca do fogo 2 fica FORA do quadro e acima da borda (consertos
              do review da onda B do lote 5, B2): ela corria por cima do risco vermelho do corte, que
              já marca a ponta. */}
          <path
            className="stroke-scene-b"
            d={
              cortado
                ? `M${quadro.x + lado} ${ponta(fogo2) - 12}H${quadro.x + lado + 44}`
                : `M${quadro.x + 10 * quadro.escala} ${ponta(fogo2)}H${quadro.x + lado + 44}`
            }
            strokeWidth="3"
            strokeDasharray="6 4"
          />
          <Texto
            className="fill-scene-b-ink"
            x={quadro.x + lado + 50}
            y={ponta(fogo2) + 6 - (cortado ? 12 : 0)}
            tamanho={18}
            fontWeight="700"
          >
            fogo 2
          </Texto>
        </g>
      )}
    </SceneCanvas>
  )
}

/* ── symmetry ─────────────────────────────────────────────────────────────────────────────────── */

/** A nave de guia na grade 16 × 16, linha a linha: `[linha, primeira coluna, última coluna]`. */
const GUIA_DA_NAVE: readonly (readonly [number, number, number])[] = [
  [1, 7, 8],
  [2, 7, 8],
  [3, 6, 9],
  [4, 6, 9],
  [5, 5, 10],
  [6, 5, 10],
  [7, 5, 10],
  [8, 4, 11],
  [9, 2, 13],
  [10, 1, 14],
  [11, 1, 14],
  [12, 2, 13],
  [13, 5, 10],
  [14, 6, 9],
]

/**
 * O tamanho, na TELA, de um quadradinho da grade a partir do qual o dedo acerta a casa (consertos do
 * review da onda B do lote 5, M3). A 390 px a grade inteira mede ~135 px, 8 px por casa.
 */
export const CASA_PARA_O_DEDO = 16

/**
 * A grade tem casa de dedo? Mede a área de toque (`data-toque-na-grade`) no navegador e acompanha a
 * largura da coluna. ⚠️ Mede o `<svg>` inteiro com `ResizeObserver` (numa forma SVG ele devolve o
 * tamanho em unidades do desenho, que não muda) e lê o retângulo do toque em px. Sem medida (SSR, o
 * happy-dom dos testes), a resposta é "não", e o caminho é a bancada.
 */
export function useCasaDeDedo(acharAGrade: () => Element | null): boolean {
  const [cabe, setCabe] = useState(false)
  // ⚠️ Num ref: a função nasce a cada render, e nas dependências o observador seria refeito sempre.
  const achar = useRef(acharAGrade)
  achar.current = acharAGrade
  useEffect(() => {
    const elemento = achar.current()
    if (!elemento) return
    const medir = () =>
      setCabe(elemento.getBoundingClientRect().width / PAPEL_DO_ESPELHO >= CASA_PARA_O_DEDO)
    medir()
    if (typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(medir)
    observador.observe(elemento.closest('svg') ?? elemento)
    return () => observador.disconnect()
  }, [])
  return cabe
}

/**
 * A grade da nave com os espelhos do Pinta.
 *
 * ⚠️⚠️ O MEIO é fixo (entre as colunas 7 e 8, ou as linhas 7 e 8): o Espelho lado a lado do Pinta
 * reflete sempre no meio do desenho, e a cena antiga mandava mover um eixo que a ferramenta não tem.
 * O traço e a cópia têm a MESMA cor, como no Pinta; a cópia do último traço ganha uma borda (o
 * "brilho"), desenhada e não animada, para valer igual com menos movimento.
 * ⚠️ A grade inteira recebe TOQUE só na experimentação; o caminho do teclado é a bancada ("Pintar a
 * asa"). ⚠️⚠️ Consertos do review da onda B do lote 5 (M3 e BAIXO-12): a 390 px cada quadradinho tinha
 * 8 px, o dedo acertava a casa do lado, e a grade inteira com `touch-action: none` pintava quando a
 * criança só queria ROLAR a página. Com casa de dedo (`CASA_PARA_O_DEDO`) a grade é papel de desenho:
 * o dedo arrasta e pinta uma marca por casa nova, como o Lápis do Pinta. Menor que isso, o DEDO não
 * pinta (a página rola, e a bancada é o caminho); o mouse e a caneta pintam sempre.
 */
export function SymmetryStage({
  state,
  cast,
  dispatch,
}: {
  state: SceneState
  cast?: SceneCast
  dispatch?: (action: SceneAction) => void
}) {
  const svg = useRef<SVGSVGElement | null>(null)
  const grade = useRef<SVGRectElement | null>(null)
  /** O ponteiro que está pintando, e a última casa que ele pintou (o arrasto pinta só casa NOVA). */
  const pintando = useRef<{ id: number; casa: string } | null>(null)
  const dedoPinta = useCasaDeDedo(() => grade.current)
  const casa = 15
  const lado = PAPEL_DO_ESPELHO * casa
  const x0 = (VIEW.w - lado) / 2
  const y0 = 36
  const { on, axis, marks } = state.mirror
  const espelhos = mirrorAxes(on, axis)
  const celulas = symmetryCells(marks)
  const meio = PAPEL_DO_ESPELHO / 2
  const casaDoPonteiro = (e: PointerEvent<SVGRectElement>) => {
    const matriz = svg.current?.getScreenCTM()
    if (!matriz) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matriz.inverse())
    const x = Math.floor((p.x - x0) / casa)
    const y = Math.floor((p.y - y0) / casa)
    if (x < 0 || y < 0 || x >= PAPEL_DO_ESPELHO || y >= PAPEL_DO_ESPELHO) return null
    return { x, y }
  }
  const pintar = (e: PointerEvent<SVGRectElement>) => {
    const alvo = casaDoPonteiro(e)
    if (!dispatch || !alvo || !pintando.current) return
    const chave = `${alvo.x},${alvo.y}`
    if (chave === pintando.current.casa) return
    pintando.current.casa = chave
    dispatch({ type: 'dot', x: alvo.x, y: alvo.y })
  }
  const soltar = () => {
    pintando.current = null
  }
  const copias = celulas.filter((c) => c.copia).length
  return (
    <SceneCanvas
      cast={cast}
      svgRef={svg}
      interativo={Boolean(dispatch)}
      titulo="A grade da nave, com o espelho do Pinta"
      descricao={`${
        espelhos.x && espelhos.y
          ? 'Os dois espelhos ligados, no meio da grade.'
          : espelhos.x
            ? 'Espelho lado a lado ligado, no meio da grade.'
            : espelhos.y
              ? 'Espelho de cima e de baixo ligado, no meio da grade.'
              : 'Espelhos desligados.'
      } ${quantos(celulas.length, 'quadradinho pintado', 'quadradinhos pintados')}${
        copias ? `, ${quantos(copias, 'deles pintado', 'deles pintados')} pelo espelho` : ''
      }.`}
    >
      <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
      <g transform={`translate(${x0} ${y0}) scale(${casa})`} shapeRendering="crispEdges">
        <PapelDoQuadro tamanho={PAPEL_DO_ESPELHO} />
        {/* A nave de guia, de leve: é o contorno que a criança está desenhando. */}
        <path
          data-guia
          className="fill-scene-grid"
          opacity={0.45}
          d={GUIA_DA_NAVE.map(
            ([y, de, ate]) => `M${de} ${y}h${ate - de + 1}v1h${-(ate - de + 1)}Z`,
          ).join('')}
        />
        {celulas.map((c) => (
          <rect
            key={`${c.x},${c.y}`}
            data-casa={`${c.x},${c.y}`}
            data-copia={c.copia || undefined}
            className="fill-scene-a"
            x={c.x}
            y={c.y}
            width={1}
            height={1}
          />
        ))}
        {celulas
          .filter((c) => c.nova)
          .map((c) => (
            <rect
              key={`nova-${c.x},${c.y}`}
              data-copia-nova
              className="fill-none stroke-scene-b"
              x={c.x}
              y={c.y}
              width={1}
              height={1}
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          ))}
      </g>
      <rect
        className="fill-none stroke-scene-rule"
        x={x0}
        y={y0}
        width={lado}
        height={lado}
        strokeWidth="2"
      />
      {on && (
        /* ⚠️ Uma linha do meio por espelho LIGADO: são duas chaves, como no Pinta (consertos do review
           da onda B do lote 5), e com as duas ligadas os dois meios aparecem. */
        <g data-meio={axis}>
          {espelhos.x && (
            <>
              <path
                className="stroke-scene-b"
                d={`M${x0 + meio * casa} ${y0 - 10}V${y0 + lado + 10}`}
                strokeWidth="3"
                strokeDasharray="8 5"
              />
              <Texto
                className="fill-scene-b-ink"
                x={x0 + meio * casa}
                y={y0 - 14}
                textAnchor="middle"
                tamanho={18}
                fontWeight="700"
              >
                meio
              </Texto>
            </>
          )}
          {espelhos.y && (
            <>
              <path
                className="stroke-scene-b"
                d={`M${x0 - 10} ${y0 + meio * casa}H${x0 + lado + 10}`}
                strokeWidth="3"
                strokeDasharray="8 5"
              />
              <Texto
                className="fill-scene-b-ink"
                x={x0 - 16}
                y={y0 + meio * casa + 6}
                textAnchor="end"
                tamanho={18}
                fontWeight="700"
              >
                meio
              </Texto>
            </>
          )}
        </g>
      )}
      {/* ⚠️ A área de TOQUE, sem nome: quem usa teclado ou leitor de tela pinta pela bancada. */}
      {dispatch && (
        <rect
          ref={grade}
          data-toque-na-grade
          data-dedo-pinta={dedoPinta || undefined}
          aria-hidden
          x={x0}
          y={y0}
          width={lado}
          height={lado}
          fill="transparent"
          // ⚠️ `touch-action` só trava a rolagem quando a casa é de dedo: senão a página não rolava.
          style={{ cursor: 'crosshair', touchAction: dedoPinta ? 'none' : 'auto' }}
          onPointerDown={(e) => {
            if (e.pointerType === 'touch' && !dedoPinta) return
            e.currentTarget.setPointerCapture?.(e.pointerId)
            pintando.current = { id: e.pointerId, casa: '' }
            pintar(e)
          }}
          onPointerMove={(e) => {
            if (pintando.current?.id === e.pointerId) pintar(e)
          }}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          onLostPointerCapture={soltar}
        />
      )}
    </SceneCanvas>
  )
}

/* ── pixel-vector ─────────────────────────────────────────────────────────────────────────────── */

/**
 * A pedra do protótipo `interacoes/pixel-vetor.html`, na grade de 16: quatro pontos da Caneta e as
 * curvas entre eles. ⚠️ É ESTA curva que vira quadradinhos (`PEDRA_EM_PIXELS`), como no protótipo: a
 * pedra de pixel era um oval escrito à mão com outra silhueta, e de longe já se via a diferença.
 */
const PONTOS_DA_PEDRA = [
  [2, 7],
  [9, 2],
  [14, 10],
  [5, 13],
] as const
const ALCAS_DA_PEDRA = [
  [3, 1],
  [16, 3],
  [11, 16],
  [1, 12],
] as const
const PEDRA_VETOR = `M${PONTOS_DA_PEDRA[0].join(' ')}${PONTOS_DA_PEDRA.map(
  (_, i) =>
    `Q${ALCAS_DA_PEDRA[i]?.join(' ')} ${PONTOS_DA_PEDRA[(i + 1) % PONTOS_DA_PEDRA.length]?.join(' ')}`,
).join('')}Z`

/**
 * A curva rasterizada em 16 × 16: um quadradinho é pintado quando o CENTRO dele cai dentro da curva
 * (a mesma conta de cobertura de metade que o canvas do protótipo fazia). Exportada para o teste.
 */
export function rasterizarPedra(): [number, number][] {
  const contorno: [number, number][] = []
  PONTOS_DA_PEDRA.forEach((p0, i) => {
    const c = ALCAS_DA_PEDRA[i] ?? p0
    const p1 = PONTOS_DA_PEDRA[(i + 1) % PONTOS_DA_PEDRA.length] ?? p0
    for (let k = 0; k < 24; k++) {
      const t = k / 24
      const u = 1 - t
      contorno.push([
        u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
        u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
      ])
    }
  })
  const dentro = (px: number, py: number) => {
    let sim = false
    for (let i = 0, j = contorno.length - 1; i < contorno.length; j = i++) {
      const [xi = 0, yi = 0] = contorno[i] ?? []
      const [xj = 0, yj = 0] = contorno[j] ?? []
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) sim = !sim
    }
    return sim
  }
  const celulas: [number, number][] = []
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) if (dentro(x + 0.5, y + 0.5)) celulas.push([x, y])
  return celulas
}
const PEDRA_EM_PIXELS = rasterizarPedra()
/**
 * O meio da silhueta COM as alças (e não da grade): é em volta dele que a lupa aproxima. ⚠️ O y é 8,5
 * (consertos do review da onda B do lote 5, B6): as alças vão da linha 1 à 16, e em 8 a de baixo saía
 * do painel na lupa 8.
 */
const MEIO_DA_PEDRA = [8.3, 8.5] as const
/** Quanto vale um quadradinho com a lupa em 1. ⚠️ Pela silhueta real: na lupa 8 a pedra cabe inteira. */
const UNIDADE = 1.9
/** Os quadradinhos da pedra de pixel como UM caminho: o recorte da grade fina que vai por cima. */
const CASAS_DA_PEDRA = PEDRA_EM_PIXELS.map(([x, y]) => `M${x} ${y}h1v1h-1Z`).join('')
/** As linhas da grade de 16, para desenhar por cima dos quadradinhos. */
const LINHAS_DA_GRADE = Array.from({ length: 17 }, (_, i) => `M${i} 0V16M0 ${i}H16`).join('')

/**
 * As duas pedras, lado a lado, na MESMA lupa.
 *
 * ⚠️⚠️ A pedra que não estava sob a lupa ficava em 2, e a comparação virava memória (uma pedra
 * enorme ao lado de uma miúda). Agora "Aproximar" mexe nas duas: no mesmo instante uma borda vira
 * degraus e a outra continua lisa. A partir de `LUPA.grade` a de pixel ganha a grade fina dos
 * quadradinhos por cima; a partir de `LUPA.pontos` a de vetor mostra os pontos e as alças da Caneta.
 */
export function PixelVectorStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const id = useId()
  const { zoom } = state.pixels
  // ⚠️ 236 de altura (consertos do review da onda B do lote 5, B6): com as alças da Caneta na lupa 8.
  const painel = { w: 250, h: 236, y: 50 }
  const lados = [
    { chave: 'pixel' as const, rotulo: 'pedra de pixel', x: 20 },
    { chave: 'vector' as const, rotulo: 'pedra de vetor', x: VIEW.w - 20 - painel.w },
  ]
  const escala = UNIDADE * zoom
  const perto = zoom >= LUPA.perto
  const grade = zoom >= LUPA.grade
  const pontos = zoom >= LUPA.pontos
  return (
    <SceneCanvas
      cast={cast}
      titulo="As duas pedras, na mesma lupa"
      // ⚠️ A borda é contada a quem não enxerga só quando ela está GRANDE o bastante para se ver.
      descricao={`Aproximar em ${quantos(zoom, 'vez', 'vezes')}, nas duas pedras.${
        perto
          ? ' A borda da pedra de pixel aparece em degraus, e a borda da pedra de vetor continua lisa.'
          : ''
      }${pontos ? ' Na pedra de vetor aparecem os pontos e as curvas.' : ''}`}
    >
      <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
      {lados.map((lado) => {
        const corte = `${id}-${lado.chave}`
        return (
          <g key={lado.chave} data-pedra={lado.chave} data-lupa={zoom}>
            <clipPath id={corte}>
              <rect x={lado.x} y={painel.y} width={painel.w} height={painel.h} rx="10" />
            </clipPath>
            <rect
              className="fill-scene-card stroke-scene-card-line"
              x={lado.x}
              y={painel.y}
              width={painel.w}
              height={painel.h}
              rx="10"
              strokeWidth="2"
            />
            <Texto
              className="fill-scene-ink"
              x={lado.x + painel.w / 2}
              y={painel.y - 16}
              textAnchor="middle"
              tamanho={18}
              fontWeight="700"
            >
              {lado.rotulo}
            </Texto>
            <g clipPath={`url(#${corte})`}>
              <g
                transform={`translate(${lado.x + painel.w / 2} ${painel.y + painel.h / 2}) scale(${escala}) translate(${-MEIO_DA_PEDRA[0]} ${-MEIO_DA_PEDRA[1]})`}
              >
                {lado.chave === 'pixel' ? (
                  <g shapeRendering="crispEdges">
                    {/* ⚠️⚠️ SEM fresta entre os quadradinhos (consertos do review da onda B do lote 5, M5):
                        com a borda clara de 1,5 a pedra de perto parecia uma peneira de pontinhos, a
                        silhueta em degraus sumia na textura, e os "pontinhos" ainda competiam com os
                        pontos da Caneta. A grade entra só em `LUPA.grade`, fina, escura e POR CIMA. */}
                    {PEDRA_EM_PIXELS.map(([x, y]) => (
                      <rect
                        key={`${x},${y}`}
                        className="fill-scene-a"
                        x={x}
                        y={y}
                        width={1}
                        height={1}
                      />
                    ))}
                    {grade && (
                      <>
                        <clipPath id={`${corte}-casas`}>
                          <path d={CASAS_DA_PEDRA} />
                        </clipPath>
                        <path
                          data-grade-da-pedra
                          className="stroke-scene-ink"
                          d={LINHAS_DA_GRADE}
                          clipPath={`url(#${corte}-casas)`}
                          fill="none"
                          opacity={0.25}
                          strokeWidth="1"
                          vectorEffect="non-scaling-stroke"
                        />
                      </>
                    )}
                  </g>
                ) : (
                  <>
                    <path className="fill-scene-a" d={PEDRA_VETOR} />
                    {pontos && (
                      <g data-pontos-da-caneta>
                        {PONTOS_DA_PEDRA.map((p, i) => {
                          const alca = ALCAS_DA_PEDRA[i] ?? p
                          const proximo = PONTOS_DA_PEDRA[(i + 1) % PONTOS_DA_PEDRA.length] ?? p
                          return (
                            <path
                              key={`alca-${alca.join()}`}
                              className="stroke-scene-ink-soft"
                              d={`M${p.join(' ')}L${alca.join(' ')}L${proximo.join(' ')}`}
                              fill="none"
                              strokeWidth="1.5"
                              strokeDasharray="4 3"
                              vectorEffect="non-scaling-stroke"
                            />
                          )
                        })}
                        {ALCAS_DA_PEDRA.map((c) => (
                          <rect
                            key={`c-${c.join()}`}
                            className="fill-scene-card stroke-scene-ink-soft"
                            x={c[0] - 3 / escala}
                            y={c[1] - 3 / escala}
                            width={6 / escala}
                            height={6 / escala}
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                        {PONTOS_DA_PEDRA.map((p) => (
                          <circle
                            key={`p-${p.join()}`}
                            data-ponto
                            className="fill-scene-card stroke-scene-b"
                            cx={p[0]}
                            cy={p[1]}
                            r={6 / escala}
                            strokeWidth="3"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                      </g>
                    )}
                  </>
                )}
              </g>
            </g>
          </g>
        )
      })}
    </SceneCanvas>
  )
}

/* ── sheet-vs-sprite ──────────────────────────────────────────────────────────────────────────── */

/** A folha de 64 × 32: a nave do quadro 1 (fogo pequeno) e a do quadro 2 (fogo grande). */
function FolhaDaNave() {
  return (
    <>
      <rect
        className="fill-scene-card"
        width={FOLHA_DA_NAVE.largura}
        height={FOLHA_DA_NAVE.altura}
      />
      <NaveDoQuadro quadro={1} />
      <g transform={`translate(${FOLHA_DA_NAVE.quadro} 0)`}>
        <NaveDoQuadro quadro={2} />
      </g>
    </>
  )
}

/**
 * A folha da nave e o jogo, na MESMA régua de pixel.
 *
 * ⚠️⚠️ O jogo mostra o RECORTE esticado no quadrado do sprite, como o Estúdio: com 64 as duas naves
 * espremidas (é o que aparece antes de carregar a folha), com 16 meia nave esticada, com 32 uma nave
 * inteira. A folha NUNCA muda: é a permanência dela, ao lado de um recorte e de um tamanho que mudam,
 * que ensina a cena. A folha de antes era de 64 × 64 com quatro Dinos, e trocar o pedaço não mudava
 * o jogo.
 */
export function SheetStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { size, width, loaded } = state.sheet
  const cell = sheetCropCell(state.sheet.cell, width)
  // ⚠️ UMA escala para os dois lados: o quadrado de 54 do jogo e a folha de 64 × 32 se comparam.
  const s = 2.6
  const folha = { x: 24, y: 136 }
  const jogo = { x: 290, y: 38, lado: 96 * s }
  const sprite = size * s
  const spriteX = jogo.x + (jogo.lado - sprite) / 2
  const spriteY = jogo.y + (jogo.lado - sprite) / 2
  const noJogo =
    width === FOLHA_DA_NAVE.largura
      ? 'a folha inteira, com as duas naves espremidas'
      : width === FOLHA_DA_NAVE.quadro
        ? `o quadro ${cell}, uma nave inteira`
        : 'metade de uma nave, esticada'
  return (
    <SceneCanvas
      cast={cast}
      titulo="A folha da nave ao lado do jogo"
      descricao={
        loaded
          ? `Folha de 64 por 32, com o recorte de ${width} por 32. No jogo, num quadrado de ${size} por ${size}: ${noJogo}.`
          : `Folha de 64 por 32, sem recorte ainda. No jogo, um quadrado vazio de ${size} por ${size}.`
      }
    >
      <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
      <Texto className="fill-scene-ink" x={folha.x} y={76} tamanho={18} fontWeight="700">
        folha 64 por 32
      </Texto>
      {/* A régua da folha: é por ela que 16, 32 e 64 viram um lugar na imagem. */}
      <g data-regua-da-folha>
        <path
          className="stroke-scene-rule"
          d={`M${folha.x} ${folha.y - 12}h${64 * s}${[0, 16, 32, 48, 64]
            .map((v) => `M${folha.x + v * s} ${folha.y - 18}v12`)
            .join('')}`}
          strokeWidth="2"
        />
        {[16, 32, 64].map((v) => (
          <Texto
            key={v}
            className="fill-scene-ink-soft"
            x={folha.x + v * s}
            y={folha.y - 24}
            textAnchor={v === 64 ? 'end' : 'middle'}
            tamanho={18}
          >
            {v}
          </Texto>
        ))}
      </g>
      <g transform={`translate(${folha.x} ${folha.y}) scale(${s})`} shapeRendering="crispEdges">
        <FolhaDaNave />
        <path
          className="stroke-scene-card-line"
          d={`M${FOLHA_DA_NAVE.quadro} 0V${FOLHA_DA_NAVE.altura}`}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </g>
      {/* ⚠️⚠️ Sem recorte, nem janela nem sprite (consertos do review da onda B do lote 5, A4): a cena
          abria com a folha inteira no jogo, e a resposta da previsão da Aula 6 ("se o jogo mostrar a
          folha inteira, o que aparece?") estava desenhada antes do palpite. */}
      {loaded && (
        <rect
          data-recorte={width}
          data-quadro={cell}
          className="fill-none stroke-scene-b"
          x={folha.x + (cell - 1) * width * s}
          y={folha.y}
          width={width * s}
          height={FOLHA_DA_NAVE.altura * s}
          strokeWidth="4"
          strokeDasharray="8 5"
        />
      )}
      <Texto
        className="fill-scene-b-ink"
        x={folha.x}
        y={folha.y + FOLHA_DA_NAVE.altura * s + 30}
        tamanho={18}
        fontWeight="700"
      >
        {loaded ? `recorte ${width} por 32` : 'sem recorte'}
      </Texto>
      <Texto className="fill-scene-ink" x={jogo.x} y={28} tamanho={18} fontWeight="700">
        jogo
      </Texto>
      <rect
        className="fill-scene-grass stroke-scene-line"
        x={jogo.x}
        y={jogo.y}
        width={jogo.lado}
        height={jogo.lado}
        strokeWidth="2"
        rx="6"
      />
      {/* O sprite: o RECORTE esticado no quadrado do tamanho no jogo. Sem recorte, o "?" do vazio. */}
      {loaded ? (
        <svg
          data-sprite-no-jogo={size}
          x={spriteX}
          y={spriteY}
          width={sprite}
          height={sprite}
          viewBox={`${(cell - 1) * width} 0 ${width} ${FOLHA_DA_NAVE.altura}`}
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
        >
          <FolhaDaNave />
        </svg>
      ) : (
        <Texto
          data-jogo-vazio
          className="fill-scene-ink-soft"
          x={spriteX + sprite / 2}
          y={spriteY + sprite / 2 + 18}
          textAnchor="middle"
          tamanho={48}
          fontWeight="700"
        >
          ?
        </Texto>
      )}
      <rect
        className="fill-none stroke-scene-a"
        x={spriteX}
        y={spriteY}
        width={sprite}
        height={sprite}
        strokeWidth="2"
        strokeDasharray="5 4"
      />
      {/* ⚠️ O tamanho mora na linha do nome, fora do quadro do jogo: embaixo do sprite ele encostava
          na borda com o sprite grande. */}
      <Texto
        className="fill-scene-a"
        x={jogo.x + jogo.lado}
        y={28}
        textAnchor="end"
        tamanho={18}
        fontWeight="700"
      >
        {`${size} por ${size}`}
      </Texto>
    </SceneCanvas>
  )
}

/* ── fill-stroke ──────────────────────────────────────────────────────────────────────────────── */

/** A pedra do asteroide, feita com a Caneta (pontos ligados por curvas), e não um pentágono. */
const PEDRA_DO_ASTEROIDE =
  // ⚠️ Mais pontos e um AMASSADO (consertos do review da onda B do lote 5, B12): a de quatro curvas lia
  // como um ovo liso.
  'M96 160Q92 96 150 82Q196 56 238 84Q300 96 290 160Q300 214 246 240Q196 268 150 244Q118 252 102 214Q84 190 96 160Z'

/** O xadrez do "Sem cor": o fundo transparente do Pinta, que não é branco. */
function Xadrez({ id, lado = 16 }: { id: string; lado?: number }) {
  return (
    <pattern id={id} width={lado * 2} height={lado * 2} patternUnits="userSpaceOnUse">
      <rect className="fill-scene-card" width={lado * 2} height={lado * 2} />
      <rect className="fill-scene-grid" width={lado} height={lado} />
      <rect className="fill-scene-grid" x={lado} y={lado} width={lado} height={lado} />
    </pattern>
  )
}

/**
 * A pedra sobre o xadrez, com as duas amostras do Pinta ao lado.
 *
 * ⚠️⚠️ "Sem cor" é TRANSPARENTE, e não branco: com o preenchimento em Sem cor o xadrez aparece por
 * dentro da linha. O fundo liso de antes fazia o Sem cor parecer uma cor. A amostra em Sem cor é a do
 * Pinta (o xadrez com o risco vermelho) e fica ACESA: é a parte que mudou.
 */
export function FillStrokeStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const id = useId()
  const { fill, stroke } = state.ink
  const amostras = [
    { chave: 'fill', rotulo: 'Preenchimento', cor: 'fill-scene-a', nome: 'azul', com: fill, y: 44 },
    {
      chave: 'stroke',
      rotulo: 'Contorno',
      cor: 'fill-scene-b',
      nome: 'laranja',
      com: stroke,
      y: 164,
    },
  ] as const
  return (
    <SceneCanvas
      cast={cast}
      titulo="A pedra, com o preenchimento e o contorno"
      descricao={
        fill || stroke
          ? `Preenchimento ${fill ? 'azul' : 'em Sem cor, com o fundo aparecendo por dentro'}, contorno ${stroke ? 'laranja' : 'em Sem cor'}.`
          : 'Preenchimento e contorno em Sem cor: só o fundo aparece.'
      }
    >
      <defs>
        <Xadrez id={`${id}-xadrez`} />
      </defs>
      <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
      <rect
        data-xadrez
        x={28}
        y={24}
        width={316}
        height={252}
        rx={10}
        fill={`url(#${id}-xadrez)`}
        className="stroke-scene-card-line"
        strokeWidth="2"
      />
      <path
        data-pedra-do-asteroide
        data-preenchimento={fill ? 'cor' : 'sem-cor'}
        data-contorno={stroke ? 'cor' : 'sem-cor'}
        className={`${fill ? 'fill-scene-a' : 'fill-none'} ${stroke ? 'stroke-scene-b' : 'stroke-none'}`}
        d={PEDRA_DO_ASTEROIDE}
        strokeWidth="10"
        strokeLinejoin="round"
      />
      {amostras.map((a) => (
        <g key={a.chave} data-amostra={a.chave} data-acesa={!a.com || undefined}>
          <Texto className="fill-scene-ink" x={372} y={a.y + 18} tamanho={18} fontWeight="700">
            {a.rotulo}
          </Texto>
          {a.com ? (
            <rect className={a.cor} x={372} y={a.y + 32} width={56} height={56} rx={8} />
          ) : (
            <g>
              <rect
                x={372}
                y={a.y + 32}
                width={56}
                height={56}
                rx={8}
                fill={`url(#${id}-xadrez)`}
              />
              <path
                className="stroke-scene-alert"
                d={`M${376} ${a.y + 84}L${424} ${a.y + 36}`}
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>
          )}
          <rect
            className={a.com ? 'fill-none stroke-scene-card-line' : 'fill-none stroke-scene-ink'}
            x={372}
            y={a.y + 32}
            width={56}
            height={56}
            rx={8}
            strokeWidth={a.com ? 2 : 4}
          />
          <Texto className="fill-scene-ink" x={440} y={a.y + 66} tamanho={18}>
            {a.com ? a.nome : 'Sem cor'}
          </Texto>
        </g>
      ))}
    </SceneCanvas>
  )
}

/* ── shading ──────────────────────────────────────────────────────────────────────────────────── */

/** A bola em pixels: 12 × 12 quadradinhos grandes, para lembrar a nave pintada no Pinta. */
const BOLA = 12
/** Os três tons da FAMÍLIA do azul, derivados do `scene-a` (⚠️ `in oklab`: em `oklch` o azul vira ROSA). */
const TONS = {
  base: 'var(--color-scene-a)',
  sombra: 'color-mix(in oklab, var(--color-scene-a) 60%, #07142a)',
  luz: 'color-mix(in oklab, var(--color-scene-a) 50%, #ffffff)',
} as const

/**
 * O tom de cada quadradinho da bola, com a luz vindo de um lado (de cima, em diagonal).
 *
 * ⚠️⚠️ Um BRILHO redondo perto do sol e a sombra em CRESCENTE do outro lado (consertos do review da onda B
 * do lote 5, M7). O limiar sobre o produto com uma direção fazia duas fronteiras RETAS de borda a borda:
 * luz, base e sombra em três listras do mesmo tamanho, e "a bola ficou redonda" era mais dito que visto.
 * O centro do brilho fica deslocado para o lado do sol e para cima; a sombra é o que fica LONGE dele.
 */
function tonsDaBola(lado: 'left' | 'right', comTons: boolean) {
  const r = BOLA / 2 - 0.1
  const brilho = { x: (lado === 'left' ? -1 : 1) * 0.35 * r, y: -0.35 * r }
  const casas: { x: number; y: number; tom: keyof typeof TONS }[] = []
  for (let y = 0; y < BOLA; y++)
    for (let x = 0; x < BOLA; x++) {
      const dx = x + 0.5 - BOLA / 2
      const dy = y + 0.5 - BOLA / 2
      if (Math.hypot(dx, dy) > r) continue
      const doBrilho = Math.hypot(dx - brilho.x, dy - brilho.y)
      casas.push({
        x,
        y,
        tom: !comTons
          ? 'base'
          : doBrilho < 0.45 * r
            ? 'luz'
            : doBrilho > 0.95 * r
              ? 'sombra'
              : 'base',
      })
    }
  return casas
}

/**
 * A bola em pixels grandes, com os TRÊS tons da família do azul e o sol de um lado.
 *
 * ⚠️⚠️ A "segunda cor da mesma cor" era um crescente verde-oliva (`scene-ink`) sobre a bola azul, e
 * a aula pede "tons da família de cada cor", primeiro as sombras e depois as luzes. O sol ganhou uma
 * seta tracejada até a bola no lugar dos quatro traços, que liam como uma bola correndo.
 */
export function ShadingStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { shade, side } = state.light
  const esquerda = side === 'left'
  const casa = 17
  const lado = BOLA * casa
  const x0 = (VIEW.w - lado) / 2
  const y0 = 46
  const sol = { x: esquerda ? 84 : VIEW.w - 84, y: 70 }
  const alvo = { x: x0 + lado / 2 + (esquerda ? -1 : 1) * lado * 0.36, y: y0 + lado * 0.2 }
  const casas = tonsDaBola(side, shade)
  const angulo = Math.atan2(alvo.y - sol.y, alvo.x - sol.x)
  return (
    <SceneCanvas
      cast={cast}
      titulo="A bola em pixels, com o sol de um lado"
      descricao={
        shade
          ? `O sol está na ${esquerda ? 'esquerda' : 'direita'}. A bola tem três tons de azul: o mais claro do lado do sol e o mais escuro do outro lado.`
          : `O sol está na ${esquerda ? 'esquerda' : 'direita'}. A bola tem um tom de azul só.`
      }
    >
      <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
      <g transform={`translate(${x0} ${y0})`} shapeRendering="crispEdges" data-bola>
        {casas.map((c) => (
          <rect
            key={`${c.x},${c.y}`}
            data-tom={c.tom}
            x={c.x * casa}
            y={c.y * casa}
            width={casa}
            height={casa}
            style={{ fill: TONS[c.tom] }}
          />
        ))}
      </g>
      <g data-sol={side}>
        <path
          className="stroke-scene-flame"
          d={`M${sol.x + Math.cos(angulo) * 34} ${sol.y + Math.sin(angulo) * 34}L${alvo.x} ${alvo.y}`}
          strokeWidth="3"
          strokeDasharray="7 5"
          strokeLinecap="round"
        />
        <path
          className="fill-scene-flame"
          transform={`translate(${alvo.x} ${alvo.y}) rotate(${(angulo * 180) / Math.PI})`}
          d="M0 0L-13 -7L-13 7Z"
        />
        <circle
          className="fill-scene-flame-core stroke-scene-flame"
          cx={sol.x}
          cy={sol.y}
          r="24"
          strokeWidth="4"
        />
        <Texto
          className="fill-scene-ink"
          x={sol.x}
          y={sol.y + 50}
          textAnchor="middle"
          tamanho={18}
          fontWeight="700"
        >
          sol
        </Texto>
      </g>
      <Texto
        className="fill-scene-ink"
        x={VIEW.w / 2}
        y={y0 + lado + 32}
        textAnchor="middle"
        tamanho={18}
        fontWeight="700"
      >
        {shade ? 'três tons de azul' : 'um tom de azul'}
      </Texto>
    </SceneCanvas>
  )
}
