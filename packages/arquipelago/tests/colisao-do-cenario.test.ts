import { expect, test } from 'bun:test'
import { Matrix4, PlaneGeometry } from 'three'
import { MundoDoTeste } from '../../molda-cenarios-motor/src/teste/colisoes'
import { entidadesSoDoCorpo, prepararColisaoDoCenario } from '../src/sistemas/colisao-do-cenario'
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

test('folhagem e peças finas só seguram o corpo; chão, caminho e peças grandes tapam a câmera', () => {
  const caixa = (min: [number, number, number], max: [number, number, number]) => ({
    min: { x: min[0], y: min[1], z: min[2] },
    max: { x: max[0], y: max[1], z: max[2] },
  })
  const so = entidadesSoDoCorpo([
    // O relevo e os caminhos (pontes, escadas) são o chão: a câmera nunca passa por baixo.
    { entidade: 'terreno', tipo: 'terreno', volume: caixa([-300, -5, -300], [300, 20, 300]) },
    { entidade: 'ponte', tipo: 'caminho', volume: caixa([0, 2, 0], [12, 3, 2]) },
    // Paredes, casas, torre e rochas grandes tapam a câmera.
    { entidade: 'casa', tipo: 'malha', volume: caixa([0, 0, 0], [6, 5, 5]) },
    { entidade: 'muro', tipo: 'caixa', volume: caixa([0, 0, 0], [4, 3, 0.25]) },
    { entidade: 'rochedo', tipo: 'malha', volume: caixa([0, 0, 0], [3, 2.2, 2.5]) },
    // Piso de peças (a praça de lajes) é chão, mesmo baixo: a câmera não passa por baixo dele.
    { entidade: 'laje', tipo: 'malha', volume: caixa([0, 0, 0], [2, 0.12, 2]) },
    // Moita, cerca e corrimão são baixos; poste, placa e viga são finos.
    { entidade: 'moita', tipo: 'caixa', volume: caixa([0, 0, 0], [1.2, 1.1, 1.2]) },
    { entidade: 'viga', tipo: 'caixa', volume: caixa([0, 6, 0], [5, 6.2, 0.2]) },
    { entidade: 'cerca', tipo: 'caixa', volume: caixa([0, 0, 0], [3.5, 1, 0.12]) },
    { entidade: 'poste', tipo: 'caixa', volume: caixa([0, 0, 0], [0.22, 2.4, 0.22]) },
    { entidade: 'placa', tipo: 'malha', volume: caixa([0, 0, 0], [0.7, 1.8, 0.2]) },
    // A cápsula genérica envolve o volume inteiro do modelo, copa inclusa.
    { entidade: 'arvore', tipo: 'capsula', volume: caixa([0, 0, 0], [4, 7, 4]) },
    // Uma entidade com uma parte que é chão continua tapando a câmera inteira.
    { entidade: 'deque', tipo: 'caminho', volume: caixa([0, 0, 0], [5, 0.3, 5]) },
    { entidade: 'deque', tipo: 'caixa', volume: caixa([0, 0, 0], [0.2, 1, 0.2]) },
    { entidade: null, tipo: 'malha', volume: caixa([0, 0, 0], [1, 1, 1]) },
  ])
  expect([...so].sort()).toEqual(['arvore', 'cerca', 'moita', 'placa', 'poste', 'viga'])
})

test('a mesma passada separa o chão da câmera e o que só segura o corpo, sem repetir', () => {
  const g = new PlaneGeometry(10, 10),
    mundo = new MundoDoTeste([
      { objeto: 'chao', geometria: g, matriz: new Matrix4().makeRotationX(-Math.PI / 2) },
      {
        objeto: 'moita',
        geometria: g,
        matriz: new Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, 1, 0),
      },
    ])
  try {
    const r = prepararColisaoDoCenario(
      mundo,
      { x: 0, z: 0 },
      undefined,
      (t) => t.objeto === 'moita',
    )
    expect(r.triangulos).toBe(2)
    for (let i = 1; i < r.vertices.length; i += 3) expect(r.vertices[i]).toBeCloseTo(0, 4)
    expect(r.soDoCorpo.triangulos).toBe(2)
    expect([...r.soDoCorpo.indices]).toEqual([0, 1, 2, 3, 4, 5])
    for (let i = 1; i < r.soDoCorpo.vertices.length; i += 3)
      expect(r.soDoCorpo.vertices[i]).toBeCloseTo(1, 4)
  } finally {
    mundo.descartar()
    g.dispose()
  }
})
