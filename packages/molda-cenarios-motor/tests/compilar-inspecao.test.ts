import { expect, test } from 'bun:test'
import { inspecionarGlbDaCompilacao } from '../src/compilar/inspecao-glb'

function exemplo(vertices = 3) {
  const bin = new Uint8Array(vertices * 12)
  const j = {
    asset: { version: '2.0' },
    buffers: [{ byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bin.length }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: vertices,
        type: 'VEC3',
        min: [0, 0, 0],
        max: [0, 0, 0],
      },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    nodes: [{ mesh: 0 }, { mesh: 0 }],
    scenes: [{ nodes: [0, 1] }],
    scene: 0,
  }
  return { j, bin }
}
function glb(json: unknown, bin: Uint8Array) {
  const texto = new TextEncoder().encode(JSON.stringify(json)),
    n = Math.ceil(texto.length / 4) * 4,
    dados = new Uint8Array(28 + n + Math.ceil(bin.length / 4) * 4),
    v = new DataView(dados.buffer)
  v.setUint32(0, 0x46546c67, true)
  v.setUint32(4, 2, true)
  v.setUint32(8, dados.length, true)
  v.setUint32(12, n, true)
  v.setUint32(16, 0x4e4f534a, true)
  dados.fill(32, 20, 20 + n)
  dados.set(texto, 20)
  v.setUint32(20 + n, dados.length - 28 - n, true)
  v.setUint32(24 + n, 0x004e4942, true)
  dados.set(bin, 28 + n)
  return dados
}

test('inspeção mede primitivas instanciadas, não o tamanho da tabela meshes', () => {
  const { j, bin } = exemplo(),
    bytes = glb(j, bin),
    antes = bytes.slice()
  expect(inspecionarGlbDaCompilacao(bytes)).toMatchObject({
    malhas: 2,
    triangulos: 2,
    verticesMaximos: 3,
    animavel: false,
  })
  expect(bytes).toEqual(antes)
})
test('arquivos compilados limitam vértices reais e fontes maiores seguem para divisão explícita', () => {
  const { j, bin } = exemplo(65_001),
    bytes = glb(j, bin)
  expect(() => inspecionarGlbDaCompilacao(bytes)).toThrow(/vértices|65.000/)
  expect(inspecionarGlbDaCompilacao(bytes, { fonte: true }).verticesMaximos).toBe(65_001)
})
test('accessor gigante com poucos bytes, índices inválidos e ciclos são recusados antes do GLTFLoader', () => {
  const { j, bin } = exemplo()
  expect(() =>
    inspecionarGlbDaCompilacao(
      glb({ ...j, accessors: [{ ...j.accessors[0], count: 2 ** 30 }] }, bin),
    ),
  ).toThrow()
  expect(() =>
    inspecionarGlbDaCompilacao(glb({ ...j, nodes: [{ children: [1] }, { children: [0] }] }, bin)),
  ).toThrow(/ciclo/)
  const indices = new Uint8Array(40)
  indices.set(bin)
  new DataView(indices.buffer).setUint16(36, 9, true)
  const indexado = {
    ...j,
    buffers: [{ byteLength: 40 }],
    bufferViews: [...j.bufferViews, { buffer: 0, byteOffset: 36, byteLength: 4 }],
    accessors: [...j.accessors, { bufferView: 1, componentType: 5121, count: 3, type: 'SCALAR' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
  }
  expect(() => inspecionarGlbDaCompilacao(glb(indexado, indices))).toThrow(/índice/)
})
test('extensões materiais suportadas não removem o bloqueio de compressão e arquivos externos', () => {
  const { j, bin } = exemplo()
  expect(
    inspecionarGlbDaCompilacao(
      glb(
        {
          ...j,
          extensionsUsed: ['KHR_materials_unlit'],
          extensionsRequired: ['KHR_materials_unlit'],
        },
        bin,
      ),
    ).malhas,
  ).toBe(2)
  expect(() =>
    inspecionarGlbDaCompilacao(glb({ ...j, extensionsUsed: ['KHR_draco_mesh_compression'] }, bin)),
  ).toThrow(/Draco/)
  expect(() =>
    inspecionarGlbDaCompilacao(
      glb({ ...j, buffers: [{ byteLength: 36, uri: 'https://example.com/b.bin' }] }, bin),
    ),
  ).toThrow(/fora|completo/)
})

test('hierarquia profunda não chega à recursão do decoder', () => {
  const { j, bin } = exemplo()
  const nodes = Array.from({ length: 129 }, (_, i) =>
    i === 128 ? { mesh: 0 } : { children: [i + 1] },
  )
  expect(() =>
    inspecionarGlbDaCompilacao(glb({ ...j, nodes, scenes: [{ nodes: [0] }] }, bin)),
  ).toThrow(/profunda/)
})
