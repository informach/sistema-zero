import { expect, test } from 'bun:test'
import {
  AMOSTRAS_DA_PECA,
  type BaseDeTerreno,
  clonarCampo,
  codificarBuracosDaPeca,
  codificarPecaDeAlturas,
  codificarPecaDePintura,
  codificarRecursoDeBuracos,
  criarBuracos,
  criarPinturaDeChao,
  elevarTerreno,
  furarTerreno,
  lerRecursoDeTerreno,
  pintarChao,
} from '@sistemazero/molda-cenarios-core/v2'
import { type BufferGeometry, Group, type Mesh, Raycaster, Vector3 } from 'three'
import { TerrenoDoPalco } from '../src/Terreno'
import { MundoDoTeste } from '../src/teste/colisoes'

const a = 'a'.repeat(64),
  b = 'b'.repeat(64)
const base = (pecas: BaseDeTerreno['pecas']): BaseDeTerreno => ({
  tipo: 'terreno',
  origem: { x: -512, z: 256 },
  passo: 2,
  colunas: 128,
  linhas: 64,
  min: 0,
  max: 255,
  fundo: 0,
  pecas,
})
const peca = (ox: number) =>
  lerRecursoDeTerreno(
    codificarPecaDeAlturas(
      Float64Array.from(
        { length: AMOSTRAS_DA_PECA },
        (_, i) => (ox + (i % 65)) / 8 + Math.floor(i / 65) / 16,
      ),
      0,
      255,
    ),
  )
const raio = (x: number, z: number) => new Raycaster(new Vector3(x, 1000, z), new Vector3(0, -1, 0))
const copiarEstado = (terreno: TerrenoDoPalco) => ({
  campo: clonarCampo(terreno.estado.campo),
  pintura: { ...terreno.estado.pintura, pesos: terreno.estado.pintura.pesos.slice() },
  buracos: { ...terreno.estado.buracos, celulas: terreno.estado.buracos.celulas.slice() },
})

test('prévia muda só as peças atingidas, consulta a altura nova e cancela sem alterar os recursos', () => {
  const b = {
    ...base([]),
    colunas: 192,
    min: 0,
    max: 255,
    pecas: [0, 1, 2].map((coluna) => ({ coluna, linha: 0, digest: a })),
  }
  const recurso = lerRecursoDeTerreno(codificarPecaDeAlturas(new Float64Array(65 * 65), 0, 255))
  const terreno = new TerrenoDoPalco(b, new Map([[a, recurso]]))
  const original = terreno.estado,
    distante = terreno.fontesDoTeste()[2]!.geometria,
    estado = copiarEstado(terreno)
  const alturas = elevarTerreno(estado.campo, { x: -490, z: 278, raio: 8, forca: 1 }, 3)
  try {
    terreno.prever(estado, { alturas })
    expect(terreno.altura(-490, 278)).toBeCloseTo(3, 4)
    expect(terreno.pontoSobRaio(raio(-490, 278))?.y).toBeCloseTo(3, 4)
    expect(terreno.pontoParaEditar(raio(-490, 278), true)?.y).toBeCloseTo(0, 4)
    expect(terreno.pontoParaEditar(raio(-490, 278))?.y).toBeCloseTo(3, 4)
    expect(terreno.fontesDoTeste().some((f) => f.geometria === distante)).toBe(true)
    expect(original.campo.alturas.every((v) => v === 0)).toBe(true)
    terreno.cancelarPrevia()
    expect(terreno.estado).toBe(original)
    expect(terreno.altura(-490, 278)).toBe(0)
    expect(terreno.pontoSobRaio(raio(-490, 278))?.y).toBe(0)
    expect(terreno.fontesDoTeste().some((f) => f.geometria === distante)).toBe(true)
  } finally {
    terreno.descartar()
  }
})

test('consulta de edição encontra o campo sob uma abertura sem acrescentar piso físico', () => {
  const b = base([])
  b.buracos = [{ coluna: 0, linha: 0, digest: a }]
  const terreno = new TerrenoDoPalco(
    b,
    new Map([[a, lerRecursoDeTerreno(codificarRecursoDeBuracos(new Uint8Array(512).fill(255)))]]),
  )
  try {
    const antes = terreno.fontesDoTeste().map((f) => f.geometria)
    expect(terreno.pontoSobRaio(raio(-500, 268))).toBeNull()
    expect(terreno.pontoParaEditar(raio(-500, 268))?.y).toBe(0)
    expect(terreno.pontoSobRaio(raio(-500, 268))).toBeNull()
    expect(terreno.fontesDoTeste().map((f) => f.geometria)).toEqual(antes)
  } finally {
    terreno.descartar()
  }
})

test('a consulta de edição coincide com os triângulos vistos em raios oblíquos e nas divisas', () => {
  const terreno = new TerrenoDoPalco(
    base([
      { coluna: 0, linha: 0, digest: a },
      { coluna: 1, linha: 0, digest: b },
    ]),
    new Map([
      [a, peca(0)],
      [b, peca(64)],
    ]),
  )
  try {
    for (const [origem, destino] of [
      [new Vector3(-600, 60, 450), new Vector3(-400, terreno.altura(-400, 300), 300)],
      [new Vector3(-200, 60, 320), new Vector3(-350, terreno.altura(-350, 320), 320)],
      [new Vector3(-384, 100, 300), new Vector3(-384, 0, 300)],
      [new Vector3(-384, 60, 440), new Vector3(-384, terreno.altura(-384, 300), 300)],
    ]) {
      const r = new Raycaster(origem!, destino!.clone().sub(origem!).normalize()),
        visto = terreno.pontoSobRaio(r),
        editado = terreno.pontoParaEditar(r)
      expect(visto).not.toBeNull()
      expect(editado).not.toBeNull()
      expect(editado!.distanceTo(visto!)).toBeLessThan(0.0001)
      r.far = 0.001
      expect(terreno.pontoParaEditar(r)).toBeNull()
    }
  } finally {
    terreno.descartar()
  }
})

test('pintar uma peça de fundo não importa a altura da peça vizinha', () => {
  const b = base([{ coluna: 0, linha: 0, digest: a }])
  b.solo = { camadas: [{ id: 'a', nome: 'Grama', cor: '#ffffff' }], pecas: [] }
  const terreno = new TerrenoDoPalco(
    b,
    new Map([
      [a, lerRecursoDeTerreno(codificarPecaDeAlturas(new Float64Array(65 * 65).fill(5), 0, 255))],
    ]),
  )
  try {
    const estado = copiarEstado(terreno)
    const pintura = pintarChao(b, estado.pintura, { x: -382, z: 278, raio: 2, forca: 1 }, 0)
    terreno.prever(estado, { pintura })
    expect(terreno.altura(-382, 278)).toBe(0)
    expect(terreno.pontoSobRaio(raio(-382, 278))?.y).toBe(0)
    terreno.cancelarPrevia()
    expect(terreno.pontoSobRaio(raio(-382, 278))?.y).toBe(0)
  } finally {
    terreno.descartar()
  }
})

test('máscara e recorte retiram as mesmas faces da vista, seleção, cápsula e câmera', () => {
  const terrenoBase = base([])
  terrenoBase.recortes = [
    [
      { x: -484, z: 280 },
      { x: -476, z: 280 },
      { x: -476, z: 288 },
      { x: -484, z: 288 },
    ],
  ]
  const buracos = criarBuracos(terrenoBase)
  furarTerreno(terrenoBase, buracos, { x: -500, z: 268, raio: 3 })
  terrenoBase.buracos = [{ coluna: 0, linha: 0, digest: a }]
  const dados = lerRecursoDeTerreno(
    codificarRecursoDeBuracos(codificarBuracosDaPeca(buracos, 0, 0)),
  )
  const terreno = new TerrenoDoPalco(terrenoBase, new Map([[a, dados]]))
  const mundo = new MundoDoTeste(terreno.fontesDoTeste())
  try {
    expect(terreno.pontoSobRaio(raio(-500, 268))).toBeNull()
    expect(terreno.pontoSobRaio(raio(-480, 284))).toBeNull()
    expect(terreno.pontoSobRaio(raio(-510, 258))).not.toBeNull()
    expect(mundo.rastrear(new Vector3(-500, 2, 268), new Vector3(-500, -2, 268))).toBeNull()
    expect(mundo.resolver(new Vector3(-500, -0.1, 268), 1.16, 0.19).normais).toHaveLength(0)
  } finally {
    mundo.descartar()
    terreno.descartar()
  }
})

test('uma peça inteiramente aberta não cria malha vazia nem piso sob o buraco', () => {
  const terrenoBase = base([])
  terrenoBase.buracos = [{ coluna: 0, linha: 0, digest: a }]
  const recurso = lerRecursoDeTerreno(codificarRecursoDeBuracos(new Uint8Array(512).fill(255)))
  const terreno = new TerrenoDoPalco(terrenoBase, new Map([[a, recurso]]))
  try {
    expect(terreno.fontesDoTeste()).toHaveLength(1)
    expect(terreno.pontoSobRaio(raio(-500, 268))).toBeNull()
    expect(terreno.pontoSobRaio(raio(-300, 300))).not.toBeNull()
  } finally {
    terreno.descartar()
  }
})

test('pintura em área sem peça de altura cria superfície própria, sem plano duplicado', () => {
  const terrenoBase = base([])
  terrenoBase.solo = {
    camadas: [
      { id: 'a', nome: 'Verde', cor: '#00ff00' },
      { id: 'b', nome: 'Vermelho', cor: '#ff0000' },
    ],
    pecas: [{ coluna: 0, linha: 0, digest: a }],
  }
  const pintura = criarPinturaDeChao(terrenoBase, 2)
  pintarChao(terrenoBase, pintura, { x: -500, z: 268, raio: 6, forca: 1 }, 1)
  const recurso = lerRecursoDeTerreno(codificarPecaDePintura(pintura, 0, 0))
  const terreno = new TerrenoDoPalco(terrenoBase, new Map([[a, recurso]]))
  try {
    expect(terreno.grupo.children).toHaveLength(2)
    const malha = terreno.grupo.children[0] as Mesh<BufferGeometry>
    const cor = malha.geometry.getAttribute('color'),
      i = 6 * 65 + 6
    expect(cor.getX(i)).toBe(1)
    expect(cor.getY(i)).toBe(0)
    expect(terreno.pontoSobRaio(raio(-500, 268))?.y).toBe(0)
  } finally {
    terreno.descartar()
  }
})

test('recortes importados retiram a superfície da seleção, sem plano invisível por baixo', () => {
  const b = base([{ coluna: 0, linha: 0, digest: a }])
  b.recortes = [
    [
      { x: -502, z: 266 },
      { x: -494, z: 266 },
      { x: -494, z: 274 },
      { x: -502, z: 274 },
    ],
  ]
  const terreno = new TerrenoDoPalco(b, new Map([[a, peca(0)]]))
  try {
    expect(terreno.pontoSobRaio(raio(-498, 270))).toBeNull()
    expect(terreno.pontoSobRaio(raio(-506, 270))).not.toBeNull()
  } finally {
    terreno.descartar()
  }
})

test('seleção usa o relevo real, incluindo origem, interior e borda entre peças', () => {
  const terreno = new TerrenoDoPalco(
    base([
      { coluna: 0, linha: 0, digest: a },
      { coluna: 1, linha: 0, digest: b },
    ]),
    new Map([
      [a, peca(0)],
      [b, peca(64)],
    ]),
  )
  try {
    for (const [x, z] of [
      [-510.5, 257.5],
      [-384, 300],
      [-300, 350],
    ]) {
      const ponto = terreno.pontoSobRaio(raio(x!, z!))
      expect(ponto).not.toBeNull()
      expect(ponto!.y).toBeCloseTo(terreno.altura(x!, z!), 5)
    }
    expect(terreno.pontoSobRaio(raio(0, 0))).toBeNull()
    expect(terreno.grupo.children.length).toBe(2)
  } finally {
    terreno.descartar()
  }
})

test('normais de borda coincidem e o BVH não altera os buffers desenhados', () => {
  const terreno = new TerrenoDoPalco(
    base([
      { coluna: 0, linha: 0, digest: a },
      { coluna: 1, linha: 0, digest: b },
    ]),
    new Map([
      [a, peca(0)],
      [b, peca(64)],
    ]),
  )
  try {
    const [esquerda, direita] = terreno.grupo.children as Mesh<BufferGeometry>[]
    const normalA = esquerda!.geometry.getAttribute('normal')
    const normalB = direita!.geometry.getAttribute('normal')
    const indice = esquerda!.geometry.index!.array.slice()
    for (const linha of [1, 20, 63]) {
      const n = linha * 65
      expect(normalA.getX(n + 64)).toBe(normalB.getX(n))
      expect(normalA.getY(n + 64)).toBe(normalB.getY(n))
      expect(normalA.getZ(n + 64)).toBe(normalB.getZ(n))
    }
    terreno.pontoSobRaio(raio(-400, 300))
    expect(esquerda!.geometry.index!.array).toEqual(indice)
    expect('boundsTree' in esquerda!.geometry).toBe(false)
  } finally {
    terreno.descartar()
  }
})

test('área omitida recebe apenas o piso e o descarte é completo e idempotente', () => {
  const terreno = new TerrenoDoPalco(
    base([{ coluna: 0, linha: 0, digest: a }]),
    new Map([[a, peca(0)]]),
  )
  const pai = new Group()
  pai.add(terreno.grupo)
  const malhas = terreno.grupo.children as Mesh<BufferGeometry>[]
  let geometrias = 0,
    materiais = 0
  for (const m of malhas) m.geometry.addEventListener('dispose', () => geometrias++)
  const material = malhas[0]!.material
  if (!Array.isArray(material)) material.addEventListener('dispose', () => materiais++)
  expect(terreno.pontoSobRaio(raio(-300, 300))?.y).toBe(0)
  expect(malhas[1]!.geometry.index!.count).toBe(6)
  terreno.descartar()
  terreno.descartar()
  expect(geometrias).toBe(2)
  expect(materiais).toBe(1)
  expect(pai.children.length).toBe(0)
  expect(terreno.pontoSobRaio(raio(-400, 300))).toBeNull()
})
