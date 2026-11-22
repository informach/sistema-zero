import { expect, test } from 'bun:test'
import { Matrix4, PlaneGeometry, type Vector3 } from 'three'
import { apoioPorRaios, MundoDoTeste } from '../src/teste/colisoes'

/**
 * O apoio dos pés (lote 6 da conclusão, 22/11/2026): as nove amostras que os motores 3D do
 * Estúdio repetiam moram aqui. O laço abaixo é a cópia do que os motores faziam (o Jogo 3D com
 * `>`, o 3D Avançado com `>=` e o contato inteiro); `apoioPorRaios` precisa dar o mesmo.
 */
interface Ponto {
  x: number
  y: number
  z: number
}
type Contato = { ponto: Ponto; normal: Ponto }

function apoioDosMotores(
  rastrear: (de: Ponto, ate: Ponto) => Contato | null,
  x: number,
  z: number,
  raio: number,
  topo: number,
  fundo: number,
  normalMinima: number,
  incluiMinima: boolean,
): { y: number; normal: Ponto } | null {
  let best: Contato | null = null
  for (let i = 0; i < 9; i++) {
    const angle = ((i - 1) * Math.PI) / 4
    const px = x + (i ? Math.cos(angle) * raio * 0.75 : 0)
    const pz = z + (i ? Math.sin(angle) * raio * 0.75 : 0)
    const hit = rastrear({ x: px, y: topo, z: pz }, { x: px, y: fundo, z: pz })
    const sobe = hit && (incluiMinima ? hit.normal.y >= normalMinima : hit.normal.y > normalMinima)
    if (hit && sobe && (!best || hit.ponto.y > best.ponto.y)) best = hit
  }
  return best ? { y: best.ponto.y, normal: best.normal } : null
}

test('o apoio dá o mesmo que o laço de 9 amostras dos motores, em qualquer chão', () => {
  let semente = 7
  const sorteio = () => {
    semente = (semente * 1103515245 + 12345) % 2147483648
    return semente / 2147483648
  }
  for (let caso = 0; caso < 300; caso++) {
    // Um chão de degraus com buracos e paredes inclinadas, diferente a cada caso.
    const degraus = Array.from({ length: 5 }, () => ({
      altura: sorteio() * 4 - 1,
      normal: sorteio() - 0.2,
      buraco: sorteio() < 0.2,
    }))
    const rastrear = (de: Ponto, ate: Ponto): Contato | null => {
      const d = degraus[Math.abs(Math.floor(de.x * 3 + de.z * 5)) % degraus.length]!
      if (d.buraco || d.altura > de.y || d.altura < ate.y) return null
      return { ponto: { x: de.x, y: d.altura, z: de.z }, normal: { x: 0, y: d.normal, z: 0 } }
    }
    const x = sorteio() * 20 - 10,
      z = sorteio() * 20 - 10,
      raio = caso % 7 === 0 ? 0 : sorteio() * 2,
      normalMinima = [0, 0.5, 0.64][caso % 3]!,
      incluiMinima = caso % 2 === 0
    expect(
      apoioPorRaios(
        (de: Vector3, ate: Vector3) => rastrear(de, ate),
        x,
        z,
        raio,
        5,
        -5,
        normalMinima,
        incluiMinima,
      ),
    ).toEqual(apoioDosMotores(rastrear, x, z, raio, 5, -5, normalMinima, incluiMinima))
  }
})

test('a normal igual ao mínimo só conta na comparação inclusiva (a do 3D Avançado)', () => {
  const rastrear = (de: Vector3) => ({
    ponto: { y: 1 },
    normal: { x: 0, y: 0.64, z: 0.768 },
    distancia: de.y - 1,
  })
  expect(apoioPorRaios(rastrear, 0, 0, 1, 5, -5, 0.64, true)).toEqual({
    y: 1,
    normal: { x: 0, y: 0.64, z: 0.768 },
  })
  expect(apoioPorRaios(rastrear, 0, 0, 1, 5, -5, 0.64)).toBeNull()
})

test('sem raio positivo, um raio só, no centro (como o Mundo 3D fazia)', () => {
  for (const raio of [0, -1, Number.NaN]) {
    const pontos: Ponto[] = []
    const rastrear = (de: Vector3) => {
      pontos.push({ x: de.x, y: de.y, z: de.z })
      return null
    }
    expect(apoioPorRaios(rastrear, 2, 3, raio, 5, -5, 0)).toBeNull()
    expect(pontos).toEqual([{ x: 2, y: 5, z: 3 }])
  }
})

test('no mundo de colisões de verdade, o apoio é o chão', () => {
  const chao = new PlaneGeometry(20, 20).rotateX(-Math.PI / 2)
  const mundo = new MundoDoTeste([
    { geometria: chao, matriz: new Matrix4().makeTranslation(0, 1.5, 0) },
  ])
  try {
    expect(mundo.apoio(0, 0, 0.5, 5, -5, 0.5)?.y).toBeCloseTo(1.5, 6)
    expect(mundo.apoio(50, 0, 0.5, 5, -5, 0.5)).toBeNull()
  } finally {
    mundo.descartar()
    chao.dispose()
  }
})

test('no empate de altura vale o primeiro raio (o do centro), como nos motores', () => {
  const rastrear = (de: Vector3) => ({
    ponto: { y: 1 },
    normal: de.x === 2 && de.z === 3 ? { x: 0, y: 1, z: 0 } : { x: 0.43, y: 0.9, z: 0 },
  })
  expect(apoioPorRaios(rastrear, 2, 3, 1, 5, -5, 0.5)?.normal).toEqual({ x: 0, y: 1, z: 0 })
})
