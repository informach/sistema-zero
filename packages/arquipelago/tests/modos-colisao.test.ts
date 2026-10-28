import { beforeAll, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import type { RapierContext } from '@react-three/rapier'
import { limitarPosicaoDaCamera } from '../src/sistemas/camera'
import { CORPO } from '../src/sistemas/corpo'
import { ESCALADA } from '../src/sistemas/escalada'
import {
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import { BORDA } from '../src/sistemas/modos/borda'
import { passoComColisao } from '../src/sistemas/modos/colisao'
import { agarrarTronco } from '../src/sistemas/modos/escalada'

// Usa exatamente a física instalada pelo renderer, sem outra versão de Rapier no teste.
const require = createRequire(import.meta.url)
const R: RapierContext['rapier'] = require(
  require.resolve('@dimforge/rapier3d-compat', {
    paths: [require.resolve('@react-three/rapier')],
  }),
)
beforeAll(async () => {
  await R.init()
})

test('a interpolação da câmera não corta um obstáculo entre dois destinos livres', () => {
  const world = new R.World({ x: 0, y: 0, z: 0 })
  try {
    world.createCollider(R.ColliderDesc.cuboid(0.5, 2, 0.5))
    world.step()
    const alvo = { x: -5, y: 0, z: -5 }
    const proposta = { x: 0, y: 0, z: 0 }
    const sonda = new R.Ball(0.2)
    const identidade = { x: 0, y: 0, z: 0, w: 1 }
    const livreAte = (p: { x: number; y: number; z: number }) => {
      const dx = p.x - alvo.x,
        dz = p.z - alvo.z
      const distancia = Math.hypot(dx, dz)
      const hit = world.castShape(
        alvo,
        identidade,
        { x: dx / distancia, y: 0, z: dz / distancia },
        sonda,
        0,
        distancia,
        false,
      )
      return hit ? hit.time_of_impact - 0.05 : distancia
    }
    for (const extremo of [
      { x: 2, y: 0, z: -2 },
      { x: -2, y: 0, z: 2 },
    ]) {
      expect(livreAte(extremo)).toBeCloseTo(Math.hypot(extremo.x + 5, extremo.z + 5), 4)
    }
    limitarPosicaoDaCamera(alvo, proposta, livreAte(proposta))
    expect(proposta.x).toBeLessThan(-0.6)
    expect(proposta.z).toBeLessThan(-0.6)
  } finally {
    world.free()
  }
})

function percurso(parede: boolean, sensor = false) {
  const world = new R.World({ x: 0, y: -24, z: 0 })
  try {
    world.createCollider(R.ColliderDesc.cuboid(10, 0.1, 2).setTranslation(0, -0.1, 0))
    if (parede)
      world.createCollider(
        R.ColliderDesc.cuboid(0.05, 2, 2).setTranslation(1, 2, 0).setSensor(sensor),
      )
    const corpo = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(
        0,
        CORPO.doCentroAoPe + CORPO.folga,
        0,
      ),
    )
    const colisor = world.createCollider(
      R.ColliderDesc.capsule(CORPO.meiaAltura, CORPO.raio),
      corpo,
    )
    const kcc = world.createCharacterController(CORPO.folga)
    const livre = world.createCharacterController(CORPO.folga)
    const c = criarEstadoDoCorpo()
    c.modo = 'equilibrio'
    c.eixo = { id: 'tronco', a: { x: 0, y: 0, z: 0 }, b: { x: 8, y: 0, z: 0 } }
    c.noModo = 1
    Object.assign(c.inicio, corpo.translation())
    Object.assign(c.prox, corpo.translation())
    const mundo: MundoDoMovimento = {
      cipos: [],
      troncos: [],
      aguas: [],
      equilibrios: [c.eixo],
      escadas: [],
      escorregadores: [],
      bordas: [],
      rodasDeNado: [],
      foco: { x: 0, y: 0, z: 0 },
    }
    const avisos: string[] = []
    world.step()
    for (let i = 0; i < 120; i++) {
      const e: EntradaDoPasso = {
        dt: 1 / 60,
        agora: (i * 1000) / 60,
        parado: false,
        p: corpo.translation(),
        ix: 1,
        iz: 0,
        pedidoX: 1,
        pedidoZ: 0,
        ladoX: 1,
        ladoZ: 0,
        pulou: false,
        usou: false,
        correr: false,
        ritmo: 1,
        conversa: null,
        gravidade: 24,
        nivelDoMar: -10,
      }
      c.noModo += e.dt
      passoComColisao(
        MODOS[c.modo],
        c,
        e,
        mundo,
        colisor,
        kcc,
        livre,
        R.QueryFilterFlags.EXCLUDE_SENSORS,
        () => true,
        (modo) => avisos.push(modo),
      )
      corpo.setNextKinematicTranslation(c.prox)
      world.step()
    }
    return { x: corpo.translation().x, y: corpo.translation().y, modo: c.modo, avisos }
  } finally {
    world.free()
  }
}

test('percurso guiado para antes de uma parede real e devolve o controle ao chão', () => {
  const r = percurso(true)
  expect(r.x).toBeLessThan(1 - 0.05 - CORPO.raio)
  expect(r.x).toBeGreaterThan(0.4)
  expect(r.avisos).toContain('chao')
})

test('piso de apoio não interrompe o equilíbrio e conserva a trajetória livre', () => {
  const r = percurso(false)
  expect(r.x).toBeGreaterThan(2)
  expect(r.y).toBeCloseTo(CORPO.doCentroAoPe + CORPO.folga, 3)
  expect(r.modo).toBe('equilibrio')
  expect(r.avisos).toEqual([])
})

test('sensor não vira parede no percurso guiado', () => {
  const r = percurso(true, true)
  expect(r.x).toBeGreaterThan(2)
  expect(r.modo).toBe('equilibrio')
})

test('escalada conserva contato com tronco real e para sob teto novo', () => {
  for (const teto of [false, true]) {
    const world = new R.World({ x: 0, y: -24, z: 0 })
    try {
      world.createCollider(R.ColliderDesc.cylinder(3, 0.6).setTranslation(0, 3, 0))
      if (teto) world.createCollider(R.ColliderDesc.cuboid(3, 0.05, 3).setTranslation(0, 3.5, 0))
      const p = { x: 0, y: 1.2, z: 0.6 + CORPO.raio + ESCALADA.folga }
      const corpo = world.createRigidBody(
        R.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y, p.z),
      )
      const col = world.createCollider(R.ColliderDesc.capsule(CORPO.meiaAltura, CORPO.raio), corpo)
      const k = world.createCharacterController(CORPO.folga)
      const c = criarEstadoDoCorpo()
      const tronco = {
        id: 'teste',
        tronco: {
          base: { x: 0, y: 0, z: 0 },
          topo: { x: 0, y: 6, z: 0 },
          raioBase: 0.6,
          raioTopo: 0.6,
        },
      }
      const mundo: MundoDoMovimento = {
        cipos: [],
        troncos: [tronco],
        aguas: [],
        equilibrios: [],
        escadas: [],
        escorregadores: [],
        bordas: [],
        rodasDeNado: [],
        foco: { x: 0, y: 0, z: 0 },
      }
      agarrarTronco(c, tronco, p, 0, () => {})
      c.noModo = 1
      world.step()
      let maiorY = p.y
      for (let i = 0; i < 120; i++) {
        const e: EntradaDoPasso = {
          dt: 1 / 60,
          agora: (i * 1000) / 60,
          parado: false,
          p: corpo.translation(),
          ix: 0,
          iz: 1,
          pedidoX: 0,
          pedidoZ: -1,
          ladoX: 1,
          ladoZ: 0,
          pulou: false,
          usou: false,
          correr: false,
          ritmo: 1,
          conversa: null,
          gravidade: 24,
          nivelDoMar: -10,
        }
        c.noModo += e.dt
        passoComColisao(
          MODOS[c.modo],
          c,
          e,
          mundo,
          col,
          k,
          k,
          R.QueryFilterFlags.EXCLUDE_SENSORS,
          () => true,
          () => {},
        )
        corpo.setNextKinematicTranslation(c.prox)
        world.step()
        maiorY = Math.max(maiorY, corpo.translation().y)
      }
      if (teto) expect(maiorY + CORPO.doCentroAoPe).toBeLessThan(3.45)
      else {
        expect(maiorY).toBeGreaterThan(3)
        expect(c.modo).toBe('escalada')
      }
    } finally {
      world.free()
    }
  }
})

test('subida da borda passa acima da quina de uma plataforma real', () => {
  const world = new R.World({ x: 0, y: -24, z: 0 })
  try {
    world.createCollider(R.ColliderDesc.cuboid(2, 1.3, 2).setTranslation(0, 1.3, 2))
    const p = { x: 0, y: 2.6 - BORDA.maosAcimaDoCentro, z: -BORDA.daParede }
    const corpo = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y, p.z),
    )
    const col = world.createCollider(R.ColliderDesc.capsule(CORPO.meiaAltura, CORPO.raio), corpo)
    const k = world.createCharacterController(CORPO.folga)
    const c = criarEstadoDoCorpo()
    c.modo = 'borda'
    c.borda = {
      id: 'quina',
      a: { x: -1.3, y: 2.6, z: 0 },
      b: { x: 1.3, y: 2.6, z: 0 },
      fora: { x: 0, y: 2.6, z: -1 },
    }
    c.naBorda = 1.3
    c.noModo = 1
    Object.assign(c.inicio, p)
    Object.assign(c.prox, p)
    const mundo: MundoDoMovimento = {
      cipos: [],
      troncos: [],
      aguas: [],
      equilibrios: [],
      escadas: [],
      escorregadores: [],
      bordas: [c.borda],
      rodasDeNado: [],
      foco: { x: 0, y: 0, z: 0 },
    }
    world.step()
    for (let i = 0; i < 45 && c.modo === 'borda'; i++) {
      const e: EntradaDoPasso = {
        dt: 1 / 60,
        agora: (i * 1000) / 60,
        parado: false,
        p: corpo.translation(),
        ix: 0,
        iz: 1,
        pedidoX: 0,
        pedidoZ: 1,
        ladoX: 1,
        ladoZ: 0,
        pulou: false,
        usou: false,
        correr: false,
        ritmo: 1,
        conversa: null,
        gravidade: 24,
        nivelDoMar: -10,
      }
      c.noModo += e.dt
      passoComColisao(
        MODOS[c.modo],
        c,
        e,
        mundo,
        col,
        k,
        k,
        R.QueryFilterFlags.EXCLUDE_SENSORS,
        () => true,
        () => {},
      )
      corpo.setNextKinematicTranslation(c.prox)
      world.step()
    }
    expect(c).toMatchObject({ modo: 'chao' })
    expect(c.prox.y - CORPO.doCentroAoPe).toBeGreaterThan(2.6)
    expect(c.prox.z).toBeCloseTo(BORDA.paraDentro, 2)
  } finally {
    world.free()
  }
})
