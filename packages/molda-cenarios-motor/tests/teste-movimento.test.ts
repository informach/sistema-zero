import { expect, test } from 'bun:test'
import { BoxGeometry, Matrix4, PlaneGeometry, Vector3 } from 'three'
import { MundoDoTeste } from '../src/teste/colisoes'
import { MovimentoDoTeste } from '../src/teste/movimento'

const piso = () => ({
  geometria: new PlaneGeometry(40, 40),
  matriz: new Matrix4().makeRotationX(-Math.PI / 2),
})
const parado = { x: 0, z: 0, vertical: 0, correr: false, saltar: false }
const andar = { ...parado, x: 1 }
test('quadros lentos preservam o tempo ativo e a distância do passo fixo', () => {
  const chao = piso(),
    mundo = new MundoDoTeste([chao])
  const resultados = [1 / 120, 0.2].map((delta) => {
    const movimento = new MovimentoDoTeste(mundo, new Vector3(0, 0.001, 0), 1.16)
    movimento.percurso.iniciar(movimento.posicao)
    for (let i = 0; i < Math.round(2 / delta); i++) movimento.avancar(delta, andar)
    return { posicao: movimento.posicao.clone(), medida: movimento.percurso.ler() }
  })
  expect(resultados[1]!.posicao.x).toBeCloseTo(resultados[0]!.posicao.x, 5)
  expect(resultados[1]!.medida.segundos).toBeCloseTo(2, 5)
  expect(resultados[1]!.medida.caminhada).toBeCloseTo(resultados[0]!.medida.caminhada, 5)
  mundo.descartar()
  chao.geometria.dispose()
})
function executar(m: MovimentoDoTeste, entrada: typeof andar, segundos: number) {
  for (let i = 0; i < Math.round(segundos * 120); i++) m.avancar(1 / 120, entrada)
}

test('correnteza move só quem nada, permite controle contrário e respeita a parede física', () => {
  const fundo = {
      geometria: new PlaneGeometry(40, 40),
      matriz: new Matrix4()
        .makeTranslation(0, -4, 0)
        .multiply(new Matrix4().makeRotationX(-Math.PI / 2)),
    },
    mundo = new MundoDoTeste([fundo]),
    fonte = () => ({ nivel: 0, profundidade: 4, correnteza: { x: 1, z: 0 } }),
    m = new MovimentoDoTeste(mundo, new Vector3(0, -0.75, 0), 1.16, fonte)
  executar(m, parado, 2)
  expect(m.nadando).toBe(true)
  expect(m.posicao.x).toBeGreaterThan(1.8)
  const antes = m.posicao.x
  executar(m, { ...parado, x: -1, correr: true }, 2)
  expect(m.posicao.x).toBeLessThan(antes - 1)
  mundo.descartar()
  fundo.geometria.dispose()
  const chao = piso(),
    parede = {
      geometria: new BoxGeometry(0.02, 6, 8),
      matriz: new Matrix4().makeTranslation(2, -1, 0),
    },
    comParede = new MundoDoTeste([parede]),
    n = new MovimentoDoTeste(comParede, new Vector3(0, -0.75, 0), 1.16, fonte),
    raso = new MundoDoTeste([chao]),
    r = new MovimentoDoTeste(raso, new Vector3(0, 0.001, 0), 1.16, () => ({
      nivel: 0.2,
      profundidade: 0.2,
      correnteza: { x: 5, z: 0 },
    }))
  executar(n, parado, 4)
  expect(n.posicao.x).toBeLessThan(1.81)
  expect(n.posicao.x).toBeGreaterThan(1.7)
  executar(r, parado, 2)
  expect(r.nadando).toBe(false)
  expect(r.posicao.x).toBe(0)
  comParede.descartar()
  raso.descartar()
  parede.geometria.dispose()
  chao.geometria.dispose()
})
test('gravidade, parede fina, pulo e tempo suspenso não atravessam o cenário', () => {
  const chao = piso(),
    parede = {
      geometria: new BoxGeometry(0.02, 4, 8),
      matriz: new Matrix4().makeTranslation(2, 2, 0),
    }
  const mundo = new MundoDoTeste([chao, parede]),
    m = new MovimentoDoTeste(mundo, new Vector3(0, 2, 0), 1.16)
  executar(m, parado, 2)
  expect(m.posicao.y).toBeCloseTo(0, 3)
  expect(m.noChao).toBe(true)
  executar(m, andar, 3)
  expect(m.posicao.x).toBeLessThan(1.81)
  expect(m.posicao.x).toBeGreaterThan(1.6)
  const antes = m.posicao.clone()
  m.avancar(10, andar)
  expect(m.posicao.distanceTo(antes)).toBe(0)
  m.avancar(1 / 120, { ...parado, saltar: true })
  expect(m.posicao.y).toBeGreaterThan(0.01)
  executar(m, parado, 2)
  expect(m.posicao.y).toBeCloseTo(0, 3)
  mundo.descartar()
  chao.geometria.dispose()
  parede.geometria.dispose()
})
test('degrau baixo é transposto, degrau alto bloqueia e queda não ganha piso invisível', () => {
  for (const altura of [0.15, 0.6]) {
    const chao = piso(),
      degrau = {
        geometria: new BoxGeometry(3, altura, 4),
        matriz: new Matrix4().makeTranslation(2.5, altura / 2, 0),
      }
    const mundo = new MundoDoTeste([chao, degrau]),
      m = new MovimentoDoTeste(mundo, new Vector3(0, 0.001, 0), 1.16)
    executar(m, parado, 0.2)
    executar(m, andar, 2)
    if (altura === 0.15) {
      expect(m.posicao.x).toBeGreaterThan(1.5)
      expect(m.posicao.y).toBeCloseTo(altura, 2)
    } else expect(m.posicao.x).toBeLessThan(1)
    mundo.descartar()
    chao.geometria.dispose()
    degrau.geometria.dispose()
  }
  const mundo = new MundoDoTeste([]),
    m = new MovimentoDoTeste(mundo, new Vector3(), 1.16)
  executar(m, parado, 2)
  expect(m.posicao.y).toBeLessThan(-10)
  expect(m.noChao).toBe(false)
  mundo.descartar()
})
test('pausa, voo e reposição não alteram a caminhada medida; modos mantêm a posição', () => {
  const chao = piso(),
    mundo = new MundoDoTeste([chao]),
    m = new MovimentoDoTeste(mundo, new Vector3(0, 0.001, 0), 1.16)
  executar(m, parado, 0.2)
  m.percurso.iniciar(m.posicao)
  executar(m, andar, 1)
  const medida = m.percurso.ler()
  expect(medida.caminhada).toBeGreaterThan(1)
  m.pausado = true
  executar(m, andar, 1)
  expect(m.percurso.ler()).toEqual(medida)
  m.pausado = false
  m.definirModo('voo')
  executar(m, { ...andar, vertical: 1 }, 1)
  expect(m.percurso.ler().estado).toBe('concluido')
  expect(m.percurso.ler().caminhada).toBe(medida.caminhada)
  m.retomar()
  expect(m.posicao.x).toBe(0)
  expect(m.percurso.ler().caminhada).toBe(medida.caminhada)
  mundo.descartar()
  chao.geometria.dispose()
})
test('rampa caminhável permite subir, encosta íngreme não vira escada e teto limita o salto', () => {
  for (const graus of [25, 65]) {
    const angulo = (graus * Math.PI) / 180,
      chao = piso(),
      rampa = {
        geometria: new PlaneGeometry(8, 6),
        matriz: new Matrix4()
          .makeRotationZ(angulo)
          .multiply(new Matrix4().makeRotationX(-Math.PI / 2))
          .setPosition(4 * Math.cos(angulo), 4 * Math.sin(angulo), 0),
      }
    const mundo = new MundoDoTeste([chao, rampa]),
      m = new MovimentoDoTeste(mundo, new Vector3(-1, 0.001, 0), 1.16)
    executar(m, parado, 0.2)
    executar(m, andar, 3)
    if (graus === 25) {
      expect(m.posicao.x).toBeGreaterThan(1.5)
      expect(m.posicao.y).toBeGreaterThan(0.5)
    } else expect(m.posicao.y).toBeLessThan(0.3)
    mundo.descartar()
    chao.geometria.dispose()
    rampa.geometria.dispose()
  }
  const chao = piso(),
    teto = {
      geometria: new BoxGeometry(4, 0.2, 4),
      matriz: new Matrix4().makeTranslation(0, 1.6, 0),
    }
  const mundo = new MundoDoTeste([chao, teto]),
    m = new MovimentoDoTeste(mundo, new Vector3(0, 0.001, 0), 1.16)
  executar(m, parado, 0.2)
  let max = 0
  for (let i = 0; i < 120; i++) {
    m.avancar(1 / 120, { ...parado, saltar: i === 0 })
    max = Math.max(max, m.posicao.y)
  }
  expect(max).toBeGreaterThan(0.2)
  expect(max).toBeLessThan(0.35)
  mundo.descartar()
  chao.geometria.dispose()
  teto.geometria.dispose()
})
test('cápsula pequena em queda rápida não atravessa piso fino', () => {
  const chao = piso(),
    mundo = new MundoDoTeste([chao]),
    m = new MovimentoDoTeste(mundo, new Vector3(0, 15, 0), 0.3)
  executar(m, parado, 3)
  expect(m.posicao.y).toBeCloseTo(0, 3)
  expect(m.noChao).toBe(true)
  mundo.descartar()
  chao.geometria.dispose()
})
test('início junto ao piso já está apoiado; início no vazio permanece em queda', () => {
  const chao = piso(),
    mundo = new MundoDoTeste([chao])
  const apoiado = new MovimentoDoTeste(mundo, new Vector3(0, 0.001, 0), 1.16),
    vazio = new MovimentoDoTeste(mundo, new Vector3(30, 0.001, 0), 1.16)
  expect(apoiado.noChao).toBe(true)
  expect(apoiado.posicao.y).toBeCloseTo(0, 3)
  expect(vazio.noChao).toBe(false)
  mundo.descartar()
  chao.geometria.dispose()
})
test('descida maior que cem metros só termina se passar do fundo real do cenário', () => {
  const chao = piso(),
    mundo = new MundoDoTeste([chao]),
    m = new MovimentoDoTeste(mundo, new Vector3(0, 150, 0), 1.16)
  executar(m, parado, 8)
  expect(m.caiu).toBe(false)
  expect(m.posicao.y).toBeCloseTo(0, 3)
  mundo.descartar()
  chao.geometria.dispose()
})
test('subir degraus continua sendo caminhada no medidor, sem registrar como salto', () => {
  const chao = piso(),
    degraus = Array.from({ length: 5 }, (_, i) => ({
      geometria: new BoxGeometry(0.45, (i + 1) * 0.18, 3),
      matriz: new Matrix4().makeTranslation(1 + i * 0.45 + 0.225, (i + 1) * 0.09, 0),
    }))
  const mundo = new MundoDoTeste([chao, ...degraus]),
    m = new MovimentoDoTeste(mundo, new Vector3(0, 0.001, 0), 1.16)
  m.percurso.iniciar(m.posicao)
  executar(m, andar, 2)
  const medida = m.percurso.ler()
  expect(m.posicao.y).toBeGreaterThan(0.7)
  expect(medida.caminhada).toBeGreaterThanOrEqual(medida.direta - 0.02)
  expect(medida.segundos).toBeGreaterThan(1.98)
  mundo.descartar()
  chao.geometria.dispose()
  for (const d of degraus) d.geometria.dispose()
})
