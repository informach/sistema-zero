import { describe, expect, it } from 'bun:test'
import { type FakeRenderer, type KitApi, loadStartedKit } from './kitHarness'

/**
 * ⭐ A suíte que faltava — e é exatamente o buraco por onde o defeito passou.
 *
 * Direção = ENTRADA (teclas) × ORIENTAÇÃO (quaternion) × CÂMERA. Nenhuma das
 * três era testada: o fake de THREE tinha a rotação zerada (`applyQuaternion`
 * devolvia o vetor intacto), e o teclado é intestável no browser (o CDP não
 * entrega tecla ao iframe sandbox). Na interseção dos dois pontos cegos moravam
 * DUAS convenções de "frente" brigando 180° — 2523 testes verdes não viram.
 *
 * Com o three de verdade na bancada, o laço inteiro fecha aqui, sem browser:
 * o `window.dispatchEvent(new KeyboardEvent(...))` do happy-dom alimenta o mesmo
 * mapa de teclas que o motor lê.
 *
 * CONTRATO FIXADO: a frente do modelo é **+Z** — a convenção do curso
 * (`turret.js:92` usa `setFromUnitVectors(new Vector3(0,0,1), aimDirection)`) e
 * dos `.glb` (glTF: "+Z toward the viewer"). Todo WASD é **relativo à câmera**.
 */

const EPS = 1e-6

function press(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }))
}
function release(key: string) {
  window.dispatchEvent(new KeyboardEvent('keyup', { key }))
}
/** Solta tudo que os testes usam — o mapa de teclas é global ao módulo. */
function releaseAll() {
  for (const k of ['w', 'a', 's', 'd', ' ']) release(k)
}

type Vec = { x: number; y: number; z: number }
function vel(api: KitApi, e: unknown): Vec {
  return { x: api.velocityOf(e, 'x'), y: api.velocityOf(e, 'y'), z: api.velocityOf(e, 'z') }
}
function pos(api: KitApi, e: unknown): Vec {
  return { x: api.posOf(e, 'x'), y: api.posOf(e, 'y'), z: api.posOf(e, 'z') }
}
function norm(v: Vec): Vec {
  const l = Math.hypot(v.x, v.y, v.z) || 1
  return { x: v.x / l, y: v.y / l, z: v.z / l }
}
function dot(a: Vec, b: Vec) {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

async function kitWithHero() {
  const { api, step, renderers } = await loadStartedKit()
  api.defineMold('heroi', { health: 1, speed: 5 }, () => {
    api.part({ shape: 'box', color: '#0af', w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 })
  })
  api.setState('jogando')
  /** Onde a câmera REALMENTE está — lida do render, não recalculada pelo teste. */
  const camPos = (): Vec => {
    const c = (renderers as FakeRenderer[])[0]?.camera
    if (!c) throw new Error('câmera não chegou ao render')
    return { x: c.position.x, y: c.position.y, z: c.position.z }
  }
  return { api, step, camPos }
}

describe('SZGameKit3D — a frente é +Z (a convenção do curso)', () => {
  it('setYaw(90°) + moveForward manda a entidade para +X', async () => {
    const { api } = await kitWithHero()
    const e = api.spawn('heroi', 0, 0, 0)
    api.setYaw(e, 90)
    api.moveForward(e, 10)
    // +Z girado 90° em torno de Y = +X.
    const v = norm(vel(api, e))
    expect(v.x).toBeCloseTo(1, 4)
    expect(v.z).toBeCloseTo(0, 4)
  })

  it('sem rotação, moveForward vai para +Z (não para -Z)', async () => {
    const { api } = await kitWithHero()
    const e = api.spawn('heroi', 0, 0, 0)
    api.moveForward(e, 7)
    expect(vel(api, e).z).toBeCloseTo(7, 4)
  })

  it('faceVelocity alinha o +Z do mesh com a velocidade', async () => {
    const { api } = await kitWithHero()
    const e = api.spawn('heroi', 0, 0, 0)
    api.setVelocity(e, 3, 0, 0) // andando para +X
    api.faceVelocity(e)
    // Depois de encarar, andar para a frente deve manter o rumo.
    api.moveForward(e, 5)
    const v = norm(vel(api, e))
    expect(v.x).toBeCloseTo(1, 4)
    expect(Math.abs(v.z)).toBeLessThan(1e-3)
  })

  it('aimAt converge e, ao mirar, o tiro de moveForward vai NA direção do alvo', async () => {
    const { api, step } = await kitWithHero()
    api.defineMold('alvo', { health: 10, speed: 0 }, () => {
      api.part({ shape: 'sphere', color: '#f00', w: 1, h: 1, d: 1, x: 0, y: 0, z: 0 })
    })
    const torre = api.spawn('heroi', 0, 0, 0)
    const alvo = api.spawn('alvo', 12, 0, 0) // ao lado, em +X
    // aimAt usa o dt do quadro corrente: mira ao longo de vários quadros.
    for (let i = 0; i < 90; i++) {
      api.aimAt(torre, alvo, 10)
      step(1)
    }
    expect(api.isAimingAt(torre, alvo)).toBe(true)
    const tiro = api.spawnFrom('heroi', torre)
    api.moveForward(tiro, 8)
    const v = norm(vel(api, tiro))
    const rumo = norm({ x: 12, y: 0, z: 0 })
    expect(dot(v, rumo)).toBeGreaterThan(0.999)
  })
})

describe('SZGameKit3D — WASD é relativo à CÂMERA (o "está ao contrário")', () => {
  it('câmera de cima: W sobe na tela (-Z) e D vai para a direita (+X)', async () => {
    const { api, step } = await kitWithHero()
    const e = api.spawn('heroi', 0, 0, 0)
    api.cameraTop(45)
    step(1)
    press('w')
    api.moveWithKeys(e, 6)
    // Na câmera de cima o topo da tela é -Z: é o comportamento que já existia.
    expect(norm(vel(api, e)).z).toBeCloseTo(-1, 3)
    releaseAll()

    press('d')
    api.moveWithKeys(e, 6)
    expect(norm(vel(api, e)).x).toBeCloseTo(1, 3)
    releaseAll()
  })

  it('⭐ câmera que SEGUE: W afasta o herói da câmera (entra na tela)', async () => {
    const { api, step, camPos } = await kitWithHero()
    const e = api.spawn('heroi', 0, 0, 0)
    api.cameraFollow(e, 12, 6)
    // A câmera que segue ENTRA amortecida (~9,5%/quadro): sem assentar, o teste
    // mediria a câmera de órbita padrão a meio caminho, não a de seguir.
    step(60)
    const cam = camPos()
    press('w')
    api.moveWithKeys(e, 6)
    releaseAll()
    // O rumo da câmera PARA o herói, achatado: W tem que ir para lá.
    const paraOHeroi = norm({ x: pos(api, e).x - cam.x, y: 0, z: pos(api, e).z - cam.z })
    expect(dot(norm(vel(api, e)), paraOHeroi)).toBeGreaterThan(0.99)
  })

  it('⭐ câmera que SEGUE: D vai para a DIREITA da tela', async () => {
    const { api, step, camPos } = await kitWithHero()
    const e = api.spawn('heroi', 0, 0, 0)
    api.cameraFollow(e, 12, 6)
    step(60)
    const cam = camPos()
    const f = norm({ x: pos(api, e).x - cam.x, y: 0, z: pos(api, e).z - cam.z })
    // direita da tela = (-fz, 0, fx)
    const direita = { x: -f.z, y: 0, z: f.x }
    press('d')
    api.moveWithKeys(e, 6)
    releaseAll()
    expect(dot(norm(vel(api, e)), direita)).toBeGreaterThan(0.99)
  })

  it('câmera de órbita: W entra na tela mesmo com o ângulo padrão (hoje torto 40°)', async () => {
    const { api, step, camPos } = await kitWithHero()
    const e = api.spawn('heroi', 0, 0, 0)
    api.cameraOrbit(25)
    step(1)
    const cam = camPos()
    // A órbita olha para o pivô (origem): o rumo da câmera é -posição, achatado.
    const olhar = norm({ x: -cam.x, y: 0, z: -cam.z })
    press('w')
    api.moveWithKeys(e, 6)
    releaseAll()
    expect(dot(norm(vel(api, e)), olhar)).toBeGreaterThan(0.99)
  })

  it('platformerKeys segue a mesma base da câmera (e o pulo continua no eixo Y)', async () => {
    const { api, step, camPos } = await kitWithHero()
    const e = api.spawn('heroi', 0, 2, 0)
    api.cameraFollow(e, 12, 6)
    step(60)
    const cam = camPos()
    const paraOHeroi = norm({ x: pos(api, e).x - cam.x, y: 0, z: pos(api, e).z - cam.z })
    press('w')
    api.platformerKeys(e, 8, 11)
    releaseAll()
    const v = vel(api, e)
    expect(dot(norm({ x: v.x, y: 0, z: v.z }), paraOHeroi)).toBeGreaterThan(0.99)
  })
})

describe('SZGameKit3D — 1ª pessoa olha e anda para o MESMO lado', () => {
  it('⭐ o tiro do jogador em 1ª pessoa sai PARA A FRENTE (não pelas costas)', async () => {
    const { api, step } = await kitWithHero()
    const e = api.spawn('heroi', 0, 0, 0)
    api.cameraFps(e, 1.4)
    step(1)
    // moveFps anda para onde a câmera olha...
    press('w')
    api.moveFps(e, 6)
    releaseAll()
    const andar = norm(vel(api, e))
    // ...e o tiro nascido nele (spawnFrom herda o quaternion) deve ir junto.
    const tiro = api.spawnFrom('heroi', e)
    api.moveForward(tiro, 9)
    expect(dot(norm(vel(api, tiro)), andar)).toBeGreaterThan(0.999)
  })

  it('1ª pessoa: A/D andam de lado, perpendicular ao olhar', async () => {
    const { api, step } = await kitWithHero()
    const e = api.spawn('heroi', 0, 0, 0)
    api.cameraFps(e, 1.4)
    step(1)
    press('w')
    api.moveFps(e, 6)
    const frente = norm(vel(api, e))
    releaseAll()
    press('d')
    api.moveFps(e, 6)
    releaseAll()
    const lado = norm(vel(api, e))
    expect(Math.abs(dot(frente, lado))).toBeLessThan(1e-3)
  })

  it('1ª pessoa: arrastar no canvas com toque gira o olhar e o rumo', async () => {
    const { api, step } = await kitWithHero()
    const e = api.spawn('heroi', 0, 0, 0)
    api.cameraFps(e, 1.4)
    step(1)
    press('w')
    api.moveFps(e, 6)
    releaseAll()
    const antes = norm(vel(api, e))
    const canvases = document.querySelectorAll('#szg3k-canvas')
    const canvas = canvases[canvases.length - 1]
    if (!canvas) throw new Error('canvas 3D não montado')

    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
        pointerId: 7,
        pointerType: 'touch',
      }),
    )
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 220,
        clientY: 100,
        pointerId: 7,
        pointerType: 'touch',
      }),
    )
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        clientX: 220,
        clientY: 100,
        pointerId: 7,
        pointerType: 'touch',
      }),
    )
    step(1)

    press('w')
    api.moveFps(e, 6)
    releaseAll()
    const depois = norm(vel(api, e))
    expect(dot(antes, depois)).toBeLessThan(0.99)
  })

  it('olhar em 1ª pessoa reassa a matriz de uma entidade estática', async () => {
    const { api, step } = await kitWithHero()
    const e = api.spawn('heroi', 0, 0, 0) as {
      mesh: { matrix: { toArray(): number[] }; matrixAutoUpdate: boolean }
    }
    step(2)
    expect(e.mesh.matrixAutoUpdate).toBe(false)
    const before = e.mesh.matrix.toArray()
    api.cameraFps(e, 1.4)
    const canvases = document.querySelectorAll('#szg3k-canvas')
    const canvas = canvases[canvases.length - 1]
    if (!canvas) throw new Error('canvas 3D não montado')

    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
        pointerId: 9,
        pointerType: 'touch',
      }),
    )
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 180,
        clientY: 100,
        pointerId: 9,
        pointerType: 'touch',
      }),
    )
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        clientX: 180,
        clientY: 100,
        pointerId: 9,
        pointerType: 'touch',
      }),
    )
    step(1)

    expect(e.mesh.matrix.toArray()).not.toEqual(before)
    expect(e.mesh.matrixAutoUpdate).toBe(false)
  })
})

describe('SZGameKit3D — o contrato entre as duas famílias', () => {
  it('a entidade que anda com WASD e encara o rumo NÃO anda de costas', async () => {
    // O casamento que quebrava: entrada (-Z) + orientação (+Z) = 180° de erro.
    const { api, step } = await kitWithHero()
    const e = api.spawn('heroi', 0, 0, 0)
    api.cameraTop(45)
    step(1)
    press('w')
    api.moveWithKeys(e, 6)
    releaseAll()
    const rumo = norm(vel(api, e))
    api.faceVelocity(e)
    // Agora "para a frente" (o +Z do mesh) tem que ser o MESMO rumo do WASD.
    api.moveForward(e, 6)
    expect(dot(norm(vel(api, e)), rumo)).toBeGreaterThan(0.999 - EPS)
  })
})
