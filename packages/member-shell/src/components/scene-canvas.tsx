'use client'

import {
  castText,
  cenarioEscuro,
  type SceneCast,
  type SceneCenarioId,
} from '@sistemazero/core/learning/scene'
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  type RefObject,
  type SVGProps,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '../lib/cn'

/**
 * O PALCO das 45 cenas: a moldura, o desenho e o que se lê em volta dele — num lugar só.
 *
 * ⭐⭐ Havia CINCO cromos de palco, um por família de cena, e três deles chamavam a própria cópia
 * de `Moldura`. As cinco desenhavam a mesma coisa: a caixa com borda e recorte, o `<svg>` com
 * `role="img"`, o `<title>`/`<desc>` ligados por `aria-labelledby` e o rodapé de legenda. Enquanto
 * foi assim, **qualquer melhoria de desenho custava cinco edições** — é por isso que a faixa
 * cortada só foi consertada numa família e a caixa vazia sobreviveu a quatro revisões.
 *
 * ⚠️⚠️ **O ENQUADRAMENTO continua sendo por família, e é deliberado.** Três das cinco já usam
 * 560×300 (`SCENE_VIEW`, agora o padrão), mas o palco do Corre Dino é 600×310 e o da tela é
 * derivado do tamanho do jogo — e as centenas de coordenadas dos `d="…"` de cada desenho estão
 * NESSAS unidades. Unificar o `viewBox` não é mudar um número: é redesenhar 45 cenas. O que este
 * componente garante é que a cena NOVA nasce no enquadramento comum, então a deriva para de
 * crescer enquanto as antigas não forem redesenhadas uma a uma.
 *
 * ⚠️ O `overlay` existe para o palco compartilhado: ele põe controles HTML POR CIMA do SVG (as
 * alças de arraste, o "Toque para começar"), e eles precisam ser irmãos do `<svg>` dentro da
 * moldura posicionada. Quem não tem overlay não paga nada por ele.
 */

/** O enquadramento comum. Cena nova não escolhe o seu — herda este. */
export const SCENE_VIEW = { w: 560, h: 300 } as const

/* ── A letra do desenho (conserto "letra no celular", 16/09/2026) ─────────────────────────────── */

/**
 * ⭐⭐ A MENOR letra, em pixels NA TELA, de todo texto escrito dentro de um desenho de cena.
 *
 * ⚠️⚠️ Os palcos são SVG de 480 a 640 unidades de largura com `fontSize` de 10 a 15, e o `viewBox`
 * escala o desenho para a largura da coluna: ~0,87 no computador (coluna de 600px) e ~0,52 num
 * celular de 390px (palco de 314px). A letra de verdade é `fontSize × escala`, e no celular ela caía
 * para 5 a 8px — e em várias cenas a descoberta mora justamente nesses rótulos (os selos da
 * `controls`, a fileira da `acceleration`, os números da `group-loop`). Cada ajuste de tamanho feito
 * até aqui foi para a coluna do computador, porque nenhum palco sabia a própria escala.
 */
export const PISO_DA_LETRA = 12

/**
 * Abaixo desta escala o desenho está ESTREITO: a letra de fábrica (13 a 15 unidades) precisa crescer
 * mais de um terço para chegar ao piso, e os rótulos que moravam lado a lado passam a se encostar. É
 * a hora de o palco desenhar menos rótulos, ou de levar o número para fora do desenho.
 * ⚠️ Num celular de 390px todo palco de 480 a 640 unidades fica abaixo dela (0,49 a 0,65); na coluna
 * de 600px do computador, nenhum (0,82 a 1,09).
 */
export const ESCALA_ESTREITA = 0.75

/**
 * A largura do palco (o conteúdo da moldura, em px) enquanto ninguém mediu: a renderização no
 * servidor, o primeiro quadro e os testes sem `LarguraConhecidaDaCena`. É a coluna de 600px do
 * computador (a banca: 600 − 32 do `p-4` − 42 do cartão da aula − 2 da moldura), que é o desenho de
 * fábrica: sem medida, a cena sai como sempre saiu.
 */
export const LARGURA_NOMINAL_DA_CENA = 524

/**
 * A largura do lugar onde a cena vai morar, quando quem a monta JÁ SABE antes de medir: a galeria
 * das cenas, os testes (que renderizam no servidor, sem layout) e um palco que parte a própria área
 * (a `screen-reader` põe o desenho numa coluna, o `tilemap` numa caixa de largura fixa).
 * ⚠️ É só o ponto de partida: no navegador a moldura MEDE a si mesma, e a medida vence.
 */
export const LarguraConhecidaDaCena = createContext<number | null>(null)

/**
 * O enquadramento de um desenho: o `viewBox`. ⚠️ `x` e `y` só nos RECORTES (o `viewEstreito` e o
 * `viewEmpilhado`): as coordenadas do desenho continuam as de fábrica, e o recorte só escolhe a janela.
 */
export type Enquadramento = { x?: number; y?: number; w: number; h: number }

const viewBoxDe = (v: Enquadramento) => `${v.x ?? 0} ${v.y ?? 0} ${v.w} ${v.h}`

/** O que o palco sabe da própria escala: é por aqui que todo texto do desenho ganha tamanho. */
export interface Palco {
  /** A largura do `<svg>` na tela, em px. */
  largura: number
  /** Px por unidade do `viewBox`. */
  escala: number
  /** O enquadramento em uso: o `viewEstreito` quando o palco pediu um e está estreito. */
  view: Enquadramento
  /**
   * ⭐⭐ O `fontSize` (em unidades do desenho) de um texto que foi desenhado com `unidades`: o mesmo
   * número quando ele já dá o piso na tela, e o mínimo que dá o piso quando não dá. ⚠️ TODO `<text>`
   * de palco passa por aqui, pelo `Texto` (`tests/scene-identity.test.ts` reprova `<text>` cru num
   * palco, e `tests/scene-letra-celular.test.tsx` mede as 45 cenas a 390 e a 600px).
   */
  letra: (unidades: number) => number
  /**
   * `escala < ESCALA_ESTREITA` no enquadramento de FÁBRICA: desenhe menos rótulos, ou leve o número
   * para fora do desenho. ⚠️ Com `viewEstreito` ele continua verdadeiro: é o enquadramento de fábrica
   * que decide, senão uma largura intermediária desenharia o layout largo no recorte estreito.
   */
  estreito: boolean
  /** Quantas unidades do desenho um texto ocupa na letra que ele vai ter (uma estimativa para caber). */
  larguraDoTexto: (texto: string, unidades: number) => number
}

/**
 * A largura de um texto na fonte da cena (Nunito), em unidades do tamanho dele: ~0,56 por letra, com
 * folga para o negrito e para os números. ⚠️ É para CABER (encostar na borda, alinhar à direita), não
 * para medir: quem precisa do exato mede no navegador.
 */
export const LARGURA_MEDIA_DA_LETRA = 0.56

/** O palco de um desenho de `view` (ou só a largura dele) mostrado em `largura` px. */
export function palcoDe(
  largura: number,
  view: number | Enquadramento,
  estreitoDeFabrica?: boolean,
): Palco {
  const enquadramento = typeof view === 'number' ? { w: view, h: 0 } : view
  const escala = largura > 0 && enquadramento.w > 0 ? largura / enquadramento.w : 1
  // ⚠️ Arredondado PARA CIMA no décimo: a medida da moldura tem fração de pixel, e o piso não pode
  // cair para 11,97 por arredondamento.
  const minimo = Math.ceil((PISO_DA_LETRA / escala) * 10) / 10
  const letra = (unidades: number) => Math.max(unidades, minimo)
  return {
    largura,
    escala,
    view: enquadramento,
    letra,
    estreito: estreitoDeFabrica ?? escala < ESCALA_ESTREITA,
    larguraDoTexto: (texto, unidades) =>
      [...texto].length * letra(unidades) * LARGURA_MEDIA_DA_LETRA,
  }
}

const PalcoAtual = createContext<Palco>(palcoDe(LARGURA_NOMINAL_DA_CENA, SCENE_VIEW))

/**
 * O palco do desenho em volta, para as peças que moram DENTRO do `SceneCanvas` (o selo, o cartão, a
 * torre). Quem escreve direto no desenho recebe o mesmo `Palco` pela função `children`.
 */
export function usePalco(): Palco {
  return useContext(PalcoAtual)
}

/**
 * A largura do CONTEÚDO de um elemento (sem a borda), medida no navegador e acompanhada quando a
 * coluna muda (a divisória da aula, a janela, o "Expandir"). Antes de medir, a largura conhecida do
 * contexto; sem ela, a nominal.
 *
 * ⚠️⚠️ Sem `container-type` nem consulta de contêiner: contenção na aula já prendeu o "Expandir" do
 * Estúdio (CLAUDE.md do kids) e colapsou a bancada da `camera-3d` para largura zero (CLAUDE.md daqui).
 * ⚠️ `useLayoutEffect`: mede ANTES de pintar, então no navegador a cena já nasce com a letra certa
 * (no servidor ele não roda, e vale a largura conhecida).
 * ⚠️ A largura do elemento não depende do que o palco desenha dentro dele (a moldura é um bloco na
 * largura da coluna), então medir e redesenhar não entram em laço.
 */
export function useLarguraMedida(ref: RefObject<Element | null>): number {
  const conhecida = useContext(LarguraConhecidaDaCena)
  const [medida, setMedida] = useState<number | null>(null)
  useLayoutEffect(() => {
    const elemento = ref.current
    if (!elemento) return
    const guardar = (largura: number) => {
      if (!(largura > 0)) return
      setMedida((antes) => (antes !== null && Math.abs(antes - largura) < 0.5 ? antes : largura))
    }
    const estilo = getComputedStyle(elemento)
    guardar(
      elemento.getBoundingClientRect().width -
        (Number.parseFloat(estilo.borderLeftWidth) || 0) -
        (Number.parseFloat(estilo.borderRightWidth) || 0),
    )
    if (typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(([entrada]) => {
      const caixa = entrada?.contentBoxSize?.[0]
      guardar(caixa ? caixa.inlineSize : (entrada?.contentRect.width ?? 0))
    })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [ref])
  return medida ?? conhecida ?? LARGURA_NOMINAL_DA_CENA
}

/**
 * ⭐⭐ O ÚNICO jeito de escrever dentro de um desenho de cena: um `<text>` cujo `tamanho` (em unidades
 * do desenho, o de fábrica) passa por `letra` do palco em volta. Na coluna do computador ele sai quase
 * sempre igual; num celular, cresce até o piso.
 * ⚠️⚠️ O palco que tem `<text>` cru reprova no `tests/scene-identity.test.ts`. E letra maior ocupa mais
 * lugar: quem desenha precisa conferir que nada encosta nem sai do desenho no estreito
 * (`tmp/storyboard/letra-celular/auditar.mjs`), e decidir o que desenhar com `palco.estreito`.
 */
export function Texto({
  tamanho,
  children,
  ...props
}: Omit<SVGProps<SVGTextElement>, 'fontSize'> & { tamanho: number }) {
  const { letra } = usePalco()
  return (
    <text {...props} fontSize={letra(tamanho)}>
      {children}
    </text>
  )
}

/** O desenho: pronto, ou uma função do palco (para decidir o que cabe na escala medida). */
export type DesenhoDoPalco = ReactNode | ((palco: Palco) => ReactNode)

const desenhar = (desenho: DesenhoDoPalco, palco: Palco) =>
  typeof desenho === 'function' ? desenho(palco) : desenho

/** A borda de 2px que separa os dois lados da comparação lado a lado (fica no lado da esquerda). */
const DIVISORIA = 2

/**
 * A MOLDURA, sozinha. Interna de propósito: quem desenha uma cena usa o `SceneCanvas`.
 *
 * ⚠️⚠️ **Cromo é do APP; mundo é da CENA.** A borda e o recorte vestem a identidade do
 * aplicativo (`border-border`, que no kids é a linha do Pen) porque é a moldura que encosta no
 * cartão da aula. O que fica DENTRO — céu, chão, árvores, o personagem — continua com a paleta
 * ilustrada `--color-scene-*`: a cena é o retrato de um JOGO, e pintá-la de branco e azul a
 * transformaria num formulário. `bg-scene-ground` é o papel do mundo, e por isso fica aqui.
 */
function SceneFrame({
  children,
  className,
  mundo,
  refDaMoldura,
  largura,
}: {
  children: ReactNode
  className?: string
  mundo?: SceneCenarioId
  refDaMoldura: RefObject<HTMLDivElement | null>
  /** A largura que o palco está usando (a medida, ou a conhecida antes de medir). */
  largura: number
}) {
  return (
    <div
      ref={refDaMoldura}
      // ⚠️ `data-largura-do-palco`: a largura com que a letra foi calculada, para os e2e conferirem.
      data-largura-do-palco={Math.round(largura)}
      // `sz-scene-frame`: gancho para o PLAYER colar a faixa de estado na mesma moldura (review do
      // lote 2). Sem regra aqui.
      // ⚠️⚠️ `sz-scene-espaco` (Raio-X, lote 3) REDECLARA a paleta inteira da cena para o escuro
      // (`styles/scene.css`): o papel, a tinta, o chão e o par. Por isso ela mora na MOLDURA, e
      // não no desenho: o fundo da própria moldura e os dois lados da comparação vão junto.
      data-mundo={mundo}
      className={cn(
        'sz-scene-frame overflow-hidden rounded-2xl border border-border bg-scene-ground',
        // ⚠️⚠️ Pela COR do fundo, nunca por "não tem chão": a `gorilas` tem chão e céu noturno, e
        // com a pergunta antiga a tinta escura da cena ficaria ilegível sobre a cidade à noite.
        cenarioEscuro(mundo) && 'sz-scene-espaco',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Um LADO da comparação. Ele tem nome porque é o nome que a criança compara: "nos bastidores"
 * contra "na tela do jogo" é a descoberta inteira da primeira cena do Corre Dino.
 */
export interface LadoDaComparacao {
  titulo: string
  /** O que está desenhado deste lado, para quem não enxerga. */
  descricao: string
  /** O desenho, ou uma função do palco DESTE lado (cada lado tem a sua largura e a sua escala). */
  desenho: DesenhoDoPalco
  /** O enquadramento deste lado, quando ele não é o do canvas. */
  view?: Enquadramento
  /**
   * O recorte deste lado quando os dois ficam EMPILHADOS (celular): um lado de pé ocupa a largura
   * inteira e a altura dobra, então o que é margem vazia em volta do desenho sai (conserto "letra no
   * celular": a `world` passava de uma tela de celular inteira só com as duas vistas).
   */
  viewEmpilhado?: Enquadramento
}

/**
 * Os dois lados cabem lado a lado? ⚠️⚠️ Pela largura MEDIDA da moldura, e não pelo `sm:` (que olha a
 * JANELA): numa janela de computador com a cena numa coluna estreita, dois desenhos lado a lado caíam
 * para metade do tamanho, com a letra de 5px (consertos da onda B, `pick-ray`). Lado a lado só quando
 * nenhum lado fica estreito.
 */
export function ladosCabemLadoALado(
  largura: number,
  views: readonly [{ w: number }, { w: number }],
): boolean {
  return views.every((v, i) => (largura / 2 - (i === 0 ? DIVISORIA : 0)) / v.w >= ESCALA_ESTREITA)
}

export function SceneCanvas({
  children,
  titulo,
  descricao,
  rodape,
  cast,
  view = SCENE_VIEW,
  overlay,
  className,
  svgRef,
  comparacao,
  interativo = false,
  estilo,
  mundo,
  empilhar = false,
  legenda,
  viewEstreito,
}: {
  /** O desenho, ou uma função do `Palco` (a escala medida) que decide o que cabe. */
  children?: DesenhoDoPalco
  /**
   * O nome do desenho, para quem usa leitor de tela.
   *
   * ⚠️⚠️ Ele e a `descricao` passam pelo ELENCO aqui dentro. É o invariante do full review de
   * 14/09/2026: sem ele a criança de uma turma de nave lia "nave" na faixa de estado e ouvia "o
   * Dino" do leitor de tela, no mesmo desenho. Texto solto DENTRO do `children` continua
   * precisando do `castText` à mão — o componente não alcança o que o desenho escreve.
   */
  titulo: string
  /** O que está desenhado AGORA. Não é o que acabou de acontecer: isso é da frase abaixo do palco. */
  descricao: string
  /** A legenda dentro da moldura, abaixo do desenho. */
  rodape?: string
  cast?: SceneCast
  view?: Enquadramento
  /** Controles HTML por CIMA do desenho. Pede `className="relative"` na moldura. */
  overlay?: ReactNode
  className?: string
  svgRef?: RefObject<SVGSVGElement | null>
  /**
   * O modo ANTES | DEPOIS: dois desenhos lado a lado, nomeados, dentro da mesma moldura.
   *
   * ⭐⭐ É o padrão número um do estudo do Brilliant, e nenhum dos 45 palcos o tinha como
   * ESTRUTURA: cada um desenhava UM estado e a comparação vivia no texto ("compare", "depois
   * ligue"). É a diferença entre a criança VER a descoberta e LER que ela aconteceu.
   *
   * ⚠⚠ Lado a lado só quando nenhum lado fica estreito, pela largura MEDIDA da moldura
   * (`ladosCabemLadoALado`; antes era o `sm:`, que olha a janela). Num celular de 360px dois painéis
   * dariam 170px cada, e a comparação que existe para ser vista ficaria ilegível — empilhado, os
   * nomes de cada lado seguram a leitura na vertical.
   *
   * ⚠ As cores do PAR (azul e âmbar) marcam os dois nomes. Elas não seguem o tema: dizem QUAL
   * lado é qual, aqui, na faixa de estado e na comparação guardada.
   *
   * ⚠️⚠️⚠️ **QUANDO usar, e quando NÃO.** A galeria das 45 mostrou que a maioria das cenas de
   * contraste JÁ compara estruturalmente, cada uma dentro do próprio desenho: `hold-vs-press` tem
   * duas pistas, `delta-time` tem dois computadores, `pixel-vector` tem as duas pedras,
   * `sheet-vs-sprite` tem a folha e o jogo, `tilemap` tem o texto e o desenho. A regra que separa
   * os casos não é "a cena fala de contraste":
   *
   * - **Os dois estados COEXISTEM no mundo** (o Dino guardado E desenhado; o mesmo jogo em dois
   *   computadores) → lado a lado. Sem isso a criança LÊ que os dois existem.
   * - **A criança ALTERNA entre dois estados** (`layers` troca a ordem, `fill-stroke` liga e
   *   desliga o miolo) → **um estado só, e o gesto é a descoberta.** Mostrar os dois ao mesmo
   *   tempo ali não melhora nada: TIRA o experimento, porque não sobra o que descobrir.
   *
   * A comparação com o que ela viu ANTES é outra coisa, e já existe: o "Guardar para comparar"
   * (`ExperienceComparison`).
   */
  comparacao?: readonly [LadoDaComparacao, LadoDaComparacao]
  /**
   * O desenho recebe gesto DIRETO (arrastar o cacto, tocar no Dino para pular).
   *
   * ⚠⚠ Aí ele deixa de ser `role="img"` e vira `role="group"`: uma imagem é uma coisa só e o
   * leitor de tela não entra nela, mas este palco tem alvos dentro. ⚠ O caminho de teclado
   * continua sendo a BANCADA — o arrasto nunca é a única saída.
   */
  interativo?: boolean
  /** Só para o que o CSS não alcança: o `touch-action` de um palco que se arrasta. */
  estilo?: CSSProperties
  /**
   * O mundo do elenco (`sceneCenario` do core). ⚠️ Só o palco que DESENHA um papel do elenco passa:
   * ele troca também o próprio fundo (`FundoDoCenario`). Um palco abstrato (o espelho, a lupa, o
   * mapa de letras) fica no papel de sempre com qualquer elenco.
   */
  mundo?: SceneCenarioId
  /**
   * Os dois lados da comparação sempre um EMBAIXO do outro (consertos do review da onda B do lote 5,
   * `pick-ray`). ⚠️ O `sm:` olha a JANELA, e não a coluna da cena: num computador com a cena numa coluna
   * de 600px, dois desenhos DEITADOS lado a lado caíam para metade do tamanho. Só para lados deitados.
   */
  empilhar?: boolean
  /**
   * Texto HTML logo abaixo do desenho, dentro da moldura: o lugar do número que É a descoberta quando
   * o desenho está estreito demais para ele (conserto "letra no celular"). Recebe o palco do desenho
   * (na comparação, o do primeiro lado). ⚠️ Não é o `rodape`: o rodapé só dá nome ao desenho.
   */
  legenda?: DesenhoDoPalco
  /**
   * O enquadramento do desenho quando o palco está ESTREITO (celular): um recorte menor, para quem leva
   * rótulos para fora do desenho e mostra só o que sobrou, ou aproxima o que é miúdo (conserto "letra no
   * celular"). O desenho de dentro lê o enquadramento em uso em `palco.view`.
   */
  viewEstreito?: Enquadramento
}) {
  const id = useId()
  const moldura = useRef<HTMLDivElement>(null)
  const largura = useLarguraMedida(moldura)
  const textoDoRodape = rodape ? (
    /* ⚠️ 14px (lote 2 do Raio-X): o rodapé é texto que a criança LÊ; 12px fica para rótulo de eixo. */
    <p className="px-3 pb-2 text-center text-sm text-scene-ink-soft">{castText(rodape, cast)}</p>
  ) : null
  if (comparacao) {
    const views = [comparacao[0].view ?? view, comparacao[1].view ?? view] as const
    const ladoALado = !empilhar && ladosCabemLadoALado(largura, views)
    // ⚠️ Lado a lado, as duas colunas têm metade da moldura, e a divisória de 2px mora DENTRO da primeira.
    const emUso = views.map((v, i) => (ladoALado ? v : (comparacao[i]?.viewEmpilhado ?? v)))
    const palcos = emUso.map((v, i) =>
      palcoDe(ladoALado ? largura / 2 - (i === 0 ? DIVISORIA : 0) : largura, v),
    )
    return (
      <SceneFrame className={className} mundo={mundo} refDaMoldura={moldura} largura={largura}>
        <div
          role="group"
          aria-label={castText(titulo, cast)}
          data-empilhada={ladoALado ? undefined : true}
          data-lado-a-lado={ladoALado || undefined}
          // ⚠️ `grid-cols-2` é `minmax(0, 1fr)`: as duas colunas têm a MESMA largura, e a divisória de
          // 2px fica dentro da primeira (o desenho da esquerda perde 2px, o da direita não).
          className={ladoALado ? 'grid grid-cols-2' : 'grid'}
        >
          {comparacao.map((lado, i) => {
            const palco = palcos[i] ?? palcoDe(largura, view)
            const v = palco.view
            return (
              <div
                key={lado.titulo}
                // ⚠️ A divisória usa a régua da CENA (`scene-rule`), e não a linha do app: ela fica
                // sobre o papel ilustrado, onde a linha do Pen sumiria. Ela separa DOIS LUGARES —
                // é informação, não moldura.
                className={
                  i === 0
                    ? ladoALado
                      ? 'border-scene-rule border-r-2'
                      : 'border-scene-rule'
                    : ladoALado
                      ? 'border-scene-rule'
                      : 'border-scene-rule border-t-2'
                }
              >
                <p
                  className={`px-3 pt-2 text-center text-sm font-bold uppercase tracking-[.14em] ${
                    i === 0 ? 'text-scene-a' : 'text-scene-b-ink'
                  }`}
                >
                  {castText(lado.titulo, cast)}
                </p>
                <svg
                  viewBox={viewBoxDe(v)}
                  className="block w-full"
                  role="img"
                  aria-labelledby={`${id}-${i}-t ${id}-${i}-d`}
                  data-largura-do-desenho={Math.round(palco.largura)}
                  data-escala-do-desenho={palco.escala.toFixed(3)}
                >
                  <title id={`${id}-${i}-t`}>{castText(lado.titulo, cast)}</title>
                  <desc id={`${id}-${i}-d`}>{castText(lado.descricao, cast)}</desc>
                  <PalcoAtual.Provider value={palco}>
                    {desenhar(lado.desenho, palco)}
                  </PalcoAtual.Provider>
                </svg>
              </div>
            )
          })}
        </div>
        {legenda ? desenhar(legenda, palcos[0] ?? palcoDe(largura, view)) : null}
        {textoDoRodape}
        {overlay}
      </SceneFrame>
    )
  }
  // ⭐ O recorte do estreito: quem leva rótulos para fora do desenho pode mostrar só o que sobrou, e o
  // desenho cresce na tela (e a letra precisa crescer menos). Quem decide que está estreito é o de fábrica.
  const deFabrica = palcoDe(largura, view)
  const palco =
    deFabrica.estreito && viewEstreito ? palcoDe(largura, viewEstreito, true) : deFabrica
  return (
    <SceneFrame className={className} mundo={mundo} refDaMoldura={moldura} largura={largura}>
      <svg
        ref={svgRef}
        viewBox={viewBoxDe(palco.view)}
        className="block w-full"
        role={interativo ? 'group' : 'img'}
        aria-labelledby={`${id}-t ${id}-d`}
        style={estilo}
        data-largura-do-desenho={Math.round(palco.largura)}
        data-escala-do-desenho={palco.escala.toFixed(3)}
      >
        <title id={`${id}-t`}>{castText(titulo, cast)}</title>
        <desc id={`${id}-d`}>{castText(descricao, cast)}</desc>
        <PalcoAtual.Provider value={palco}>{desenhar(children, palco)}</PalcoAtual.Provider>
      </svg>
      {legenda ? desenhar(legenda, palco) : null}
      {textoDoRodape}
      {overlay}
    </SceneFrame>
  )
}
