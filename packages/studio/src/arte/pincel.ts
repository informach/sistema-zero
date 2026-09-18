/**
 * O PINCEL: o contrato de desenho que a arte do jogo fala.
 *
 * ⭐⭐ Ele é um `Pick` do `CanvasRenderingContext2D`, e isso é a peça central do desenho todo.
 * Não é "uma interface parecida com o canvas": é literalmente o subconjunto da API do canvas que
 * a arte usa, então o runtime do jogo passa o `ctx` DIRETO (custo zero, zero risco de divergir) e
 * o TypeScript cobra do pincel de SVG a mesma assinatura, argumento por argumento. Uma interface
 * escrita à mão em paralelo seria a terceira cópia de um contrato que já existe.
 *
 * ⚠️ É só TIPO — apagado no runtime. O módulo continua server-safe (a cena renderiza no servidor
 * por `renderToStaticMarkup`), e nada aqui toca o DOM.
 *
 * ⚠️ O que ficou DE FORA é deliberado: `drawImage`, `fillText` e `measureText` não aparecem em
 * nenhum desenho procedural (imagem e texto são outro caminho do `drawSprite`, com layout e cache
 * próprios). O pincel de SVG LANÇA se alguém chamá-los — falhar alto é melhor do que desenhar
 * errado numa cena de aula.
 */
export type Pincel = Pick<
  CanvasRenderingContext2D,
  // estado de pintura
  | 'fillStyle'
  | 'strokeStyle'
  | 'lineWidth'
  | 'lineCap'
  | 'lineJoin'
  | 'globalAlpha'
  | 'shadowColor'
  | 'shadowBlur'
  // pilha e transformação
  | 'save'
  | 'restore'
  | 'translate'
  | 'scale'
  | 'rotate'
  // caminhos
  | 'beginPath'
  | 'closePath'
  | 'moveTo'
  | 'lineTo'
  | 'quadraticCurveTo'
  | 'bezierCurveTo'
  | 'arc'
  | 'ellipse'
  | 'rect'
  | 'roundRect'
  // pintura
  | 'fill'
  | 'stroke'
  | 'clip'
  | 'fillRect'
  | 'strokeRect'
  | 'createLinearGradient'
>

/**
 * O AMBIENTE de um desenho: tudo que a arte lia de variável global dentro do runtime.
 *
 * ⭐⭐ É o que torna o desenho determinístico e portátil. No runtime do jogo estes valores vêm de
 * `now()`, `dinoGround(ctx)` e `world.gravity`, que só existem dentro do IIFE do preview; na cena
 * de aula vêm do relógio da própria cena. Enquanto eram globais, a arte não podia sair dali.
 *
 * ⚠️ `t` é o relógio em MILISSEGUNDOS, e a cena passa o tempo ACUMULADO dela (não `Date.now()`):
 * com o relógio parado o valor não muda, o desenho é o mesmo quadro e o `renderToStaticMarkup`
 * dos testes fica estável. Foi por isso que o tempo virou parâmetro em vez de continuar global.
 */
export interface Ambiente {
  /** O relógio em milissegundos. Parado = sempre o mesmo quadro. */
  t: number
  /** A linha do chão, em coordenadas do mundo. A sombra do Dino mora nela. */
  chao: number
  /** Gravidade invertida (o mundo puxa para cima). Espelha a sombra e o pouso. */
  gravidadeParaCima?: boolean
}

/** A caixa que um desenho de figura ocupa: o tamanho natural dele no jogo. */
export interface CaixaDaFigura {
  w: number
  h: number
}

/**
 * Uma FIGURA a desenhar: o recorte do sprite do jogo que a arte realmente lê.
 *
 * ⚠️ `x`/`y` são o canto SUPERIOR ESQUERDO, como no jogo — e não o meio do chão, que é a
 * convenção do palco de cena. Quem converte é o adaptador do member-shell; a arte fica com uma
 * convenção só, a do jogo, para o teste de paridade poder comparar número a número.
 */
export interface Figura {
  x: number
  y: number
  w: number
  h: number
  /** A cor que a criança escolheu, quando o desenho aceita uma. */
  cor?: string
  /** A segunda cor, quando o desenho tem duas (as asas da nave ao lado do casco). */
  corSecundaria?: string
  /** Variação do desenho: a forma do obstáculo, o lado do gorila, a pose do Dino. */
  variante?: string
  /** Defasagem fixa da animação, para dois iguais na tela não baterem asa em uníssono. */
  fase?: number
  /** O Dino agachado. */
  agachado?: boolean
  /** O Dino no ar (troca a pose das perninhas e encolhe a sombra). */
  noAr?: boolean
  /** Quantos lados o polígono tem (o asteroide sorteia entre 7 e 9 ao nascer). */
  lados?: number
  /**
   * Quanto o desenho gira por milissegundo.
   *
   * ⚠️ Fica separado da `fase` de propósito: a `fase` é o ângulo de NASCENÇA (fixo por sprite) e
   * isto é a velocidade. Fundir os dois obrigaria quem chama a saber o relógio do outro lado, que
   * é exatamente o acoplamento que tirar o `now()` global veio desfazer.
   */
  giroPorMs?: number
}

/** Um desenho de figura: recebe o pincel, a figura e o ambiente, e não devolve nada. */
export type DesenhoDeFigura = (p: Pincel, f: Figura, amb: Ambiente) => void

/** O retângulo em que um fundo é desenhado. */
export interface AreaDoFundo {
  w: number
  h: number
  /** A linha do chão dentro dessa área (a grama do Corre Dino, o telhado da cidade). */
  chao: number
}

/**
 * Quanto detalhe um fundo desenha.
 *
 * ⚠️⚠️ `'calmo'` existe para a cena de aula, e é uma exigência pedagógica, não um enfeite: os
 * palcos desenham POR CIMA do fundo as marcas que a atividade ensina (a grade e as réguas da
 * `coordinates`, os pontinhos da pista da `velocity`, o alvo tracejado da `stage-size`). Um fundo
 * cheio de nuvens e estrelas cintilando atrás de uma régua compete com o que a criança precisa
 * ler. No jogo vale sempre `'cheio'`.
 */
export type DetalheDoFundo = 'cheio' | 'calmo'

/** Um retângulo da área do fundo. */
export interface Retangulo {
  x: number
  y: number
  w: number
  h: number
}

/** Um desenho de fundo: o retângulo inteiro, com parallax derivado do tempo. */
export type DesenhoDeFundo = (
  p: Pincel,
  area: AreaDoFundo,
  amb: Ambiente & {
    velocidade?: number
    detalhe?: DetalheDoFundo
    /**
     * Onde o fundo NÃO desenha detalhe (estrela, nuvem, janela acesa).
     *
     * ⚠️⚠️ Não é enfeite: o palco de cena escreve o placar e as réguas POR CIMA do céu, e uma
     * estrelinha colada no "restam 2" virava ponto final, outra no "15" virava parte do número.
     * O halo do texto só apaga a estrela que ENCOSTA na letra; estas ficavam a dois pixels e
     * continuavam lá. O céu (o degradê, os morros, os prédios) continua inteiro — o que sai é só
     * o pontinho que compete com o número.
     */
    semDetalhe?: readonly Retangulo[]
  },
) => void
