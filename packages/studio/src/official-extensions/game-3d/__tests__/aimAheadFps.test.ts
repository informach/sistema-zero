import { describe, expect, it } from 'bun:test'
import * as RealTHREE from 'three'
import { gameThreeDRuntime } from '../runtime'

/**
 * Regressão da MIRA em primeira pessoa (Lote C, "Labirinto dos Robôs").
 *
 * O `getWorldDirection` de um Object3D aponta +Z, mas a câmera-filha do modo
 * FPS olha -Z (convenção do three) e o `fpsControls` anda no -Z do yaw. Sem o
 * ramo especial, `aimAhead(jogador)` atirava 180° PARA TRÁS do crosshair. O
 * fix faz a mira FPS usar a direção/origem da CÂMERA (inclui o pitch), e fora
 * do FPS preserva o +Z clássico (torretas construídas olhando +Z).
 *
 * ⭐ THREE de VERDADE (receita do kitHarness do g3k): um fake com a matemática
 * de rotação zerada esconderia exatamente esta classe de bug.
 */

const runtimeBody = gameThreeDRuntime.replace(/^import \* as THREE from 'three';\n/, '')

interface AimApi {
  createScene: (canvasId: string) => unknown
  createBox: (world: unknown, opts?: { size?: number; color?: string }) => RealTHREE.Object3D
  setPosition: (obj: unknown, x: number, y: number, z: number) => void
  fpsCamera: (world: unknown, obj: unknown) => void
  aimAhead: (world: unknown, obj: unknown, dist?: number) => unknown
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
