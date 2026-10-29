import { expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { guardarAchadoDoRecife } from '../src/sistemas/achados-do-recife'
import { paginasDoDiario } from '../src/sistemas/diario'
import { ilhaPreferida } from '../src/sistemas/ilhas-completas'
import {
  correnteDoMergulho,
  MERGULHO,
  mostrarAvatarNoMergulho,
  podeMergulhar,
  type VolumeDeMergulho,
} from '../src/sistemas/mergulho'
import {
  atenderPedido,
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import { MODO_MERGULHO } from '../src/sistemas/modos/mergulho'

const volume: VolumeDeMergulho = {
  id: 'recife',
  x: 0,
  z: 0,
  raio: 42,
  superficie: 0,
  fundo: -3.5,
  entrada: { x: 4.4, y: 0, z: -16.2 },
  ativo: true,
}
const mundo: MundoDoMovimento = {
  cipos: [],
  troncos: [],
  aguas: [],
  equilibrios: [],
  escadas: [],
  escorregadores: [],
  bordas: [],
  rodasDeNado: [],
  foco: { x: 0, y: 0, z: 0 },
  mergulhos: [volume],
}
function entrada(): EntradaDoPasso {
  return {
    dt: 1 / 60,
    agora: 0,
    parado: false,
    p: { ...volume.entrada, y: 0.35 },
    ix: 0,
    iz: 0,
    pedidoX: 0,
    pedidoZ: 0,
    ladoX: 1,
    ladoZ: 0,
    pulou: false,
    usou: false,
    correr: false,
    ritmo: 1,
    patins: false,
    conversa: null,
    gravidade: 24,
    nivelDoMar: 0,
  }
}
function preparar() {
  const c = criarEstadoDoCorpo(),
    e = entrada()
  atenderPedido(c, { tipo: 'mergulho', volume }, mundo, e.p, 0, () => {})
  return { c, e }
}
function passo(c: ReturnType<typeof criarEstadoDoCorpo>, e: EntradaDoPasso) {
  // Como o personagem: o relógio do modo anda fora do modo, e para na pausa.
  if (!e.parado) c.noModo += e.dt
  MODO_MERGULHO.passo(c, e, mundo)
  MODO_MERGULHO.depois(c, e, mundo, c.desloc, false, () => {})
  Object.assign(e.p, c.prox)
  e.agora += e.dt * 1000
}
test('só entra perto da âncora, com o volume pronto e no modo de chão', () => {
  expect(preparar().c.modo).toBe('mergulho')
  expect(podeMergulhar({ ...volume, ativo: false }, volume.entrada)).toBe(false)
  const c = criarEstadoDoCorpo()
  atenderPedido(c, { tipo: 'mergulho', volume }, mundo, { x: 0, y: 0, z: 0 }, 0, () => {})
  expect(c.modo).toBe('chao')
  expect(MODO_MERGULHO.valendo(preparar().c, { ...mundo, mergulhos: [] })).toBe(false)
})
test('desce, nada no fundo sem afundar, para na profundidade e emerge sem perder a cápsula', () => {
  const { c, e } = preparar()
  e.descer = true
  e.pedidoX = 1
  for (let i = 0; i < 180; i++) passo(c, e)
  expect(e.p.y).toBeGreaterThan(-2.61)
  expect(e.p.y).toBeLessThan(-2.4)
  expect(e.p.x).toBeGreaterThan(10)
  e.descer = false
  e.pedidoX = 0
  for (let i = 0; i < 60; i++) passo(c, e)
  const y = e.p.y
  for (let i = 0; i < 60; i++) passo(c, e)
  expect(e.p.y).toBe(y)
  e.subir = true
  for (let i = 0; i < 200 && c.modo === 'mergulho'; i++) passo(c, e)
  expect(c.modo).toBe('chao')
  expect(c.mergulho).toBeNull()
  expect(e.p.y).toBeGreaterThan(0.14)
})
test('pausa não avança a regra, nem permite subir ou descer', () => {
  const { c, e } = preparar()
  for (let i = 0; i < 30; i++) passo(c, e)
  const posicao = { ...e.p },
    tempo = c.noModo,
    velY = c.velY
  e.parado = e.subir = e.descer = true
  for (let i = 0; i < 120; i++) passo(c, e)
  expect(e.p).toEqual(posicao)
  expect(c.noModo).toBe(tempo)
  expect(c.velY).toBe(velY)
})
test('corrente é velocidade somada para dentro só na borda, não deslocamento por quadro', () => {
  const v = { x: 0, z: 0 }
  correnteDoMergulho(volume, { x: 10, y: -2, z: 0 }, v)
  expect(v).toEqual({ x: 0, z: 0 })
  correnteDoMergulho(volume, { x: 42, y: -2, z: 0 }, v)
  expect(v.x).toBe(-MERGULHO.corrente)
  const { c, e } = preparar()
  e.p = { x: 42, y: -2, z: 0 }
  c.noModo = 2
  passo(c, e)
  expect(e.p.x).toBeCloseTo(42 - MERGULHO.corrente / 60, 6)
})
test('nadando para fora com tudo, a corrente da borda segura dentro do volume', () => {
  const { c, e } = preparar()
  e.p = { x: 30, y: -2, z: 0 }
  c.noModo = 2
  e.pedidoX = 1
  for (let i = 0; i < 60 * 30; i++) passo(c, e)
  expect(c.modo).toBe('mergulho')
  expect(Math.hypot(e.p.x, e.p.z)).toBeLessThan(volume.raio)
})
test('a descida da entrada dura um segundo de jogo, e a pausa não a gasta', () => {
  const { c, e } = preparar()
  e.parado = true
  for (let i = 0; i < 120; i++) passo(c, e)
  e.parado = false
  for (let i = 0; i < 50; i++) passo(c, e)
  // Ainda dentro do primeiro segundo: desce sozinho.
  expect(c.velY).toBeLessThan(0)
  expect(c.noModo).toBeCloseTo(50 / 60, 6)
})
test('30 e 60 quadros entregam os mesmos 240 passos fixos de nado e subida', () => {
  const rodar = (fps: number) => {
    const { c, e } = preparar()
    for (let frame = 0; frame < fps * 4; frame++)
      for (let j = 0; j < 60 / fps; j++) {
        e.descer = e.agora < 2000
        e.pedidoX = 0.5
        e.pedidoZ = 0.2
        passo(c, e)
      }
    return { p: e.p, tempo: c.noModo, vel: c.vel }
  }
  expect(rodar(30)).toEqual(rodar(60))
})
test('cada achado só recompensa uma vez, persiste, e a página abre o diário', () => {
  let s = criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
  s.necessidades.diversao = 90
  for (const id of ['bau', 'pagina', 'tesouro'] as const) {
    s = guardarAchadoDoRecife(s, id)
    expect(guardarAchadoDoRecife(s, id)).toBe(s)
  }
  expect(s.necessidades.diversao).toBe(100)
  expect(paginasDoDiario(s).find((p) => p.ilha === 'recife')?.aberta).toBe(true)
})

test('áreas de carga sobrepostas têm um dono e o Recife fica retido durante o mergulho', () => {
  const candidatas = [
    { id: 'recife', x: 0, z: 0 },
    { id: 'vila-doce', x: 82, z: 0 },
  ]
  expect(ilhaPreferida({ x: 50, z: 0 }, candidatas, 'recife')).toBe('recife')
  expect(ilhaPreferida({ x: 50, z: 0 }, candidatas, null)).toBe('vila-doce')
  expect(ilhaPreferida({ x: 30, z: 0 }, candidatas, null)).toBe('recife')
  expect(ilhaPreferida({ x: 50, z: 0 }, candidatas.slice(0, 1), null)).toBe('recife')
  expect(ilhaPreferida({ x: 0, z: 0 }, [], null)).toBeNull()
})

test('a câmera junto ao corpo não desenha o interior do avatar nem pisca na borda', () => {
  expect(mostrarAvatarNoMergulho(0, true)).toBe(false)
  expect(mostrarAvatarNoMergulho(1.3, true)).toBe(false)
  expect(mostrarAvatarNoMergulho(1.5, true)).toBe(true)
  expect(mostrarAvatarNoMergulho(1.5, false)).toBe(false)
  expect(mostrarAvatarNoMergulho(1.7, false)).toBe(true)
})
