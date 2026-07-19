import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { gameKit3DBlocks } from '../blocks'
import { saltoNasNuvensExample } from '../examples'
import { gameKit3DManifest } from '../manifest'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'

/**
 * Drift do exemplo "Salto nas Nuvens" (mini-plataforma 3D). Prova a LARGURA da
 * v0.2.0: física/plataforma (fall/makeSolid/platformerKeys/posOf), formas &
 * material (torus + brilho), luz de ambiente, emissor contínuo (emitterOn) e
 * câmera seguidora. A IR embutida em examples.ts foi GERADA pelo parser real a
 * partir do SOURCE abaixo — se o parser/gerador mudarem a forma canônica, este
 * teste avisa: re-rode o fonte por parseJS e re-embuta a IR.
 */

const SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 60, sky: "#0b1026", ground: "#1e293b" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.1, vignette: true });
SZGameKit3D.setScreenText("menu", "Salto nas Nuvens", "Pule de plataforma em plataforma e junte as moedas. Cuidado para não cair!", "Pular");
SZGameKit3D.setScreenText("vitoria", "Você juntou tudo!", "Que pulos!", "Jogar de novo");
SZGameKit3D.defineMold("heroi", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#38bdf8", w: 0.9, h: 1.1, d: 0.9, x: 0, y: 0.55, z: 0 });
  SZGameKit3D.part({ shape: "sphere", color: "#e0f2fe", w: 0.7, h: 0.7, d: 0.7, x: 0, y: 1.3, z: 0 });
});
SZGameKit3D.defineMold("chao", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#334155", w: 4, h: 0.6, d: 4, x: 0, y: 0, z: 0 });
});
SZGameKit3D.defineMold("moeda", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "torus", material: "brilho", color: "#fde047", w: 0.7, h: 0.7, d: 0.3, x: 0, y: 0, z: 0 });
});
SZGameKit3D.makeSolid("chao");
SZGameKit3D.defineEmitter("poeira", { colorFrom: "#e0f2fe", colorTo: "#38bdf8", sizeFrom: 0.35, sizeTo: 0, rate: 18, speed: 1.5, cone: 40, gravity: -3, glow: true });
SZGameKit3D.defineEffect("brilho", { count: 16, colorFrom: "#fde047", colorTo: "#f97316", spread: 4, sizeFrom: 0.4, sizeTo: 0, life: 0.5, gravity: 2 });
let moedas = 0;
SZGameKit3D.onEnterState("jogando", function () {
  moedas = 0;
  SZGameKit3D.setAmbient(0.5);
  SZGameKit3D.addLight("#fef3c7", 0, 16, 6, 1.2);
  SZGameKit3D.spawn("chao", 0, 0, 0);
  SZGameKit3D.spawn("chao", 7, 1.5, -2);
  SZGameKit3D.spawn("chao", -7, 3, 2);
  SZGameKit3D.spawn("chao", 0, 4.5, -8);
  SZGameKit3D.spawn("moeda", 7, 3, -2);
  SZGameKit3D.spawn("moeda", -7, 4.5, 2);
  SZGameKit3D.spawn("moeda", 0, 6, -8);
  const heroi = SZGameKit3D.spawn("heroi", 0, 3, 0);
  SZGameKit3D.cameraFollow(heroi, 12, 6);
  SZGameKit3D.emitterOn("poeira", heroi);
});
SZGameKit3D.onEntityStateUpdate("heroi", "parado", function (ela, dt) {
  SZGameKit3D.platformerKeys(ela, 8, 11);
  SZGameKit3D.forEachNear(ela, "moeda", 1.4, function (m) {
    SZGameKit3D.burstOn("brilho", m);
    SZGameKit3D.recycle(m);
    moedas = moedas + 1;
    if (moedas >= 3) {
      SZGameKit3D.setState("vitoria");
    }
  });
  if (SZGameKit3D.posOf(ela, "y") < -12) {
    SZGameKit3D.setState("menu");
  }
});
SZGameKit3D.onEntityStateUpdate("moeda", "parado", function (ela, dt) {
  SZGameKit3D.setYaw(ela, SZGameKit3D.stateTime(ela) * 120);
});
SZGameKit3D.onUpdate(function (dt) {
  SZGameKit3D.setHud("top-left", "Moedas: " + moedas);
  SZGameKit3D.setHud("top-right", "Faltam: " + (3 - moedas));
});
SZGameKit3D.start();
`.trim()

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id') continue
      out[k] = stripIds(v)
    }
    return out as T
  }
  return value
}

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

describe('Exemplo Salto nas Nuvens — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d-advanced', () => {
    expect(gameKit3DManifest.examples).toContain(saltoNasNuvensExample)
    expect(saltoNasNuvensExample.ir.extensions).toEqual([{ extensionId: 'game-3d-advanced' }])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(stripIds(behaviorStatements(saltoNasNuvensExample.ir)) as JSStatement[])
  })

  it('exercita a largura da v0.2.0 (física + emissor + luz)', () => {
    const types = collectTypes(behaviorStatements(saltoNasNuvensExample.ir))
    expect(types.has('g3k:makeSolid')).toBe(true)
    expect(types.has('g3k:platformerKeys')).toBe(true)
    expect(types.has('g3k:defineEmitter')).toBe(true)
    expect(types.has('g3k:emitterOn')).toBe(true)
    expect(types.has('g3k:addLight')).toBe(true)
    expect(types.has('g3k:setAmbient')).toBe(true)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(saltoNasNuvensExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      saltoNasNuvensExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(saltoNasNuvensExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
