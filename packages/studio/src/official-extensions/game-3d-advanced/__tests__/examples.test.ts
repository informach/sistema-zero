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
import { defesaDaTorreExample } from '../examples'
import { gameKit3DManifest } from '../manifest'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'

/**
 * Drift do exemplo "Defesa da Torre": a IR embutida em examples.ts foi gerada
 * pelo parser real a partir do SOURCE achatado abaixo. Se o parser/gerador
 * mudarem a forma canônica, este teste avisa — re-rode o fonte por parseJS e
 * re-embuta a IR (comentário no examples.ts).
 */

const SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 60, sky: "#0b1026", ground: "#14532d" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.2, vignette: true });
SZGameKit3D.setScreenText("menu", "Defesa da Torre", "Os invasores vêm da beirada do mundo. Suas torres têm cérebro próprio!", "Defender");
SZGameKit3D.setScreenText("vitoria", "O cristal sobreviveu!", "As torres agradecem.", "Defender de novo");
SZGameKit3D.defineMold("cristal", { health: 200, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#0e7490", w: 2.2, h: 0.4, d: 2.2, x: 0, y: 0.2, z: 0 });
  SZGameKit3D.part({ shape: "cone", color: "#22d3ee", w: 1.6, h: 3, d: 1.6, x: 0, y: 1.9, z: 0 });
});
SZGameKit3D.defineMold("torre", { health: 120, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "cylinder", color: "#64748b", w: 1.2, h: 2, d: 1.2, x: 0, y: 1, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#94a3b8", w: 0.4, h: 0.4, d: 1.4, x: 0, y: 2, z: 0.5 });
});
SZGameKit3D.defineMold("invasor", { health: 30, speed: 3 }, function () {
  SZGameKit3D.part({ shape: "sphere", color: "#ef4444", w: 1.2, h: 1.2, d: 1.2, x: 0, y: 0.6, z: 0 });
  SZGameKit3D.part({ shape: "cone", color: "#7f1d1d", w: 0.7, h: 0.8, d: 0.7, x: 0, y: 1.6, z: 0 });
});
SZGameKit3D.defineMold("tiro", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "sphere", color: "#fde047", w: 0.35, h: 0.35, d: 0.35, x: 0, y: 0, z: 0 });
});
SZGameKit3D.defineEffect("explosao", { count: 30, colorFrom: "#fb923c", colorTo: "#451a03", spread: 8, sizeFrom: 0.6, sizeTo: 0, life: 0.8, gravity: -9 });
SZGameKit3D.defineEffect("faisca", { count: 10, colorFrom: "#fde047", colorTo: "#fb923c", spread: 3, sizeFrom: 0.3, sizeTo: 0, life: 0.3, gravity: 0 });
let pontos = 0;
SZGameKit3D.onEnterState("jogando", function () {
  pontos = 0;
  SZGameKit3D.scatterDecor(20);
  SZGameKit3D.spawn("cristal", 0, 0, 0);
  SZGameKit3D.spawn("torre", 8, 0, 8);
  SZGameKit3D.spawn("torre", -8, 0, 8);
  SZGameKit3D.spawn("torre", 0, 0, -10);
  SZGameKit3D.startSpawner("invasor", 2, "edge");
  SZGameKit3D.cameraTop(45);
});
SZGameKit3D.onEntityStateUpdate("torre", "parado", function (ela, dt) {
  const alvo = SZGameKit3D.nearest("invasor", ela);
  if (SZGameKit3D.exists(alvo) && SZGameKit3D.touches(ela, alvo, 14)) {
    SZGameKit3D.setEntityState(ela, "mirar");
  }
});
SZGameKit3D.onEntityStateUpdate("torre", "mirar", function (ela, dt) {
  const alvo = SZGameKit3D.nearest("invasor", ela);
  if (!SZGameKit3D.exists(alvo)) {
    SZGameKit3D.setEntityState(ela, "parado");
  } else {
    SZGameKit3D.aimAt(ela, alvo, 6);
    if (SZGameKit3D.isAimingAt(ela, alvo)) {
      SZGameKit3D.setEntityState(ela, "atirar");
    }
  }
});
SZGameKit3D.onEnterEntityState("torre", "atirar", function (ela) {
  SZGameKit3D.spawnFrom("tiro", ela);
  SZGameKit3D.playEffect("laser");
  SZGameKit3D.setEntityState(ela, "recarregar");
});
SZGameKit3D.stateTimer("torre", "recarregar", 1, "parado");
SZGameKit3D.onEntityStateUpdate("invasor", "parado", function (ela, dt) {
  const alvo = SZGameKit3D.nearest("cristal", ela);
  if (SZGameKit3D.exists(alvo)) {
    SZGameKit3D.seek(ela, alvo);
    SZGameKit3D.faceVelocity(ela);
    if (SZGameKit3D.touches(ela, alvo, 2)) {
      SZGameKit3D.hurt(alvo, 15);
      SZGameKit3D.burstOn("explosao", ela);
      SZGameKit3D.recycle(ela);
    }
  }
});
SZGameKit3D.onEntityStateUpdate("tiro", "parado", function (ela, dt) {
  SZGameKit3D.moveForward(ela, 18);
  SZGameKit3D.forEachNear(ela, "invasor", 1.5, function (vitima) {
    SZGameKit3D.hurt(vitima, 15);
    SZGameKit3D.burstOn("faisca", vitima);
    SZGameKit3D.recycle(ela);
  });
});
SZGameKit3D.onEntityDeath("invasor", function (ela) {
  SZGameKit3D.burstOn("explosao", ela);
  SZGameKit3D.playEffect("explosion");
  pontos = pontos + 1;
  if (pontos >= 15) {
    SZGameKit3D.setState("vitoria");
  }
});
SZGameKit3D.onEntityDeath("cristal", function (ela) {
  SZGameKit3D.burstOn("explosao", ela);
  SZGameKit3D.playEffect("gameover");
  SZGameKit3D.endGame();
});
SZGameKit3D.onUpdate(function (dt) {
  SZGameKit3D.cullFar("tiro", 40);
  SZGameKit3D.setHud("top-left", "Derrotados: " + pontos);
  SZGameKit3D.setHud("top-right", "Invasores: " + SZGameKit3D.countAlive("invasor"));
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

describe('Exemplo Defesa da Torre — drift contra o parser real', () => {
  it('está registrado no manifest e a extensão é nível avançado', () => {
    expect(gameKit3DManifest.examples).toContain(defesaDaTorreExample)
    expect(defesaDaTorreExample.ir.extensions).toEqual([{ extensionId: 'game-3d-advanced' }])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(stripIds(behaviorStatements(defesaDaTorreExample.ir)) as JSStatement[])
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(defesaDaTorreExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      defesaDaTorreExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(defesaDaTorreExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})
