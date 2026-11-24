import { expect, test } from 'bun:test'
import {
  type Box3,
  BoxGeometry,
  Matrix4,
  MeshStandardMaterial,
  Ray,
  Raycaster,
  Vector3,
} from 'three'
import { SuperficiesDosObjetos } from '../src/superficies'

test('consulta espacial de vinte mil instâncias visita só a região do raio e acompanha a prévia', () => {
  const geometria = new BoxGeometry(),
    material = new MeshStandardMaterial(),
    consulta = new SuperficiesDosObjetos()
  let visitas = 0
  class RaioContado extends Ray {
    override intersectsBox(caixa: Box3) {
      visitas++
      return super.intersectsBox(caixa)
    }
  }
  const raio = new Raycaster()
  raio.ray = new RaioContado(new Vector3(0, 20, 0), new Vector3(0, -1, 0))
  try {
    consulta.definir(
      Array.from({ length: 20_000 }, (_, i) => ({
        id: `p${i}`,
        geometria,
        material,
        matriz: new Matrix4().makeTranslation((i % 200) * 3, 0, Math.floor(i / 200) * 3),
      })),
    )
    expect(consulta.acertar(raio)?.id).toBe('p0')
    expect(visitas).toBeLessThan(100)
    consulta.atualizar('p0', new Matrix4().makeTranslation(-10, 0, 0))
    expect(consulta.acertar(raio)).toBeNull()
    raio.ray.origin.x = -10
    expect(consulta.acertar(raio)?.id).toBe('p0')
    expect('boundsTree' in geometria).toBe(false)
  } finally {
    consulta.descartar()
    geometria.dispose()
    material.dispose()
  }
})
test('escolher aceita referência pendente, encaixar exige geometria real e raízes mantêm a ordem', () => {
  const geometria = new BoxGeometry(),
    material = new MeshStandardMaterial(),
    consulta = new SuperficiesDosObjetos()
  const raio = new Raycaster(new Vector3(0, 10, 0), new Vector3(0, -1, 0))
  try {
    consulta.definir([
      {
        id: 'primeira',
        chave: 'filho-a',
        pendente: true,
        geometria,
        material,
        matriz: new Matrix4(),
      },
    ])
    expect(consulta.acertar(raio)).toBeNull()
    expect(consulta.escolher(raio)?.id).toBe('primeira')
    consulta.definir(
      ['primeira', 'segunda'].map((id) => ({ id, geometria, material, matriz: new Matrix4() })),
    )
    expect(consulta.escolher(raio)?.id).toBe('primeira')
    expect(consulta.acertar(raio, new Set(['primeira']))?.id).toBe('segunda')
  } finally {
    consulta.descartar()
    geometria.dispose()
    material.dispose()
  }
})
