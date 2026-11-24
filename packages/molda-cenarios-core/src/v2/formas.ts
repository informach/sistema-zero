import { z } from 'zod'
import type { VolumeDeComposicao } from './volume'

const identificacao = {
  id: z
    .string()
    .min(1)
    .max(240)
    .regex(/^[\p{L}\p{N}_.:/-]+$/u),
  nome: z.string().min(1).max(120),
}
const medida = z.number().finite().min(0.1).max(128)
const bloco = { ...identificacao, largura: medida, altura: medida, comprimento: medida }

/** Rascunhos autorais gerados pela ferramenta. Não são modelos GLB nem itens licenciados. */
export const FormaDeCenarioSchema = z.discriminatedUnion('tipo', [
  z.object({ ...bloco, tipo: z.literal('caixa') }).strict(),
  z.object({ ...bloco, tipo: z.literal('rampa') }).strict(),
  z
    .object({ ...bloco, tipo: z.literal('escada'), degraus: z.number().int().min(1).max(64) })
    .strict(),
  z
    .object({
      ...identificacao,
      tipo: z.literal('cilindro'),
      raio: medida,
      altura: medida,
      lados: z.number().int().min(3).max(64),
    })
    .strict(),
])
export type FormaDeCenario = z.infer<typeof FormaDeCenarioSchema>

export function volumeDaForma(f: FormaDeCenario): VolumeDeComposicao {
  if (f.tipo === 'cilindro') {
    const xs = Array.from({ length: f.lados }, (_, i) =>
      Math.fround(f.raio * Math.cos((i * 2 * Math.PI) / f.lados)),
    )
    const zs = Array.from({ length: f.lados }, (_, i) =>
      Math.fround(f.raio * Math.sin((i * 2 * Math.PI) / f.lados)),
    )
    return {
      min: { x: Math.min(...xs), y: 0, z: Math.min(...zs) },
      max: { x: Math.max(...xs), y: Math.fround(f.altura), z: Math.max(...zs) },
    }
  }
  const x = Math.fround(f.largura / 2),
    z = Math.fround(f.comprimento / 2)
  return { min: { x: -x, y: 0, z: -z }, max: { x, y: Math.fround(f.altura), z } }
}

export interface MalhaDeForma {
  posicoes: Float32Array
  normais: Float32Array
  uvs: Float32Array
  indices: Uint16Array
}
type Ponto = readonly [number, number, number]
type UV = readonly [number, number]

/** Recorte de orelhas limitado ao perfil simples de até 64 degraus. Preserva a borda exata. */
function triangularPerfil(pontos: readonly UV[]): [number, number, number][] {
  const cruz = (a: UV, b: UV, c: UV) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const area = pontos.reduce((s, p, i) => {
    const q = pontos[(i + 1) % pontos.length]!
    return s + p[0] * q[1] - q[0] * p[1]
  }, 0)
  const sinal = Math.sign(area),
    vivos = pontos.map((_, i) => i),
    saida: [number, number, number][] = []
  while (vivos.length > 3) {
    let cortou = false
    for (let i = 0; i < vivos.length; i++) {
      const a = vivos[(i + vivos.length - 1) % vivos.length]!,
        b = vivos[i]!,
        c = vivos[(i + 1) % vivos.length]!
      if (cruz(pontos[a]!, pontos[b]!, pontos[c]!) * sinal <= 1e-12) continue
      if (
        vivos.some(
          (j) =>
            j !== a &&
            j !== b &&
            j !== c &&
            cruz(pontos[a]!, pontos[b]!, pontos[j]!) * sinal >= -1e-12 &&
            cruz(pontos[b]!, pontos[c]!, pontos[j]!) * sinal >= -1e-12 &&
            cruz(pontos[c]!, pontos[a]!, pontos[j]!) * sinal >= -1e-12,
        )
      )
        continue
      saida.push([a, b, c])
      vivos.splice(i, 1)
      cortou = true
      break
    }
    if (!cortou) throw new Error('O perfil da escada não pôde ser triangulado')
  }
  saida.push([vivos[0]!, vivos[1]!, vivos[2]!])
  return saida
}

/** Superfície fechada, sem caixas sobrepostas nem faces internas; UV em metros. */
export function malhaDaForma(entrada: FormaDeCenario): MalhaDeForma {
  const f = FormaDeCenarioSchema.parse(entrada)
  const posicoes: number[] = [],
    normais: number[] = [],
    uvs: number[] = [],
    indices: number[] = []
  const tri = (a: Ponto, b: Ponto, c: Ponto, uvA: UV, uvB: UV, uvC: UV) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const n = [
        u[1]! * v[2]! - u[2]! * v[1]!,
        u[2]! * v[0]! - u[0]! * v[2]!,
        u[0]! * v[1]! - u[1]! * v[0]!,
      ],
      tamanho = Math.hypot(...n)
    if (!(tamanho > 0)) throw new Error('A forma contém uma face degenerada')
    const inicio = posicoes.length / 3
    for (const p of [a, b, c]) {
      posicoes.push(...p)
      normais.push(n[0]! / tamanho, n[1]! / tamanho, n[2]! / tamanho)
    }
    for (const uv of [uvA, uvB, uvC]) uvs.push(...uv)
    indices.push(inicio, inicio + 1, inicio + 2)
  }
  const quad = (a: Ponto, b: Ponto, c: Ponto, d: Ponto) => {
    const largura = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
      altura = Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2])
    tri(a, b, c, [0, 0], [largura, 0], [largura, altura])
    tri(a, c, d, [0, 0], [largura, altura], [0, altura])
  }
  if (f.tipo === 'cilindro') {
    const ponto = (i: number, y: number): Ponto => [
      f.raio * Math.cos(((i % f.lados) * 2 * Math.PI) / f.lados),
      y,
      f.raio * Math.sin(((i % f.lados) * 2 * Math.PI) / f.lados),
    ]
    for (let i = 0; i < f.lados; i++) {
      const a = ponto(i, 0),
        b = ponto(i + 1, 0),
        c = ponto(i + 1, f.altura),
        d = ponto(i, f.altura)
      const passo = 2 * f.raio * Math.sin(Math.PI / f.lados),
        u = i * passo,
        v = (i + 1) * passo
      tri(b, a, d, [v, 0], [u, 0], [u, f.altura])
      tri(b, d, c, [v, 0], [u, f.altura], [v, f.altura])
      tri(
        [0, 0, 0],
        a,
        b,
        [f.raio, f.raio],
        [a[0] + f.raio, a[2] + f.raio],
        [b[0] + f.raio, b[2] + f.raio],
      )
      tri(
        [0, f.altura, 0],
        c,
        d,
        [f.raio, f.raio],
        [c[0] + f.raio, c[2] + f.raio],
        [d[0] + f.raio, d[2] + f.raio],
      )
    }
  } else {
    const x = f.largura / 2,
      z = f.comprimento / 2,
      h = f.altura
    quad([-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z])
    quad([-x, 0, z], [x, 0, z], [x, h, z], [-x, h, z])
    if (f.tipo === 'rampa') {
      quad([-x, 0, -z], [-x, h, z], [x, h, z], [x, 0, -z])
      tri([-x, 0, -z], [-x, 0, z], [-x, h, z], [0, 0], [f.comprimento, 0], [f.comprimento, h])
      tri([x, 0, -z], [x, h, z], [x, 0, z], [0, 0], [f.comprimento, h], [f.comprimento, 0])
    } else {
      const n = f.tipo === 'escada' ? f.degraus : 1
      const perfil: UV[] = [
        [-z, 0],
        [-z, h / n],
      ]
      for (let i = 0; i < n; i++) {
        const y = (h * (i + 1)) / n,
          y0 = (h * i) / n,
          z0 = -z + (f.comprimento * i) / n,
          z1 = -z + (f.comprimento * (i + 1)) / n
        quad([-x, y, z0], [-x, y, z1], [x, y, z1], [x, y, z0])
        quad([-x, y0, z0], [-x, y, z0], [x, y, z0], [x, y0, z0])
        perfil.push([z1, y])
        if (i + 1 < n) perfil.push([z1, (h * (i + 2)) / n])
      }
      perfil.push([z, 0])
      for (const [a, b, c] of triangularPerfil(perfil)) {
        const p = perfil[a]!,
          q = perfil[b]!,
          r = perfil[c]!
        tri([-x, p[1], p[0]], [-x, r[1], r[0]], [-x, q[1], q[0]], p, r, q)
        tri([x, p[1], p[0]], [x, q[1], q[0]], [x, r[1], r[0]], p, q, r)
      }
    }
  }
  return {
    posicoes: new Float32Array(posicoes),
    normais: new Float32Array(normais),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  }
}
