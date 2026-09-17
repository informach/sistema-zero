'use client'

import type {
  SceneAction,
  SceneCast,
  SceneFigure,
  SceneState,
} from '@sistemazero/core/learning/scene'
import {
  actorFigure,
  drawLoopOnScreen,
  quantos,
  SCENE_LIMITS,
  SCREEN_READER_EMPTY,
  STAGE_TARGET,
  sceneWorld,
  screenReaderSays,
} from '@sistemazero/core/learning/scene'
import { Check, Ear, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { SceneButton } from './exploration-stage'
import { LarguraConhecidaDaCena, SceneCanvas, Texto, useLarguraMedida } from './scene-canvas'
import { ActorFigure, FundoEspaco, pisoDoMundo } from './scene-figures'
import { useSceneVoice } from './use-scene-voice'

/**
 * Os palcos da família "A tela e o mundo" (menos a `world`, que mora em `scene-world-stage.tsx`).
 *
 * Elas não cabem no palco compartilhado (chão, árvores, pista) porque não são sobre o mundo do
 * jogo: uma é sobre o SISTEMA DE COORDENADAS da tela, outra sobre o que uma pessoa que não vê a
 * tela recebe, outra sobre o LIMITE da tela e a última sobre o laço que desenha. Cada uma tem a
 * própria moldura e o próprio enquadramento.
 */

/**
 * A CAIXA do sprite no jogo e onde a figura assenta dentro dela (lote 5 do Raio-X, 16/09/2026).
 *
 * ⚠️⚠️ O endereço do Estúdio é o canto de CIMA, à esquerda, da caixa (`sprites.ts` desenha a partir
 * de `sprite.x, sprite.y`), e não o meio do corpo. A mira no meio do Dino ensinava outra coisa: com
 * x 0 e y 0 o Dino saía metade FORA da tela, por cima da régua, e no jogo ele encosta no canto por
 * dentro. As medidas são as dos cursos: o Dino tem "tamanho 64" na Aula 1, e a nave do Desafio, 54
 * por 62.
 * ⚠️ `centro` desloca a figura para o meio da caixa: o desenho do Dino não é simétrico em volta do
 * seu `x` (a cauda passa 39 para a esquerda, a cabeça 20 para a direita).
 */
const CAIXA: Partial<Record<SceneFigure, { w: number; h: number; centro: number }>> = {
  dino: { w: 64, h: 64, centro: 9.5 },
  nave: { w: 54, h: 62, centro: 0 },
}
const caixaDe = (figura: SceneFigure) => CAIXA[figura] ?? { w: 64, h: 64, centro: 0 }

/**
 * A partir de quantos px de palco a `screen-reader` põe a miniatura e o painel lado a lado: com menos,
 * a miniatura de 240 unidades ficava abaixo de 0,96 e o "pontos 0" passava da caixa dele.
 */
const DUAS_COLUNAS_DO_LEITOR = 500

/** A margem de fábrica da régua da `coordinates`: o lugar dos números à esquerda e em cima da tela. */
const MARGEM_DA_REGUA = { x: 46, y: 30 } as const

/** A régua de um eixo: o começo, o fim e as divisões inteiras entre eles. */
const marcas = (tamanho: number, partes: number) =>
  Array.from({ length: partes + 1 }, (_, i) => Math.round((tamanho * i) / partes))

/**
 * O endereço na tela.
 *
 * ⚠️ O que faz esta cena ensinar não é o sprite se mexer — é o par de números aparecer LIGADO
 * ao lugar. Por isso ela tem três coisas que nenhuma outra tem: as réguas dos dois eixos com a
 * origem marcada no canto de cima (é o que torna o "y cresce para baixo" visível antes de ser
 * dito), as guias tracejadas até a MARCA do endereço, e o FANTASMA da posição anterior, para
 * comparar sem guardar de memória.
 *
 * ⭐⭐ Lote 5 do Raio-X: a marca fica no canto de cima da CAIXA tracejada do sprite (o endereço do
 * Estúdio), a figura é recortada pela própria tela (o que passa da borda some, como no jogo), e a
 * TELA é a do caso: 480 × 270 no Corre Dino, 800 × 480 no Desafio, com a régua proporcional.
 */
export function CoordinatesStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const id = useId()
  const { x, y, fromX, fromY, width, height } = state.place
  // ⚠️ A escala cabe a tela num espaço de 480 × 300 do palco: a de 800 × 480 fica do mesmo tamanho
  // na página, e a régua diz os números de verdade.
  const escalaDeFabrica = Math.min(480 / width, 300 / height)
  const VIEW = {
    w: width * escalaDeFabrica + MARGEM_DA_REGUA.x + 16,
    h: height * escalaDeFabrica + MARGEM_DA_REGUA.y + 22,
  }
  const mexeu = fromX !== x || fromY !== y
  const heroi = actorFigure(cast, 'hero')
  const caixa = caixaDe(heroi)
  const mundo = sceneWorld(cast, 'coordinates')
  return (
    <SceneCanvas
      view={VIEW}
      cast={cast}
      mundo={mundo}
      titulo="Tela do jogo com o Dino no endereço escolhido"
      descricao={`Tela de ${width} por ${height}. O canto de cima da caixa do Dino está em x ${x}, y ${y}.`}
      // ⚠️ SEM rodapé (lote 2 do Raio-X, 16/09/2026). "O alvo mostra o endereço. O Dino desenhado
      // fica em volta dele." tinha pronome que o elenco não flexiona e "alvo", palavra que a aula
      // nunca apresentou. A régua e a marca já dão nome ao que está desenhado.
    >
      {(palco) => {
        /**
         * ⚠️⚠️ A margem da régua vem da LETRA (conserto "letra no celular"): num celular os números
         * crescem até ~21 unidades, e com a margem de fábrica o "0, 0" e o "270" saíam cortados na
         * borda esquerda. A tela encolhe um pouco dentro do mesmo enquadramento para a régua caber.
         */
        const MARGEM = {
          x: Math.max(
            MARGEM_DA_REGUA.x,
            palco.larguraDoTexto('0, 0', 11) + 14,
            palco.larguraDoTexto(String(height), 11) + 18,
          ),
          // ⚠️ E embaixo dos números de cima: na letra de 12px a de fábrica cortava o alto deles.
          y: Math.max(MARGEM_DA_REGUA.y, palco.letra(11) + 13),
        }
        /** A linha de base dos números de cima (18 na coluna do computador). */
        const baseDosNumeros = MARGEM.y - 12
        const escala = Math.min((VIEW.w - MARGEM.x - 16) / width, (VIEW.h - MARGEM.y - 22) / height)
        const TELA = { w: width * escala, h: height * escala }
        const px = MARGEM.x + x * escala
        const py = MARGEM.y + y * escala
        /** A figura dentro da caixa cujo canto de cima está em (cx, cy), no desenho. */
        const figura = (cx: number, cy: number, ghost = false) => (
          <ActorFigure
            figure={heroi}
            x={cx + (caixa.w / 2 + caixa.centro) * escala}
            y={cy + (caixa.h - 2) * escala}
            escala={escala}
            ghost={ghost}
          />
        )
        /**
         * ⚠️ No estreito o "0" de cada régua sai e fica só o "0, 0" no canto: com a letra de 12px os três
         * se encostavam. A origem continua escrita, e é ela que diz que o y começa em CIMA.
         */
        const comNumero = (v: number) => !palco.estreito || v > 0
        const ultimaX = width
        return (
          <>
            <defs>
              <pattern id={`${id}-dots`} width="30" height="30" patternUnits="userSpaceOnUse">
                <circle className="fill-scene-grid" cx="1.5" cy="1.5" r="1.5" />
              </pattern>
              <clipPath id={`${id}-tela`}>
                <rect x={MARGEM.x} y={MARGEM.y} width={TELA.w} height={TELA.h} />
              </clipPath>
            </defs>
            {/* As réguas: os números que a criança vai digitar, na borda da tela. */}
            <g className="fill-scene-ink-soft" fontFamily="inherit">
              {marcas(width, 4).map((v) => (
                <g key={`x${v}`}>
                  {comNumero(v) && (
                    <Texto
                      tamanho={11}
                      x={MARGEM.x + v * escala}
                      y={baseDosNumeros}
                      // ⚠️ O último número encosta na borda da tela por DENTRO no estreito: centrado,
                      // metade dele passava do desenho.
                      textAnchor={
                        v === 0 ? 'start' : v === ultimaX && palco.estreito ? 'end' : 'middle'
                      }
                    >
                      {v}
                    </Texto>
                  )}
                  <path
                    className="stroke-scene-rule"
                    d={`M${MARGEM.x + v * escala} ${MARGEM.y - 8}v8`}
                    strokeWidth="1.5"
                  />
                </g>
              ))}
              {marcas(height, 3).map((v) => (
                <g key={`y${v}`}>
                  {comNumero(v) && (
                    <Texto
                      tamanho={11}
                      x={MARGEM.x - 10}
                      y={MARGEM.y + v * escala + 4}
                      textAnchor="end"
                    >
                      {v}
                    </Texto>
                  )}
                  <path
                    className="stroke-scene-rule"
                    d={`M${MARGEM.x - 8} ${MARGEM.y + v * escala}h8`}
                    strokeWidth="1.5"
                  />
                </g>
              ))}
            </g>
            {/* A tela: o céu com pontinhos do Corre Dino, ou o espaço de estrelas do Desafio (a tela do
                jogo da criança é "um espaço cheio de estrelas" desde o Dia 1). */}
            {mundo === 'espaco' ? (
              <>
                <FundoEspaco x={MARGEM.x} y={MARGEM.y} w={TELA.w} h={TELA.h} />
                <rect
                  className="stroke-scene-line"
                  x={MARGEM.x}
                  y={MARGEM.y}
                  width={TELA.w}
                  height={TELA.h}
                  fill="none"
                  strokeWidth="2"
                />
              </>
            ) : (
              <>
                <rect
                  className="fill-scene-sky stroke-scene-line"
                  x={MARGEM.x}
                  y={MARGEM.y}
                  width={TELA.w}
                  height={TELA.h}
                  strokeWidth="2"
                />
                <rect
                  x={MARGEM.x}
                  y={MARGEM.y}
                  width={TELA.w}
                  height={TELA.h}
                  fill={`url(#${id}-dots)`}
                />
              </>
            )}
            {/* ⚠️⚠️ O que passa da tela é RECORTADO pela própria tela, como no jogo (lote 5): em x 480 o
                Dino saía do quadro do desenho, e em 0, 0 cobria os números da régua. */}
            <g clipPath={`url(#${id}-tela)`}>
              {mexeu && (
                <g className="text-scene-ink-soft">
                  {figura(MARGEM.x + fromX * escala, MARGEM.y + fromY * escala, true)}
                </g>
              )}
              <g className="text-primary">{figura(px, py)}</g>
              {/* A caixa do sprite: fina e tracejada, o tamanho que o bloco do Estúdio dá ao Dino. */}
              <rect
                data-caixa-do-sprite=""
                className="stroke-scene-ink-soft"
                x={px}
                y={py}
                width={caixa.w * escala}
                height={caixa.h * escala}
                fill="none"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            </g>
            {/* As guias levam o olho da marca até o número de cada eixo. */}
            <path
              className="stroke-scene-a"
              d={`M${MARGEM.x} ${py}H${px}`}
              strokeWidth="2"
              strokeDasharray="5 4"
            />
            <path
              className="stroke-scene-b"
              d={`M${px} ${MARGEM.y}V${py}`}
              strokeWidth="2"
              strokeDasharray="5 4"
            />
            {/* A origem. Ela é o que explica o eixo y virado: a contagem começa em CIMA. ⚠️ O "0, 0" fica
                na margem, do lado de fora: dentro da tela o Dino em 0, 0 o cobria. */}
            <circle className="fill-scene-ink" cx={MARGEM.x} cy={MARGEM.y} r="4" />
            <Texto
              className="fill-scene-ink"
              x={MARGEM.x - 10}
              y={baseDosNumeros + 2}
              textAnchor="end"
              tamanho={11}
              fontWeight="600"
              fontFamily="inherit"
            >
              0, 0
            </Texto>
            {/* A MARCA do endereço: o canto de cima da caixa, com um anel claro para aparecer em qualquer
                fundo. */}
            <circle
              data-marca-do-endereco=""
              className="fill-scene-ink stroke-scene-card"
              cx={px}
              cy={py}
              r="5.5"
              strokeWidth="2.5"
            />
          </>
        )
      }}
    </SceneCanvas>
  )
}

/**
 * O que o leitor de tela lê.
 *
 * Duas colunas, e é a comparação entre elas que é a aula: o que APARECE (um desenho, que não
 * informa nada a quem não o vê) contra o que a pessoa OUVE (só o que estiver escrito).
 *
 * ⚠️ O painel escuro é uma citação do terminal onde um leitor de tela mostra o que fala, e as
 * cores dele são literais de propósito: ele representa outro programa, não a nossa cena.
 *
 * ⭐⭐ Lote 5 do Raio-X (decisão da dona): a cena FALA de verdade, com a voz do navegador em pt-BR
 * (`useSceneVoice`, o mesmo helper do "Ouvir" do player), e o painel continua escrito, que é o
 * caminho quando não há voz. O painel guarda as DUAS escutas, "Sem frase" e "Com a sua frase", com os
 * selos do que a frase diz: o contraste "Imagem." × a frase dela fica inteiro à vista.
 */
export function ScreenReaderStage({
  state,
  dispatch,
  interactive,
  cast,
}: {
  state: SceneState
  dispatch: (action: SceneAction) => void
  interactive: boolean
  cast?: SceneCast
}) {
  const id = useId()
  const { text, heard, heardEmpty, said, listens } = state.description
  const heroi = actorFigure(cast, 'hero')
  const obstaculo = actorFigure(cast, 'obstacle')
  const mundo = sceneWorld(cast, 'screen-reader')
  // ⚠️ A miniatura só tem a linha do chão na terra: no espaço as figuras flutuam.
  const piso = pisoDoMundo(mundo, 118)
  const diz = screenReaderSays(state)
  const voz = useSceneVoice()
  const [vozLigada, setVozLigada] = useState(true)
  /**
   * ⚠️⚠️ A voz fala quando a CONTAGEM de escutas sobe, e só aí. Ouvir a mesma frase duas vezes não
   * muda `heard`, e a segunda escuta precisa falar também; desfazer (a contagem desce), recomeçar e
   * abrir a aula noutro dia (a contagem chega pronta) não falam nada.
   */
  const escutasVistas = useRef(listens)
  // biome-ignore lint/correctness/useExhaustiveDependencies: a fala é o efeito da CONTAGEM subir; `heard` é lido na hora
  useEffect(() => {
    const antes = escutasVistas.current
    escutasVistas.current = listens
    if (listens > antes && vozLigada && voz.temVoz && heard) voz.falar([heard])
  }, [listens])
  /**
   * ⚠️⚠️ O texto não sobe tecla a tecla.
   *
   * Cada `describe` é um COMANDO: vai para o histórico do desfazer, entra no segmento que sobe
   * ao servidor (com o texto inteiro dentro) e conta uma ação na evidência. Despachando por
   * tecla, escrever a frase da Aula 1 gerava ~50 comandos, ~10 KB de segmento e um relatório
   * dizendo que a criança fez cinquenta coisas — quando ela escreveu uma frase.
   *
   * O campo passa a ser local e só avisa o motor quando ela PARA (meio segundo) ou sai dele.
   * O botão de ouvir tira o foco antes do clique, então o que se ouve é sempre o que está
   * escrito. E o efeito abaixo mantém o campo em dia quando o motor muda por fora (desfazer,
   * recomeçar, retomar a aula noutro dia).
   */
  const [rascunho, setRascunho] = useState(text)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    setRascunho(text)
  }, [text])
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  /**
   * ⚠️⚠️ O campo nasce FECHADO até a tela vazia ser ouvida (lote 5). Aberto, ele convidava a escrever
   * antes, e quem escrevia só fechava "ouvir sem descrição" apagando a própria frase. Fechado não é
   * escondido: continua no Tab, com o motivo ligado a ele. Um caso que já escreveu uma frase abre.
   */
  const fechado = !heardEmpty && text.trim() === ''
  const [tentouEscrever, setTentouEscrever] = useState(false)
  function escrever(valor: string) {
    if (fechado) return
    setRascunho(valor)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (valor !== text) dispatch({ type: 'describe', text: valor })
    }, 500)
  }
  function confirmar(valor: string) {
    if (fechado) return
    if (timer.current) clearTimeout(timer.current)
    if (valor !== text) dispatch({ type: 'describe', text: valor })
  }
  const nada = !heardEmpty && !said
  /**
   * ⚠️⚠️ Duas colunas pela largura MEDIDA do palco, e não pelo `sm:` (conserto "letra no celular"): o
   * `sm:` olha a janela, e com a cena numa coluna estreita de computador a miniatura caía para ~150px,
   * com o "pontos 0" a 7px. A miniatura sabe a própria largura antes de medir (a coluna dela).
   */
  const raiz = useRef<HTMLDivElement>(null)
  const larguraDoPalco = useLarguraMedida(raiz)
  const duasColunas = larguraDoPalco >= DUAS_COLUNAS_DO_LEITOR
  // O recuo `p-3` (24), o vão `gap-3` (12) e a borda do embrulho da miniatura (2).
  const larguraDaMiniatura = (duasColunas ? (larguraDoPalco - 36) / 2 : larguraDoPalco - 24) - 2
  return (
    // ⚠️ `p-3`: no player este palco mora DENTRO da moldura da faixa de estado, que não tem recuo, e
    // o texto encostava na borda. A miniatura leva a borda num embrulho PRÓPRIO porque o player tira a
    // borda de todo `sz-scene-frame` de dentro da moldura (e ela ficava cortada no meio do cartão).
    <div ref={raiz} className={`grid gap-3 p-3 ${duasColunas ? 'grid-cols-2' : ''}`}>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
          O que aparece na tela
        </p>
        <div
          className="overflow-hidden rounded-2xl border border-border"
          data-parte-da-cena={Math.round(larguraDaMiniatura)}
        >
          <LarguraConhecidaDaCena.Provider value={larguraDaMiniatura}>
            <SceneCanvas
              className="rounded-none border-0"
              view={{ w: 240, h: 150 }}
              cast={cast}
              mundo={mundo}
              titulo="A tela do jogo"
              // ⚠️⚠️ "dinossauro" NÃO é termo do elenco (a régua casa "Dino", e o comentário dela
              // diz por que: senão "Dinossauro" casaria "Dino" pela metade). Numa turma de nave a
              // frase saía "Um dinossauro correndo diante de asteroides" — meio elenco trocado,
              // metade não, justo na cena que ENSINA a descrever a tela para quem não a vê.
              // ⚠️⚠️ Diz que é o DESENHO da cena (review do lote 2): "O Dino correndo diante dos cactos"
              // era, palavra por palavra, a opção errada da previsão ("Um Dino correndo e pulando cactos"),
              // e quem usa leitor de tela ouvia a frase como se fosse o que o leitor do jogo diz.
              descricao="Desenho da tela do jogo: o Dino, os cactos e o placar."
            >
              {mundo === 'espaco' ? (
                <FundoEspaco w={240} h={150} semEstrelas={[{ x: 6, y: 6, w: 76, h: 28 }]} />
              ) : (
                <>
                  <rect className="fill-scene-sky" width="240" height="150" />
                  <rect className="fill-scene-ground" y="118" width="240" height="32" />
                  <path className="stroke-scene-line" d="M0 118h240" strokeWidth="2" />
                </>
              )}
              {/* ⚠️ O pé do Dino assenta NA linha do chão: `y` é o solo dele, e a escala do
                grupo entra na conta (118 = 44 + 87 × 0,85). */}
              <g className="text-primary" transform="translate(10 44) scale(0.85)">
                <ActorFigure figure={heroi} x={52} y={87 - (118 - piso) / 0.85} />
              </g>
              {/* ⚠️ Os cactos desta miniatura são retângulos desde sempre, e ficam: é o Corre Dino que
              não muda. Lote 5: MAIORES (o segundo era só um traço) e com braços dos dois lados.
              Qualquer outro obstáculo vem da figura dele. */}
              {obstaculo === 'cacto' ? (
                <g className="fill-scene-leaf" data-figure="cacto">
                  <rect x="160" y="76" width="11" height="42" rx="3" />
                  <rect x="150" y="88" width="10" height="9" rx="2" />
                  <rect x="150" y="80" width="5" height="14" rx="2" />
                  <rect x="171" y="84" width="10" height="9" rx="2" />
                  <rect x="176" y="76" width="5" height="14" rx="2" />
                  <rect x="206" y="90" width="10" height="28" rx="3" />
                  <rect x="216" y="98" width="8" height="7" rx="2" />
                  <rect x="220" y="91" width="4" height="12" rx="2" />
                </g>
              ) : (
                <>
                  <ActorFigure figure={obstaculo} x={170} y={piso} escala={0.6} />
                  <ActorFigure figure={obstaculo} x={214} y={piso} escala={0.5} />
                </>
              )}
              {/* O placar dentro de um retângulo: solto, "pontos 0" se lia como sujeira no céu. */}
              <rect
                className="fill-scene-card stroke-scene-card-line"
                x="8"
                y="8"
                width="72"
                height="24"
                rx="6"
                strokeWidth="1.5"
              />
              <Texto
                className="fill-scene-ink"
                x="44"
                y="24"
                tamanho={12}
                fontWeight="600"
                textAnchor="middle"
              >
                pontos 0
              </Texto>
            </SceneCanvas>
          </LarguraConhecidaDaCena.Provider>
        </div>
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">
          O que a pessoa ouve
        </p>
        <div className="min-h-[9rem] rounded-2xl border border-[#2c4657] bg-[#12202b] p-4 text-[#cfe3f0]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 whitespace-nowrap text-xs uppercase tracking-[.14em] text-[#6f8ea3]">
              {/* ⚠️ O ícone mexe só enquanto a voz FALA, e para com menos movimento. */}
              <Ear
                size={14}
                aria-hidden
                data-falando={voz.falando ? '' : undefined}
                className={
                  voz.falando ? 'animate-pulse text-[#cfe3f0] motion-reduce:animate-none' : ''
                }
              />
              Leitor de tela
            </p>
            {/* ⚠️ `temVoz`, e não `disponivel` (consertos do review da onda A do lote 5, B4): com vozes
                sem português a chave dizia "Voz: ligada" e nada falava. */}
            {voz.temVoz && (
              /* ⚠️ Chave com o ESTADO no rótulo. Quem já usa um leitor de tela de verdade ouve o painel
                 duas vezes com a voz ligada, e é por isso que ela desliga aqui. */
              <SceneButton
                aria-pressed={vozLigada}
                className="min-h-11 border-[#2c4657] bg-transparent text-[#cfe3f0] hover:bg-[#1c3242]"
                onClick={() => {
                  if (vozLigada) voz.parar()
                  setVozLigada(!vozLigada)
                }}
              >
                {vozLigada ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
                Voz: {vozLigada ? 'ligada' : 'desligada'}
              </SceneButton>
            )}
          </div>
          {/* ⚠️ `role="status"`: quem usa leitor de tela precisa OUVIR o que este painel mostra —
              é literalmente o assunto da cena. */}
          <div role="status" className="mt-2 space-y-3 text-sm leading-relaxed">
            {/* Um "…" solto não dizia nada, e o leitor de tela lia "reticências". */}
            {nada && <p className="italic text-[#9fb4c2]">Ainda em silêncio.</p>}
            {heardEmpty && (
              <div data-escuta="sem-frase">
                <p className="text-xs font-semibold uppercase tracking-[.1em] text-[#6f8ea3]">
                  Sem frase
                </p>
                <p>{SCREEN_READER_EMPTY}</p>
              </div>
            )}
            {said && (
              <div data-escuta="com-frase">
                <p className="text-xs font-semibold uppercase tracking-[.1em] text-[#6f8ea3]">
                  Com a sua frase
                </p>
                <p className="break-words">{said}</p>
                <ul className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                  {[
                    { chave: 'goal', rotulo: 'o que fazer', aceso: diz?.goal === true },
                    { chave: 'control', rotulo: 'como jogar', aceso: diz?.control === true },
                  ].map((selo) => (
                    <li
                      key={selo.chave}
                      data-selo={selo.chave}
                      data-aceso={selo.aceso ? '' : undefined}
                      className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2.5 ${
                        selo.aceso
                          ? 'border-[#5fd08a] bg-[#16382a] text-[#bff0cf]'
                          : 'border-dashed border-[#4b6475] text-[#8aa3b3]'
                      }`}
                    >
                      {selo.aceso ? <Check size={12} aria-hidden /> : null}
                      {selo.rotulo}: {selo.aceso ? 'sim' : 'ainda não'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {listens > 0 && !voz.temVoz && (
              <p className="text-xs text-[#8aa3b3]">
                Este navegador não tem voz. A leitura fica escrita aqui.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className={duasColunas ? 'col-span-2' : undefined}>
        <label className="block text-sm font-semibold" htmlFor={`${id}-desc`}>
          Descrição do jogo
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          É o campo do bloco Descrever o jogo para leitor de tela.
        </p>
        <textarea
          id={`${id}-desc`}
          rows={2}
          maxLength={SCENE_LIMITS.describe.max}
          disabled={!interactive}
          // ⚠️ `readOnly` + `aria-disabled`, e não `disabled`: fechado continua no Tab, dizendo o motivo.
          readOnly={fechado}
          aria-disabled={fechado || undefined}
          aria-describedby={fechado ? `${id}-nota` : undefined}
          value={rascunho}
          /* ⚠️⚠️ Fechado, o MOTIVO mora dentro do campo, com o cadeado e o fundo apagado (consertos do
             review da onda A do lote 5): a criança tocava, o campo ganhava o anel azul de campo aberto,
             ela digitava e nada aparecia, e o único sinal era a borda tracejada e uma nota de 12px. */
          placeholder={
            fechado
              ? '🔒 Primeiro aperte Ouvir a tela.'
              : 'Escreva o que é o seu jogo e como se joga'
          }
          onChange={(e) => escrever(e.target.value)}
          onBlur={(e) => confirmar(e.target.value)}
          onKeyDown={(e) => {
            // A primeira tecla num campo fechado vira aviso falado (uma vez só).
            if (fechado && !tentouEscrever && e.key.length === 1) setTentouEscrever(true)
          }}
          className={`w-full rounded-xl border p-3 text-sm ${
            fechado
              ? 'cursor-not-allowed border-dashed border-muted-foreground/50 bg-muted placeholder:text-muted-foreground focus-visible:outline-dashed'
              : 'border-border bg-background'
          }`}
        />
        {fechado && interactive && (
          <p
            id={`${id}-nota`}
            role="status"
            className={`mt-1 text-muted-foreground ${tentouEscrever ? 'text-sm font-semibold' : 'text-xs'}`}
          >
            {tentouEscrever
              ? 'O campo ainda está fechado. Abre depois de ouvir a tela vazia.'
              : 'Abre depois de ouvir a tela vazia.'}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * A tela e o limite dela.
 *
 * ⚠️ O que ensina aqui é o CONTRASTE entre a área de fora e a tela: sem a borda, a cor do
 * fundo cobre tudo e a criança não tem como saber onde o jogo acontece — que é exatamente a
 * queixa que o roteiro da Aula 1 usa para introduzir o bloco da borda. Por isso o palco desenha
 * o espaço em volta, e não só o retângulo.
 *
 * ⭐⭐ Lote 5 do Raio-X: ESCALA FIXA. A escala era recalculada a cada mudança, e diminuir os números
 * fazia o desenho CRESCER (de 800 × 480 para 600 × 300, com a borda escondida, o que mudava na tela
 * era o tracejado do alvo, maior); com a borda ligada, 800 × 480 e 480 × 270 saíam quase do mesmo
 * tamanho. Hoje o espaço em volta é sempre o de 800 × 480, e 480 fica visivelmente mais estreito.
 */
export function StageSizeStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { width, height, border } = state.stage
  const noAlvo = width === STAGE_TARGET.width && height === STAGE_TARGET.height
  const VIEW = { w: 560, h: 330 } as const
  const { stageWidth, stageHeight } = SCENE_LIMITS
  const escala = Math.min((VIEW.w - 60) / stageWidth.max, (VIEW.h - 56) / stageHeight.max)
  const moldura = (w0: number, h0: number) => {
    const w = w0 * escala
    const h = h0 * escala
    return { x: (VIEW.w - w) / 2, y: (VIEW.h - h) / 2 + 8, w, h }
  }
  const tela = moldura(width, height)
  const alvo = moldura(STAGE_TARGET.width, STAGE_TARGET.height)
  const mundo = sceneWorld(cast, 'stage-size')
  const heroi = actorFigure(cast, 'hero')
  const caixa = caixaDe(heroi)
  /** As cantoneiras do alvo: um L em cada canto, curto, fora do caminho do Dino. */
  const BRACO = 16
  const cantos = [
    { x: alvo.x, y: alvo.y, dx: 1, dy: 1 },
    { x: alvo.x + alvo.w, y: alvo.y, dx: -1, dy: 1 },
    { x: alvo.x, y: alvo.y + alvo.h, dx: 1, dy: -1 },
    { x: alvo.x + alvo.w, y: alvo.y + alvo.h, dx: -1, dy: -1 },
  ]
  return (
    <SceneCanvas
      view={VIEW}
      cast={cast}
      mundo={mundo}
      titulo="A tela do jogo dentro do espaço em volta"
      // ⚠️ Com outras palavras que a frase embaixo do palco: iguais, o leitor de tela ouvia a mesma
      // coisa duas vezes.
      descricao={`A tela do jogo mede ${width} por ${height}, e a borda está ${border ? 'à vista' : 'escondida'}.`}
      // ⚠️ SEM rodapé (lote 2 do Raio-X): "A cor do fundo cobriu tudo: onde começa a tela?" era a
      // pergunta da previsão da cena já respondida, embaixo do palco, desde a abertura. E
      // "moldura" era a segunda palavra para a borda, que é o nome do botão e do bloco.
    >
      {/* O espaço em volta tem a MESMA cor do céu: é isso que faz o limite sumir sem a borda. No
          espaço, as estrelas continuam do lado de fora pelo mesmo motivo. ⚠️ E nada tracejado, nem
          texto, antes da borda: o único retângulo do palco tem de ser a TELA (lote 5). */}
      {mundo === 'espaco' ? (
        <FundoEspaco w={VIEW.w} h={VIEW.h} />
      ) : (
        <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
      )}
      {/* ⭐ O ALVO só com a borda à vista, e como CANTONEIRAS (lote 5): o retângulo tracejado era um
          segundo retângulo que não é a tela, e o texto dele ficava embaixo do Dino. */}
      {border && !noAlvo && (
        <g
          data-alvo=""
          className="stroke-scene-ink-soft"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        >
          {cantos.map((c) => (
            <path
              key={`${c.x}-${c.y}`}
              d={`M${c.x + c.dx * BRACO} ${c.y}H${c.x}V${c.y + c.dy * BRACO}`}
            />
          ))}
        </g>
      )}
      {border && (
        <>
          {/* ⚠️ Na cor de DESTAQUE do tema, e não no vermelho de erro: na aula a criança escolhe a cor
              da borda, e vermelho lia "está errado". */}
          <rect
            data-borda=""
            className="stroke-primary"
            x={tela.x}
            y={tela.y}
            width={tela.w}
            height={tela.h}
            fill="none"
            strokeWidth="4"
          />
          {/* As medidas ficam ao lado da borda, do lado de fora, para não sujar a tela. */}
          <Texto
            className="fill-scene-ink"
            x={tela.x + tela.w / 2}
            y={tela.y - 10}
            textAnchor="middle"
            tamanho={13}
            fontWeight="600"
          >
            {width}
          </Texto>
          <Texto
            className="fill-scene-ink"
            x={tela.x - 10}
            y={tela.y + tela.h / 2}
            textAnchor="end"
            tamanho={13}
            fontWeight="600"
          >
            {height}
          </Texto>
        </>
      )}
      {/* O Dino do tamanho do jogo (a caixa de 64) e sempre ACIMA da linha de baixo da tela. */}
      <g className="text-primary">
        <ActorFigure
          figure={heroi}
          x={tela.x + tela.w / 2 + caixa.centro * escala}
          y={tela.y + tela.h - 6}
          escala={escala}
        />
      </g>
    </SceneCanvas>
  )
}

/**
 * Por que o desenho se repete.
 *
 * O palco mostra os três estados do par de chaves: a tela que não muda (só desenhou no começo), o
 * rastro (desenha sem limpar) e o movimento (limpa e desenha). O rastro é desenhado de verdade —
 * cópias do Dino nas casas em que ele foi desenhado —, porque é vendo os desenhos acumulados que a
 * criança entende o que a limpeza faz.
 *
 * ⭐⭐ Lote 5 do Raio-X: o palco desenha o que o MOTOR diz que está na tela (`render.drawn`, as casas
 * de cada desenho), e o x do Dino nos bastidores anda na faixa. Antes a posição só existia aqui
 * (`frames % casas`), então ligar o desenho depois de alguns quadros fazia o Dino dar um salto sem
 * explicação; hoje o salto é a descoberta, e a tela é do tamanho da do jogo (480 de largura).
 */
export function DrawLoopStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { frames, drawn } = state.render
  const VIEW = { w: 480, h: 200 } as const
  const CHAO = 160
  /** Quantos Dinos a tela mostra vem do MOTOR (`drawLoopOnScreen`), o mesmo número da faixa. */
  const naTela = drawLoopOnScreen(state)
  const heroi = actorFigure(cast, 'hero')
  const caixa = caixaDe(heroi)
  const mundo = sceneWorld(cast, 'draw-loop')
  // ⚠️ No espaço não há chão (review do lote 3): na mesma aula a `world` já diz isso.
  const piso = pisoDoMundo(mundo, CHAO)
  const ultimo = drawn.at(-1)
  /**
   * ⚠️⚠️ Onde o Dino ESTÁ enquanto o desenho fica (consertos do review da onda A do lote 5): com "Só no
   * começo" a criança via o Dino parado e um número andando na faixa, e o contraste número × desenho
   * vivia só na legenda. Uma silhueta TRACEJADA e vazia na casa de `render.x`, com o x embaixo, mostra
   * os dois ao mesmo tempo. Só com algo desenhado: com a tela vazia, a descoberta é o vazio.
   */
  const bastidor = state.render.x
  const semDesenhoNoLugar = frames > 0 && drawn.length > 0 && !drawn.includes(bastidor)
  const desenhoFicou =
    semDesenhoNoLugar && ultimo !== undefined
      ? ` O x do Dino já está em ${bastidor}, e o desenho continua em ${ultimo}.`
      : ''
  return (
    <SceneCanvas
      view={VIEW}
      cast={cast}
      mundo={mundo}
      titulo="A tela do jogo enquanto o relógio anda"
      // ⚠️ A descrição diz o que está DESENHADO, para quem não enxerga, e nunca a regra das chaves.
      // ⚠️ Com palavras DIFERENTES da frase embaixo do palco (review do lote 2).
      descricao={`${
        naTela === 0
          ? `No quadro ${frames}, a tela do jogo está vazia.`
          : // ⚠️ Sem "ele" e sem "um em cada": os dois não concordam com um elenco feminino.
            naTela === 1
            ? `No quadro ${frames}, a tela do jogo mostra ${quantos(naTela, 'Dino', 'Dinos')}.`
            : `No quadro ${frames}, a tela do jogo mostra ${quantos(naTela, 'Dino', 'Dinos')} lado a lado.`
      }${desenhoFicou}`}
      // ⚠️⚠️ SEM rodapé em estado nenhum (lote 2 do Raio-X, 16/09/2026): os três diziam a REGRA.
    >
      {mundo === 'espaco' ? (
        <FundoEspaco w={VIEW.w} h={VIEW.h} semEstrelas={[{ x: 8, y: 8, w: 84, h: 26 }]} />
      ) : (
        <>
          <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
          <rect className="fill-scene-ground" y={CHAO} width={VIEW.w} height={VIEW.h - CHAO} />
          <path className="stroke-scene-line" d={`M0 ${CHAO}h${VIEW.w}`} strokeWidth="2" />
        </>
      )}
      {drawn.map((x) => (
        <g
          key={x}
          className="text-primary"
          data-desenho={x}
          // O desenho antigo fica mais apagado: ele é o que SOBROU, não o de agora.
          opacity={x === ultimo ? 1 : 0.45}
        >
          <ActorFigure figure={heroi} x={x + caixa.w / 2 + caixa.centro} y={piso} />
        </g>
      ))}
      {semDesenhoNoLugar && (
        <g data-bastidor={bastidor}>
          <rect
            className="stroke-scene-a"
            x={bastidor}
            y={piso - caixa.h}
            width={caixa.w}
            height={caixa.h}
            rx="10"
            fill="none"
            strokeWidth="2"
            strokeDasharray="6 5"
          />
          <Texto
            className="fill-scene-a"
            x={bastidor + caixa.w / 2}
            y={piso + 18}
            textAnchor="middle"
            tamanho={13}
            fontWeight="700"
          >
            {/* ⚠️ Com o nome da `world` (full review de experiência, B12): três "fantasmas" com três
                sentidos nas primeiras aulas; este é o Dino que está NOS BASTIDORES. */}
            {`nos bastidores · x ${bastidor}`}
          </Texto>
        </g>
      )}
      <Texto
        className="fill-scene-ink-soft"
        x="16"
        y="26"
        tamanho={12}
        fontWeight="600"
        letterSpacing="0.5"
      >
        {`quadro ${frames}`}
      </Texto>
    </SceneCanvas>
  )
}
