import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { SZIRSchema } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { gameKitBlocks } from '../blocks'
import { arenaGoblinsExample, cacaMoedasExample } from '../examples'
import { gameKitExtension } from '../index'

/**
 * Drift do exemplo "Caça-moedas profissional": a IR embutida foi GERADA pelo
 * parser real a partir do SOURCE abaixo. Se o parser evoluir e mudar a saída,
 * este teste acusa — re-embuta a IR (one-off: parseJS(SOURCE) → examples.ts).
 */

const SOURCE = `SZGameKit.setup({ width: 960, height: 540, background: "#1a1a2e", accent: "#4a9eff" });
SZGameKit.setScreenText("menu", "Caça-moedas", "WASD ou setas para andar - Esc pausa", "Jogar");
SZGameKit.createScreen("vitoria", "Você venceu!", "Pegou as 5 moedas!");
SZGameKit.addButton("vitoria", "Jogar de novo", function () {
  SZGameKit.setState("jogando");
});
const heroi = SZGameKit.createCharacter({ image: "", w: 48, h: 48, speed: 320, color: "#4a9eff" });
const moeda = SZGameKit.createCharacter({ image: "", w: 28, h: 28, speed: 0, color: "#fbbf24" });
let pontos = 0;
SZGameKit.onEnterState("jogando", function () {
  pontos = 0;
  SZGameKit.resetCharacter(heroi);
  SZGameKit.placeCharacter(moeda, 700, 120);
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.moveWithKeys(heroi, dt);
  SZGameKit.keepOnScreen(heroi);
  if (SZGameKit.touching(heroi, moeda)) {
    pontos = pontos + 1;
    SZGameKit.placeCharacter(moeda, Math.random() * (SZGameKit.width() - 28), Math.random() * (SZGameKit.height() - 28));
    if (pontos >= 5) {
      SZGameKit.setState("venceu");
      SZGameKit.showScreen("vitoria");
    }
  }
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#0f3460", true);
  SZGameKit.drawCharacter(heroi);
  SZGameKit.drawCharacter(moeda);
  ctx.fillStyle = "#ffffff";
  ctx.font = "24px sans-serif";
  ctx.fillText("Moedas: " + pontos, 20, 40);
});
SZGameKit.start();
`

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
  registerExtensionBlocks(gameKitBlocks)
})

describe('game-2d-advanced — exemplo Caça-moedas', () => {
  it('o manifest registra o exemplo (e a vitrine o herda do catálogo)', () => {
    expect(gameKitExtension.manifest.examples.map((e) => e.name)).toEqual([
      'Caça-moedas profissional',
      'Arena dos Goblins',
    ])
    expect(gameKitExtension.minLevel).toBe('intermediario')
  })

  it('IR embutida é válida, sem rawJS, e usa o paradigma inteiro', () => {
    const parsed = SZIRSchema.safeParse(cacaMoedasExample.ir)
    expect(parsed.success).toBe(true)
    const types = collectTypes(cacaMoedasExample.ir)
    expect(types.has('rawJS')).toBe(false)
    // O exemplo é a vitrine do paradigma: estados, telas, dt, personagens e
    // Canvas do núcleo dentro do onDraw (prova o ctxVar do gancho).
    for (const t of [
      'gk:setup',
      'gk:setScreenText',
      'gk:createScreen',
      'gk:addButton',
      'gk:onEnterState',
      'gk:onUpdate',
      'gk:onDraw',
      'gk:charactersTouch',
      'gk:gameWidth',
      'canvasFillText',
      'gk:start',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: parseJS(SOURCE) devolve EXATAMENTE a IR embutida', () => {
    expect(stripIds(parseJS(SOURCE))).toEqual(cacaMoedasExample.ir.js)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(cacaMoedasExample.ir.js, 0)
    const code2 = compileStatements(stripIds(parseJS(code1)), 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por BLOCOS: IR → workspace → IR estável', () => {
    const state = buildWorkspaceStateFromIR(
      cacaMoedasExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      expect(stripIds(buildIRFromWorkspace(ws).js)).toEqual(cacaMoedasExample.ir.js)
    } finally {
      ws.dispose()
    }
  })
})

const SOURCE_ARENA = `SZGameKit.setup({ width: 960, height: 540, background: "#12203a", accent: "#4a9eff" });
SZGameKit.setScreenText("menu", "Arena dos Goblins", "WASD ou setas - sobreviva!", "Entrar na arena");
SZGameKit.createScreen("vitoria", "Você resistiu!", "Missão cumprida.");
SZGameKit.addButton("vitoria", "Jogar de novo", function () {
  SZGameKit.setState("jogando");
});
SZGameKit.defineLook("goblin", function (ctx) {
  ctx.fillStyle = "#e94f4f";
  ctx.fillRect(0, 0, 40, 40);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(26, 12, 6, 6);
});
SZGameKit.defineMold("goblin", { w: 40, h: 40, health: 20, speed: 120, damage: 10, color: "#e94f4f", image: "", look: "goblin" });
SZGameKit.defineEffect("poeira", { count: 14, color: "#caa977", size: 4, life: 0.5, speed: 180, gravity: 260 });
SZGameKit.setMission(30, 10);
const heroi = SZGameKit.createCharacter({ image: "", w: 48, h: 48, speed: 300, color: "#4a9eff" });
SZGameKit.onEnterState("jogando", function () {
  SZGameKit.resetCharacter(heroi);
});
SZGameKit.startSpawner("goblin", 1.2);
SZGameKit.onUpdate(function (dt) {
  SZGameKit.moveWithKeys(heroi, dt);
  SZGameKit.keepOnScreen(heroi);
  SZGameKit.forEachActive("goblin", function (item) {
    SZGameKit.seek(item, heroi, dt);
    SZGameKit.face(item, heroi);
    if (SZGameKit.touchCircle(item, heroi)) {
      SZGameKit.hurt(heroi, 10, 1);
      SZGameKit.knockback(heroi, item, 400);
      SZGameKit.burst("poeira", SZGameKit.charX(item), SZGameKit.charY(item));
      SZGameKit.recycle(item);
      SZGameKit.emit("inimigo:morreu");
      SZGameKit.playEffect("hit");
    }
  });
  SZGameKit.cullOffscreen("goblin", 120);
  if (SZGameKit.isDead(heroi)) {
    SZGameKit.endGame();
  }
});
SZGameKit.on("inimigo:morreu", function () {
  SZGameKit.missionKill();
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#0f3460", true);
  SZGameKit.drawActive("goblin");
  SZGameKit.drawCharacter(heroi);
  SZGameKit.drawEffects();
  SZGameKit.drawHealthBar(heroi, 100);
  SZGameKit.drawTimer(20, 40);
});
SZGameKit.start();
`

describe('game-2d-advanced — exemplo Arena dos Goblins (P24)', () => {
  it('IR embutida é válida, sem rawJS, e usa TODO grupo novo', () => {
    const parsed = SZIRSchema.safeParse(arenaGoblinsExample.ir)
    expect(parsed.success).toBe(true)
    const types = collectTypes(arenaGoblinsExample.ir)
    expect(types.has('rawJS')).toBe(false)
    for (const t of [
      'gk:onEvent',
      'gk:emit',
      'gk:defineMold',
      'gk:startSpawner',
      'gk:forEachActive',
      'gk:cullOffscreen',
      'gk:recycle',
      'gk:drawActive',
      'gk:defineLook',
      'gk:seek',
      'gk:face',
      'gk:hurt',
      'gk:knockback',
      'gk:touchCircle',
      'gk:isDead',
      'gk:setMission',
      'gk:missionKill',
      'gk:drawTimer',
      'gk:defineEffect',
      'gk:burst',
      'gk:drawEffects',
      'gk:playEffect',
      'canvasFillRect', // Canvas do núcleo DENTRO da aparência (prova o ctxVar)
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: parseJS(SOURCE) devolve EXATAMENTE a IR embutida', () => {
    expect(stripIds(parseJS(SOURCE_ARENA))).toEqual(arenaGoblinsExample.ir.js)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(arenaGoblinsExample.ir.js, 0)
    const code2 = compileStatements(stripIds(parseJS(code1)), 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por BLOCOS: IR → workspace → IR estável', () => {
    const state = buildWorkspaceStateFromIR(
      arenaGoblinsExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      expect(stripIds(buildIRFromWorkspace(ws).js)).toEqual(arenaGoblinsExample.ir.js)
    } finally {
      ws.dispose()
    }
  })
})
