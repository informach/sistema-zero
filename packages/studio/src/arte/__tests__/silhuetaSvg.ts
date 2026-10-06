/**
 * Silhueta de um desenho SVG simples, sem navegador: diz se um ponto cai em alguma parte pintada.
 *
 * Cobre exatamente o subconjunto que a folha do jardim usa (`path` com M/L/C/Z absolutos,
 * `ellipse`, `circle`, `rect` com canto arredondado, `polygon`, `line`, contorno com
 * `stroke-width` e `transform="rotate(a cx cy)"`). Qualquer coisa fora disso LANÇA: um desenho
 * novo que use outro recurso tem de ensinar este leitor antes, senão a conferência de cobertura
 * passaria olhando uma silhueta incompleta.
 */

type Ponto = readonly [number, number]

interface Forma {
  /** Anéis preenchidos (regra nonzero), já girados. */
  aneis: Ponto[][]
  /** Trechos de contorno e a meia espessura. */
  trechos: Array<readonly [Ponto, Ponto]>
  meiaEspessura: number
  caixa: { x0: number; y0: number; x1: number; y1: number }
}

const PASSOS_CURVA = 16
const PASSOS_ELIPSE = 48

function numero(attrs: Record<string, string>, nome: string, padrao?: number): number {
  const bruto = attrs[nome]
  if (bruto === undefined) {
    if (padrao === undefined) throw new Error(`Atributo ausente: ${nome}`)
    return padrao
  }
  const valor = Number(bruto)
  if (!Number.isFinite(valor)) throw new Error(`Número inválido em ${nome}: ${bruto}`)
  return valor
}

function girador(transform: string | undefined): (p: Ponto) => Ponto {
  if (!transform) return (p) => p
  const m = transform.match(/^rotate\(\s*([-\d.]+)(?:[\s,]+([-\d.]+)[\s,]+([-\d.]+))?\s*\)$/)
  if (!m) throw new Error(`Transformação não suportada: ${transform}`)
  const ang = (Number(m[1]) * Math.PI) / 180
  const cx = Number(m[2] ?? 0)
  const cy = Number(m[3] ?? 0)
  const cos = Math.cos(ang)
  const sin = Math.sin(ang)
  return ([x, y]) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos]
}

function elipse(cx: number, cy: number, rx: number, ry: number): Ponto[] {
  return Array.from({ length: PASSOS_ELIPSE }, (_, i) => {
    const t = (i / PASSOS_ELIPSE) * Math.PI * 2
    return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)] as const
  })
}

function retangulo(x: number, y: number, w: number, h: number, rx: number, ry: number): Ponto[] {
  const rX = Math.min(rx, w / 2)
  const rY = Math.min(ry, h / 2)
  if (rX <= 0 || rY <= 0)
    return [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ]
  const cantos: Array<[number, number, number]> = [
    [x + w - rX, y + rY, -Math.PI / 2],
    [x + w - rX, y + h - rY, 0],
    [x + rX, y + h - rY, Math.PI / 2],
    [x + rX, y + rY, Math.PI],
  ]
  const pontos: Ponto[] = []
  for (const [cx, cy, inicio] of cantos)
    for (let i = 0; i <= 8; i++) {
      const t = inicio + (i / 8) * (Math.PI / 2)
      pontos.push([cx + rX * Math.cos(t), cy + rY * Math.sin(t)])
    }
  return pontos
}

/** Subcaminhos de um `d` com M/L/C/Z absolutos; `fechado` diz se terminou em Z. */
function caminho(d: string): Array<{ pontos: Ponto[]; fechado: boolean }> {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? []
  const subcaminhos: Array<{ pontos: Ponto[]; fechado: boolean }> = []
  let atual: { pontos: Ponto[]; fechado: boolean } | null = null
  let i = 0
  let comando = ''
  const ler = () => {
    const t = tokens[i++]
    if (t === undefined || /[A-Za-z]/.test(t)) throw new Error(`Caminho incompleto: ${d}`)
    return Number(t)
  }
  while (i < tokens.length) {
    const t = tokens[i] as string
    if (/[A-Za-z]/.test(t)) {
      comando = t
      i++
      if (comando === 'Z') {
        if (atual) atual.fechado = true
        continue
      }
    }
    if (comando === 'M') {
      atual = { pontos: [[ler(), ler()]], fechado: false }
      subcaminhos.push(atual)
      comando = 'L'
    } else if (comando === 'L') {
      atual?.pontos.push([ler(), ler()])
    } else if (comando === 'C') {
      if (!atual) throw new Error(`Curva sem ponto inicial: ${d}`)
      const [x0, y0] = atual.pontos[atual.pontos.length - 1] as Ponto
      const x1 = ler()
      const y1 = ler()
      const x2 = ler()
      const y2 = ler()
      const x3 = ler()
      const y3 = ler()
      for (let k = 1; k <= PASSOS_CURVA; k++) {
        const s = k / PASSOS_CURVA
        const u = 1 - s
        atual.pontos.push([
          u * u * u * x0 + 3 * u * u * s * x1 + 3 * u * s * s * x2 + s * s * s * x3,
          u * u * u * y0 + 3 * u * u * s * y1 + 3 * u * s * s * y2 + s * s * s * y3,
        ])
      }
    } else {
      throw new Error(`Comando de caminho não suportado: ${comando} em ${d}`)
    }
  }
  return subcaminhos
}

function lerAtributos(texto: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const m of texto.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[m[1] as string] = m[2] as string
  return attrs
}

/** Lê o corpo de um desenho (o conteúdo de dentro do `<svg>`) em formas. */
export function lerFormas(corpo: string): Forma[] {
  const formas: Forma[] = []
  const elementos = [...corpo.matchAll(/<([a-zA-Z]+)\b([^>]*?)\/?>/g)]
  for (const [, tag, resto] of elementos) {
    const attrs = lerAtributos(resto ?? '')
    const girar = girador(attrs.transform)
    const pinta = attrs.fill !== 'none'
    const contorno = attrs.stroke !== undefined && attrs.stroke !== 'none'
    const meiaEspessura = contorno ? numero(attrs, 'stroke-width', 1) / 2 : 0
    let aneis: Ponto[][] = []
    let linhas: Ponto[][] = []
    switch (tag) {
      case 'path': {
        const subs = caminho(attrs.d ?? '')
        aneis = subs.map((s) => s.pontos)
        linhas = subs.map((s) => (s.fechado ? [...s.pontos, s.pontos[0] as Ponto] : s.pontos))
        break
      }
      case 'ellipse':
        aneis = [
          elipse(
            numero(attrs, 'cx'),
            numero(attrs, 'cy'),
            numero(attrs, 'rx'),
            numero(attrs, 'ry'),
          ),
        ]
        break
      case 'circle': {
        const r = numero(attrs, 'r')
        aneis = [elipse(numero(attrs, 'cx'), numero(attrs, 'cy'), r, r)]
        break
      }
      case 'rect': {
        const rx = numero(attrs, 'rx', Number(attrs.ry ?? 0))
        aneis = [
          retangulo(
            numero(attrs, 'x', 0),
            numero(attrs, 'y', 0),
            numero(attrs, 'width'),
            numero(attrs, 'height'),
            rx,
            numero(attrs, 'ry', rx),
          ),
        ]
        break
      }
      case 'polygon': {
        const n = (attrs.points ?? '')
          .split(/[\s,]+/)
          .filter(Boolean)
          .map(Number)
        const pontos: Ponto[] = []
        for (let k = 0; k + 1 < n.length; k += 2) pontos.push([n[k] as number, n[k + 1] as number])
        aneis = [pontos]
        break
      }
      case 'line':
        aneis = []
        linhas = [
          [
            [numero(attrs, 'x1'), numero(attrs, 'y1')],
            [numero(attrs, 'x2'), numero(attrs, 'y2')],
          ],
        ]
        break
      default:
        throw new Error(`Elemento não suportado na silhueta: <${tag}>`)
    }
    // Formas fechadas também têm contorno quando fill="none" (por exemplo, o aro da chave).
    if (contorno && linhas.length === 0) linhas = aneis.map((anel) => [...anel, anel[0] as Ponto])
    const aneisGirados = pinta ? aneis.map((a) => a.map(girar)) : []
    const trechos: Array<readonly [Ponto, Ponto]> = []
    if (contorno)
      for (const linha of linhas)
        for (let k = 1; k < linha.length; k++)
          trechos.push([girar(linha[k - 1] as Ponto), girar(linha[k] as Ponto)])
    const todos = [...aneisGirados.flat(), ...trechos.flat()]
    if (!todos.length) continue
    const caixa = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
    for (const [x, y] of todos) {
      caixa.x0 = Math.min(caixa.x0, x - meiaEspessura)
      caixa.y0 = Math.min(caixa.y0, y - meiaEspessura)
      caixa.x1 = Math.max(caixa.x1, x + meiaEspessura)
      caixa.y1 = Math.max(caixa.y1, y + meiaEspessura)
    }
    formas.push({ aneis: aneisGirados, trechos, meiaEspessura, caixa })
  }
  return formas
}

function dentroDosAneis(aneis: Ponto[][], x: number, y: number): boolean {
  let voltas = 0
  for (const anel of aneis) {
    for (let k = 0; k < anel.length; k++) {
      const [ax, ay] = anel[k] as Ponto
      const [bx, by] = anel[(k + 1) % anel.length] as Ponto
      if (ay <= y) {
        if (by > y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) > 0) voltas++
      } else if (by <= y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) < 0) voltas--
    }
  }
  return voltas !== 0
}

function pertoDoTrecho([a, b]: readonly [Ponto, Ponto], x: number, y: number, r: number) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l2 = dx * dx + dy * dy
  const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)) : 0
  const px = a[0] + t * dx - x
  const py = a[1] + t * dy - y
  return px * px + py * py <= r * r
}

export function pintado(formas: Forma[], x: number, y: number): boolean {
  for (const f of formas) {
    const c = f.caixa
    if (x < c.x0 || x > c.x1 || y < c.y0 || y > c.y1) continue
    if (f.aneis.length && dentroDosAneis(f.aneis, x, y)) return true
    for (const trecho of f.trechos) if (pertoDoTrecho(trecho, x, y, f.meiaEspessura)) return true
  }
  return false
}

/** Caixa (em unidades do desenho) de tudo o que é pintado. */
export function caixaDasFormas(formas: Forma[]) {
  const caixa = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  for (const f of formas) {
    caixa.x0 = Math.min(caixa.x0, f.caixa.x0)
    caixa.y0 = Math.min(caixa.y0, f.caixa.y0)
    caixa.x1 = Math.max(caixa.x1, f.caixa.x1)
    caixa.y1 = Math.max(caixa.y1, f.caixa.y1)
  }
  return caixa
}

/**
 * A grade de pontos de um sprite posto na tela como o jogo faz: a imagem inteira na caixa
 * (x, y, w, h), com o `viewBox` encaixado por "meet" (o padrão do SVG).
 */
export function mascara(
  sprite: { viewBox: string; body: string },
  caixa: { x: number; y: number; w: number; h: number },
  grade: { x0: number; y0: number; colunas: number; linhas: number; passo: number },
): Uint8Array {
  const [vx, vy, vw, vh] = sprite.viewBox.split(/\s+/).map(Number) as [
    number,
    number,
    number,
    number,
  ]
  const escala = Math.min(caixa.w / vw, caixa.h / vh)
  const ox = caixa.x + (caixa.w - vw * escala) / 2
  const oy = caixa.y + (caixa.h - vh * escala) / 2
  const formas = lerFormas(sprite.body)
  const m = new Uint8Array(grade.colunas * grade.linhas)
  for (let j = 0; j < grade.linhas; j++) {
    const py = grade.y0 + (j + 0.5) * grade.passo
    const uy = vy + (py - oy) / escala
    if (uy < vy || uy > vy + vh) continue
    for (let i = 0; i < grade.colunas; i++) {
      const px = grade.x0 + (i + 0.5) * grade.passo
      const ux = vx + (px - ox) / escala
      if (ux < vx || ux > vx + vw) continue
      if (pintado(formas, ux, uy)) m[j * grade.colunas + i] = 1
    }
  }
  return m
}
