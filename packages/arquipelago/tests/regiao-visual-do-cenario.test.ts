import { expect, test } from 'bun:test'
import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Scene,
  Vector3,
} from 'three'
import { MaterialDaAgua } from '../../molda-cenarios-motor/src/agua/material'
import { restringirCenarioARegiao } from '../src/mundo/regiao-do-cenario'
import { regiaoDoCenario } from '../src/sistemas/regiao-do-cenario'

function preparar(material = new MeshStandardMaterial()) {
  const cena = new Scene(),
    raiz = new Group(),
    geometria = new BoxGeometry()
  cena.add(raiz)
  const nos = [
    { id: 'vila', volume: { min: { x: -10, y: 0, z: 100 }, max: { x: 10, y: 10, z: 120 } } },
    { id: 'bosque', volume: { min: { x: -10, y: 0, z: -710 }, max: { x: 10, y: 10, z: -690 } } },
    { id: 'borda', volume: { min: { x: -10, y: -8, z: -360 }, max: { x: 10, y: 0, z: -340 } } },
  ]
  for (const n of nos) {
    const grupo = new Group()
    grupo.name = n.id
    grupo.add(new Mesh(geometria, material))
    raiz.add(grupo)
  }
  return { cena, raiz, nos, material, geometria }
}
test('região conserva a vila, oculta o outro território e só recorta materiais da fronteira', () => {
  const v = preparar(),
    b = v.raiz.children[2]!.children[0] as Mesh
  const indice = [...v.geometria.index!.array]
  const aplicar = restringirCenarioARegiao(v, regiaoDoCenario('sua-ilha'))
  try {
    expect(v.raiz.children[0]!.visible).toBe(true)
    expect(v.raiz.children[1]!.visible).toBe(false)
    expect((v.raiz.children[0]!.children[0] as Mesh).material).toBe(v.material)
    expect(b.material).not.toBe(v.material)
    expect((b.material as MeshStandardMaterial).clippingPlanes).toHaveLength(6)
    expect(v.material.clippingPlanes).toBeNull()
    expect([...v.geometria.index!.array]).toEqual(indice)
    aplicar.atualizar(new Box3(new Vector3(-30, -10, 90), new Vector3(30, 40, 140)))
    expect(v.raiz.children[0]!.visible).toBe(true)
    expect(v.raiz.children[2]!.visible).toBe(false)
  } finally {
    aplicar.descartar()
    v.material.dispose()
    v.geometria.dispose()
  }
  expect(b.material).toBe(v.material)
  expect(v.raiz.children.every((o) => o.visible)).toBe(true)
})
test('água conserva hooks autorais e luzes externas não vazam para outra ilha', () => {
  const agua = new MaterialDaAgua(undefined, { fundo: null, plano: 0, profundidade: 2 }),
    v = preparar(agua.material),
    luz = new PointLight()
  luz.position.set(0, 5, -700)
  v.cena.add(luz)
  const hook = v.material.onBeforeCompile,
    chave = v.material.customProgramCacheKey
  const aplicar = restringirCenarioARegiao(v, regiaoDoCenario('sua-ilha'))
  try {
    const m = (v.raiz.children[2]!.children[0] as Mesh).material as MeshStandardMaterial
    expect(m.onBeforeCompile).toBe(hook)
    expect(m.customProgramCacheKey).toBe(chave)
    expect(luz.visible).toBe(false)
    let descartes = 0
    m.addEventListener('dispose', () => {
      descartes++
    })
    aplicar.descartar()
    aplicar.descartar()
    expect(descartes).toBe(1)
    expect(luz.visible).toBe(true)
  } finally {
    aplicar.descartar()
    agua.descartar()
    v.geometria.dispose()
    luz.dispose()
  }
})

test('janela de detalhe recorta exatamente a borda e muda sem recriar materiais', () => {
  const v = preparar(),
    janela = new Box3(new Vector3(-30, -20, 90), new Vector3(30, 40, 140))
  const aplicar = restringirCenarioARegiao(
    { ...v, nos: v.nos.map((n) => ({ ...n, arquivo: `terreno/${n.id}.glb` })) },
    regiaoDoCenario('sua-ilha'),
    janela,
    new Set(v.nos.map((n) => `terreno/${n.id}.glb`)),
  )
  const m = (v.raiz.children[0]!.children[0] as Mesh).material as MeshStandardMaterial
  try {
    expect(m).not.toBe(v.material)
    expect(m.clippingPlanes).toHaveLength(10)
    expect(
      m.clippingPlanes!.slice(-4).every((p) => p.distanceToPoint(new Vector3(0, 0, 100)) >= 0),
    ).toBe(true)
    expect(
      m.clippingPlanes!.slice(-4).some((p) => p.distanceToPoint(new Vector3(0, 0, 200)) < 0),
    ).toBe(true)
    expect(v.raiz.children[2]!.visible).toBe(false)
    aplicar.atualizar(new Box3(new Vector3(-30, -20, -370), new Vector3(30, 40, -330)))
    expect((v.raiz.children[0]!.children[0] as Mesh).material).toBe(m)
    expect(v.raiz.children[0]!.visible).toBe(false)
    expect(v.raiz.children[2]!.visible).toBe(true)
    expect(() => aplicar.atualizar(new Box3())).toThrow(/janela/)
  } finally {
    aplicar.descartar()
    v.material.dispose()
    v.geometria.dispose()
  }
})

test('a janela de detalhe não corta objetos: só terreno, água e caminho', () => {
  const v = preparar(),
    janela = new Box3(new Vector3(-30, -20, 90), new Vector3(30, 40, 140))
  const aplicar = restringirCenarioARegiao(
    { ...v, nos: v.nos.map((n) => ({ ...n, arquivo: `modelos/${n.id}.glb` })) },
    regiaoDoCenario('sua-ilha'),
    janela,
    new Set(['terreno/relevo.glb']),
  )
  try {
    // A vila está inteira dentro da ilha e é um objeto: fica com o material de sempre.
    expect((v.raiz.children[0]!.children[0] as Mesh).material).toBe(v.material)
    expect(v.raiz.children[0]!.visible).toBe(true)
  } finally {
    aplicar.descartar()
    v.material.dispose()
    v.geometria.dispose()
  }
})
