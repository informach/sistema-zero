import { beforeAll, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import type { RapierContext } from '@react-three/rapier'
import { GRUPO_SO_DO_CORPO, GRUPOS_DO_RAIO_DA_CAMERA } from '../src/mundo/grupos'
import { GRAVIDADE, PASSO_DA_FISICA } from '../src/mundo/medidas'
import { CORPO } from '../src/sistemas/corpo'
import {
  BICHO_QUE_SEGURA,
  capsulaDoEspaco,
  comecarPassinho,
  corpoQueSegura,
  criarEmpurrao,
  distanciaMinima,
  empurrando,
  espacoDoBicho,
  ladoDoPassinho,
  passoDoEmpurrao,
  passoDoPassinho,
  respeitarFolga,
} from '../src/sistemas/espaco-dos-bichos'
import {
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import { passoComColisao } from '../src/sistemas/modos/colisao'
import { criarSeguir, ficouPreso, passoDoSeguir, SEGUIR } from '../src/sistemas/seguir'

/**
 * O espaço dos bichos com o Rapier de verdade (31/10/2026): a cápsula da criança para na do bicho
 * (sem subir nele), o filtro dela continua deixando passar os outros cinemáticos, o raio da câmera
 * ignora a cápsula, o empurrão faz o bicho dar passagem e o bicho que segue não fica preso nela.
 */

// A mesma versão Rapier do renderer, sem instalar outro motor só para o teste.
const require = createRequire(import.meta.url)
const R: RapierContext['rapier'] = require(
  require.resolve('@dimforge/rapier3d-compat', {
    paths: [require.resolve('@react-three/rapier')],
  }),
)
beforeAll(async () => {
  await R.init()
})

type Mundo = InstanceType<typeof R.World>
type Corpo = ReturnType<Mundo['createRigidBody']>
type Colisor = ReturnType<Mundo['createCollider']>

const MUNDO_VAZIO: MundoDoMovimento = {
  cipos: [],
  troncos: [],
  aguas: [],
  equilibrios: [],
  escadas: [],
  escorregadores: [],
  bordas: [],
  rodasDeNado: [],
  foco: { x: 0, y: 0, z: 0 },
}

/** Um bicho como o jogo monta: corpo cinemático, cápsula do espaço no grupo só do corpo. */
function porBicho(world: Mundo, id: string, x: number, z: number, segura = true) {
  const cap = capsulaDoEspaco(espacoDoBicho(id))
  const corpo = world.createRigidBody(
    R.RigidBodyDesc.kinematicPositionBased().setTranslation(x, cap.y, z),
  )
  if (segura) corpo.userData = { ...BICHO_QUE_SEGURA }
  world.createCollider(
    R.ColliderDesc.capsule(cap.meiaAltura, cap.raio).setCollisionGroups(GRUPO_SO_DO_CORPO),
    corpo,
  )
  return { corpo, cap }
}

/** A criança: a cápsula e o controlador do chão configurados como em `personagem.tsx`. */
function porCrianca(world: Mundo, x: number, z: number) {
  const corpo = world.createRigidBody(
    R.RigidBodyDesc.kinematicPositionBased().setTranslation(x, CORPO.doCentroAoPe + CORPO.folga, z),
  )
  const col = world.createCollider(R.ColliderDesc.capsule(CORPO.meiaAltura, CORPO.raio), corpo)
  const k = world.createCharacterController(CORPO.folga)
  k.enableAutostep(CORPO.degrau, 0.25, true)
  k.enableSnapToGround(0.35)
  k.setMaxSlopeClimbAngle((CORPO.sobeAte * Math.PI) / 180)
  k.setMinSlopeSlideAngle((CORPO.escorregaAcimaDe * Math.PI) / 180)
  const c = criarEstadoDoCorpo()
  Object.assign(c.inicio, corpo.translation())
  Object.assign(c.prox, corpo.translation())
  // O filtro do `personagem.tsx`: nunca o próprio corpo; o resto pelo `userData`.
  const aceitar = (outro: Colisor) => {
    const dono = outro.parent()
    if (dono && dono.handle === corpo.handle) return false
    return corpoQueSegura(dono?.userData, c.modo)
  }
  return { corpo, col, k, c, aceitar }
}

function entrada(p: { x: number; y: number; z: number }, i: number, px: number, pz: number) {
  const e: EntradaDoPasso = {
    dt: PASSO_DA_FISICA,
    agora: (i * 1000) / 60,
    parado: false,
    p,
    // Câmera olhando para −z (giro 0): o eixo x do controle é o +x do mundo, o z é o −z.
    ix: px,
    iz: -pz,
    pedidoX: px,
    pedidoZ: pz,
    ladoX: 1,
    ladoZ: 0,
    pulou: false,
    usou: false,
    correr: false,
    ritmo: 1,
    patins: false,
    conversa: null,
    gravidade: GRAVIDADE,
    nivelDoMar: -10,
  }
  return e
}

function passoDaCrianca(cr: ReturnType<typeof porCrianca>, i: number, px: number, pz: number) {
  const e = entrada(cr.corpo.translation(), i, px, pz)
  cr.c.noModo += e.dt
  passoComColisao(
    MODOS[cr.c.modo],
    cr.c,
    e,
    MUNDO_VAZIO,
    cr.col,
    cr.k,
    cr.k,
    R.QueryFilterFlags.EXCLUDE_SENSORS,
    cr.aceitar,
    () => {},
  )
  cr.corpo.setNextKinematicTranslation(cr.c.prox)
}

function novoMundo() {
  const world = new R.World({ x: 0, y: -GRAVIDADE, z: 0 })
  world.timestep = PASSO_DA_FISICA
  world.createCollider(R.ColliderDesc.cuboid(30, 0.5, 30).setTranslation(0, -0.5, 0))
  return world
}

const pe = (c: Corpo) => c.translation().y - CORPO.doCentroAoPe

test('a criança para encostada no cachorro do quarto, sem subir nele', () => {
  for (const id of ['pet-cachorro', 'pet-gato', 'porquinho-filhote', 'cachorro-adulto']) {
    const world = novoMundo()
    try {
      const { cap } = porBicho(world, id, 2, 0)
      const cr = porCrianca(world, 0, 0)
      world.step()
      for (let i = 0; i < 180; i++) {
        passoDaCrianca(cr, i, 1, 0)
        world.step()
      }
      const x = cr.corpo.translation().x
      const encosto = 2 - CORPO.raio - cap.raio
      expect(x).toBeLessThan(encosto)
      expect(x).toBeGreaterThan(encosto - CORPO.folga - 0.05)
      expect(Math.abs(cr.corpo.translation().z)).toBeLessThan(0.15)
      // O degrau automático não a leva para cima do bicho.
      expect(pe(cr.corpo)).toBeLessThan(0.1)
    } finally {
      world.free()
    }
  }
})

test('fora do modo chão o bicho não segura (o filtro deixa passar)', () => {
  const world = novoMundo()
  try {
    porBicho(world, 'pet-cachorro', 1.2, 0)
    const cr = porCrianca(world, 0, 0)
    world.step()
    const desejado = { x: 2, y: 0, z: 0 }
    for (const [modo, livre] of [
      ['cipo', true],
      ['montar', true],
      ['chao', false],
    ] as const) {
      cr.k.computeColliderMovement(
        cr.col,
        desejado,
        R.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        (outro: Colisor) => corpoQueSegura(outro.parent()?.userData, modo),
      )
      if (livre) expect(cr.k.computedMovement().x).toBeCloseTo(2, 3)
      else expect(cr.k.computedMovement().x).toBeLessThan(0.5)
    }
  } finally {
    world.free()
  }
})

test('⚠️ dentro do filtro, isKinematic() lança e o Rapier conta o colisor como sólido', () => {
  // A prova do porquê o filtro decide só pelo userData (e do que acontecia antes de 31/10/2026).
  // Depois do erro o mundo fica "emprestado" para sempre: `world.free()` lança ("attempted to
  // take ownership of Rust value while it was borrowed"), então este mundo não é solto.
  const world = novoMundo()
  {
    porBicho(world, 'pet-cachorro', 1.2, 0, false)
    const cr = porCrianca(world, 0, 0)
    world.step()
    let lancou = false
    cr.k.computeColliderMovement(
      cr.col,
      { x: 2, y: 0, z: 0 },
      R.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      (outro: Colisor) => {
        const dono = outro.parent()
        if (!dono) return true
        try {
          return !dono.isKinematic()
        } catch {
          lancou = true
          return true
        }
      },
    )
    expect(lancou).toBe(true)
    expect(cr.k.computedMovement().x).toBeLessThan(0.5)
    expect(() => world.free()).toThrow()
  }
})

test('o raio da câmera passa pela cápsula do bicho', () => {
  const world = novoMundo()
  try {
    porBicho(world, 'cachorro-adulto', 0, 0)
    world.step()
    const bola = new R.Ball(0.2)
    const de = { x: -3, y: 0.6, z: 0 }
    const para = { x: 1, y: 0, z: 0 }
    const rot = { x: 0, y: 0, z: 0, w: 1 }
    // Com o filtro inteiro da câmera (personagem/camera.tsx).
    const comFiltro = world.castShape(
      de,
      rot,
      para,
      bola,
      0,
      6,
      false,
      R.QueryFilterFlags.EXCLUDE_KINEMATIC | R.QueryFilterFlags.EXCLUDE_SENSORS,
      GRUPOS_DO_RAIO_DA_CAMERA,
    )
    expect(comFiltro).toBeNull()
    // Mesmo sem o EXCLUDE_KINEMATIC, o grupo só do corpo já deixa a câmera passar.
    expect(
      world.castShape(de, rot, para, bola, 0, 6, false, undefined, GRUPOS_DO_RAIO_DA_CAMERA),
    ).toBeNull()
    // E sem filtro nenhum a bolinha bate (a cápsula está mesmo lá).
    expect(world.castShape(de, rot, para, bola, 0, 6, false)).not.toBeNull()
  } finally {
    world.free()
  }
})

test('o controlador do bicho adotado não tropeça nela (assimétrico)', () => {
  const world = novoMundo()
  try {
    const cr = porCrianca(world, 1, 0)
    const corpo = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.45, 0),
    )
    const col = world.createCollider(R.ColliderDesc.capsule(0.15, 0.25), corpo)
    const k = world.createCharacterController(0.02)
    world.step()
    k.computeColliderMovement(
      col,
      { x: 0.5, y: 0, z: 0 },
      R.QueryFilterFlags.EXCLUDE_KINEMATIC | R.QueryFilterFlags.EXCLUDE_SENSORS,
    )
    expect(k.computedMovement().x).toBeCloseTo(0.5, 4)
    expect(cr.corpo.translation().x).toBe(1)
  } finally {
    world.free()
  }
})

/** O bicho parado com as regras do empurrão e do passinho; `livre` pelo Rapier, como no jogo. */
function empurrarAte(parede: boolean) {
  const world = novoMundo()
  try {
    const id = 'pet-cachorro'
    const { corpo: bicho, cap } = porBicho(world, id, 2, 0)
    if (parede) world.createCollider(R.ColliderDesc.cuboid(0.6, 1, 0.4).setTranslation(2, 1, 0.95))
    const cr = porCrianca(world, 0, 0)
    const e = criarEmpurrao()
    const pedido = { x: 1, z: 0 }
    const bola = new R.Capsule(cap.meiaAltura, cap.raio)
    const livre = (x: number, z: number) =>
      world.intersectionWithShape(
        { x, y: cap.y + 0.1, z },
        { x: 0, y: 0, z: 0, w: 1 },
        bola,
        R.QueryFilterFlags.EXCLUDE_KINEMATIC | R.QueryFilterFlags.EXCLUDE_SENSORS,
      ) === null
    let passinhos = 0
    let menor = Number.POSITIVE_INFINITY
    world.step()
    for (let i = 0; i < 300; i++) {
      passoDaCrianca(cr, i, pedido.x, pedido.z)
      const b = bicho.translation()
      const c = cr.corpo.translation()
      const noBicho = { x: b.x, z: b.z, pe: 0 }
      const nela = { x: c.x, z: c.z, pe: pe(cr.corpo) }
      menor = Math.min(menor, Math.hypot(b.x - c.x, b.z - c.z))
      if (passoDoEmpurrao(e, empurrando(noBicho, cap.raio, nela, pedido), PASSO_DA_FISICA)) {
        const lado = ladoDoPassinho(noBicho, nela, pedido, livre)
        if (lado) {
          comecarPassinho(e, lado)
          passinhos++
        }
      }
      const d = { x: 0, z: 0 }
      passoDoPassinho(e, PASSO_DA_FISICA, d)
      bicho.setNextKinematicTranslation({ x: b.x + d.x, y: b.y, z: b.z + d.z })
      world.step()
    }
    return {
      crianca: cr.corpo.translation(),
      bicho: bicho.translation(),
      passinhos,
      menor,
      encosto: CORPO.raio + cap.raio,
    }
  } finally {
    world.free()
  }
}

test('empurrando meio segundo, o bicho dá um passinho e ela passa', () => {
  const r = empurrarAte(false)
  expect(r.passinhos).toBeGreaterThanOrEqual(1)
  expect(r.crianca.x).toBeGreaterThan(3)
  expect(Math.abs(r.bicho.z)).toBeGreaterThan(0.5)
  // Nunca se cruzaram.
  expect(r.menor).toBeGreaterThan(r.encosto - 0.02)
})

test('com uma parede de um lado, o passinho vai para o outro', () => {
  const r = empurrarAte(true)
  expect(r.passinhos).toBeGreaterThanOrEqual(1)
  expect(r.bicho.z).toBeLessThan(-0.5)
  expect(r.crianca.x).toBeGreaterThan(3)
})

test('o bicho que segue mantém a folga e não fica preso nela, ida e volta', () => {
  const world = novoMundo()
  try {
    const id = 'cachorro-filhote'
    const espaco = espacoDoBicho(id)
    const { corpo: bicho, cap } = porBicho(world, id, -2, 0)
    // O corpo de andar do bicho adotado (o mesmo do `bicho-adotado.tsx`) no mesmo corpo.
    const colDoBicho = world.createCollider(
      R.ColliderDesc.capsule(0.15, 0.25).setTranslation(0, 0.4 + 0.02 - cap.y, 0),
      bicho,
    )
    const k = world.createCharacterController(0.02)
    k.enableAutostep(0.3, 0.2, true)
    k.enableSnapToGround(0.3)
    const cr = porCrianca(world, 0, 0)
    const seguir = criarSeguir()
    const minimo = distanciaMinima(espaco.raio)
    const e = criarEmpurrao()
    let menor = Number.POSITIVE_INFINITY
    let reapareceu = false
    let preso = false
    let xMaisLonge = 0
    world.step()
    for (let i = 0; i < 600; i++) {
      // Anda 3 s para +x, para 1 s, volta 3 s para −x (contra ele), para 3 s.
      const px = i < 180 ? 1 : i < 240 ? 0 : i < 420 ? -1 : 0
      passoDaCrianca(cr, i, px, 0)
      const b = bicho.translation()
      const c = cr.corpo.translation()
      const peDoBicho = b.y - cap.y
      const noBicho = { x: b.x, y: peDoBicho, z: b.z }
      const nela = { x: c.x, z: c.z, pe: pe(cr.corpo) }
      menor = Math.min(menor, Math.hypot(b.x - c.x, b.z - c.z))
      const passo = passoDoSeguir(seguir, noBicho, nela, false, PASSO_DA_FISICA)
      if (passo.reaparecer) reapareceu = true
      const d = { x: seguir.vx * PASSO_DA_FISICA, z: seguir.vz * PASSO_DA_FISICA }
      const pedido = { x: px, z: 0 }
      const aqui = { x: b.x, z: b.z, pe: peDoBicho }
      if (passoDoEmpurrao(e, empurrando(aqui, espaco.raio, nela, pedido), PASSO_DA_FISICA)) {
        const lado = ladoDoPassinho(aqui, nela, pedido)
        if (lado) comecarPassinho(e, lado)
      }
      passoDoPassinho(e, PASSO_DA_FISICA, d)
      respeitarFolga(aqui, d, nela, minimo, PASSO_DA_FISICA)
      // O controlador dele com EXCLUDE_KINEMATIC: não vê a criança, só o chão.
      k.computeColliderMovement(
        colDoBicho,
        { x: d.x, y: -0.05, z: d.z },
        R.QueryFilterFlags.EXCLUDE_KINEMATIC | R.QueryFilterFlags.EXCLUDE_SENSORS,
      )
      const mov = k.computedMovement()
      if (ficouPreso(seguir, Math.hypot(mov.x, mov.z), PASSO_DA_FISICA)) preso = true
      bicho.setNextKinematicTranslation({ x: b.x + mov.x, y: b.y + mov.y, z: b.z + mov.z })
      world.step()
      if (i === 239) xMaisLonge = cr.corpo.translation().x
    }
    // As cápsulas nunca se cruzaram, e ele nunca precisou reaparecer.
    expect(menor).toBeGreaterThan(CORPO.raio + espaco.raio - 0.02)
    expect(reapareceu).toBe(false)
    expect(preso).toBe(false)
    // Na volta ela andou de verdade (não ficou presa nele) e ele continua por perto.
    expect(xMaisLonge - cr.corpo.translation().x).toBeGreaterThan(4)
    const fim = Math.hypot(
      bicho.translation().x - cr.corpo.translation().x,
      bicho.translation().z - cr.corpo.translation().z,
    )
    expect(fim).toBeLessThan(SEGUIR.comecaAAndar + 0.2)
  } finally {
    world.free()
  }
})
