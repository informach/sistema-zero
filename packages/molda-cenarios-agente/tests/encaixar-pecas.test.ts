import { expect, test } from 'bun:test'
import { criarHostEmMemoria } from '@sistemazero/molda-cenarios/oficina/host-memoria'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { glb } from '../../molda-cenarios-motor/tests/fixtures/glb-compilacao'
import { criarContexto, executarFerramenta } from '../src/oficina/ferramentas'
import { criarIntencoes } from '../src/oficina/intencoes'

/** Um trecho de caminho de verdade (GLB de 1,2 × 0,1 × 4 m): as pontas são os pontos de encaixe. */
function trecho() {
  // Os 8 cantos da caixa e as 12 faces (sem o Three, que este pacote não tipa).
  const [x, y, z] = [0.6, 0.1, 2]
  const cantos = [
    [-x, 0, -z],
    [x, 0, -z],
    [x, y, -z],
    [-x, y, -z],
    [-x, 0, z],
    [x, 0, z],
    [x, y, z],
    [-x, y, z],
  ]
  const faces = [
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2,
    6, 1, 6, 5,
  ]
  const posicoes = new Float32Array(cantos.flat()),
    indices = new Uint16Array(faces),
    bin = new Uint8Array(posicoes.byteLength + indices.byteLength)
  bin.set(new Uint8Array(posicoes.buffer), 0)
  bin.set(new Uint8Array(indices.buffer), posicoes.byteLength)
  const min = { x: -x, y: 0, z: -z },
    max = { x, y, z }
  return glb(
    {
      asset: { version: '2.0' },
      buffers: [{ byteLength: bin.length }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: posicoes.byteLength, target: 34962 },
        {
          buffer: 0,
          byteOffset: posicoes.byteLength,
          byteLength: indices.byteLength,
          target: 34963,
        },
      ],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: posicoes.length / 3,
          type: 'VEC3',
          min: [min.x, min.y, min.z],
          max: [max.x, max.y, max.z],
        },
        { bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' },
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
      nodes: [{ mesh: 0 }],
      scenes: [{ nodes: [0] }],
      scene: 0,
    },
    bin,
  )
}

test('encaixar_pecas puxa o trecho torto até a ponta do vizinho, num passo só', async () => {
  const host = criarHostEmMemoria({ equipe: true })
  const biblioteca = await host.criarBiblioteca('conta', { nome: 'Caminhos', licenca: 'propria' })
  const conteudo = trecho()
  const [m] = await host.importarModelos(biblioteca.id, [
    {
      nome: 'Caminho 01',
      pasta: '',
      etiquetas: [],
      conteudo,
      digest: await digestDosBytes(conteudo),
      miniatura: new Blob([new Uint8Array([1])], { type: 'image/webp' }),
      min: [-0.6, 0, -2],
      max: [0.6, 0.1, 2],
      triangulos: 12,
    },
  ])
  const ref = { bibliotecaId: biblioteca.id, modeloId: m!.id, digest: m!.digest }
  const mundo = await host.criarMundo('conta', 'Trilhas')
  await host.editarMundo(mundo.id, { bibliotecas: [biblioteca.id] })
  const cenario = await host.criarCenario(mundo.id, 'Trilha')
  const a = criarIntencoes(host)
  const primeiro = (await a.colocarModelo(cenario.id, { ...ref, x: 0, z: 0 })).criados[0]!
  // O segundo ficou meio metro adiante e um pouco de lado, girado 15°.
  const segundo = (
    await a.colocarModelo(cenario.id, { ...ref, x: 0.3, z: 4.5, giro: (15 * Math.PI) / 180 })
  ).criados[0]!
  const antes = (await host.abrirCenario(cenario.id)).revisao
  // As ferramentas pedem UUID; o host em memória cria outro formato de id.
  const uuid = '6f1c2b9e-3d4a-4f5b-8c6d-7e8f9a0b1c2d',
    traduzir = (id: string) => (id === uuid ? cenario.id : id)
  const contexto = criarContexto({
    ...host,
    abrirCenario: (id: string) => host.abrirCenario(traduzir(id)),
    conteudoDoTerreno: (id: string, digest: string, sinal?: AbortSignal) =>
      host.conteudoDoTerreno(traduzir(id), digest, sinal),
    editarCenario: ((id: string, ...resto: unknown[]) =>
      (host.editarCenario as (...a: unknown[]) => unknown)(
        traduzir(id),
        ...resto,
      )) as typeof host.editarCenario,
  })
  const resposta = await executarFerramenta(contexto, 'encaixar_pecas', {
    cenarioId: uuid,
    pecas: [segundo],
  })
  expect(resposta).toMatchObject({ ok: true })
  const r = (
    resposta as { valor: { revisao: number; encaixes: { peca: string; vizinha: string }[] } }
  ).valor
  expect(r.revisao).toBe(antes + 1)
  expect(r.encaixes).toEqual([expect.objectContaining({ peca: segundo, vizinha: primeiro })])
  const o = (await host.abrirCenario(cenario.id)).documento.instancias.find(
    (i) => i.id === segundo,
  )!
  expect(o.apoio).toEqual({ tipo: 'absoluto' })
  expect(o.transformacao.posicao.x).toBeCloseTo(0, 5)
  expect(o.transformacao.posicao.z).toBeCloseTo(4, 5)
  expect(o.transformacao.rotacao.y).toBeCloseTo(0, 5)
})
