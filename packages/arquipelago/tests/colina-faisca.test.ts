import { expect, test } from 'bun:test'
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from 'three'
import { RECORTE_DA_COLINA } from '../src/sistemas/colina-da-faisca'
import { ilhaDoArquipelago } from '../src/sistemas/geografia-do-arquipelago'
import { pontoNoContorno } from '../src/sistemas/lago-da-faisca'
import { alturaNaMalhaDoSetor, malhaDoSetor } from '../src/sistemas/setores-do-arquipelago'

test('o setor abre passagem às escadas sem deixar terreno atravessando os degraus', () => {
  const malha = malhaDoSetor(ilhaDoArquipelago('sua-ilha'), -1, 1),
    r = RECORTE_DA_COLINA.retangulo
  let margem = 0
  for (let i = 0; i < malha.indices.length; i += 3) {
    const ids = [0, 1, 2].map((j) => malha.indices[i + j]! * 3),
      x = ids.reduce((s, k) => s + malha.vertices[k]!, 0) / 3,
      z = ids.reduce((s, k) => s + malha.vertices[k + 2]!, 0) / 3
    expect(pontoNoContorno(RECORTE_DA_COLINA.furo, x, z)).toBe(false)
    if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) margem++
  }
  expect(margem).toBeGreaterThan(8)
})

test('o apoio dos passeios consulta os mesmos triângulos físicos na chegada das escadas', () => {
  const ilha = ilhaDoArquipelago('sua-ilha'),
    m = malhaDoSetor(ilha, -1, 1),
    geo = new BufferGeometry()
      .setAttribute('position', new BufferAttribute(m.vertices, 3))
      .setIndex(new BufferAttribute(m.indices, 1)),
    mat = new MeshBasicMaterial({ side: DoubleSide }),
    mesh = new Mesh(geo, mat),
    ray = new Raycaster()
  mesh.updateMatrixWorld(true)
  for (const z of [118.1, 118.3, 118.8, 119.2]) {
    ray.set(new Vector3(-3, 20, z), new Vector3(0, -1, 0))
    const hit = ray.intersectObject(mesh)[0]
    expect(hit).toBeDefined()
    expect(alturaNaMalhaDoSetor(ilha, -3, z)).toBeCloseTo(hit!.point.y, 5)
  }
  geo.dispose()
  mat.dispose()
})
