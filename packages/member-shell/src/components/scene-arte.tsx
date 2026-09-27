'use client'

import {
  cenarioTemChao,
  fundoDoCenario,
  type SceneCenarioId,
} from '@sistemazero/core/learning/scene'
import {
  type DetalheDoFundo,
  FIGURAS,
  FUNDOS,
  farolSvgUrl,
  type NomeDaFigura,
  type NoSvg,
  PincelSvg,
  type Retangulo,
} from '@sistemazero/studio/arte'
import { createContext, type ReactNode, useContext, useId } from 'react'

/**
 * A ARTE DO JOGO dentro do palco de cena.
 *
 * ⭐⭐ A cena desenhava o Dino como UM path de silhueta chapada, e o jogo que a criança monta na
 * aula seguinte tem um Dino com barriga, espinhos, olho e perninhas que correm. Ela viu os dois e
 * disse que a cena parecia outra coisa. Aqui o palco passa a chamar o MESMO código de desenho do
 * runtime do Jogo 2D (`@sistemazero/studio/arte`), com um pincel que grava SVG em vez de pintar
 * num canvas.
 *
 * ⚠️ Continua SVG, e isso não é conservadorismo: é o que mantém o `<title>`/`<desc>` lidos pelo
 * leitor de tela, o piso de letra de 12px, a escala pela largura medida e os testes que varrem as
 * 45 cenas por `renderToStaticMarkup`. Um `<canvas>` no palco seria opaco para todos eles.
 */

/**
 * O RELÓGIO DA ARTE: quanto tempo a cena já andou, em milissegundos.
 *
 * ⭐⭐ É o que faz o Dino correr e a chama pulsar — a decisão dela foi "anda só quando o tempo da
 * cena anda". Sem relógio o desenho fica num quadro fixo, que é o certo enquanto a criança lê a
 * pergunta e é o que mantém o `renderToStaticMarkup` dos testes estável.
 *
 * ⚠️⚠️ CONTEXTO, e não uma prop: o tempo teria de atravessar o despacho e os quinze palcos até
 * chegar em cada `ActorFigure`, e o palco é justamente a camada que não deveria saber do relógio.
 * É o mesmo caminho que a fala do Zappy já faz (`zappy-fala-context`): quem rege está na POSIÇÃO
 * da árvore, não em quem passou a prop.
 * ⚠️ O padrão é ZERO: fora do player (os testes, a galeria, a prévia do admin) a arte fica parada.
 */
const RelogioDaArte = createContext(0)
export const RelogioDaArteProvider = RelogioDaArte.Provider
export const useRelogioDaArte = () => useContext(RelogioDaArte)

/** Os atributos que precisam de camelCase para o React não os tratar como desconhecidos. */
const ATRIBUTO_REACT: Record<string, string> = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'clip-path': 'clipPath',
  'stop-color': 'stopColor',
  'flood-color': 'floodColor',
  'flood-opacity': 'floodOpacity',
  'fill-rule': 'fillRule',
}

function nosParaReact(nos: readonly NoSvg[]): ReactNode {
  return nos.map((no, i) => {
    const props: Record<string, unknown> = { key: `${no.tag}-${i}` }
    for (const [chave, valor] of Object.entries(no.attrs))
      props[ATRIBUTO_REACT[chave] ?? chave] = valor
    const filhos = no.filhos.length > 0 ? nosParaReact(no.filhos) : undefined
    const Tag = no.tag as 'g'
    return (
      <Tag {...props} key={props.key as string}>
        {filhos}
      </Tag>
    )
  })
}

/**
 * Quanto cada figura mede DE ALTURA no palco de cena.
 *
 * ⚠️⚠️ É uma tabela calibrada, e não a fórmula "encaixe tudo em 60×60" que parecia óbvia: o TIRO
 * é pequeno no jogo e tem que continuar pequeno (esticado a 60 ele vira uma bola maior que a nave
 * que o disparou), e a banana some se ficar nos 16 naturais dela. Onde o tamanho do jogo já cabe
 * no palco, o número é o natural — o Dino, o cacto e a nave não mudam um pixel.
 * ⚠️ A árvore e o prédio são CENÁRIO e vão a 138, que é a altura que a árvore do palco sempre teve.
 */
const ALTURA_NA_CENA: Record<NomeDaFigura, number> = {
  dino: 64,
  cacto: 57,
  pedra: 40,
  passaro: 35,
  ovo: 38,
  arvore: 138,
  nave: 62,
  asteroide: 47,
  // O tiro é a bolinha de luz do Dia 2: no jogo ela é pequena, e aqui também.
  tiro: 18,
  chama: 62,
  // O gorila mede 36 no jogo, mas ali ele é visto de longe, no alto de um prédio. No palco ele é
  // o personagem que a criança controla, e precisa do tamanho de um protagonista.
  gorila: 60,
  banana: 26,
  predio: 138,
}

/**
 * Um desenho da arte do jogo, no enquadramento do palco.
 *
 * ⭐ O contrato de posição é o de sempre e não mudou para nenhum dos 45 palcos: `(0, 0)` é o meio
 * do CHÃO sob a figura, e o corpo sobe para o `y` negativo. Quem converte da convenção do jogo
 * (onde `x`/`y` é o canto de cima) é esta função, num lugar só.
 *
 * ⚠️ `chao: 0` no ambiente é o que põe a sombra do Dino exatamente na base da figura: no jogo ela
 * fica na linha do chão do mundo, e aqui a linha do chão É a origem do grupo.
 */
export function ArteSvg({
  nome,
  t,
  cor,
  corSecundaria,
  fase,
  variante,
}: {
  nome: NomeDaFigura
  /** O relógio em milissegundos. Ausente = o da cena (`RelogioDaArte`), que é o caso normal. */
  t?: number
  cor?: string
  corSecundaria?: string
  fase?: number
  /** A variação do desenho (a árvore escura do meio da `layers`, a forma do obstáculo). */
  variante?: string
}) {
  // ⚠️ Os ids de degradê, recorte e sombra precisam ser únicos NA PÁGINA: duas cenas na mesma
  // aula, ou os dois lados de uma comparação, disputariam o mesmo `url(#…)`.
  const id = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const relogio = useRelogioDaArte()
  const quando = t ?? relogio
  const { caixa, desenhar } = FIGURAS[nome]
  const escala = ALTURA_NA_CENA[nome] / caixa.h
  const pincel = new PincelSvg(`a${id}`)
  desenhar(
    pincel,
    { x: -caixa.w / 2, y: -caixa.h, w: caixa.w, h: caixa.h, cor, corSecundaria, fase, variante },
    { t: quando, chao: 0 },
  )
  // ⚠️ Sempre um `<g>`, mesmo na escala 1: sem ele os nós da arte virariam irmãos do que o palco
  // desenhou antes, e um `opacity` ou `className` do grupo de fora deixaria de alcançá-los juntos.
  return (
    <g transform={escala === 1 ? undefined : `scale(${escala})`}>{nosParaReact(pincel.arvore())}</g>
  )
}

/** A largura que uma figura ocupa no palco, para quem precisa reservar espaço. */
export const larguraNaCena = (nome: NomeDaFigura) =>
  FIGURAS[nome].caixa.w * (ALTURA_NA_CENA[nome] / FIGURAS[nome].caixa.h)

export { ALTURA_NA_CENA }

/**
 * O FUNDO do cenário: o mundo do jogo que esta cena retrata.
 *
 * ⭐⭐ Substitui o `FundoEspaco` e os `<rect className="fill-scene-sky">` que cada palco pintava à
 * mão. O céu do Corre Dino era um retângulo de cor; agora é o degradê, o sol, as nuvens e os
 * morros do `drawForest` do jogo — a mesma paisagem que a criança vê quando roda o jogo dela.
 *
 * ⚠️⚠️ **O fundo é a camada de BAIXO e nunca apaga o que a cena ensina.** As marcas didáticas (a
 * grade e as réguas da `coordinates`, os pontinhos da pista da `velocity`, o alvo tracejado da
 * `stage-size`) continuam desenhadas POR CIMA, pelo palco. Onde o fundo cheio competir com a
 * marca, o palco pede `detalhe="calmo"`, que tira nuvens, cintilar e janelas acesas.
 *
 * ⚠️ `data-fundo` é o contrato da varredura das 45 cenas (`tests/scene-figures.test.tsx`): é por
 * ele que ela sabe que o palco pintou o mundo, e não só pôs a moldura nele.
 */
export function FundoDoCenario({
  cenario,
  w,
  h,
  x = 0,
  y = 0,
  chao,
  detalhe = 'cheio',
  semDetalhe,
  t,
  velocidade,
}: {
  cenario: SceneCenarioId
  w: number
  h: number
  x?: number
  y?: number
  /**
   * A linha do chão. Num cenário SEM chão ela só é desenhada onde MEDE alguma coisa — nos outros
   * as figuras flutuam por `pisoDoMundo`, e uma nave "estacionada" numa linha pontilhada foi um
   * achado de review.
   */
  chao?: number
  detalhe?: DetalheDoFundo
  /**
   * Onde o palco escreve por cima do céu: ali o fundo não põe estrela nem nuvem.
   *
   * ⚠️⚠️ Em coordenadas do PRÓPRIO fundo (0 a `w`, 0 a `h`), não do `<svg>` do palco. Num fundo
   * com `x`/`y` de deslocamento — a tela do jogo desenhada dentro de um quadro menor — uma zona em
   * coordenadas do palco protegeria o lugar errado, e o defeito é MUDO: a estrelinha continua
   * colada no número e nada acusa.
   */
  semDetalhe?: readonly Retangulo[]
  /** O relógio em milissegundos. Ausente = o da cena (`RelogioDaArte`). */
  t?: number
  velocidade?: number
}) {
  const id = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const relogio = useRelogioDaArte()
  if (cenario === 'farol')
    return (
      <g data-fundo="farol" transform={x === 0 && y === 0 ? undefined : `translate(${x} ${y})`}>
        <image
          href={farolSvgUrl('cenario')}
          width={w}
          height={h}
          preserveAspectRatio="xMidYMid slice"
        />
      </g>
    )
  const quando = t ?? relogio
  const pincel = new PincelSvg(`b${id}`)
  const linha = chao ?? (cenarioTemChao(cenario) ? h * 0.82 : h)
  FUNDOS[fundoDoCenario(cenario)](
    pincel,
    { w, h, chao: linha },
    { t: quando, chao: linha, velocidade, detalhe, semDetalhe },
  )
  return (
    <g data-fundo={cenario} transform={x === 0 && y === 0 ? undefined : `translate(${x} ${y})`}>
      {/* ⚠️⚠️ RECORTADO na própria área, e isso não é zelo: os morros da floresta são mais largos
          que a tela de propósito (é o que dá o parallax), e num palco que desenha a tela do jogo
          DENTRO de um quadro menor eles vazavam para fora dele — uma faixa verde do lado de fora
          da moldura, na cena que ensina onde a tela começa e termina. */}
      <clipPath id={`c${id}`}>
        <rect x={0} y={0} width={w} height={h} />
      </clipPath>
      <g clipPath={`url(#c${id})`}>{nosParaReact(pincel.arvore())}</g>
      {chao !== undefined && !cenarioTemChao(cenario) && (
        <path
          className="stroke-scene-line"
          d={`M0 ${chao}h${w}`}
          strokeWidth="2"
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
      )}
    </g>
  )
}
