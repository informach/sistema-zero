import { expect, test } from 'bun:test'
import { AguaSchema, criarDocumentoVazio } from '@sistemazero/molda-cenarios-core/v2'
import {
  Box3,
  BoxGeometry,
  Group,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Raycaster,
  Vector3,
} from 'three'
import { AguasDoPalco } from '../src/agua/aguas'
import { MundoDoTeste } from '../src/teste/colisoes'

const comum = { id: 'a', nome: 'Lago', grupo: null, oculto: false, bloqueado: false },
  contorno = [
    { x: -4, z: -3 },
    { x: 4, z: -3 },
    { x: 4, z: 3 },
    { x: -4, z: 3 },
  ]
const lago = () =>
  AguaSchema.parse({
    ...comum,
    tipo: 'lago',
    modelo: null,
    centro: { x: 0, z: 0 },
    giro: 0,
    escala: 1,
    nivel: 1,
    profundidade: 2,
    contorno,
    recorte: contorno,
  })

test('água nativa não adiciona piso; configuração estável conserva recursos e ocultar libera sua malha', () => {
  const d = criarDocumentoVazio('c', 'Água'),
    a = new AguasDoPalco(2048)
  d.aguas = [lago()]
  try {
    expect(a.definir(d, null, () => null, new Set())).toEqual({ carregando: 0, falhas: [] })
    const raiz = a.grupo.children[0]!,
      malha = raiz.children[0]
    a.definir(d, null, () => null, new Set())
    expect(a.grupo.children[0]!.children[0]).toBe(malha)
    a.definir(
      { ...d, aguas: [{ ...d.aguas[0]!, nome: 'Lago renomeado', nado: false }] },
      null,
      () => null,
      new Set(),
    )
    expect(a.grupo.children[0]!.children[0]).toBe(malha)
    expect(a.fontesDoTeste()).toEqual([])
    const raio = new Raycaster(new Vector3(0, 10, 0), new Vector3(0, -1, 0))
    expect(a.pontoSobRaio(raio)?.id).toBe('a')
    expect(a.pontoSobRaio(raio)?.ponto.y).toBe(1)
    const mundo = new MundoDoTeste(a.fontesDoTeste())
    expect(mundo.rastrear(new Vector3(0, 5, 0), new Vector3(0, -5, 0))).toBeNull()
    mundo.descartar()
    a.definir(d, null, () => null, new Set(['a']))
    expect(a.grupo.children).toHaveLength(0)
    expect(a.pontoSobRaio(raio)).toBeNull()
  } finally {
    a.descartar()
  }
})

test('lago de modelo usa nível e papéis explícitos; só margens colidem e o cache conserva seus arquivos', () => {
  const d = criarDocumentoVazio('c', 'Água'),
    a = new AguasDoPalco(2048),
    aguaGeo = new PlaneGeometry(8, 6).rotateX(-Math.PI / 2).translate(0, 1.4, 0),
    terraGeo = new BoxGeometry(10, 0.3, 8).translate(0, 0.15, 0),
    aguaMat = new MeshStandardMaterial(),
    terraMat = new MeshStandardMaterial(),
    modelo = {
      partes: [
        { geometria: aguaGeo, material: aguaMat, matriz: new Matrix4() },
        { geometria: terraGeo, material: terraMat, matriz: new Matrix4() },
      ],
      caixa: new Box3(new Vector3(-5, 0, -4), new Vector3(5, 1.4, 4)),
      triangulos: 14,
      raiz: new Group(),
      descartar() {
        throw Error('O cache é o dono deste modelo')
      },
    }
  aguaMat.name = 'superficie'
  terraMat.name = 'margem'
  let descartados = 0
  for (const g of [aguaGeo, terraGeo]) g.addEventListener('dispose', () => descartados++)
  d.modelos = [{ id: 'm', modelo: 'm', biblioteca: 'b', digest: 'a'.repeat(64) }]
  const entrada = lago()
  if (entrada.tipo !== 'lago') throw Error('Lago esperado')
  d.aguas = [
    {
      ...entrada,
      modelo: 'm',
      profundidade: 5,
      centro: { x: 10, z: 20 },
      giro: 0.3,
      escala: 2,
      encaixeModelo: {
        nivelLocal: 1.4,
        materiaisDaAgua: ['superficie'],
        materiaisSolidos: ['margem'],
      },
    },
  ]
  try {
    expect(a.definir(d, null, () => modelo, new Set()).falhas).toEqual([])
    const raiz = a.grupo.children[0]!
    expect(raiz.position.y).toBeCloseTo(-1.8)
    const fontes = a.fontesDoTeste()
    expect(fontes).toHaveLength(1)
    expect(fontes[0]!.geometria).toBe(terraGeo)
    expect(
      a
        .consultasDoTeste()
        .get('a')!
        .em(10, 20, () => 100)?.profundidade,
    ).toBeCloseTo(2.2, 6)
    const mundo = new MundoDoTeste(fontes),
      piso = mundo.rastrear(new Vector3(10, 5, 20), new Vector3(10, -5, 20))
    expect(piso?.ponto.y).toBeCloseTo(-1.2, 6)
    mundo.descartar()
    a.esquecerModelo(modelo)
    expect(a.grupo.children).toHaveLength(0)
    expect(descartados).toBe(0)
    const atual = d.aguas[0]!
    if (atual.tipo !== 'lago') throw new Error('Lago esperado')
    d.aguas = [
      {
        ...atual,
        encaixeModelo: { nivelLocal: 1.4, materiaisDaAgua: ['inexistente'], materiaisSolidos: [] },
      },
    ]
    expect(a.definir(d, null, () => modelo, new Set()).falhas).toHaveLength(1)
    expect(a.grupo.children).toHaveLength(0)
  } finally {
    a.descartar()
    aguaGeo.dispose()
    terraGeo.dispose()
    aguaMat.dispose()
    terraMat.dispose()
  }
})
