import { expect, test } from 'bun:test'
import { inspecionarGlbDaCompilacao } from '../src/compilar/inspecao-glb'

import { exemplo, glb } from './fixtures/glb-compilacao'

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

test('morph que o Three não conserva é recusado antes do carregamento', () => {
  const { j, bin } = exemplo()
  const bytes = glb(
    {
      ...j,
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, targets: [{ TANGENT: 0 }] }] }],
    },
    bin,
  )
  expect(() => inspecionarGlbDaCompilacao(bytes, { fonte: true })).toThrow(/morph/)
})

test('imagem de fonte com padding do exportador é normalizada sem alterar o hash autoral; saída continua estrita', () => {
  const { j, bin } = exemplo(),
    png = new Uint8Array(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4AWL6z8DwHwSZGEEkw38GAAAAAP//4+5legAAAAZJREFUAwBBDwb/5c5bAAAAAABJRU5ErkJggg==',
        'base64',
      ),
    ),
    completo = new Uint8Array(bin.length + 100)
  completo.set(bin)
  completo.set(png, bin.length)
  const bytes = glb(
      {
        ...j,
        buffers: [{ byteLength: completo.length }],
        bufferViews: [...j.bufferViews, { buffer: 0, byteOffset: bin.length, byteLength: 100 }],
        images: [{ bufferView: 1, mimeType: 'image/png' }],
      },
      completo,
    ),
    antes = bytes.slice()
  expect(inspecionarGlbDaCompilacao(bytes, { fonte: true }).bytesDePixels).toBe(16)
  expect(() => inspecionarGlbDaCompilacao(bytes)).toThrow()
  expect(bytes).toEqual(antes)
})
