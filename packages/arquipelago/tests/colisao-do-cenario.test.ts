import { expect, test } from 'bun:test'
import { Matrix4, PlaneGeometry } from 'three'
import { MundoDoTeste } from '../../molda-cenarios-motor/src/teste/colisoes'
import { prepararColisaoDoCenario } from '../src/sistemas/colisao-do-cenario'
import { regiaoDoCenario } from '../src/sistemas/regiao-do-cenario'

test('malha Rapier próxima conserva escala e altura sem repetir triângulos entre setores', () => {
  const g = new PlaneGeometry(160, 160),
    mundo = new MundoDoTeste([
      { geometria: g, matriz: new Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, 4, 0) },
    ])
  try {
    const r = prepararColisaoDoCenario(mundo, { x: 0, z: 0 })
    expect(r.triangulos).toBe(2)
    expect(r.vertices.length).toBe(18)
    expect([...r.indices]).toEqual([0, 1, 2, 3, 4, 5])
    for (let i = 1; i < r.vertices.length; i += 3) expect(r.vertices[i]).toBeCloseTo(4, 4)
  } finally {
    mundo.descartar()
    g.dispose()
  }
})
test('janela próxima troca de setores e espaço sem geometria não ganha piso artificial', () => {
  const g = new PlaneGeometry(10, 10),
    mundo = new MundoDoTeste([
      { geometria: g, matriz: new Matrix4().makeRotationX(-Math.PI / 2) },
      { geometria: g, matriz: new Matrix4().makeRotationX(-Math.PI / 2).setPosition(800, 8, 0) },
    ])
  try {
    const a = prepararColisaoDoCenario(mundo, { x: 0, z: 0 })
    const vazio = prepararColisaoDoCenario(mundo, { x: 400, z: 0 })
    const b = prepararColisaoDoCenario(mundo, { x: 800, z: 0 })
    expect(a.triangulos).toBe(2)
    expect(vazio.triangulos).toBe(0)
    expect(vazio.vertices.length).toBe(0)
    expect(b.triangulos).toBe(2)
    expect(b.celula.x).toBe(10)
    expect(() => prepararColisaoDoCenario(mundo, { x: NaN, z: 0 })).toThrow(/foco/)
    expect(() => prepararColisaoDoCenario(mundo, { x: Infinity, z: 0 })).toThrow(/foco/)
  } finally {
    mundo.descartar()
    g.dispose()
  }
})

test('consulta usa triângulos globais para separar territórios presentes no mesmo pacote', () => {
  const g = new PlaneGeometry(10, 10),
    mundo = new MundoDoTeste([
      {
        objeto: 'faisca',
        geometria: g,
        matriz: new Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, 4, -320),
      },
      {
        objeto: 'bosque',
        geometria: g,
        matriz: new Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, 8, -380),
      },
    ])
  const regiao = regiaoDoCenario('sua-ilha')
  try {
    const r = prepararColisaoDoCenario(mundo, { x: 0, z: -350 }, (t) =>
      regiao.contem((t.a.x + t.b.x + t.c.x) / 3, (t.a.z + t.b.z + t.c.z) / 3),
    )
    expect(r.triangulos).toBe(2)
    for (let i = 1; i < r.vertices.length; i += 3) expect(r.vertices[i]).toBeCloseTo(4, 4)
  } finally {
    mundo.descartar()
    g.dispose()
  }
})
