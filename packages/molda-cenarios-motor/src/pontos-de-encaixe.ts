import type { PontoDeEncaixe } from '@sistemazero/molda-cenarios-core/v2'
import { type BufferGeometry, type Matrix4, Vector3 } from 'three'

/**
 * Os pontos de encaixe de uma peça, achados na própria geometria (o catálogo não os tem). O mesmo
 * arquivo dá sempre os mesmos pontos, então eles são guardados pelo hash.
 *
 * - Peça de pisar (caminho, ponte, plataforma, rampa, escada): a superfície de cima cobre a maior
 *   parte da base. Em cada lado da caixa onde essa superfície encosta na borda com pelo menos
 *   0,6 m, nasce um ponto na altura do piso ali. Com várias alturas na borda (o tabuleiro e os
 *   corrimãos de uma ponte), vale a que cobre mais largura. Na escada, o lado de baixo fica no
 *   primeiro degrau e o de cima no último.
 * - Peça comprida e fina (cerca, muro): um ponto em cada ponta, no pé.
 */
export const LARGURA_MINIMA_DO_ENCAIXE = 0.6
const PISO = 0.9 // normal.y de quem é piso (até uns 25°)
const COBERTURA_DE_PISO = 0.5

interface Triangulo {
  a: Vector3
  b: Vector3
  c: Vector3
  normalY: number
  area: number
}

function triangulos(partes: readonly { geometria: BufferGeometry; matriz: Matrix4 }[]) {
  const lista: Triangulo[] = []
  const ab = new Vector3(),
    ac = new Vector3(),
    n = new Vector3()
  for (const { geometria, matriz } of partes) {
    const posicoes = geometria.getAttribute('position')
    if (!posicoes) continue
    const indice = geometria.getIndex()
    const total = indice ? indice.count : posicoes.count
    const vertice = (i: number) =>
      new Vector3().fromBufferAttribute(posicoes, indice ? indice.getX(i) : i).applyMatrix4(matriz)
    for (let i = 0; i + 2 < total; i += 3) {
      const a = vertice(i),
        b = vertice(i + 1),
        c = vertice(i + 2)
      n.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a))
      const dobro = n.length()
      if (dobro < 1e-10) continue
      lista.push({ a, b, c, normalY: n.y / dobro, area: dobro / 2 })
    }
  }
  return lista
}

export function pontosDeEncaixeDaGeometria(
  partes: readonly { geometria: BufferGeometry; matriz: Matrix4 }[],
): PontoDeEncaixe[] {
  const tris = triangulos(partes)
  if (!tris.length) return []
  const min = new Vector3(Infinity, Infinity, Infinity),
    max = new Vector3(-Infinity, -Infinity, -Infinity)
  for (const t of tris)
    for (const v of [t.a, t.b, t.c]) {
      min.min(v)
      max.max(v)
    }
  const tamanho = new Vector3().subVectors(max, min)
  if (tamanho.x < 0.05 && tamanho.z < 0.05) return []

  // Peça comprida e fina: um ponto em cada ponta do eixo comprido, no pé.
  const fino = Math.min(tamanho.x, tamanho.z),
    comprido = Math.max(tamanho.x, tamanho.z)
  if (fino < 0.4 && comprido > 1 && tamanho.y > 0.3) {
    const eixo = tamanho.x >= tamanho.z ? 'x' : 'z'
    const meio = { x: (min.x + max.x) / 2, z: (min.z + max.z) / 2 }
    return [1, -1].map((s) => ({
      posicao: {
        x: eixo === 'x' ? (s > 0 ? max.x : min.x) : meio.x,
        y: min.y,
        z: eixo === 'z' ? (s > 0 ? max.z : min.z) : meio.z,
      },
      direcao: eixo === 'x' ? { x: s, z: 0 } : { x: 0, z: s },
      largura: Math.max(fino, 0.1),
    }))
  }

  // Peça de pisar: o piso projetado cobre boa parte da base.
  const pisos = tris.filter((t) => t.normalY > PISO)
  const areaDoPiso = pisos.reduce((s, t) => s + t.area * t.normalY, 0)
  if (areaDoPiso < COBERTURA_DE_PISO * tamanho.x * tamanho.z) return []

  const lados = [
    { eixo: 'x' as const, valor: max.x, direcao: { x: 1, z: 0 } },
    { eixo: 'x' as const, valor: min.x, direcao: { x: -1, z: 0 } },
    { eixo: 'z' as const, valor: max.z, direcao: { x: 0, z: 1 } },
    { eixo: 'z' as const, valor: min.z, direcao: { x: 0, z: -1 } },
  ]
  const pontos: PontoDeEncaixe[] = []
  for (const lado of lados) {
    const de = lado.eixo,
      atraves = de === 'x' ? 'z' : 'x'
    const tolerancia = Math.max(0.03, 0.02 * tamanho[de])
    // Arestas do piso deitadas na borda deste lado, agrupadas pela altura (5 cm).
    const porAltura = new Map<number, { comprimento: number; de: number; ate: number; y: number }>()
    for (const t of pisos)
      for (const [p, q] of [
        [t.a, t.b],
        [t.b, t.c],
        [t.c, t.a],
      ] as const) {
        if (Math.abs(p[de] - lado.valor) > tolerancia || Math.abs(q[de] - lado.valor) > tolerancia)
          continue
        const y = (p.y + q.y) / 2,
          faixa = Math.round(y / 0.05)
        const grupo = porAltura.get(faixa) ?? {
          comprimento: 0,
          de: Infinity,
          ate: -Infinity,
          y: -Infinity,
        }
        grupo.comprimento += Math.abs(p[atraves] - q[atraves])
        grupo.de = Math.min(grupo.de, p[atraves], q[atraves])
        grupo.ate = Math.max(grupo.ate, p[atraves], q[atraves])
        grupo.y = Math.max(grupo.y, p.y, q.y)
        porAltura.set(faixa, grupo)
      }
    let melhor: { comprimento: number; de: number; ate: number; y: number } | null = null
    for (const g of porAltura.values())
      if (!melhor || g.comprimento > melhor.comprimento) melhor = g
    // Arestas compartilhadas por dois triângulos contam duas vezes: o comprimento real é a metade.
    if (!melhor || Math.min(melhor.comprimento, melhor.ate - melhor.de) < LARGURA_MINIMA_DO_ENCAIXE)
      continue
    const centro = (melhor.de + melhor.ate) / 2
    pontos.push({
      posicao: {
        x: de === 'x' ? lado.valor : centro,
        y: melhor.y,
        z: de === 'z' ? lado.valor : centro,
      },
      direcao: lado.direcao,
      largura: melhor.ate - melhor.de,
    })
  }
  // Peça comprida (trecho de caminho, ponte, escada) só se liga pelas pontas: dois caminhos
  // paralelos não grudam de lado. Peça quase quadrada (plataforma, praça) fica com os quatro.
  if (comprido >= 1.5 * fino) {
    const eixo = tamanho.x >= tamanho.z ? 'x' : 'z'
    return pontos.filter((p) => Math.abs(p.direcao[eixo]) > 0.5)
  }
  return pontos
}
