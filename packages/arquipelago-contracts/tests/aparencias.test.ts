import { describe, expect, test } from 'bun:test'
import {
  AparenciaLidaSchema,
  escalaDaCaixaDoMolda,
  LIMITES_DA_APARENCIA,
  triangulosDoGlb,
} from '../src/aparencias'
import { CATALOGO_DE_OBJETOS } from '../src/objetos'

function glb(mudar: (g: ReturnType<typeof documento>) => void = () => {}) {
  const g = documento()
  mudar(g)
  const bin = g.accessors[0]!.count * 12
  g.buffers[0]!.byteLength = bin
  g.bufferViews[0]!.byteLength = bin
  const json = new TextEncoder().encode(JSON.stringify(g))
  const size = Math.ceil(json.length / 4) * 4
  const bytes = new Uint8Array(20 + size + 8 + bin)
  const v = new DataView(bytes.buffer)
  v.setUint32(0, 0x46546c67, true)
  v.setUint32(4, 2, true)
  v.setUint32(8, bytes.length, true)
  v.setUint32(12, size, true)
  v.setUint32(16, 0x4e4f534a, true)
  bytes.fill(32, 20, 20 + size)
  bytes.set(json, 20)
  v.setUint32(20 + size, bin, true)
  v.setUint32(24 + size, 0x004e4942, true)
  return bytes
}
function documento() {
  return {
    asset: { version: '2.0' },
    buffers: [{ byteLength: 36, uri: undefined as string | undefined }],
    bufferViews: [{ buffer: 0, byteLength: 36 }],
    accessors: [{ count: 3, type: 'VEC3', componentType: 5126, bufferView: 0 }],
    nodes: [{ mesh: 0, children: [] as number[] }],
    scenes: [{ nodes: [0] }],
    scene: 0,
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, mode: 4 }] }],
  }
}
describe('a porta das aparências', () => {
  test('conta o conteúdo do GLB e recusa teto, arquivo truncado e URI externa', () => {
    expect(triangulosDoGlb(glb())).toBe(1)
    expect(
      triangulosDoGlb(
        glb((g) => {
          g.accessors[0]!.count = 15000
        }),
      ),
    ).toBe(5000)
    expect(
      triangulosDoGlb(
        glb((g) => {
          g.accessors[0]!.count = 9000
          g.nodes.push({ mesh: 0, children: [] })
          g.scenes[0]!.nodes.push(1)
        }),
      ),
    ).toBeNull()
    expect(
      triangulosDoGlb(
        glb((g) => {
          g.accessors[0]!.count = 15003
        }),
      ),
    ).toBeNull()
    expect(triangulosDoGlb(glb().subarray(0, 30))).toBeNull()
    expect(
      triangulosDoGlb(
        glb((g) => {
          g.buffers[0]!.uri = 'https://outro/model.bin'
        }),
      ),
    ).toBeNull()
    expect(
      AparenciaLidaSchema.safeParse({
        tipo: 'molda',
        bytes: new Uint8Array(LIMITES_DA_APARENCIA.glbBytes + 1),
      }).success,
    ).toBe(false)
  })
  test('recusa ciclos e conta instâncias repetidas da malha', () => {
    expect(
      triangulosDoGlb(
        glb((g) => {
          g.nodes[0]!.children = [0]
        }),
      ),
    ).toBeNull()
    expect(
      triangulosDoGlb(
        glb((g) => {
          g.nodes.push({ mesh: 0, children: [] })
          g.scenes[0]!.nodes.push(1)
        }),
      ),
    ).toBe(2)
  })
  test('a escala é a mesma da oficina, inclusive moldes grandes', () => {
    expect(escalaDaCaixaDoMolda(CATALOGO_DE_OBJETOS.geladeira.molde)).toBe(16)
    expect(escalaDaCaixaDoMolda(CATALOGO_DE_OBJETOS.banda.molde)).toBeCloseTo(30 / 2.85)
  })
  test('PNG exige assinatura e dimensões reais dentro da planificação', () => {
    const png = Uint8Array.from(
      atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==',
      ),
      (c) => c.charCodeAt(0),
    )
    expect(AparenciaLidaSchema.safeParse({ tipo: 'pinta', bytes: png }).success).toBe(true)
    new DataView(png.buffer).setUint32(16, 193)
    expect(AparenciaLidaSchema.safeParse({ tipo: 'pinta', bytes: png }).success).toBe(false)
    expect(
      AparenciaLidaSchema.safeParse({ tipo: 'pinta', bytes: new Uint8Array(33) }).success,
    ).toBe(false)
  })
})
