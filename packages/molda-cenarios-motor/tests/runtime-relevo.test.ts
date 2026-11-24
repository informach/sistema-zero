import { describe, expect, test } from 'bun:test'
import {
  type CamadaDoRelevo,
  celulasDoNo,
  type FormaDoRelevo,
  type NoDoRelevo,
} from '@sistemazero/molda-cenarios-core/compilar'
import { malhaDeGradeNaPeca } from '@sistemazero/molda-cenarios-core/v2'
import type { Mesh } from 'three'
import { type DadosDoRelevo, RelevoNoThree } from '../src/compilar/runtime-relevo'

/** O relevo "campo" em pedaços (plano "Mundos de 2 km", lote 2, 23/11/2026). */

function sorteador(semente: number) {
  return () => {
    semente = (semente * 1103515245 + 12345) % 2147483648
    return semente / 2147483648
  }
}

const CAMADAS: CamadaDoRelevo[] = [
  { id: 'grama', cor: '#55aa33', corMedia: '#ffffff' },
  { id: 'terra', cor: '#996633', corMedia: '#ffffff' },
]

function dadosDeTeste(colunas = 256, linhas = 192, passo = 2): DadosDoRelevo {
  const sorteio = sorteador(17),
    forma: FormaDoRelevo = { origem: { x: -200, z: -150 }, passo, colunas, linhas },
    vertices = (colunas + 1) * (linhas + 1),
    alturas = new Float32Array(vertices),
    pesos = new Uint8Array(vertices * 4),
    buracos = new Uint8Array(colunas * linhas)
  for (let z = 0; z <= linhas; z++)
    for (let x = 0; x <= colunas; x++) {
      const i = z * (colunas + 1) + x
      alturas[i] = 30 * Math.sin(x / 23) * Math.cos(z / 17) + 6 * Math.sin(x / 3.1) + sorteio()
      const g = Math.round(255 * (0.5 + 0.5 * Math.sin(x / 11)))
      pesos.set([g, 255 - g, 0, 0], i * 4)
    }
  for (let k = 0; k < 40; k++) buracos[Math.floor(sorteio() * colunas * linhas)] = 1
  return { forma, alturas, buracos, pesos: [pesos], camadas: CAMADAS }
}

/**
 * A altura na borda do pedaço em (x, z), pela própria malha dele: a reta entre os dois vértices
 * vizinhos da borda (a grade do pedaço é regular, um vértice a cada `passoDoPedaco` metros).
 * `null` fora da borda ou em cima de um vértice.
 */
function alturaNaBorda(malha: Mesh, x: number, z: number, passoDoPedaco: number): number | null {
  const p = malha.geometry.getAttribute('position'),
    caixa = malha.geometry.boundingBox!,
    qx = Math.round((caixa.max.x - caixa.min.x) / passoDoPedaco),
    qz = Math.round((caixa.max.z - caixa.min.z) / passoDoPedaco),
    lx = x - malha.position.x,
    lz = z - malha.position.z,
    perto = (a: number, b: number) => Math.abs(a - b) < 1e-4
  const naReta = (ao: number, max: number) => ao > 1e-4 && ao < max - 1e-4
  if ((perto(lz, 0) || perto(lz, qz * passoDoPedaco)) && naReta(lx, qx * passoDoPedaco)) {
    const j = perto(lz, 0) ? 0 : qz,
      i = Math.floor(lx / passoDoPedaco),
      t = (lx - i * passoDoPedaco) / passoDoPedaco
    if (t < 1e-6) return null
    const a = j * (qx + 1) + i
    return p.getY(a) + (p.getY(a + 1) - p.getY(a)) * t
  }
  if ((perto(lx, 0) || perto(lx, qx * passoDoPedaco)) && naReta(lz, qz * passoDoPedaco)) {
    const i = perto(lx, 0) ? 0 : qx,
      j = Math.floor(lz / passoDoPedaco),
      t = (lz - j * passoDoPedaco) / passoDoPedaco
    if (t < 1e-6) return null
    const a = j * (qx + 1) + i
    return p.getY(a) + (p.getY(a + qx + 1) - p.getY(a)) * t
  }
  return null
}

describe('o relevo em pedaços', () => {
  test('o pedaço de detalhe máximo tem os vértices e os triângulos da malha do chão', () => {
    const dados = dadosDeTeste(),
      relevo = new RelevoNoThree({ ...dados, buracos: undefined }, { celulasPorNo: 64 })
    const no: NoDoRelevo = { nivel: 0, ix: 1, iz: 1 }
    const g = relevo.construir(no)
    const malha = malhaDeGradeNaPeca(
      dados.forma,
      { coluna: 1, linha: 1 },
      (x, z) => dados.alturas[(64 + z) * (dados.forma.colunas + 1) + 64 + x] as number,
    )
    const p = g.getAttribute('position')
    for (let i = 0; i < 65 * 65; i++) {
      expect(p.getX(i)).toBeCloseTo(malha.vertices[i * 3]!, 5)
      expect(p.getY(i)).toBeCloseTo(malha.vertices[i * 3 + 1]!, 5)
      expect(p.getZ(i)).toBeCloseTo(malha.vertices[i * 3 + 2]!, 5)
    }
    // Os triângulos do topo (antes das saias) são os mesmos, na mesma ordem.
    const indices = Array.from(g.index!.array).slice(0, malha.indices.length)
    expect(indices).toEqual(Array.from(malha.indices))
    relevo.descartar()
  })

  test('os pesos chegam a cada vértice, e o buraco não tem triângulo', () => {
    const dados = dadosDeTeste(),
      relevo = new RelevoNoThree(dados, { celulasPorNo: 32 })
    const g = relevo.construir({ nivel: 0, ix: 2, iz: 1 }),
      c = celulasDoNo(dados.forma, { nivel: 0, ix: 2, iz: 1 }, 32),
      pesos = g.getAttribute('mcnPesosA')
    for (const [i, j] of [
      [0, 0],
      [7, 3],
      [32, 32],
    ] as const) {
      const v = j * 33 + i,
        origem = ((c.z0 + j) * (dados.forma.colunas + 1) + c.x0 + i) * 4
      expect(pesos.getX(v)).toBeCloseTo(dados.pesos[0]![origem]! / 255, 5)
      expect(pesos.getY(v)).toBeCloseTo(dados.pesos[0]![origem + 1]! / 255, 5)
    }
    // Com e sem os buracos: a diferença de triângulos é a dos buracos dentro do pedaço.
    const semBuracos = new RelevoNoThree({ ...dados, buracos: undefined }, { celulasPorNo: 32 })
    let buracosDentro = 0
    for (let z = c.z0; z < c.z1; z++)
      for (let x = c.x0; x < c.x1; x++)
        if (dados.buracos![z * dados.forma.colunas + x] === 1) buracosDentro++
    const sem = semBuracos.construir({ nivel: 0, ix: 2, iz: 1 })
    expect(sem.index!.count - g.index!.count).toBe(buracosDentro * 6)
    relevo.descartar()
    semBuracos.descartar()
  })

  test('entre pedaços de níveis vizinhos, a diferença na borda cabe na saia', () => {
    const dados = dadosDeTeste(),
      relevo = new RelevoNoThree(dados, { celulasPorNo: 16, fator: 1.2, maximoDeNos: 200 })
    relevo.atualizar({ x: -40, z: 10 }, Number.POSITIVE_INFINITY, true)
    const malhas = relevo.grupo.children as Mesh[]
    const nivel = (m: Mesh) => Number(m.name.split(':')[1])
    let conferidas = 0
    for (const a of malhas)
      for (const b of malhas) {
        if (nivel(b) !== nivel(a) + 1) continue
        // b é o mais grosso; os pontos da borda do mais fino que caem na borda do mais grosso.
        const pa = a.geometry.getAttribute('position')
        for (let i = 0; i < (a.geometry.userData.topo as number); i++) {
          const x = pa.getX(i) + a.position.x,
            z = pa.getZ(i) + a.position.z,
            y = pa.getY(i)
          const naGrossa = alturaNaBorda(b, x, z, 2 ** nivel(b) * dados.forma.passo)
          if (naGrossa === null) continue
          // Quem está mais alto pendura a saia: ela precisa chegar ao outro.
          const saia = (y > naGrossa ? a : b).geometry.userData.saia as number
          expect(Math.abs(naGrossa - y)).toBeLessThanOrEqual(saia)
          conferidas++
        }
      }
    expect(conferidas).toBeGreaterThan(20)
    relevo.descartar()
  })

  test('andando com o foco, a tela nunca fica com buraco (troca só com tudo pronto)', () => {
    const dados = dadosDeTeste(),
      { forma } = dados,
      relevo = new RelevoNoThree(dados, { celulasPorNo: 16, construcoesPorQuadro: 1 })
    relevo.atualizar({ x: -150, z: -100 }, Number.POSITIVE_INFINITY, true)
    for (let passo = 0; passo < 120; passo++) {
      relevo.atualizar({ x: -150 + passo * 3, z: -100 + passo * 2 }, Number.POSITIVE_INFINITY)
      const vezes = new Uint8Array(forma.colunas * forma.linhas)
      for (const m of relevo.grupo.children as Mesh[]) {
        const [, n, ix, iz] = m.name.split(':').map(Number) as [number, number, number, number]
        const c = celulasDoNo(forma, { nivel: n, ix, iz }, 16)
        for (let z = c.z0; z < c.z1; z++)
          for (let x = c.x0; x < c.x1; x++) vezes[z * forma.colunas + x]!++
      }
      expect(vezes.filter((v) => v !== 1).length, `passo ${passo}`).toBe(0)
    }
    // A guarda: os da tela, os que estão a caminho e no máximo 64 a mais.
    const estado = relevo.estado()
    expect(estado.construidos).toBeLessThanOrEqual(estado.pedacos + estado.faltam + 64 + 40)
    relevo.descartar()
    expect(relevo.grupo.children.length).toBe(0)
  })

  test('recusa dados que não batem com a grade', () => {
    const dados = dadosDeTeste()
    expect(() => new RelevoNoThree({ ...dados, alturas: new Float32Array(3) })).toThrow(
      'As alturas não correspondem à grade do relevo.',
    )
    expect(() => new RelevoNoThree({ ...dados, pesos: [] })).toThrow(
      'Os pesos não correspondem à grade e às camadas do relevo.',
    )
  })
})
