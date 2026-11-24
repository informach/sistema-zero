import { expect, test } from 'bun:test'
import { criarDocumentoVazio } from '@sistemazero/molda-cenarios-core/v2'
import {
  Box3,
  BoxGeometry,
  DataTexture,
  Group,
  type InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import type { ModeloCarregado } from '../src/modelos'
import { PreviaDeObjetos } from '../src/PreviaDeObjetos'

test('prévia usa contato e proporção reais, compartilha conteúdo e descarta somente seus recursos', () => {
  const geometria = new BoxGeometry(1, 1, 1)
  geometria.translate(0, 0.5, 0)
  const textura = new DataTexture(new Uint8Array(16).fill(255), 2, 2)
  const material = new MeshStandardMaterial({ color: '#aabbcc', map: textura })
  const original = {
    material: material.toJSON(),
    position: Array.from(geometria.getAttribute('position').array),
  }
  let originaisDescartados = 0
  for (const recurso of [geometria, material, textura])
    recurso.addEventListener('dispose', () => originaisDescartados++)
  const modelo: ModeloCarregado = {
    partes: [{ geometria, material, matriz: new Matrix4() }],
    caixa: new Box3(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 1, 0.5)),
    triangulos: 12,
    raiz: new Group(),
    descartar() {
      throw new Error('Conteúdo de origem não pertence à prévia')
    },
  }
  const doc = criarDocumentoVazio('d', 'Prévia')
  doc.formas = [
    { id: 'caixa', nome: 'Caixa', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 },
  ]
  doc.texturas = [{ id: 't', biblioteca: 'b', textura: 't', digest: 'a'.repeat(64) }]
  const previa = new PreviaDeObjetos()
  const objeto = {
    id: 'p',
    nome: 'Caixa',
    grupo: null,
    modelo: 'caixa',
    bloqueado: false,
    oculto: false,
    colisao: 'caixa' as const,
    apoio: {
      tipo: 'terreno' as const,
      deslocamento: 0,
      inclinar: false,
      referencia: 'volume' as const,
    },
    transformacao: {
      posicao: { x: 3, y: 999, z: 2 },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 2, y: 3, z: 0.5 },
    },
    aparencia: { cor: '#ffccaa', textura: { id: 't', repeticaoMetros: 2 } },
    espelho: { x: true, y: false, z: false },
  }
  let materiaisDaPreviaDescartados = 0
  for (let ciclo = 0; ciclo < 3; ciclo++) {
    previa.desenhar(
      doc,
      [objeto],
      undefined,
      () => modelo,
      () => textura,
    )
    const mesh = previa.grupo.children.find(
      (o) => (o as InstancedMesh).count === 1,
    ) as InstancedMesh
    expect(mesh).toBeDefined()
    expect(mesh.castShadow).toBe(false)
    const matriz = new Matrix4()
    mesh.getMatrixAt(0, matriz)
    mesh.geometry.computeBoundingBox()
    const caixa = mesh.geometry.boundingBox!.clone().applyMatrix4(matriz)
    expect(caixa.min.y).toBeCloseTo(0, 8)
    expect(caixa.max.y).toBeCloseTo(3, 8)
    expect(caixa.max.x - caixa.min.x).toBeCloseTo(2, 8)
    expect(caixa.max.z - caixa.min.z).toBeCloseTo(0.5, 8)
    const m = mesh.material as MeshStandardMaterial
    expect(m).not.toBe(material)
    expect(m.opacity).toBe(0.55)
    m.addEventListener('dispose', () => materiaisDaPreviaDescartados++)
    previa.esvaziar()
    expect(mesh.count).toBe(0)
    previa.limpar()
    expect(previa.grupo.children).toHaveLength(0)
    expect(originaisDescartados).toBe(0)
  }
  previa.descartar()
  previa.descartar()
  expect(materiaisDaPreviaDescartados).toBe(3)
  expect(material.toJSON()).toEqual(original.material)
  expect(Array.from(geometria.getAttribute('position').array)).toEqual(original.position)
  expect(originaisDescartados).toBe(0)
  geometria.dispose()
  material.dispose()
  textura.dispose()
})
