import { describe, expect, it } from 'bun:test'
import * as RealTHREE from 'three'
import { gameThreeDRuntime } from '../runtime'

/**
 * Regressão das CONVENÇÕES DE FRENTE em primeira pessoa (Lote C, "Labirinto
 * dos Robôs"): aimAhead E moveForward.
 *
 * O `getWorldDirection` de um Object3D aponta +Z, mas a câmera-filha do modo
 * FPS olha -Z (convenção do three) e o `fpsControls` anda no -Z do yaw. Sem o
 * ramo especial, `aimAhead(jogador)` atirava (e `moveForward` andava) 180°
 * PARA TRÁS do crosshair. O fix faz a mira FPS usar a direção/origem da CÂMERA
 * (inclui o pitch) e o passo FPS usar a direção HORIZONTAL da vista (pitch
 * achatado: olhar para cima não faz o passo voar); fora do FPS ambos preservam
 * o +Z clássico (torretas construídas olhando +Z).
 *
 * ⭐ THREE de VERDADE (receita do kitHarness do g3k): um fake com a matemática
 * de rotação zerada esconderia exatamente esta classe de bug.
 */

const runtimeBody = gameThreeDRuntime.replace(/^import \* as THREE from 'three';\n/, '')

interface AimWorld {
  camera: RealTHREE.PerspectiveCamera
}

interface AimApi {
  createScene: (canvasId: string) => AimWorld
  createBox: (world: unknown, opts?: { size?: number; color?: string }) => RealTHREE.Object3D
  setPosition: (obj: unknown, x: number, y: number, z: number) => void
  fpsCamera: (world: unknown, obj: unknown) => void
  aimAhead: (world: unknown, obj: unknown, dist?: number) => unknown
  moveForward: (obj: unknown, dist: number) => void
}

function loadRealThreeRuntime(): AimApi {
  function FakeWebGLRenderer() {
    return {
      setPixelRatio: () => {},
      setSize: () => {},
      setAnimationLoop: () => {},
      dispose: () => {},
      forceContextLoss: () => {},
    }
  }
  const THREE = {
    ...RealTHREE,
    WebGLRenderer: FakeWebGLRenderer as unknown as new () => unknown,
  }
  const win = {
    devicePixelRatio: 1,
    addEventListener() {},
    SZGame3D: undefined,
  } as unknown as Record<string, unknown>
  const doc = {
    getElementById: () => ({ width: 400, height: 300, addEventListener() {} }),
    addEventListener() {},
  }
  new Function('THREE', 'window', 'document', runtimeBody)(THREE, win, doc)
  return win.SZGame3D as AimApi
}

describe('aimAhead — convenções de frente', () => {
  it('sob a câmera FPS mira o que o jogador VÊ (direção da câmera, não o +Z do corpo)', () => {
    const api = loadRealThreeRuntime()
    const world = api.createScene('tela')
    const jogador = api.createBox(world, { size: 1 })
    api.setPosition(jogador, 0, 1, 0)
    // Alvo à FRENTE da vista (câmera olha -Z com yaw 0) e isca ATRÁS (+Z, onde
    // o bug antigo atirava). Tamanho 2 para o raio na altura do olho (y=1.6)
    // cruzar a caixa (centro y=1, faces 0..2).
    const alvoNaFrente = api.createBox(world, { size: 2 })
    api.setPosition(alvoNaFrente, 0, 1, -6)
    const iscaAtras = api.createBox(world, { size: 2 })
    api.setPosition(iscaAtras, 0, 1, 6)

    api.fpsCamera(world, jogador)
    expect(api.aimAhead(world, jogador, 50)).toBe(alvoNaFrente)

    // Com o corpo girado 180° (yaw = π), a vista aponta +Z: agora é a isca.
    jogador.rotation.y = Math.PI
    expect(api.aimAhead(world, jogador, 50)).toBe(iscaAtras)
  })

  it('com PITCH (olhar para cima/baixo) a mira acompanha a câmera e acerta alvos altos e baixos', () => {
    const api = loadRealThreeRuntime()
    const world = api.createScene('tela')
    const jogador = api.createBox(world, { size: 1 })
    api.setPosition(jogador, 0, 1, 0)
    // Isca no nível do olho (a mira SEM pitch bateria nela), alvo lá em cima e
    // alvo lá embaixo, todos à frente (-Z). Olho do FPS: y = 1 + 0.6 = 1.6.
    const iscaNivelada = api.createBox(world, { size: 2 })
    api.setPosition(iscaNivelada, 0, 1, -12)
    const alvoAlto = api.createBox(world, { size: 2 })
    api.setPosition(alvoAlto, 0, 6, -6)
    const alvoBaixo = api.createBox(world, { size: 2 })
    api.setPosition(alvoBaixo, 0, -3, -6)

    api.fpsCamera(world, jogador)
    // Inclina a câmera-filha para CIMA na medida do alvo alto (dentro do clamp
    // de ±1.4 rad do mouse do FPS): o raio tem de subir junto.
    world.camera.rotation.x = Math.atan2(6 - 1.6, 6)
    expect(api.aimAhead(world, jogador, 50)).toBe(alvoAlto)
    // E para BAIXO: acerta o alvo abaixo do nível do olho.
    world.camera.rotation.x = -Math.atan2(1.6 - -3, 6)
    expect(api.aimAhead(world, jogador, 50)).toBe(alvoBaixo)
    // Pitch de volta a zero: a isca nivelada volta a ser o alvo (sanidade).
    world.camera.rotation.x = 0
    expect(api.aimAhead(world, jogador, 50)).toBe(iscaNivelada)
  })

  it('fora do FPS preserva o +Z do objeto (torretas construídas olhando +Z)', () => {
    const api = loadRealThreeRuntime()
    const world = api.createScene('tela')
    const torreta = api.createBox(world, { size: 1 })
    api.setPosition(torreta, 0, 1, 0)
    const alvoMaisZ = api.createBox(world, { size: 2 })
    api.setPosition(alvoMaisZ, 0, 1, 6)

    // Sem fpsCamera neste objeto: a frente clássica é o +Z do getWorldDirection.
    expect(api.aimAhead(world, torreta, 50)).toBe(alvoMaisZ)
  })
})

describe('moveForward — convenções de frente (mesma classe do aimAhead)', () => {
  it('sob a câmera FPS anda na direção da VISTA (câmera), inclusive com o corpo girado 180°', () => {
    const api = loadRealThreeRuntime()
    const world = api.createScene('tela')
    const jogador = api.createBox(world, { size: 1 })
    api.setPosition(jogador, 0, 1, 0)
    api.fpsCamera(world, jogador)

    // Yaw 0: a câmera olha -Z. O passo tem de ir para -Z (o bug antigo, +Z do
    // getWorldDirection do corpo, andava 180° às costas da vista).
    api.moveForward(jogador, 0.5)
    expect(jogador.position.z).toBeCloseTo(-0.5, 6)
    expect(jogador.position.x).toBeCloseTo(0, 6)

    // Corpo girado 180° (yaw = π): a vista aponta +Z e o passo acompanha.
    jogador.rotation.y = Math.PI
    api.moveForward(jogador, 0.5)
    expect(jogador.position.z).toBeCloseTo(0, 6)
  })

  it('sob FPS o passo é HORIZONTAL: olhar para cima não faz o passo voar', () => {
    const api = loadRealThreeRuntime()
    const world = api.createScene('tela')
    const jogador = api.createBox(world, { size: 1 })
    api.setPosition(jogador, 0, 1, 0)
    api.fpsCamera(world, jogador)

    // Pitch bem para cima (clamp do mouse é ±1.4 rad): y não pode mudar e o
    // passo no chão continua com o TAMANHO pedido (direção re-normalizada).
    world.camera.rotation.x = 1.2
    api.moveForward(jogador, 0.5)
    expect(jogador.position.y).toBeCloseTo(1, 6)
    expect(jogador.position.z).toBeCloseTo(-0.5, 6)
  })

  it('sem FPS preserva o +Z clássico do objeto', () => {
    const api = loadRealThreeRuntime()
    const world = api.createScene('tela')
    const carrinho = api.createBox(world, { size: 1 })
    api.setPosition(carrinho, 0, 1, 0)

    api.moveForward(carrinho, 0.5)
    expect(carrinho.position.z).toBeCloseTo(0.5, 6)
    expect(carrinho.position.y).toBeCloseTo(1, 6)

    // E com um FPS ativo em OUTRO objeto, este continua no +Z próprio.
    const jogador = api.createBox(world, { size: 1 })
    api.fpsCamera(world, jogador)
    api.moveForward(carrinho, 0.5)
    expect(carrinho.position.z).toBeCloseTo(1, 6)
  })
})
