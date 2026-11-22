import { createHash } from 'node:crypto'
import { RAYLIB_3D_EXTENSION } from '../../packages/studio/src/runtime/python/raylib/contract'
import { documentFixture } from '../../packages/studio/src/state/fixtures/projectDocuments'
import { pythonFilesToTree } from '../../packages/studio/src/state/pythonProjectValidation'

/**
 * As regiões no Raylib 3D do Estúdio (lote 7b da conclusão do plano do Estúdio, 22/11/2026): um
 * cenário compilado com três regiões em fila (Vila, Floresta e Caverna, vizinhas em par), cada uma
 * com um modelo próprio com textura, e um programa que percorre a rota Vila → Floresta → Caverna →
 * Floresta → Vila dez vezes. Na Caverna e no fim de cada volta ele escreve o que contou e espera a
 * prova apertar N, para a prova ler os objetos de GPU vivos do quadro no estado estável. Fica no servidor de
 * qualificação local; nada disto entra num artefato do runtime.
 */
export const RAYLIB_REGIONS_FIXTURE = 'raylib-regioes-3d'

export function isRaylibRegionsFixture(name: string) {
  return name === RAYLIB_REGIONS_FIXTURE
}

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const IDENTIDADE = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
/** Uma imagem PNG de 1 × 1 (a textura de cada modelo). */
const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg=='

/** Um GLB estático: um triângulo com coordenadas de textura e a imagem embutida. */
function modeloComTextura(): Uint8Array {
  const posicoes = new Float32Array([0, 0, 0, 4, 0, 0, 0, 4, 0])
  const uvs = new Float32Array([0, 0, 1, 0, 0, 1])
  const binario = new Uint8Array(posicoes.byteLength + uvs.byteLength)
  binario.set(new Uint8Array(posicoes.buffer), 0)
  binario.set(new Uint8Array(uvs.buffer), posicoes.byteLength)
  const json = {
    asset: { version: '2.0' },
    buffers: [{ byteLength: binario.byteLength }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posicoes.byteLength },
      { buffer: 0, byteOffset: posicoes.byteLength, byteLength: uvs.byteLength },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: 'VEC3',
        min: [0, 0, 0],
        max: [4, 4, 0],
      },
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC2' },
    ],
    images: [{ uri: `data:image/png;base64,${PNG}` }],
    textures: [{ source: 0 }],
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, material: 0 }] }],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
  }
  let corpo = new TextEncoder().encode(JSON.stringify(json))
  if (corpo.byteLength % 4) {
    const alinhado = new Uint8Array(corpo.byteLength + (4 - (corpo.byteLength % 4))).fill(0x20)
    alinhado.set(corpo)
    corpo = alinhado
  }
  const total = 12 + 8 + corpo.byteLength + 8 + binario.byteLength
  const glb = new Uint8Array(total)
  const vista = new DataView(glb.buffer)
  vista.setUint32(0, 0x46546c67, true)
  vista.setUint32(4, 2, true)
  vista.setUint32(8, total, true)
  vista.setUint32(12, corpo.byteLength, true)
  vista.setUint32(16, 0x4e4f534a, true)
  glb.set(corpo, 20)
  vista.setUint32(20 + corpo.byteLength, binario.byteLength, true)
  vista.setUint32(24 + corpo.byteLength, 0x004e4942, true)
  glb.set(binario, 28 + corpo.byteLength)
  return glb
}

const caixa = (x0: number, x1: number) => ({
  min: { x: x0, y: 0, z: -5 },
  max: { x: x1, y: 2, z: 5 },
})

function cenaCompilada(modelo: Uint8Array) {
  const arquivo = (nome: string) => ({
    caminho: `${nome}.glb`,
    bytes: modelo.byteLength,
    digest: sha256(modelo),
    mime: 'model/gltf-binary',
    papel: 'modelo',
    malhas: 1,
  })
  const no = (id: string, nome: string, x0: number, x1: number) => ({
    id,
    entidade: null,
    arquivo: `${nome}.glb`,
    matriz: IDENTIDADE,
    volume: caixa(x0, x1),
  })
  const regiao = (
    id: string,
    nome: string,
    x0: number,
    x1: number,
    vizinhas: string[],
    nos: string[],
  ) => ({
    id,
    nome,
    caixa: { x0, z0: -50, x1, z1: 50 },
    vizinhas,
    nos,
    colisoes: [],
    aguas: [],
  })
  return {
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: 'Três regiões',
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { cenario: 'regioes', revisao: 1, digest: 'a'.repeat(64) },
    arquivos: ['vila', 'floresta', 'caverna'].map(arquivo),
    nos: [
      no('casa', 'vila', -110, -90),
      no('arvore', 'floresta', -10, 10),
      no('pedra', 'caverna', 90, 110),
    ],
    entidades: [],
    colisoes: [
      {
        id: 'piso',
        entidade: null,
        tipo: 'caixa',
        arquivo: 'vila.glb',
        matriz: IDENTIDADE,
        volume: { min: { x: -150, y: -1, z: -50 }, max: { x: 150, y: 0, z: 50 } },
      },
    ],
    marcadores: [
      {
        id: 'inicio',
        nome: 'Início',
        posicao: { x: -100, y: 0, z: 0 },
        giro: 0,
        objeto: null,
        configuracao: { tipo: 'inicio', principal: true },
      },
    ],
    aguas: [],
    caminhos: [],
    licencas: [],
    texturas: [],
    fontes: { modelos: [], texturas: [], conjuntos: [] },
    ambiente: {},
    plano: { largura: 300, comprimento: 100, colisao: 'piso' },
    regioes: [
      regiao('vila', 'Vila', -150, -50, ['floresta'], ['casa']),
      regiao('floresta', 'Floresta', -50, 50, ['vila', 'caverna'], ['arvore']),
      regiao('caverna', 'Caverna', 50, 150, ['floresta'], ['pedra']),
    ],
  }
}

const PROGRAMA = `import cenario
from pyray import *
from _szraylib import _rt

# Ensaio da carga por regiões: a rota Vila, Floresta, Caverna, Floresta, Vila, dez vezes. Cada
# parada dura 3 s de cena (o descarte espera 2 s longe), contados pelo agora de cada quadro.
init_window(320, 240, 'Regioes')
camera = Camera3D(Vector3(0, 120, 160), Vector3(0, 0, 0), Vector3(0, 1, 0), 45, CAMERA_PERSPECTIVE)
lugar = cenario.carregar('regioes/cena.json')
entradas = {'Vila': 0, 'Floresta': 0, 'Caverna': 0}
agora = 0.0


def quadro():
    begin_drawing()
    clear_background(SKYBLUE)
    begin_mode_3d(camera)
    lugar.desenhar()
    end_mode_3d()
    end_drawing()


def parar(marca, volta):
    # Escreve o que contou e espera o N desenhando o mesmo estado: a prova lê ali os objetos de
    # GPU vivos do quadro.
    e = lugar.estado_das_regioes()
    print(marca, volta, 'entradas', entradas['Vila'], entradas['Floresta'], entradas['Caverna'],
          'carregadas', '+'.join(e['carregadas']), 'falhas', len(e['falhas']),
          'modelos', e['modelos'], 'texturas', _rt._texture_count, 'fim')
    while not is_key_pressed(KEY_N) and not window_should_close():
        quadro()


for volta in range(1, 11):
    for x in (-100, 0, 100, 0, -100):
        for _ in range(3):
            agora += 1.0
            lugar.atualizar(x, 0, agora=agora)
            for nome in entradas:
                if lugar.entrou_na_regiao(nome):
                    entradas[nome] += 1
            quadro()
        if x == 100:
            # Na Caverna, a Vila (não vizinha) já saiu: a carga e a liberação contam aqui também.
            parar('caverna', volta)
    parar('volta', volta)
lugar.descartar()
close_window()
`

export function raylibRegionsProject(name: string) {
  if (!isRaylibRegionsFixture(name)) throw new Error('Unknown Raylib regions fixture')
  const modelo = modeloComTextura()
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw new Error('fixture')
  project.id = name
  project.name = 'Três regiões'
  project.installedExtensions = [{ ...RAYLIB_3D_EXTENSION, installedAt: project.createdAt }]
  project.python.entrypoint = 'main.py'
  const base64 = Buffer.from(modelo).toString('base64')
  project.assets = ['vila', 'floresta', 'caverna'].map((nome) => ({
    id: `regioes-${nome}`,
    name: `regioes-${nome}`,
    kind: 'model3d' as const,
    source: 'upload' as const,
    proPath: `regioes/${nome}.glb`,
    originalFileName: `${nome}.glb`,
    dataUrl: `data:model/gltf-binary;base64,${base64}`,
  }))
  project.tree = pythonFilesToTree({
    'main.py': PROGRAMA,
    'regioes/cena.json': JSON.stringify(cenaCompilada(modelo)),
  })
  return project
}
