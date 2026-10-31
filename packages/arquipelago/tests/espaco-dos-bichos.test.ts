import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Box3, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ESCALA_DOS_BICHOS } from '../src/mundo/bichos-do-bosque'
import { ALTURA_QUE_SEGURA } from '../src/mundo/colisao-da-ilha-central'
import { CORPO } from '../src/sistemas/corpo'
import {
  capsulaDoEspaco,
  comecarPassinho,
  corpoQueSegura,
  criarEmpurrao,
  distanciaMinima,
  ESPACO,
  ESPACO_DOS_BICHOS,
  empurrando,
  espacoDoBicho,
  ladoDoPassinho,
  passaroNoAlto,
  passoDoEmpurrao,
  passoDoPassinho,
  pedidoNoChao,
  respeitarFolga,
  subidaDoPassaro,
} from '../src/sistemas/espaco-dos-bichos'

/**
 * O espaço dos bichos (31/10/2026): as regras puras do desvio, da folga, do passinho e do
 * passarinho, e as cápsulas conferidas contra os GLBs reais.
 */

const DT = 1 / 60
const QUARTO = join(import.meta.dir, '..', '..', 'community-kids', 'public', 'room3d', 'items')
const BICHOS = join(import.meta.dir, '..', 'src', 'assets', 'bichos')

async function medir(caminho: string) {
  const b = readFileSync(caminho)
  const g = await new GLTFLoader().parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    '',
  )
  g.scene.updateMatrixWorld(true)
  return new Box3().setFromObject(g.scene).getSize(new Vector3())
}

describe('as cápsulas saem dos GLBs reais', () => {
  const casos = [
    ...(['pet-cachorro', 'pet-gato', 'pet-passaro'] as const).map((id) => ({
      id,
      arquivo: join(QUARTO, `${id}.glb`),
      escala: 1,
      voa: id === 'pet-passaro',
    })),
    ...(['cachorro', 'gato', 'coelho', 'porquinho'] as const).flatMap((b) =>
      (['adulto', 'filhote'] as const).map((fase) => ({
        id: `${b}-${fase}` as const,
        arquivo: join(BICHOS, fase === 'adulto' ? `${b}.glb` : `${b}-filhote.glb`),
        escala: ESCALA_DOS_BICHOS,
        voa: false,
      })),
    ),
  ]

  test('todo bicho medido tem cápsula, e toda cápsula foi medida', () => {
    expect(casos.map((c): string => c.id).sort()).toEqual(Object.keys(ESPACO_DOS_BICHOS).sort())
  })

  for (const c of casos) {
    test(`${c.id}: raio pelo tronco, altura do corpo`, async () => {
      const t = (await medir(c.arquivo)).multiplyScalar(c.escala)
      const e = ESPACO_DOS_BICHOS[c.id]
      const comprimento = Math.max(t.x, t.z)
      const largura = Math.min(t.x, t.z)
      // A regra: o maior entre meia largura e 30% do comprimento (focinho e rabo de fora).
      expect(e.raio).toBeCloseTo(Math.max(largura / 2, comprimento * 0.3), 1)
      expect(e.raio * 2).toBeGreaterThanOrEqual(largura - 0.01)
      expect(e.raio * 2).toBeLessThanOrEqual(comprimento)
      if (c.voa) expect(e.altura).toBeCloseTo(t.y, 2)
      else {
        expect(e.altura).toBeCloseTo(Math.max(t.y, ESPACO.alturaQueSegura), 2)
        // O corpo dela não sobe no bicho pelo degrau automático.
        expect(e.altura).toBeGreaterThan(ALTURA_QUE_SEGURA)
      }
      const cap = capsulaDoEspaco(e)
      expect(cap.y - cap.meiaAltura - cap.raio).toBeCloseTo(0, 6)
      expect(cap.y + cap.meiaAltura + cap.raio).toBeCloseTo(e.altura, 6)
    })
  }

  test('bichinho sem medida usa a do cachorro do quarto', () => {
    expect(espacoDoBicho('pet-dragao')).toEqual(ESPACO_DOS_BICHOS['pet-cachorro'])
  })
})

describe('quem segura o corpo dela', () => {
  test('bicho só no modo chão; o resto sempre (plataformas, chão, peças)', () => {
    expect(corpoQueSegura({ bichoQueSegura: true }, 'chao')).toBe(true)
    for (const modo of ['cipo', 'escada', 'montar', 'barco', 'balao', 'escalada'])
      expect(corpoQueSegura({ bichoQueSegura: true }, modo)).toBe(false)
    expect(corpoQueSegura({ plataformaDoMundo: true }, 'cipo')).toBe(true)
    expect(corpoQueSegura(undefined, 'chao')).toBe(true)
  })
})

describe('a folga de quem segue', () => {
  const crianca = { x: 0, z: 0, pe: 0 }
  const minimo = distanciaMinima(0.33)

  test('nunca é menor que as duas cápsulas encostadas', () => {
    expect(minimo).toBeGreaterThan(CORPO.raio + 0.33)
  })

  test('indo direto para ela, para na folga; de lado, passa', () => {
    const bicho = { x: 1, z: 0, pe: 0 }
    const d = { x: -0.5, z: 0 }
    respeitarFolga(bicho, d, crianca, minimo, DT)
    expect(Math.hypot(bicho.x + d.x, bicho.z + d.z)).toBeCloseTo(minimo, 6)
    const lado = { x: -0.1, z: 0.3 }
    const perto = { x: minimo + 0.05, z: 0, pe: 0 }
    respeitarFolga(perto, lado, crianca, minimo, DT)
    expect(Math.hypot(perto.x + lado.x, perto.z + lado.z)).toBeGreaterThanOrEqual(minimo - 1e-9)
    expect(lado.z).toBeGreaterThan(0.2)
  })

  test('longe, não mexe; em outro andar, não mexe', () => {
    const d = { x: -0.2, z: 0 }
    respeitarFolga({ x: 3, z: 0, pe: 0 }, d, crianca, minimo, DT)
    expect(d).toEqual({ x: -0.2, z: 0 })
    const d2 = { x: -0.5, z: 0 }
    respeitarFolga({ x: 0.8, z: 0, pe: 3 }, d2, crianca, minimo, DT)
    expect(d2).toEqual({ x: -0.5, z: 0 })
  })

  test('dentro dela (um teletransporte), sai aos poucos, sem salto', () => {
    const bicho = { x: 0.1, z: 0, pe: 0 }
    for (let i = 0; i < 60; i++) {
      const d = { x: 0, z: 0 }
      respeitarFolga(bicho, d, crianca, minimo, DT)
      expect(Math.hypot(d.x, d.z)).toBeLessThanOrEqual(ESPACO.saida * DT + 1e-9)
      bicho.x += d.x
      bicho.z += d.z
    }
    expect(Math.hypot(bicho.x, bicho.z)).toBeCloseTo(minimo - ESPACO.folga, 6)
  })

  test('ela chegando perto (dentro da folga, sem cruzar) não empurra ele', () => {
    const bicho = { x: minimo - 0.03, z: 0, pe: 0 }
    const d = { x: 0, z: 0 }
    respeitarFolga(bicho, d, crianca, minimo, DT)
    expect(d).toEqual({ x: 0, z: 0 })
    const indo = { x: -0.1, z: 0 }
    respeitarFolga(bicho, indo, crianca, minimo, DT)
    expect(indo.x).toBeCloseTo(0, 9)
  })
})

describe('o empurrão e o passinho', () => {
  const bicho = { x: 0.7, z: 0, pe: 0 }
  const crianca = { x: 0, z: 0, pe: 0 }

  test('o pedido do controle segue a câmera como no personagem', () => {
    const p = pedidoNoChao(0, -1, 0, { x: 0, z: 0 })
    expect(p.x).toBeCloseTo(0, 9)
    expect(p.z).toBeCloseTo(1, 9)
    const q = pedidoNoChao(1, 0, Math.PI / 2, { x: 0, z: 0 })
    expect(q.x).toBeCloseTo(0, 9)
    expect(q.z).toBeCloseTo(-1, 9)
  })

  test('encostada e pedindo contra ele conta; parada, de lado ou longe não', () => {
    expect(empurrando(bicho, 0.33, crianca, { x: 1, z: 0 })).toBe(true)
    expect(empurrando(bicho, 0.33, crianca, { x: 0, z: 0 })).toBe(false)
    expect(empurrando(bicho, 0.33, crianca, { x: 0, z: 1 })).toBe(false)
    expect(empurrando(bicho, 0.33, crianca, { x: -1, z: 0 })).toBe(false)
    expect(empurrando({ x: 1.5, z: 0, pe: 0 }, 0.33, crianca, { x: 1, z: 0 })).toBe(false)
  })

  test('meio segundo empurrando dá um passinho; soltar zera a conta', () => {
    const e = criarEmpurrao()
    let passos = 0
    for (let i = 0; i < 29; i++) if (passoDoEmpurrao(e, true, DT)) passos++
    expect(passos).toBe(0)
    passoDoEmpurrao(e, false, DT)
    expect(e.tempo).toBe(0)
    for (let i = 0; i < 31; i++) if (passoDoEmpurrao(e, true, DT)) passos++
    expect(passos).toBe(1)
  })

  test('o passinho vai de lado, para o lado em que ele já está', () => {
    const acima = ladoDoPassinho({ x: 0.7, z: 0.1 }, crianca, { x: 1, z: 0 })
    expect(acima?.z).toBeCloseTo(1, 9)
    const abaixo = ladoDoPassinho({ x: 0.7, z: -0.1 }, crianca, { x: 1, z: 0 })
    expect(abaixo?.z).toBeCloseTo(-1, 9)
  })

  test('com a parede de um lado, vai para o outro; sem lado livre, para a frente; sem nada, fica', () => {
    const semCima = (_x: number, z: number) => z < 0.3
    expect(ladoDoPassinho({ x: 0.7, z: 0.1 }, crianca, { x: 1, z: 0 }, semCima)?.z).toBeCloseTo(
      -1,
      9,
    )
    const corredor = (_x: number, z: number) => Math.abs(z) < 0.3
    expect(ladoDoPassinho(bicho, crianca, { x: 1, z: 0 }, corredor)?.x).toBeCloseTo(1, 9)
    expect(ladoDoPassinho(bicho, crianca, { x: 1, z: 0 }, () => false)).toBeNull()
  })

  test('o passinho anda a distância dele, aos poucos', () => {
    const e = criarEmpurrao()
    comecarPassinho(e, { x: 0, z: 1 })
    const total = { x: 0, z: 0 }
    let n = 0
    while (passoDoPassinho(e, DT, total)) n++
    expect(total.z).toBeCloseTo(ESPACO.passinho, 9)
    expect(n).toBeGreaterThan(10)
  })
})

describe('o passarinho no alto', () => {
  test('sobe com ela perto e desce com ela longe, com folga entre os dois', () => {
    expect(passaroNoAlto(false, 1.2)).toBe(true)
    expect(passaroNoAlto(false, 1.6)).toBe(false)
    expect(passaroNoAlto(true, 1.6)).toBe(true)
    expect(passaroNoAlto(true, 2.1)).toBe(false)
  })

  test('no alto, a cápsula dele passa por cima da cabeça desenhada dela', () => {
    expect(ESPACO.passaroAcimaDoPe).toBeGreaterThan(
      CORPO.desenho.cabeca + CORPO.desenho.raioDaCabeca,
    )
    expect(ESPACO.passaroAcimaDoPe).toBeGreaterThan(
      CORPO.doCentroAoPe + CORPO.meiaAltura + CORPO.raio,
    )
  })

  test('chega lá em cima antes dela encostar, mesmo correndo', () => {
    // Correndo de onde ele sobe até encostar (as duas cápsulas), a parte da subida que falta.
    const tempo =
      (ESPACO.passaroSobeDe - CORPO.raio - ESPACO_DOS_BICHOS['pet-passaro'].raio) / CORPO.correr
    let s = 0
    const alvo = ESPACO.passaroAcimaDoPe - 0.9
    for (let t = 0; t < tempo; t += DT) s = subidaDoPassaro(s, alvo, DT)
    // A base do passarinho (voo 0,9 + subida) já está acima do topo da cápsula dela.
    expect(0.9 + s).toBeGreaterThan(CORPO.doCentroAoPe + CORPO.meiaAltura + CORPO.raio)
  })
})
