/**
 * O ENCAIXE PELA ALTURA: a largura que o palco pode ter para caber INTEIRO no mundo do console
 * ampliado (01/10/2026).
 *
 * Relato dela: *"quando eu amplio a experiência está dando uma barra de rolagem interna na área da
 * cena, e não fica legal. A cena é o mais importante, tem que estar sempre visível. Se for para ter
 * barra de rolagem, tem que ser no card inteiro."*
 *
 * Por que isto é CONTA e não CSS: o desenho escala com a LARGURA (um `<svg>` com `viewBox`), e o
 * que está em volta dele na mesma moldura — a borda de 4px, a legenda desenhada (outro svg, também
 * proporcional), o texto do rodapé, os títulos da comparação, os controles do palco composto — não
 * escala, ou escala de outro jeito. Nenhum `max-height` abraça um svg pela largura, e a regra antiga
 * (`width: 100cqh × proporção`) só sabia do desenho: errava a borda por 4px (o rolinho que ela viu)
 * e ignorava todo o resto (até 270px de rolagem na `camadas`, que tem recorte estreito e por isso
 * nem entrava na regra). Medido em 56 experiências × 4 janelas antes do conserto.
 *
 * A conta: o que escala com a largura cabe em `(largura − bordasX) ÷ proporcao`; o resto é `fixo`.
 * Então `largura = (altura − fixo) × proporcao + bordasX`, presa ao teto da largura do mundo.
 * ⚠️ Com um PISO para o desenho: abaixo dele o palco deixa de encolher e quem rola é o cartão do
 * mundo inteiro (a regra dela), nunca o palco por dentro.
 */

/** O desenho nunca fica mais baixo que isto; abaixo, o cartão do mundo rola. */
export const ALTURA_MINIMA_DO_DESENHO = 160
/** Um pixel de folga contra o arredondamento: sem ela o mundo oscilava entre "cabe" e "rola 1px". */
const FOLGA = 1

export interface MedidasDoEncaixe {
  /** A altura que o mundo tem para dar ao palco inteiro (px). */
  alturaDisponivel: number
  /** A largura do mundo (px): o teto da moldura. */
  larguraDisponivel: number
  /** O que, na raiz do palco, NÃO escala com a largura (bordas, texto, títulos, controles), em px. */
  fixo: number
  /** Largura ÷ altura do que escala (o desenho e a legenda desenhada, somados). */
  proporcao: number
  /** As bordas horizontais em volta do desenho (px): a moldura é `border-box`. */
  bordasX: number
  /**
   * A menor largura que o palco aceita (px, com as bordas): a comparação lado a lado declara a
   * largura em que os dois lados ainda cabem lado a lado, porque abaixo dela o palco EMPILHA, a
   * altura dobra e a conta espirala (medido: a `world` foi parar em 117px). Daqui para baixo o
   * encaixe para, e quem rola é o cartão do mundo.
   */
  larguraMinima?: number
  /**
   * A maior largura que o palco aceita (px, com as bordas): o palco com recorte estreito, enquanto
   * está estreito, trava logo abaixo do limiar (o recorte é mais largo que o desenho inteiro, e o
   * encaixe o faria crescer, sair do estreito, ficar mais alto, encolher e voltar, sem fim).
   */
  larguraMaxima?: number
}

/** A largura da moldura que encaixa, ou `null` quando não há como encaixar (proporção inválida). */
export function larguraDoEncaixe(m: MedidasDoEncaixe): number | null {
  if (!(m.proporcao > 0) || !(m.larguraDisponivel > 0)) return null
  const alturaDoDesenho = Math.max(ALTURA_MINIMA_DO_DESENHO, m.alturaDisponivel - m.fixo - FOLGA)
  const pelaAltura = alturaDoDesenho * m.proporcao + m.bordasX
  const presa = Math.min(pelaAltura, m.larguraMaxima ?? Number.POSITIVE_INFINITY)
  return Math.min(m.larguraDisponivel, Math.max(presa, m.larguraMinima ?? 0))
}

const px = (valor: string) => Number.parseFloat(valor) || 0

/**
 * Mede o mundo do console e devolve a largura de encaixe da moldura (`null` = sem moldura que
 * encaixe: o retrato do palpite, a miniatura do leitor de tela, um palco que recusou o encaixe).
 *
 * O que entra na conta, e de onde:
 * - a PROPORÇÃO do desenho vem do React (`--sz-scene-aspect-desenho` na moldura: o recorte em uso,
 *   ou a proporção efetiva da comparação); a da LEGENDA desenhada (svg irmão do desenho) é medida —
 *   altura ÷ largura é constante, então vale em qualquer largura;
 * - `fixo` é o que sobra da altura da RAIZ do palco depois de tirar o que é proporcional: as bordas,
 *   o texto do rodapé, os títulos da comparação, os controles e avisos de um palco composto. Medido
 *   assim ele não depende de conhecer cada palco;
 * - a altura disponível é a do mundo DESCONTANDO o que o cartão do mundo já está precisando rolar:
 *   o mundo nunca encolhe abaixo do conteúdo (é o cartão que rola), então a altura dele sozinha
 *   mentiria enquanto o palco ainda está grande demais.
 */
export function encaixeDoMundo(mundo: HTMLElement): number | null {
  const raiz = mundo.firstElementChild as HTMLElement | null
  if (!raiz) return null
  const moldura = raiz.classList.contains('sz-scene-frame--fit')
    ? raiz
    : raiz.querySelector<HTMLElement>('.sz-scene-frame--fit')
  if (!moldura) return null
  const estiloDaMoldura = getComputedStyle(moldura)
  const proporcaoDoDesenho = px(estiloDaMoldura.getPropertyValue('--sz-scene-aspect-desenho'))
  if (!(proporcaoDoDesenho > 0)) return null

  const filhos = [...moldura.children]
  const desenho = filhos[0]
  const estiloDoDesenho = desenho instanceof Element ? getComputedStyle(desenho) : null
  // A moldura é `border-box`; a borda mora nela OU no próprio desenho (palco com legenda).
  const bordasX =
    px(estiloDaMoldura.borderLeftWidth) +
    px(estiloDaMoldura.borderRightWidth) +
    (estiloDoDesenho
      ? px(estiloDoDesenho.borderLeftWidth) + px(estiloDoDesenho.borderRightWidth)
      : 0)
  let legendas = 0
  for (const filho of filhos.slice(1)) {
    if (filho.tagName.toLowerCase() !== 'svg') continue
    const caixa = filho.getBoundingClientRect()
    if (caixa.width > 0) legendas += caixa.height / caixa.width
  }
  const proporcao = 1 / (1 / proporcaoDoDesenho + legendas)
  const larguraDaMoldura = moldura.getBoundingClientRect().width
  const proporcional = Math.max(0, larguraDaMoldura - bordasX) / proporcao
  const fixo = Math.max(0, raiz.getBoundingClientRect().height - proporcional)
  const cartao = mundo.parentElement
  const rolando = cartao ? Math.max(0, cartao.scrollHeight - cartao.clientHeight) : 0
  const larguraMinima = px(estiloDaMoldura.getPropertyValue('--sz-scene-largura-minima'))
  const larguraMaxima = px(estiloDaMoldura.getPropertyValue('--sz-scene-largura-maxima'))
  return larguraDoEncaixe({
    alturaDisponivel: mundo.clientHeight - rolando,
    larguraDisponivel: mundo.clientWidth,
    fixo,
    proporcao,
    bordasX,
    larguraMinima: larguraMinima > 0 ? larguraMinima + bordasX : undefined,
    larguraMaxima: larguraMaxima > 0 ? larguraMaxima + bordasX : undefined,
  })
}
