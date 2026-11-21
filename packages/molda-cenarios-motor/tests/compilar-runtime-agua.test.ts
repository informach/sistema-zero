import { expect, test } from 'bun:test'
import { lerCenaCompilada } from '@sistemazero/molda-cenarios-core/compilar'
import { AguaSchema } from '@sistemazero/molda-cenarios-core/v2'
import {
  BoxGeometry,
  BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three'
import { AguaDaCenaCompilada } from '../src/compilar/runtime-agua'

function dados() {
  return {
    cena: lerCenaCompilada({
      formato: 'molda-cena-compilada',
      versao: 1,
      nome: 'Água',
      unidade: 'metro',
      eixoVertical: 'y',
      fonte: { cenario: 'c', revisao: 1, digest: 'a'.repeat(64) },
      arquivos: [],
      entidades: [{ id: 'l', nome: 'Lago', tipo: 'agua', grupo: null }],
      nos: [],
      colisoes: [],
      caminhos: [],
      marcadores: [],
      texturas: [],
      fontes: {
        modelos: [{ id: 'm', biblioteca: 'b', modelo: 'm', digest: 'b'.repeat(64) }],
        texturas: [],
        conjuntos: [],
      },
      licencas: [{ id: 'b', nome: 'Acervo', licenca: 'propria' }],
      ambiente: { hora: 12 },
      aguas: [
        AguaSchema.parse({
          id: 'l',
          nome: 'Lago',
          grupo: null,
          oculto: false,
          bloqueado: false,
          tipo: 'lago',
          modelo: 'm',
          centro: { x: 10, z: 10 },
          nivel: 2,
          escala: 1,
          giro: 0,
          profundidade: 4,
          contorno: [
            { x: -2, z: -2 },
            { x: 2, z: -2 },
            { x: 2, z: 2 },
            { x: -2, z: 2 },
          ],
          recorte: [
            { x: -2, z: -2 },
            { x: 2, z: -2 },
            { x: 2, z: 2 },
            { x: -2, z: 2 },
          ],
          encaixeModelo: { nivelLocal: 2, materiaisDaAgua: ['agua'], materiaisSolidos: ['margem'] },
        }),
      ],
    }),
  }
}

test('nado de catálogo usa só o fundo do próprio lago; UV/profundidade são restaurados sem alterar a fonte', () => {
  const dadosDoLago = dados(),
    banco = new BoxGeometry(4, 0.2, 4),
    g = new PlaneGeometry(2, 2),
    material = new MeshStandardMaterial(),
    raiz = new Group(),
    malha = new Mesh(g, material),
    fonteUv = new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2),
    fundo = new BufferAttribute(new Float32Array([2, 2, 2, 2]), 1)
  g.setAttribute('_mcnaguauv', fonteUv)
  g.setAttribute('_mcnprofundidademodelo', fundo)
  raiz.add(malha)
  const agua = new AguaDaCenaCompilada(
    dadosDoLago,
    new Map([['l', [{ geometria: banco, matriz: new Matrix4().makeTranslation(10, 0.9, 10) }]]]),
    () => 100,
    1024,
  )
  let descartouFonte = 0
  g.addEventListener('dispose', () => descartouFonte++)
  material.addEventListener('dispose', () => descartouFonte++)
  try {
    expect(agua.consulta.nivel(10, 10)!.nivel).toBe(2)
    expect(agua.consulta.nivel(10, 10)!.profundidade).toBeCloseTo(1, 7)
    expect(agua.consulta.nivel(20, 20)).toBeNull()
    agua.aplicar(raiz, 'l')
    expect(malha.geometry).not.toBe(g)
    expect(Array.from(malha.geometry.getAttribute('uv').array)).toEqual(Array.from(fonteUv.array))
    expect(malha.geometry.getAttribute('mcnProfundidadeModelo').count).toBe(4)
    expect(malha.material).not.toBe(material)
    expect(g.hasAttribute('mcnProfundidadeModelo')).toBe(false)
    expect(malha.material.depthWrite).toBe(false)
    agua.atualizar(1)
    agua.descartar()
    agua.descartar()
    expect(descartouFonte).toBe(0)
  } finally {
    agua.descartar()
    g.dispose()
    material.dispose()
    banco.dispose()
  }
})

test('água estática conserva a física e o material portátil; fundo ausente usa profundidade declarada', () => {
  const agua = new AguaDaCenaCompilada(dados(), new Map(), undefined, 1024, false)
  try {
    expect(agua.consulta.nivel(10, 10)).toEqual({ nivel: 2, profundidade: 4 })
  } finally {
    agua.descartar()
  }
})

test('hospedeiro com oceano compartilhado mantém lagos compilados sem importar outro mar', () => {
  const d = dados()
  d.cena.aguas.push(
    AguaSchema.parse({
      id: 'mar',
      nome: 'Mar',
      grupo: null,
      bloqueado: false,
      oculto: false,
      tipo: 'mar',
      nivel: 6,
    }),
  )
  const completo = new AguaDaCenaCompilada(d, new Map(), undefined, 1024, false),
    local = new AguaDaCenaCompilada(d, new Map(), undefined, 1024, false, true)
  try {
    expect(completo.consulta.nivel(100, 100)?.nivel).toBe(6)
    expect(local.consulta.nivel(100, 100)).toBeNull()
    expect(local.consulta.nivel(10, 10)?.nivel).toBe(2)
  } finally {
    completo.descartar()
    local.descartar()
  }
})
