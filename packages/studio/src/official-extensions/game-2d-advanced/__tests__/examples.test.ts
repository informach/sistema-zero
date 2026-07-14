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
import {
  arenaGoblinsExample,
  cacaMoedasExample,
  florestaNinjaExample,
  vilaDoDragaoExample,
} from '../examples'
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
      'Vila do Dragão',
      'Floresta Ninja',
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
SZGameKit.setScreenText("menu", "Arena dos Goblins", "WASD anda - J golpeia - derrote 10!", "Entrar na arena");
SZGameKit.defineLook("goblin", function (ctx) {
  ctx.fillStyle = "#e94f4f";
  ctx.fillRect(0, 0, 40, 40);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(26, 12, 6, 6);
}, 40, 40);
SZGameKit.defineMold("goblin", { w: 40, h: 40, health: 20, speed: 120, damage: 10, color: "#e94f4f", image: "", look: "goblin" });
SZGameKit.defineEffect("poeira", { count: 14, color: "#caa977", size: 4, life: 0.5, speed: 180, gravity: 260 });
SZGameKit.setMission(60, 10);
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
    if (SZGameKit.keyPressed("j") && SZGameKit.touchCircle(heroi, item)) {
      SZGameKit.hurt(item, 10, 0.2);
      SZGameKit.knockback(item, heroi, 300);
      SZGameKit.playEffect("hit");
    }
    if (SZGameKit.isDead(item)) {
      SZGameKit.burst("poeira", SZGameKit.charX(item), SZGameKit.charY(item));
      SZGameKit.recycle(item);
      SZGameKit.emit("inimigo:morreu");
    }
    if (SZGameKit.touchCircle(item, heroi) && !SZGameKit.isInvincible(heroi)) {
      SZGameKit.hurt(heroi, 10, 1);
      SZGameKit.knockback(heroi, item, 400);
      SZGameKit.playEffect("hurt");
    }
  });
  SZGameKit.cullOffscreen("goblin", 200);
  if (SZGameKit.isDead(heroi)) {
    SZGameKit.endGame();
  }
});
SZGameKit.on("inimigo:morreu", function () {
  SZGameKit.missionKill();
  SZGameKit.playEffect("explosion");
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#0f3460", true);
  SZGameKit.drawActive("goblin");
  SZGameKit.drawCharacter(heroi);
  SZGameKit.drawEffects();
  SZGameKit.drawHealthBar(heroi, 0);
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
      // R1: o herói ATACA (edge-trigger) e o dano passa pelo gate do P24.
      'gk:keyPressed',
      'gk:isInvincible',
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
    // O defineLook novo carrega o tamanho-base (drawActive escala dele).
    const look = arenaGoblinsExample.ir.js.find((s) => s.type === 'gk:defineLook')
    expect(look && 'baseW' in look ? look.baseW : undefined).toEqual({ type: 'num', value: 40 })
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

const SOURCE_VILA = `SZGameKit.setup({ width: 960, height: 640, background: "#1c1330", accent: "#fbbf24" });
SZGameKit.setScreenText("menu", "Vila do Dragão", "Setas andam - espaço conversa - derrote o dragão!", "Começar a aventura");
SZGameKit.setScreenText("vitoria", "Vila salva!", "O dragão foi derrotado. Você é uma lenda!", "");
SZGameKit.defineLook("ferreiro", function (ctx) {
  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(12, 24, 40, 40);
  ctx.fillStyle = "#f3c78a";
  ctx.fillRect(20, 8, 24, 20);
}, 64, 64);
SZGameKit.defineLook("dragao", function (ctx) {
  ctx.fillStyle = "#2f9e44";
  ctx.fillRect(8, 16, 48, 40);
  ctx.fillStyle = "#b2f2bb";
  ctx.fillRect(16, 24, 10, 10);
  ctx.fillStyle = "#e03131";
  ctx.fillRect(40, 24, 8, 8);
}, 64, 64);
SZGameKit.rpgBattleStats(30, 8, 2);
SZGameKit.rpgSetSpecial("Espada flamejante", 18, 4);
const heroi = SZGameKit.createCharacter({ image: "", w: 64, h: 64, speed: 260, color: "#4a9eff" });
SZGameKit.rpgOnMap("vila", function () {
  SZGameKit.placeCharacter(heroi, SZGameKit.rpgCell(2), SZGameKit.rpgCell(2));
  SZGameKit.rpgBlockCell(5, 1);
  SZGameKit.rpgBlockCell(5, 2);
  SZGameKit.rpgCreateNpc("ferreiro", 7, 3, "", "ferreiro");
  if (!SZGameKit.rpgHasFlag("intro")) {
    SZGameKit.rpgCutscene(function () {
      SZGameKit.rpgNpcWalkTo("ferreiro", 3, 2);
      SZGameKit.rpgFace("ferreiro", "left");
      SZGameKit.rpgSay("Ei, viajante! A vila do dragao precisa de voce.", "Ferreiro");
    });
    SZGameKit.rpgAddFlag("intro");
  }
  if (SZGameKit.rpgHasItem("chave")) {
    SZGameKit.rpgCreateDoor(9, 6, "caverna");
  }
});
SZGameKit.rpgOnMap("caverna", function () {
  SZGameKit.placeCharacter(heroi, SZGameKit.rpgCell(1), SZGameKit.rpgCell(5));
  SZGameKit.rpgCreateNpc("dragao", 8, 2, "", "dragao");
  SZGameKit.rpgCreateDoor(0, 5, "vila");
  SZGameKit.rpgOnStep(4, 5, function () {
    SZGameKit.rpgSay("Cheiro de enxofre... o dragao esta perto!", "");
  });
});
SZGameKit.rpgOnTalk("ferreiro", function () {
  if (SZGameKit.rpgHasFlag("aceitou-missao")) {
    SZGameKit.rpgSay("A caverna fica no canto de baixo. Boa sorte!", "Ferreiro");
  } else {
    SZGameKit.rpgSay("O dragão roubou o ouro da vila!", "Ferreiro");
    SZGameKit.rpgSay("Tome a chave da caverna e esta poção. Só você pode nos salvar!", "Ferreiro");
    SZGameKit.rpgGiveItem("chave", "");
    SZGameKit.rpgGivePotion("Poção", 20);
    SZGameKit.rpgAddFlag("aceitou-missao");
    SZGameKit.rpgCreateDoor(9, 6, "caverna");
  }
});
SZGameKit.rpgOnTalk("dragao", function () {
  SZGameKit.rpgBattleStart("Dragão", 40, 6, 3);
});
SZGameKit.rpgOnBattleEnd(function () {
  if (SZGameKit.rpgBattleWon()) {
    SZGameKit.rpgBattleReward(25);
    SZGameKit.setState("vitoria");
  } else {
    SZGameKit.endGame();
  }
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.rpgMoveGrid(heroi, 64, dt);
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#2a1f45", true);
  SZGameKit.rpgDrawNpcs();
  SZGameKit.drawCharacter(heroi);
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.rpgDrawInventory(20, 20);
});
SZGameKit.start();
`

describe('game-2d-advanced — exemplo Vila do Dragão (Kit RPG)', () => {
  it('o manifest registra os 4 exemplos', () => {
    expect(gameKitExtension.manifest.examples.map((e) => e.name)).toEqual([
      'Caça-moedas profissional',
      'Arena dos Goblins',
      'Vila do Dragão',
      'Floresta Ninja',
    ])
  })

  it('IR embutida é válida, sem rawJS, e usa o Kit RPG inteiro', () => {
    const parsed = SZIRSchema.safeParse(vilaDoDragaoExample.ir)
    expect(parsed.success).toBe(true)
    const types = collectTypes(vilaDoDragaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    for (const t of [
      'gk:rpgOnMap',
      'gk:rpgCreateDoor',
      'gk:rpgBlockCell',
      'gk:rpgCell',
      'gk:rpgCreateNpc',
      'gk:rpgDrawNpcs',
      'gk:rpgOnTalk',
      'gk:rpgSay',
      'gk:rpgAddFlag',
      'gk:rpgHasFlag',
      'gk:rpgGiveItem',
      'gk:rpgHasItem',
      'gk:rpgDrawInventory',
      'gk:rpgMoveGrid',
      'gk:rpgBattleStats',
      'gk:rpgBattleStart',
      'gk:rpgOnBattleEnd',
      'gk:rpgBattleWon',
      // V6: cena de abertura (cutscene) + NPC que anda + gatilho ao pisar
      'gk:rpgCutscene',
      'gk:rpgNpcWalkTo',
      'gk:rpgFace',
      'gk:rpgOnStep',
      // V8: batalha rica (golpe especial, poção, XP)
      'gk:rpgSetSpecial',
      'gk:rpgGivePotion',
      'gk:rpgBattleReward',
      'gk:onDrawHud', // HUD do R2 no exemplo (inventário preso na tela)
      'gk:defineLook', // NPCs vetoriais (asset-free)
      'if', // conversa condicionada pela história
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: parseJS(SOURCE) devolve EXATAMENTE a IR embutida', () => {
    expect(stripIds(parseJS(SOURCE_VILA))).toEqual(vilaDoDragaoExample.ir.js)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(vilaDoDragaoExample.ir.js, 0)
    const code2 = compileStatements(stripIds(parseJS(code1)), 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por BLOCOS: IR → workspace → IR estável', () => {
    const state = buildWorkspaceStateFromIR(
      vilaDoDragaoExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      expect(stripIds(buildIRFromWorkspace(ws).js)).toEqual(vilaDoDragaoExample.ir.js)
    } finally {
      ws.dispose()
    }
  })
})

const SOURCE_FLORESTA = `SZGameKit.setup({ width: 800, height: 600, background: "#16281c", accent: "#8fe388" });
SZGameKit.setScreenText("menu", "Floresta Ninja", "WASD anda, ESPACO ataca. Derrote os ninjas!", "Começar");
SZGameKit.createScreen("vitoria", "Você venceu!", "Os ninjas foram derrotados!");
SZGameKit.addButton("vitoria", "Jogar de novo", function () {
  SZGameKit.setState("jogando");
});
const heroi = SZGameKit.createCharacter({ image: "", w: 40, h: 40, speed: 220, color: "#8fe388" });
const ninja1 = SZGameKit.createCharacter({ image: "", w: 36, h: 36, speed: 80, color: "#e0526a" });
const ninja2 = SZGameKit.createCharacter({ image: "", w: 36, h: 36, speed: 80, color: "#e0526a" });
SZGameKit.defineEffect("poeira", { count: 14, color: "#d9f5c8", size: 4, life: 0.5, speed: 180, gravity: 120 });
SZGameKit.onEnterState("jogando", function () {
  SZGameKit.placeCharacter(heroi, 380, 280);
  SZGameKit.placeCharacter(ninja1, 120, 120);
  SZGameKit.placeCharacter(ninja2, 620, 440);
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.moveWithKeys(heroi, dt);
  SZGameKit.keepOnScreen(heroi);
  if (SZGameKit.keyPressed(" ")) {
    SZGameKit.attackFacing(heroi, 46, 0.25);
  }
  if (!SZGameKit.isDead(ninja1)) {
    SZGameKit.patrolAround(ninja1, 120, 120, 130);
    if (SZGameKit.didHit(heroi, ninja1)) {
      SZGameKit.hurt(ninja1, 5, 0);
      SZGameKit.burst("poeira", SZGameKit.charX(ninja1), SZGameKit.charY(ninja1));
      SZGameKit.playEffect("hit");
    }
  }
  if (!SZGameKit.isDead(ninja2)) {
    SZGameKit.patrolAround(ninja2, 620, 440, 130);
    if (SZGameKit.didHit(heroi, ninja2)) {
      SZGameKit.hurt(ninja2, 5, 0);
      SZGameKit.burst("poeira", SZGameKit.charX(ninja2), SZGameKit.charY(ninja2));
      SZGameKit.playEffect("hit");
    }
  }
  if (SZGameKit.isDead(ninja1) && SZGameKit.isDead(ninja2)) {
    SZGameKit.setState("vitoria");
  }
});
SZGameKit.onDraw(function () {
  SZGameKit.drawBackground("#16281c", true);
  SZGameKit.drawShadow(heroi);
  SZGameKit.drawCharacter(heroi);
  if (!SZGameKit.isDead(ninja1)) {
    SZGameKit.drawShadow(ninja1);
    SZGameKit.drawCharacter(ninja1);
  }
  if (!SZGameKit.isDead(ninja2)) {
    SZGameKit.drawShadow(ninja2);
    SZGameKit.drawCharacter(ninja2);
  }
});
SZGameKit.onDrawHud(function () {
  SZGameKit.drawHearts(3, 3, 20, 20);
});
SZGameKit.start();`

describe('game-2d-advanced — exemplo Floresta Ninja (ação Zelda)', () => {
  it('IR embutida é válida, sem rawJS, e usa os blocos de AÇÃO', () => {
    const parsed = SZIRSchema.safeParse(florestaNinjaExample.ir)
    expect(parsed.success).toBe(true)
    const types = collectTypes(florestaNinjaExample.ir)
    expect(types.has('rawJS')).toBe(false)
    for (const t of [
      'gk:attackFacing',
      'gk:didHit',
      'gk:patrolAround',
      'gk:drawHearts',
      'gk:drawShadow', // profundidade (sombra) do V9
      'gk:isDead',
      'gk:burst', // faíscas ao apanhar
      'gk:onDrawHud', // corações presos na tela
      'if',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: parseJS(SOURCE) devolve EXATAMENTE a IR embutida', () => {
    expect(stripIds(parseJS(SOURCE_FLORESTA))).toEqual(florestaNinjaExample.ir.js)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(florestaNinjaExample.ir.js, 0)
    const code2 = compileStatements(stripIds(parseJS(code1)), 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por BLOCOS: IR → workspace → IR estável', () => {
    const state = buildWorkspaceStateFromIR(
      florestaNinjaExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      expect(stripIds(buildIRFromWorkspace(ws).js)).toEqual(florestaNinjaExample.ir.js)
    } finally {
      ws.dispose()
    }
  })
})
