/**
 * A arte do jogo D (lote 8 da conclusão do plano do Estúdio, 22/11/2026): peças de 32 px e
 * personagens pintados por código, com sorteio de semente fixa (os mesmos bytes em toda rodada).
 * O PNG sai pelo mesmo `png()` da galeria do Pygame Zero.
 */
import { hex, png } from '../python/pgzero-art'

export const PECA = 32

/** Sorteio de semente fixa (mulberry32). */
export function sorteio(semente: number) {
  let s = semente >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Uma tela RGBA com pincéis simples. */
export class Tela {
  readonly rgba: Uint8Array
  constructor(
    readonly largura: number,
    readonly altura: number,
  ) {
    this.rgba = new Uint8Array(largura * altura * 4)
  }
  ponto(x: number, y: number, cor: string, alfa = 255) {
    if (x < 0 || y < 0 || x >= this.largura || y >= this.altura) return
    const [r, g, b] = hex(cor)
    this.rgba.set([r!, g!, b!, alfa], (Math.floor(y) * this.largura + Math.floor(x)) * 4)
  }
  retangulo(x: number, y: number, w: number, h: number, cor: string, alfa = 255) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.ponto(i, j, cor, alfa)
  }
  circulo(cx: number, cy: number, r: number, cor: string, alfa = 255) {
    for (let j = Math.floor(cy - r); j <= cy + r; j++)
      for (let i = Math.floor(cx - r); i <= cx + r; i++)
        if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r) this.ponto(i, j, cor, alfa)
  }
  /** Pontilhado: cada pixel do retângulo vira uma das cores, pelo sorteio. */
  textura(x: number, y: number, w: number, h: number, cores: string[], aleatorio: () => number) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        this.ponto(i, j, cores[Math.floor(aleatorio() * cores.length)]!)
  }
  /** Cola outra tela (os pixels transparentes não cobrem). */
  colar(outra: Tela, x: number, y: number) {
    for (let j = 0; j < outra.altura; j++)
      for (let i = 0; i < outra.largura; i++) {
        const de = (j * outra.largura + i) * 4
        if (outra.rgba[de + 3] === 0) continue
        const para = ((y + j) * this.largura + (x + i)) * 4
        this.rgba.set(outra.rgba.subarray(de, de + 4), para)
      }
  }
  png() {
    return png(this.largura, this.altura, this.rgba)
  }
}

export const dataUrl = (bytes: Uint8Array, mime = 'image/png') =>
  `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`

const GRAMA = ['#5fae4a', '#58a444', '#66b552', '#529c40']

/** As peças, na ordem do tileset (o índice é o número da peça na cena). */
export const PECAS = [
  'grama',
  'grama-flores',
  'caminho',
  'areia',
  'agua',
  'pedra',
  'tronco',
  'copa',
  'telhado',
  'parede-casa',
  'porta-casa',
  'chao-caverna',
  'parede-caverna',
  'piso-casa',
  'parede-interior',
  'cama',
  'cerca',
  'nevoa',
  'pedrinhas',
  'entrada-caverna',
  'tapete',
  'mesa',
  'janela',
  'arbusto',
] as const
export type Peca = (typeof PECAS)[number]
export const P = Object.fromEntries(PECAS.map((nome, i) => [nome, i])) as Record<Peca, number>
/** As peças que seguram o corpo (o resto é chão). */
export const SOLIDAS: Peca[] = [
  'agua',
  'pedra',
  'tronco',
  'parede-casa',
  'parede-caverna',
  'parede-interior',
  'cerca',
  'mesa',
  'janela',
  'arbusto',
]

function desenharPeca(nome: Peca, t: Tela, x: number, y: number, a: () => number) {
  const s = PECA
  switch (nome) {
    case 'grama':
      t.textura(x, y, s, s, GRAMA, a)
      break
    case 'grama-flores':
      t.textura(x, y, s, s, GRAMA, a)
      for (let k = 0; k < 5; k++) {
        const fx = x + 3 + Math.floor(a() * 26),
          fy = y + 3 + Math.floor(a() * 26),
          cor = ['#f4d03f', '#f78fb3', '#ffffff'][k % 3]!
        t.circulo(fx, fy, 1.6, cor)
        t.ponto(fx, fy, '#e67e22')
      }
      break
    case 'caminho':
      t.textura(x, y, s, s, ['#c8a46a', '#c19a5e', '#d1ae75', '#b88f55'], a)
      break
    case 'areia':
      t.textura(x, y, s, s, ['#e8d39a', '#e2cb8f', '#efdca7'], a)
      break
    case 'agua':
      t.textura(x, y, s, s, ['#3a8fd0', '#3584c4', '#4199da'], a)
      for (let k = 0; k < 3; k++) t.retangulo(x + 4 + k * 9, y + 8 + k * 7, 6, 1, '#9fd3f5')
      break
    case 'pedra':
      t.textura(x, y, s, s, GRAMA, a)
      t.circulo(x + 16, y + 17, 13, '#7f8c8d')
      t.circulo(x + 13, y + 13, 8, '#95a5a6')
      t.circulo(x + 11, y + 11, 3, '#bdc3c7')
      break
    case 'tronco':
      t.textura(x, y, s, s, GRAMA, a)
      t.circulo(x + 16, y + 26, 9, '#3d6b2c', 120)
      t.retangulo(x + 11, y + 4, 10, 26, '#7a4b2a')
      t.retangulo(x + 13, y + 4, 3, 26, '#94603a')
      break
    case 'copa':
      t.circulo(x + 16, y + 16, 15, '#2f7d32')
      t.circulo(x + 12, y + 11, 9, '#3f9d43')
      t.circulo(x + 10, y + 9, 3, '#6cc070')
      break
    case 'telhado':
      t.retangulo(x, y, s, s, '#b03a2e')
      for (let k = 0; k < s; k += 6) t.retangulo(x, y + k, s, 2, '#8e2f25')
      break
    case 'parede-casa':
      t.retangulo(x, y, s, s, '#e5c48f')
      for (let k = 0; k < s; k += 8) t.retangulo(x, y + k, s, 1, '#c9a46e')
      break
    case 'porta-casa':
      t.retangulo(x, y, s, s, '#e5c48f')
      t.retangulo(x + 8, y + 4, 16, 28, '#6e3b1f')
      t.circulo(x + 20, y + 19, 1.5, '#f4d03f')
      break
    case 'chao-caverna':
      t.textura(x, y, s, s, ['#4a4458', '#433e50', '#514a60'], a)
      break
    case 'parede-caverna':
      t.textura(x, y, s, s, ['#2c2836', '#26222f', '#33303f'], a)
      t.retangulo(x, y + 28, s, 4, '#1c1a24')
      break
    case 'piso-casa':
      t.retangulo(x, y, s, s, '#b9875a')
      for (let k = 0; k < s; k += 8) t.retangulo(x, y + k, s, 1, '#9c6f46')
      break
    case 'parede-interior':
      t.retangulo(x, y, s, s, '#d9c2a3')
      t.retangulo(x, y + 26, s, 6, '#8c6a4a')
      break
    case 'cama':
      t.retangulo(x, y, s, s, '#b9875a')
      t.retangulo(x + 3, y + 3, 26, 26, '#6e3b1f')
      t.retangulo(x + 5, y + 5, 22, 8, '#ffffff')
      t.retangulo(x + 5, y + 13, 22, 14, '#3a78c4')
      break
    case 'cerca':
      t.textura(x, y, s, s, GRAMA, a)
      t.retangulo(x, y + 12, s, 3, '#a0703f')
      t.retangulo(x, y + 20, s, 3, '#a0703f')
      for (let k = 2; k < s; k += 10) t.retangulo(x + k, y + 8, 3, 20, '#7a4b2a')
      break
    case 'nevoa':
      for (let j = 0; j < s; j++)
        for (let i = 0; i < s; i++) if ((i + j * 3) % 5 < 3) t.ponto(x + i, y + j, '#e8f1f7', 90)
      break
    case 'pedrinhas':
      t.textura(x, y, s, s, GRAMA, a)
      for (let k = 0; k < 4; k++)
        t.circulo(x + 5 + Math.floor(a() * 22), y + 5 + Math.floor(a() * 22), 2, '#95a5a6')
      break
    case 'entrada-caverna':
      t.textura(x, y, s, s, ['#7f8c8d', '#95a5a6'], a)
      t.circulo(x + 16, y + 22, 12, '#1c1a24')
      t.retangulo(x + 4, y + 22, 24, 10, '#1c1a24')
      break
    case 'tapete':
      t.retangulo(x, y, s, s, '#b9875a')
      t.retangulo(x + 2, y + 2, 28, 28, '#8e44ad')
      t.retangulo(x + 6, y + 6, 20, 20, '#a569bd')
      break
    case 'mesa':
      t.retangulo(x, y, s, s, '#b9875a')
      t.retangulo(x + 3, y + 6, 26, 18, '#7a4b2a')
      t.retangulo(x + 3, y + 6, 26, 4, '#94603a')
      break
    case 'janela':
      t.retangulo(x, y, s, s, '#e5c48f')
      t.retangulo(x + 7, y + 8, 18, 14, '#7a4b2a')
      t.retangulo(x + 9, y + 10, 14, 10, '#9fd3f5')
      break
    case 'arbusto':
      t.textura(x, y, s, s, GRAMA, a)
      t.circulo(x + 16, y + 18, 11, '#2f7d32')
      t.circulo(x + 12, y + 14, 6, '#3f9d43')
      break
  }
}

/** O tileset inteiro (8 colunas) e as cores médias de cada peça, para a prévia das cenas. */
export function tileset() {
  const colunas = 8,
    linhas = Math.ceil(PECAS.length / colunas),
    t = new Tela(colunas * PECA, linhas * PECA),
    a = sorteio(1984)
  for (const [i, nome] of PECAS.entries())
    desenharPeca(nome, t, (i % colunas) * PECA, Math.floor(i / colunas) * PECA, a)
  const medias = PECAS.map((_, i) => {
    let r = 0,
      g = 0,
      b = 0,
      n = 0
    const x0 = (i % colunas) * PECA,
      y0 = Math.floor(i / colunas) * PECA
    for (let y = y0; y < y0 + PECA; y++)
      for (let x = x0; x < x0 + PECA; x++) {
        const at = (y * t.largura + x) * 4
        if (t.rgba[at + 3]! < 128) continue
        r += t.rgba[at]!
        g += t.rgba[at + 1]!
        b += t.rgba[at + 2]!
        n++
      }
    return n ? [r / n, g / n, b / n].map((v) => Math.round(v)) : null
  })
  return { png: t.png(), colunas, medias, tela: t }
}

/** Personagens e objetos do jogo (32 × 32), um PNG cada. */
export function personagens() {
  return Object.fromEntries(Object.entries(figuras()).map(([nome, t]) => [nome, t.png()]))
}

/** Os personagens e objetos como telas (a capa os desenha por cima das peças). */
export function figuras() {
  const feito = (desenhar: (t: Tela) => void) => {
    const t = new Tela(PECA, PECA)
    desenhar(t)
    return t
  }
  return {
    heroi: feito((t) => {
      t.circulo(16, 27, 9, '#000000', 60)
      t.retangulo(10, 14, 12, 12, '#2e86de')
      t.retangulo(10, 24, 4, 5, '#34495e')
      t.retangulo(18, 24, 4, 5, '#34495e')
      t.circulo(16, 10, 6, '#f5cba7')
      t.retangulo(10, 3, 12, 4, '#c0392b')
      t.ponto(14, 10, '#2c3e50')
      t.ponto(18, 10, '#2c3e50')
    }),
    moeda: feito((t) => {
      t.circulo(16, 16, 9, '#b7950b')
      t.circulo(16, 16, 7, '#f4d03f')
      t.retangulo(15, 11, 2, 10, '#b7950b')
    }),
    gosma: feito((t) => {
      t.circulo(16, 27, 10, '#000000', 50)
      t.circulo(16, 20, 10, '#27ae60')
      t.retangulo(6, 20, 20, 8, '#27ae60')
      t.circulo(12, 18, 2, '#ffffff')
      t.circulo(20, 18, 2, '#ffffff')
      t.ponto(12, 18, '#000000')
      t.ponto(20, 18, '#000000')
    }),
    morcego: feito((t) => {
      t.circulo(16, 16, 6, '#5b2c6f')
      t.retangulo(3, 12, 10, 4, '#5b2c6f')
      t.retangulo(19, 12, 10, 4, '#5b2c6f')
      t.ponto(14, 15, '#f1c40f')
      t.ponto(18, 15, '#f1c40f')
    }),
    bau: feito((t) => {
      t.retangulo(5, 10, 22, 16, '#7a4b2a')
      t.retangulo(5, 10, 22, 5, '#94603a')
      t.retangulo(5, 15, 22, 2, '#f4d03f')
      t.retangulo(14, 14, 4, 5, '#f4d03f')
    }),
    'bau-aberto': feito((t) => {
      t.retangulo(5, 14, 22, 12, '#7a4b2a')
      t.retangulo(5, 6, 22, 6, '#94603a')
      t.retangulo(7, 14, 18, 4, '#f4d03f')
    }),
    coracao: feito((t) => {
      t.circulo(11, 12, 6, '#e74c3c')
      t.circulo(21, 12, 6, '#e74c3c')
      for (let j = 0; j < 12; j++) t.retangulo(5 + j, 14 + j, 22 - 2 * j, 1, '#e74c3c')
    }),
  }
}

/** A prévia de uma cena: 4 pixels por peça, com a cor média da peça de cima. */
export function previa(
  colunas: number,
  linhas: number,
  camadas: number[][],
  medias: (number[] | null)[],
) {
  const escala = 4,
    t = new Tela(colunas * escala, linhas * escala)
  for (let i = 0; i < colunas * linhas; i++) {
    let cor: number[] | null = null
    for (const celulas of camadas) {
      const v = celulas[i]!
      if (v >= 0 && medias[v]) cor = medias[v]!
    }
    if (!cor) continue
    const hexa = `#${cor.map((c) => c.toString(16).padStart(2, '0')).join('')}`
    t.retangulo((i % colunas) * escala, Math.floor(i / colunas) * escala, escala, escala, hexa)
  }
  return { png: t.png(), largura: t.largura, altura: t.altura }
}

/** Um pedaço de uma tela (uma peça do tileset). */
export function recortar(origem: Tela, x: number, y: number, w: number, h: number) {
  const t = new Tela(w, h)
  for (let j = 0; j < h; j++)
    t.rgba.set(
      origem.rgba.subarray(
        ((y + j) * origem.largura + x) * 4,
        ((y + j) * origem.largura + x + w) * 4,
      ),
      j * w * 4,
    )
  return t
}

/** Reduz a tela pela média de cada bloco (fator inteiro). */
export function reduzir(origem: Tela, fator: number) {
  const t = new Tela(Math.floor(origem.largura / fator), Math.floor(origem.altura / fator))
  for (let y = 0; y < t.altura; y++)
    for (let x = 0; x < t.largura; x++) {
      const soma = [0, 0, 0, 0]
      for (let j = 0; j < fator; j++)
        for (let i = 0; i < fator; i++) {
          const at = ((y * fator + j) * origem.largura + x * fator + i) * 4
          for (let c = 0; c < 4; c++) soma[c]! += origem.rgba[at + c]!
        }
      t.rgba.set(
        soma.map((v) => Math.round(v / (fator * fator))),
        (y * t.largura + x) * 4,
      )
    }
  return t
}
