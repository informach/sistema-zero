import type { Pincel } from './pincel'

/**
 * Um nó de SVG como DADO, nunca JSX.
 *
 * ⚠️ É o que mantém este módulo sem React: o member-shell converte a árvore em elementos, o
 * playground pode serializar em texto, e um teste pode conferir a árvore sem montar nada.
 */
export interface NoSvg {
  tag: string
  attrs: Record<string, string | number>
  filhos: NoSvg[]
}

interface Estado {
  fill: string | CanvasGradient | CanvasPattern
  stroke: string | CanvasGradient | CanvasPattern
  lineWidth: number
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
  alpha: number
  shadowColor: string
  shadowBlur: number
}

interface GradienteSvg extends CanvasGradient {
  __id: string
  __no: NoSvg
}

const ehGradiente = (v: unknown): v is GradienteSvg =>
  typeof v === 'object' && v !== null && '__id' in v && '__no' in v

/** Arredonda para o SVG ficar legível e ESTÁVEL entre execuções (o markup entra em teste). */
const n = (v: number) => {
  if (!Number.isFinite(v)) return 0
  const r = Math.round(v * 100) / 100
  return Object.is(r, -0) ? 0 : r
}

const TAU = Math.PI * 2

/**
 * Um arco elíptico em comandos `A` do SVG, respeitando o sentido do canvas.
 *
 * ⚠️⚠️ Volta INTEIRA precisa de DOIS arcos: um `A` cujo ponto final é igual ao inicial não
 * desenha nada em SVG, e é justamente a forma mais comum aqui (todo `arc(..., 0, Math.PI * 2)`
 * dos olhos, das crateras e das estrelas).
 * ⚠️ O sentido importa além da estética: o recorte da cidade fura os buracos com um retângulo
 * horário e um arco ANTI-HORÁRIO, e é a oposição entre os dois que abre o furo na regra nonzero.
 */
function arcoParaD(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotacao: number,
  inicio: number,
  fim: number,
  antihorario: boolean,
  continuaSubpath: boolean,
): string {
  const cos = Math.cos(rotacao)
  const sen = Math.sin(rotacao)
  const ponto = (a: number) => {
    const px = rx * Math.cos(a)
    const py = ry * Math.sin(a)
    return [cx + px * cos - py * sen, cy + px * sen + py * cos] as const
  }

  let delta = fim - inicio
  if (antihorario) {
    if (delta > 0) delta -= TAU * Math.ceil(delta / TAU)
    if (delta === 0 && fim !== inicio) delta = -TAU
  } else {
    if (delta < 0) delta += TAU * Math.ceil(-delta / TAU)
    if (delta === 0 && fim !== inicio) delta = TAU
  }
  if (delta > TAU) delta = TAU
  if (delta < -TAU) delta = -TAU

  const grausDeRotacao = n((rotacao * 180) / Math.PI)
  const varredura = antihorario ? 0 : 1
  const [x0, y0] = ponto(inicio)
  // Canvas liga o ponto corrente ao começo do arco; sem subpath aberto, ele apenas se posiciona.
  const abertura = continuaSubpath ? `L${n(x0)} ${n(y0)}` : `M${n(x0)} ${n(y0)}`

  if (Math.abs(delta) >= TAU - 1e-9) {
    const [xm, ym] = ponto(inicio + delta / 2)
    const [xf, yf] = ponto(inicio + delta)
    return (
      `${abertura}A${n(rx)} ${n(ry)} ${grausDeRotacao} 0 ${varredura} ${n(xm)} ${n(ym)}` +
      `A${n(rx)} ${n(ry)} ${grausDeRotacao} 0 ${varredura} ${n(xf)} ${n(yf)}`
    )
  }
  const [x1, y1] = ponto(inicio + delta)
  const arcoGrande = Math.abs(delta) > Math.PI ? 1 : 0
  return `${abertura}A${n(rx)} ${n(ry)} ${grausDeRotacao} ${arcoGrande} ${varredura} ${n(x1)} ${n(y1)}`
}

/**
 * O PINCEL que grava em SVG: o mesmo código de desenho do jogo, outra saída.
 *
 * ⭐⭐ Não é uma reescrita da arte — é um adaptador. `save`/`translate`/`scale`/`rotate` viram
 * `<g transform>` ANINHADOS, e é isso que permite manter as coordenadas LOCAIS: achatando a
 * matriz nos pontos, todo `arc` viraria uma elipse girada calculada à mão, e a fidelidade do
 * desenho passaria a depender da minha aritmética em vez da do navegador.
 *
 * ⚠️ Os ids de gradiente, recorte e sombra são determinísticos por instância (contador + o
 * prefixo que o chamador dá). `renderToStaticMarkup` é a base de quase todo teste de cena, e dois
 * palcos na mesma página não podem disputar o mesmo `url(#…)`.
 */
export class PincelSvg implements Pincel {
  fillStyle: string | CanvasGradient | CanvasPattern = '#000000'
  strokeStyle: string | CanvasGradient | CanvasPattern = '#000000'
  lineWidth = 1
  lineCap: CanvasLineCap = 'butt'
  lineJoin: CanvasLineJoin = 'miter'
  globalAlpha = 1
  shadowColor = 'rgba(0, 0, 0, 0)'
  shadowBlur = 0

  private readonly prefixo: string
  private seq = 0
  private readonly defs: NoSvg[] = []
  /** Os filtros de sombra já criados, por cor e desfoque. */
  private readonly sombras = new Map<string, string>()
  private readonly raiz: NoSvg[] = []
  /** O topo é a lista de filhos em que os nós novos entram. */
  private camadas: NoSvg[][]
  private readonly saves: { estado: Estado; profundidade: number }[] = []
  private d: string[] = []
  private subpathAberto = false
  /** O último `<g transform>` ainda vazio, para transformações seguidas não aninharem à toa. */
  private grupoVazio: NoSvg | null = null
  /** O último nó preenchido, para um `stroke()` logo depois não duplicar o `d`. */
  private ultimoFill: { no: NoSvg; d: string } | null = null

  constructor(prefixo = 'arte') {
    this.prefixo = prefixo
    this.camadas = [this.raiz]
  }

  /** A árvore pronta: os `defs` (quando houver) seguidos do desenho. */
  arvore(): NoSvg[] {
    if (this.defs.length === 0) return this.raiz
    return [{ tag: 'defs', attrs: {}, filhos: this.defs }, ...this.raiz]
  }

  private id(tipo: string) {
    this.seq += 1
    return `${this.prefixo}-${tipo}-${this.seq}`
  }

  private get nivel() {
    const topo = this.camadas[this.camadas.length - 1]
    if (!topo) throw new Error('PincelSvg: pilha de camadas vazia')
    return topo
  }

  private emitir(no: NoSvg) {
    this.nivel.push(no)
    this.grupoVazio = null
    return no
  }

  private abrirGrupo(attrs: Record<string, string | number>) {
    const g: NoSvg = { tag: 'g', attrs, filhos: [] }
    this.nivel.push(g)
    this.camadas.push(g.filhos)
    this.ultimoFill = null
    return g
  }

  private transformar(parte: string) {
    // Transformações seguidas num grupo ainda vazio entram na MESMA string: `save` + `translate`
    // + `scale` é o padrão de metade dos desenhos, e aninhar três grupos por figura engorda o
    // markup sem mudar um pixel.
    if (this.grupoVazio && this.grupoVazio.filhos.length === 0) {
      this.grupoVazio.attrs.transform = `${this.grupoVazio.attrs.transform} ${parte}`
      return
    }
    this.grupoVazio = this.abrirGrupo({ transform: parte })
  }

  private estadoAtual(): Estado {
    return {
      fill: this.fillStyle,
      stroke: this.strokeStyle,
      lineWidth: this.lineWidth,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      alpha: this.globalAlpha,
      shadowColor: this.shadowColor,
      shadowBlur: this.shadowBlur,
    }
  }

  private corDe(v: string | CanvasGradient | CanvasPattern): string {
    if (typeof v === 'string') return v
    if (ehGradiente(v)) {
      if (!this.defs.includes(v.__no)) this.defs.push(v.__no)
      return `url(#${v.__id})`
    }
    // CanvasPattern não existe na arte procedural; cair no preto denuncia na tela.
    return '#000000'
  }

  private sombra(): string | null {
    if (!(this.shadowBlur > 0)) return null
    // ⚠️ Um filtro por COMBINAÇÃO, não por chamada: um jogo com cinquenta tiros na tela criaria
    // cinquenta `<filter>` idênticos no `<defs>` — markup que o React reconcilia à toa.
    const chave = `${this.shadowColor}|${this.shadowBlur}`
    const jaTem = this.sombras.get(chave)
    if (jaTem) return `url(#${jaTem})`
    const id = this.id('sombra')
    this.defs.push({
      tag: 'filter',
      attrs: { id, x: '-50%', y: '-50%', width: '200%', height: '200%' },
      filhos: [
        {
          tag: 'feDropShadow',
          attrs: {
            dx: 0,
            dy: 0,
            // O `shadowBlur` do canvas é cerca do dobro do desvio-padrão da gaussiana.
            stdDeviation: n(this.shadowBlur / 2),
            'flood-color': this.shadowColor,
            'flood-opacity': 1,
          },
          filhos: [],
        },
      ],
    })
    this.sombras.set(chave, id)
    return `url(#${id})`
  }

  private comuns(attrs: Record<string, string | number>) {
    if (this.globalAlpha < 1) attrs.opacity = n(this.globalAlpha)
    const filtro = this.sombra()
    if (filtro) attrs.filter = filtro
    return attrs
  }

  private atributosDeTraco(attrs: Record<string, string | number>) {
    attrs.stroke = this.corDe(this.strokeStyle)
    attrs['stroke-width'] = n(this.lineWidth)
    if (this.lineCap !== 'butt') attrs['stroke-linecap'] = this.lineCap
    if (this.lineJoin !== 'miter') attrs['stroke-linejoin'] = this.lineJoin
    return attrs
  }

  // ---- pilha e transformação -------------------------------------------------

  save() {
    this.saves.push({ estado: this.estadoAtual(), profundidade: this.camadas.length })
    this.grupoVazio = null
  }

  restore() {
    const marca = this.saves.pop()
    if (!marca) return
    while (this.camadas.length > marca.profundidade) this.camadas.pop()
    this.fillStyle = marca.estado.fill
    this.strokeStyle = marca.estado.stroke
    this.lineWidth = marca.estado.lineWidth
    this.lineCap = marca.estado.lineCap
    this.lineJoin = marca.estado.lineJoin
    this.globalAlpha = marca.estado.alpha
    this.shadowColor = marca.estado.shadowColor
    this.shadowBlur = marca.estado.shadowBlur
    this.grupoVazio = null
    this.ultimoFill = null
  }

  translate(x: number, y: number) {
    this.transformar(`translate(${n(x)} ${n(y)})`)
  }

  scale(x: number, y: number) {
    this.transformar(`scale(${n(x)} ${n(y)})`)
  }

  rotate(a: number) {
    this.transformar(`rotate(${n((a * 180) / Math.PI)})`)
  }

  // ---- caminhos --------------------------------------------------------------

  beginPath() {
    this.d = []
    this.subpathAberto = false
  }

  closePath() {
    if (this.d.length > 0) this.d.push('Z')
  }

  moveTo(x: number, y: number) {
    this.d.push(`M${n(x)} ${n(y)}`)
    this.subpathAberto = true
  }

  lineTo(x: number, y: number) {
    if (!this.subpathAberto) {
      this.moveTo(x, y)
      return
    }
    this.d.push(`L${n(x)} ${n(y)}`)
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    if (!this.subpathAberto) this.moveTo(cpx, cpy)
    this.d.push(`Q${n(cpx)} ${n(cpy)} ${n(x)} ${n(y)}`)
  }

  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) {
    if (!this.subpathAberto) this.moveTo(c1x, c1y)
    this.d.push(`C${n(c1x)} ${n(c1y)} ${n(c2x)} ${n(c2y)} ${n(x)} ${n(y)}`)
  }

  arc(x: number, y: number, r: number, inicio: number, fim: number, antihorario = false) {
    this.d.push(arcoParaD(x, y, r, r, 0, inicio, fim, antihorario, this.subpathAberto))
    this.subpathAberto = true
  }

  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotacao: number,
    inicio: number,
    fim: number,
    antihorario = false,
  ) {
    this.d.push(arcoParaD(x, y, rx, ry, rotacao, inicio, fim, antihorario, this.subpathAberto))
    this.subpathAberto = true
  }

  rect(x: number, y: number, w: number, h: number) {
    this.d.push(`M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`)
    this.subpathAberto = true
  }

  roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    raios?: number | DOMPointInit | Iterable<number | DOMPointInit>,
  ) {
    const bruto = typeof raios === 'number' ? raios : 0
    const r = Math.max(0, Math.min(bruto, Math.abs(w) / 2, Math.abs(h) / 2))
    if (r === 0) {
      this.rect(x, y, w, h)
      return
    }
    this.d.push(
      `M${n(x + r)} ${n(y)}` +
        `h${n(w - r * 2)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}` +
        `v${n(h - r * 2)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}` +
        `h${n(-(w - r * 2))}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}` +
        `v${n(-(h - r * 2))}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}Z`,
    )
    this.subpathAberto = true
  }

  // ---- pintura ---------------------------------------------------------------

  fill() {
    const d = this.d.join('')
    if (!d) return
    const no = this.emitir({
      tag: 'path',
      attrs: this.comuns({ d, fill: this.corDe(this.fillStyle) }),
      filhos: [],
    })
    this.ultimoFill = { no, d }
  }

  stroke() {
    const d = this.d.join('')
    if (!d) return
    // O `fill(); stroke();` do mesmo caminho é o par mais comum da arte. Emitir dois elementos
    // idênticos dobraria o `d` de desenhos grandes (a cidade inteira) sem mudar um pixel.
    const anterior = this.ultimoFill
    const nivel = this.nivel
    if (anterior && anterior.d === d && nivel[nivel.length - 1] === anterior.no) {
      this.atributosDeTraco(anterior.no.attrs)
      this.ultimoFill = null
      return
    }
    this.emitir({
      tag: 'path',
      attrs: this.atributosDeTraco(this.comuns({ d, fill: 'none' })),
      filhos: [],
    })
  }

  clip() {
    const d = this.d.join('')
    if (!d) return
    const id = this.id('recorte')
    this.defs.push({
      tag: 'clipPath',
      attrs: { id },
      filhos: [{ tag: 'path', attrs: { d }, filhos: [] }],
    })
    this.abrirGrupo({ 'clip-path': `url(#${id})` })
  }

  fillRect(x: number, y: number, w: number, h: number) {
    this.emitir({
      tag: 'rect',
      attrs: this.comuns({
        x: n(x),
        y: n(y),
        width: n(w),
        height: n(h),
        fill: this.corDe(this.fillStyle),
      }),
      filhos: [],
    })
    this.ultimoFill = null
  }

  strokeRect(x: number, y: number, w: number, h: number) {
    this.emitir({
      tag: 'rect',
      attrs: this.atributosDeTraco(
        this.comuns({ x: n(x), y: n(y), width: n(w), height: n(h), fill: 'none' }),
      ),
      filhos: [],
    })
    this.ultimoFill = null
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
    const id = this.id('degrade')
    const no: NoSvg = {
      tag: 'linearGradient',
      attrs: {
        id,
        gradientUnits: 'userSpaceOnUse',
        x1: n(x0),
        y1: n(y0),
        x2: n(x1),
        y2: n(y1),
      },
      filhos: [],
    }
    const grad: GradienteSvg = {
      __id: id,
      __no: no,
      addColorStop(offset: number, cor: string) {
        no.filhos.push({
          tag: 'stop',
          attrs: { offset: n(offset), 'stop-color': cor },
          filhos: [],
        })
      },
    }
    return grad
  }
}

/** Serializa a árvore em markup, para o playground e para o teste ler. */
export function svgEmTexto(nos: NoSvg[]): string {
  return nos
    .map((no) => {
      const attrs = Object.entries(no.attrs)
        .map(([k, v]) => ` ${k}="${String(v).replace(/"/g, '&quot;')}"`)
        .join('')
      if (no.filhos.length === 0) return `<${no.tag}${attrs}/>`
      return `<${no.tag}${attrs}>${svgEmTexto(no.filhos)}</${no.tag}>`
    })
    .join('')
}
