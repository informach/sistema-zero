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
  bichinhosDoQuintalExample,
  cacaMoedasExample,
  defesaDoReinoExample,
  dueloDosBonecosExample,
  florestaNinjaExample,
  invasaoDosOvnisExample,
  reinoAbertoExample,
  saltoNaFlorestaExample,
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
      'Salto na Floresta',
      'Bichinhos do Quintal',
      'Invasão dos Óvnis',
      'Duelo dos Bonecos',
      'Defesa do Reino',
      'Reino Aberto',
    ])
    expect(gameKitExtension.minLevel).toBe('intermediario-2d')
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
  // R24: o assert da lista de exemplos vivia DUPLICADO aqui (com o título
  // mentindo "6") — o lugar canônico é o describe do Caça-moedas.
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

/**
 * Drift do exemplo "Salto na Floresta" (Kit Plataforma): a IR embutida foi
 * GERADA pelo parser real a partir do SOURCE abaixo.
 */
const SOURCE_SALTO = `SZGameKit.setup({ width: 960, height: 540, background: "#87ceeb", accent: "#e07a3f" });
SZGameKit.setScreenText("menu", "Salto na Floresta", "Setas ou A/D para andar - espaço para pular - pise nos bichos!", "Jogar");
SZGameKit.setScreenText("vitoria", "Você chegou!", "Pegou as 5 frutas e chegou na bandeira!", "Jogar de novo");
SZGameKit.setScreenText("fim", "Ai!", "Um bicho te pegou. Tente de novo!", "Jogar de novo");
SZGameKit.setJumpFeel(0.1, 0.1, 0.3, 2160);
SZGameKit.defineMold("chao", { w: 200, h: 40, health: 1, speed: 0, damage: 0, color: "#3f7d3f", image: "", look: "" });
SZGameKit.defineMold("tabua", { w: 120, h: 12, health: 1, speed: 0, damage: 0, color: "#a0522d", image: "", look: "" });
SZGameKit.defineMold("movel", { w: 120, h: 16, health: 1, speed: 0, damage: 0, color: "#c08040", image: "", look: "" });
SZGameKit.defineMold("bicho", { w: 36, h: 36, health: 1, speed: 0, damage: 10, color: "#8b3a3a", image: "", look: "" });
SZGameKit.defineMold("fruta", { w: 22, h: 22, health: 1, speed: 0, damage: 0, color: "#e6398b", image: "", look: "" });
SZGameKit.defineEffect("poeira", { count: 10, color: "#ffffff", size: 4, life: 0.4, speed: 120, gravity: 300 });
const heroi = SZGameKit.createCharacter({ image: "", w: 34, h: 46, speed: 240, color: "#2b6cb0" });
let frutas = 0;
SZGameKit.onEnterState("jogando", function () {
  frutas = 0;
  SZGameKit.setCheckpoint(60, 300);
  SZGameKit.respawn(heroi);
  SZGameKit.spawnFromMold("chao", 0, 460);
  SZGameKit.spawnFromMold("chao", 260, 460);
  SZGameKit.spawnFromMold("chao", 700, 460);
  SZGameKit.spawnFromMold("chao", 520, 360);
  SZGameKit.spawnFromMold("tabua", 210, 300);
  SZGameKit.spawnFromMold("tabua", 760, 260);
  SZGameKit.spawnFromMold("movel", 380, 380);
  SZGameKit.spawnFromMold("bicho", 300, 424);
  SZGameKit.spawnFromMold("bicho", 740, 424);
  SZGameKit.spawnFromMold("fruta", 240, 250);
  SZGameKit.spawnFromMold("fruta", 560, 310);
  SZGameKit.spawnFromMold("fruta", 800, 210);
  SZGameKit.spawnFromMold("fruta", 420, 330);
  SZGameKit.spawnFromMold("fruta", 120, 410);
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.forEachActive("movel", function (item) {
    SZGameKit.movingPlatform(item, 380, 380, 620, 380, 3, dt);
  });
  SZGameKit.forEachActive("bicho", function (item) {
    SZGameKit.patrolTurnAtWall(item, 60);
    SZGameKit.applyGravity(item, 2160, dt);
    SZGameKit.moveByVelocity(item, dt);
    SZGameKit.collideGroup(item, "chao");
  });
  SZGameKit.platformerHero(heroi, 240, 660, dt);
  SZGameKit.dropThrough(heroi);
  SZGameKit.collideGroup(heroi, "chao");
  SZGameKit.oneWayPlatform(heroi, "tabua", dt);
  SZGameKit.rideOn(heroi, "movel");
  SZGameKit.stompKill(heroi, "bicho", 400);
  SZGameKit.platformerAnim(heroi);
  SZGameKit.forEachActive("fruta", function (item) {
    if (SZGameKit.touching(heroi, item)) {
      frutas = frutas + 1;
      SZGameKit.burst("poeira", SZGameKit.charX(item), SZGameKit.charY(item));
      SZGameKit.recycle(item);
    }
  });
  SZGameKit.forEachActive("bicho", function (item) {
    if (SZGameKit.touching(heroi, item)) {
      SZGameKit.endGame();
    }
  });
  if (SZGameKit.charY(heroi) > 540) {
    SZGameKit.respawn(heroi);
  }
  if (frutas >= 5) {
    SZGameKit.setState("vitoria");
  }
});
SZGameKit.on("plataforma:pisou", function () {
  SZGameKit.burst("poeira", SZGameKit.charX(heroi), SZGameKit.charY(heroi));
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground();
  SZGameKit.drawActive("chao");
  SZGameKit.drawActive("tabua");
  SZGameKit.drawActive("movel");
  SZGameKit.drawActive("fruta");
  SZGameKit.drawActive("bicho");
  SZGameKit.drawShadow(heroi);
  SZGameKit.drawCharacter(heroi);
  SZGameKit.drawEffects(ctx);
  ctx.fillStyle = "#ffffff";
  ctx.font = "24px sans-serif";
  ctx.fillText("Frutas: " + frutas + "/5", 20, 36);
});
SZGameKit.start();`

describe('game-2d-advanced — exemplo Salto na Floresta (Kit Plataforma)', () => {
  it('IR embutida é válida, sem rawJS, e usa os blocos de PLATAFORMA', () => {
    const parsed = SZIRSchema.safeParse(saltoNaFlorestaExample.ir)
    expect(parsed.success).toBe(true)
    const types = collectTypes(saltoNaFlorestaExample.ir)
    expect(types.has('rawJS')).toBe(false)
    for (const t of [
      'gk:platformerHero',
      'gk:setJumpFeel',
      'gk:oneWayPlatform',
      'gk:dropThrough',
      'gk:movingPlatform',
      'gk:rideOn',
      'gk:stompKill',
      'gk:patrolTurnAtWall',
      'gk:setCheckpoint',
      'gk:respawn',
      'gk:platformerAnim',
      'gk:collideGroup',
      'gk:applyGravity',
      'gk:onEvent',
      'if',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: parseJS(SOURCE) devolve EXATAMENTE a IR embutida', () => {
    expect(stripIds(parseJS(SOURCE_SALTO))).toEqual(saltoNaFlorestaExample.ir.js)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(saltoNaFlorestaExample.ir.js, 0)
    const code2 = compileStatements(stripIds(parseJS(code1)), 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por BLOCOS: IR → workspace → IR estável', () => {
    const state = buildWorkspaceStateFromIR(
      saltoNaFlorestaExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      expect(stripIds(buildIRFromWorkspace(ws).js)).toEqual(saltoNaFlorestaExample.ir.js)
    } finally {
      ws.dispose()
    }
  })
})

/**
 * Drift do exemplo "Bichinhos do Quintal" (👾 Kit Monstrinhos): a IR embutida foi
 * GERADA pelo parser real a partir do SOURCE abaixo.
 */
const SOURCE_BICHINHOS = `SZGameKit.setup({ width: 960, height: 540, background: "#2d5a2d", accent: "#e6398b" });
SZGameKit.setScreenText("menu", "Bichinhos do Quintal", "Setas para andar - espaço para falar - pegue 3 bichinhos!", "Jogar");
SZGameKit.setScreenText("vitoria", "Você conseguiu!", "Pegou 3 bichinhos do quintal!", "Jogar de novo");
SZGameKit.defineLook("fogoso", function (ctx) {
  ctx.fillStyle = "#e05a2b";
  ctx.beginPath();
  ctx.arc(20, 20, 18, 0, 6.28);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(12, 14, 5, 6);
  ctx.fillRect(23, 14, 5, 6);
}, 40, 40);
SZGameKit.defineLook("folhinha", function (ctx) {
  ctx.fillStyle = "#3f9d3f";
  ctx.beginPath();
  ctx.arc(20, 20, 18, 0, 6.28);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(12, 14, 5, 6);
  ctx.fillRect(23, 14, 5, 6);
}, 40, 40);
SZGameKit.defineLook("gotinha", function (ctx) {
  ctx.fillStyle = "#2b7de0";
  ctx.beginPath();
  ctx.arc(20, 20, 18, 0, 6.28);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(12, 14, 5, 6);
  ctx.fillRect(23, 14, 5, 6);
}, 40, 40);
SZGameKit.defineLook("fogozao", function (ctx) {
  ctx.fillStyle = "#b03010";
  ctx.beginPath();
  ctx.arc(24, 24, 23, 0, 6.28);
  ctx.fill();
  ctx.fillStyle = "#ffcc00";
  ctx.fillRect(20, 0, 8, 10);
}, 48, 48);
SZGameKit.defineLook("heroi", function (ctx) {
  ctx.fillStyle = "#2b6cb0";
  ctx.fillRect(6, 8, 28, 32);
  ctx.fillStyle = "#ffd9a0";
  ctx.fillRect(10, 12, 20, 12);
}, 40, 48);
SZGameKit.pkmCreature("Fogoso", "fogo", 30, 9, 4, 7, "", "fogoso");
SZGameKit.pkmCreature("Folhinha", "planta", 34, 7, 6, 4, "", "folhinha");
SZGameKit.pkmCreature("Gotinha", "agua", 32, 8, 5, 6, "", "gotinha");
SZGameKit.pkmCreature("Fogozao", "fogo", 45, 13, 7, 8, "", "fogozao");
SZGameKit.pkmMove("Brasa", "Fogoso", "fogo", 20, 90, "bola", "#ff8800");
SZGameKit.pkmMove("Investida", "Fogoso", "normal", 12, 100, "investida", "#999999");
SZGameKit.pkmMove("Chicote", "Folhinha", "planta", 18, 95, "onda", "#3f9d3f");
SZGameKit.pkmMove("Jato", "Gotinha", "agua", 18, 95, "bola", "#2b7de0");
SZGameKit.pkmMove("Labareda", "Fogozao", "fogo", 32, 75, "raio", "#ff4400");
SZGameKit.pkmTypeChart("fogo", "planta", 2);
SZGameKit.pkmTypeChart("planta", "agua", 2);
SZGameKit.pkmTypeChart("agua", "fogo", 2);
SZGameKit.pkmEvolve("Fogoso", "Fogozao", 8);
SZGameKit.pkmCatchDifficulty("Gotinha", "difícil");
SZGameKit.pkmEncounterRate(20);
const heroi = SZGameKit.createCharacter({ image: "", w: 40, h: 48, speed: 200, color: "#2b6cb0" });
SZGameKit.rpgOnMap("quintal", function () {
  SZGameKit.rpgCreateNpc("Cora", 3, 3, "", "heroi");
  SZGameKit.rpgCreateNpc("Enfermeira", 12, 3, "", "heroi");
  SZGameKit.pkmGrassCells(5, 6, 13, 10);
  SZGameKit.pkmWild("Folhinha", 3, 6);
  SZGameKit.pkmWild("Gotinha", 3, 6);
  SZGameKit.placeCharacter(heroi, 128, 128);
});
SZGameKit.rpgOnTalk("Cora", function () {
  if (SZGameKit.rpgHasFlag("ganhou-inicial")) {
    SZGameKit.rpgMenu("Quer mais bolas?", function () {
      SZGameKit.rpgOption("Sim", function () {
        SZGameKit.pkmGiveBall(3, 60);
      });
      SZGameKit.rpgOption("Não", function () {});
    });
  } else {
    SZGameKit.rpgSay("Leve o Fogoso e 5 bolas! Pegue 3 bichinhos no quintal!", "Cora");
    SZGameKit.pkmGive("Fogoso", 5);
    SZGameKit.pkmGiveBall(5, 60);
    SZGameKit.rpgAddFlag("ganhou-inicial");
  }
});
SZGameKit.rpgOnTalk("Enfermeira", function () {
  SZGameKit.rpgSay("Deixe comigo!", "Enfermeira");
  SZGameKit.pkmHealTeam();
});
SZGameKit.rpgOnBattleEnd(function () {
  if (SZGameKit.pkmCaught()) {
    if (SZGameKit.pkmTeamSize() >= 4) {
      SZGameKit.setState("vitoria");
    }
  }
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.rpgMoveGrid(heroi, 64, dt);
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#2d5a2d", false);
  ctx.fillStyle = "#4a8c4a";
  ctx.fillRect(320, 384, 576, 320);
  SZGameKit.drawByDepth(heroi);
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.pkmDrawTeam(10, 10);
});
SZGameKit.start();`

describe('game-2d-advanced — exemplo Bichinhos do Quintal (Kit Monstrinhos)', () => {
  it('IR embutida é válida, sem rawJS, e prova a TESE (Kit RPG + outra batalha)', () => {
    const parsed = SZIRSchema.safeParse(bichinhosDoQuintalExample.ir)
    expect(parsed.success).toBe(true)
    const types = collectTypes(bichinhosDoQuintalExample.ir)
    expect(types.has('rawJS')).toBe(false)
    for (const t of [
      // o que é do KIT
      'gk:pkmCreature',
      'gk:pkmMove',
      'gk:pkmTypeChart',
      'gk:pkmEvolve',
      'gk:pkmCatchDifficulty',
      'gk:pkmGive',
      'gk:pkmGiveBall',
      'gk:pkmHealTeam',
      'gk:pkmGrassCells',
      'gk:pkmWild',
      'gk:pkmEncounterRate',
      'gk:pkmDrawTeam',
      'gk:pkmCaught',
      'gk:pkmTeamSize',
      // ⭐ e o MUNDO, que vem TODO do Kit RPG — é a tese do kit
      'gk:rpgOnMap',
      'gk:rpgCreateNpc',
      'gk:rpgOnTalk',
      'gk:rpgSay',
      'gk:rpgMenu',
      'gk:rpgAddFlag',
      'gk:rpgMoveGrid',
      'gk:rpgOnBattleEnd', // reusado: NÃO existe pkmOnBattleEnd
      'gk:defineLook', // asset-free: as criaturas são vetor
      'if',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: parseJS(SOURCE) devolve EXATAMENTE a IR embutida', () => {
    expect(stripIds(parseJS(SOURCE_BICHINHOS))).toEqual(bichinhosDoQuintalExample.ir.js)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(bichinhosDoQuintalExample.ir.js, 0)
    const code2 = compileStatements(stripIds(parseJS(code1)), 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por BLOCOS: IR → workspace → IR estável', () => {
    const state = buildWorkspaceStateFromIR(
      bichinhosDoQuintalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      expect(stripIds(buildIRFromWorkspace(ws).js)).toEqual(bichinhosDoQuintalExample.ir.js)
    } finally {
      ws.dispose()
    }
  })
})

/**
 * Drift do exemplo "Invasão dos Óvnis" (🚀 Kit Nave): a IR embutida foi GERADA
 * pelo parser real a partir do SOURCE abaixo (one-off do R22).
 */
const SOURCE_OVNIS = `SZGameKit.setup({ width: 960, height: 540, background: "#0b1020", accent: "#7cc7ff" });
SZGameKit.setScreenText("menu", "Invasão dos Óvnis", "Setas ou A/D movem - espaço atira - não deixe descerem!", "Jogar");
SZGameKit.setScreenText("fim", "Fim de jogo", "Os óvnis venceram desta vez. Tente de novo!", "Jogar de novo");
SZGameKit.defineMold("ovni", { w: 44, h: 32, health: 1, speed: 0, damage: 10, color: "#5ad66f", image: "", look: "" });
SZGameKit.defineMold("tiro", { w: 6, h: 16, health: 1, speed: 0, damage: 0, color: "#ffe066", image: "", look: "" });
SZGameKit.defineMold("tiro-ovni", { w: 4, h: 12, health: 1, speed: 0, damage: 10, color: "#ffffff", image: "", look: "" });
SZGameKit.defineMold("bomba", { w: 24, h: 24, health: 1, speed: 0, damage: 0, color: "#ff922b", image: "", look: "" });
SZGameKit.defineEffect("explosao", { count: 16, color: "#9775fa", size: 4, life: 0.5, speed: 200, gravity: 0 });
const nave = SZGameKit.createCharacter({ image: "", w: 52, h: 28, speed: 420, color: "#7cc7ff" });
let pontos = 0;
let vidas = 3;
let velocidade = 150;
SZGameKit.naveInvasionLine(430);
SZGameKit.naveWaveShooter("ovni", 1.5, "tiro-ovni", 300);
SZGameKit.onEnterState("jogando", function () {
  pontos = 0;
  vidas = 3;
  velocidade = 150;
  SZGameKit.placeCharacter(nave, 454, 480);
  SZGameKit.naveWave("ovni", 8, 3, 60, velocidade, 30, 15);
});
SZGameKit.on("onda:limpa", function () {
  velocidade = velocidade * 1.2;
  SZGameKit.naveWave("ovni", 8, 3, 60, velocidade, 30, 15);
  SZGameKit.playEffect("win");
});
SZGameKit.on("onda:invadiu", function () {
  SZGameKit.endGame();
});
SZGameKit.on("bomba:acertou", function () {
  pontos = pontos + 50;
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.naveShip(nave, 420, 10, dt);
  if (SZGameKit.navePowerOf(nave) === "metralhadora") {
    if (SZGameKit.keyDown(" ") && SZGameKit.cooldownReady(nave, 0.12)) {
      SZGameKit.fanShot(nave, "tiro", 1, 0, -90, 600);
      SZGameKit.playEffect("laser");
    }
  } else if (SZGameKit.navePowerOf(nave) === "leque") {
    if (SZGameKit.keyPressed(" ") && SZGameKit.cooldownReady(nave, 0.35)) {
      SZGameKit.fanShot(nave, "tiro", 5, 40, -90, 600);
      SZGameKit.playEffect("laser");
    }
  } else {
    if (SZGameKit.keyPressed(" ") && SZGameKit.cooldownReady(nave, 0.35)) {
      SZGameKit.fanShot(nave, "tiro", 1, 0, -90, 600);
      SZGameKit.playEffect("laser");
    }
  }
  SZGameKit.forEachActive("tiro", function (item) {
    SZGameKit.moveByVelocity(item, dt);
  });
  SZGameKit.forEachActive("tiro-ovni", function (item) {
    SZGameKit.moveByVelocity(item, dt);
  });
  SZGameKit.cullOffscreen("tiro", 100);
  SZGameKit.cullOffscreen("tiro-ovni", 100);
  SZGameKit.overlapGroups("tiro", "ovni", function (a, b) {
    SZGameKit.recycle(a);
    SZGameKit.burst("explosao", SZGameKit.charX(b), SZGameKit.charY(b));
    SZGameKit.floatText("+100", SZGameKit.charX(b), SZGameKit.charY(b), "#ffffff", 22);
    pontos = pontos + 100;
    SZGameKit.playEffect("explosion");
    if (SZGameKit.chance(8)) {
      SZGameKit.navePowerup(nave, "metralhadora", 5);
      SZGameKit.floatText("METRALHADORA!", SZGameKit.charX(b), SZGameKit.charY(b), "#ffe066", 20);
    }
    if (SZGameKit.chance(5)) {
      SZGameKit.naveBomb("bomba", 160, "ovni");
    }
    SZGameKit.recycle(b);
  });
  SZGameKit.forEachActive("tiro-ovni", function (item) {
    if (SZGameKit.touching(item, nave)) {
      SZGameKit.recycle(item);
      if (!SZGameKit.isInvincible(nave)) {
        SZGameKit.hurt(nave, 0, 1.5);
        vidas = vidas - 1;
        SZGameKit.cameraShake(6, 0.3);
        SZGameKit.playEffect("hurt");
        SZGameKit.floatText("-1 vida", SZGameKit.charX(nave), SZGameKit.charY(nave), "#ff6b6b", 20);
        if (vidas <= 0) {
          SZGameKit.endGame();
        }
      }
    }
  });
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#0b1020", false);
  SZGameKit.naveStarfield(100, 20);
  SZGameKit.drawActive("ovni");
  SZGameKit.drawActive("tiro");
  SZGameKit.drawActive("tiro-ovni");
  SZGameKit.drawActive("bomba");
  SZGameKit.drawCharacter(nave);
  SZGameKit.drawEffects();
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.drawHearts(vidas, 3, 20, 20);
  ctx.fillStyle = "#ffffff";
  ctx.font = "24px sans-serif";
  ctx.fillText("Pontos: " + pontos, 20, 70);
});
SZGameKit.start();
`

describe('game-2d-advanced — exemplo Invasão dos Óvnis (🚀 Kit Nave)', () => {
  it('IR embutida é válida, sem rawJS, e usa o kit INTEIRO + o juice do R21', () => {
    const parsed = SZIRSchema.safeParse(invasaoDosOvnisExample.ir)
    expect(parsed.success).toBe(true)
    const types = collectTypes(invasaoDosOvnisExample.ir)
    expect(types.has('rawJS')).toBe(false)
    for (const t of [
      // os 8 do 🚀 Kit Nave
      'gk:naveShip',
      'gk:navePowerup',
      'gk:navePowerOf',
      'gk:naveWave',
      'gk:naveWaveShooter',
      'gk:naveInvasionLine',
      'gk:naveStarfield',
      'gk:naveBomb',
      // o juice do R21 que o gênero pede
      'gk:floatText',
      'gk:fanShot',
      // ⭐ a lição da dificuldade: onda:limpa → velocidade × 1.2 → nova onda
      'gk:onEvent',
      // e o paradigma geral: tiro/colisão/placar são da criança
      'gk:overlapGroups',
      'gk:cooldownReady',
      'gk:chance',
      'gk:isInvincible',
      'gk:cameraShake',
      'gk:drawHearts',
      'if',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: parseJS(SOURCE) devolve EXATAMENTE a IR embutida', () => {
    expect(stripIds(parseJS(SOURCE_OVNIS))).toEqual(invasaoDosOvnisExample.ir.js)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(invasaoDosOvnisExample.ir.js, 0)
    const code2 = compileStatements(stripIds(parseJS(code1)), 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por BLOCOS: IR → workspace → IR estável', () => {
    const state = buildWorkspaceStateFromIR(
      invasaoDosOvnisExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      expect(stripIds(buildIRFromWorkspace(ws).js)).toEqual(invasaoDosOvnisExample.ir.js)
    } finally {
      ws.dispose()
    }
  })
})

/**
 * Drift do exemplo "Duelo dos Bonecos" (🥊 Kit Luta — a pendência do R19): a IR
 * embutida foi GERADA pelo parser real a partir do SOURCE abaixo (one-off R23).
 */
const SOURCE_DUELO = `SZGameKit.setup({ width: 960, height: 540, background: "#241733", accent: "#ffd166" });
SZGameKit.setScreenText("menu", "Duelo dos Bonecos", "A/D anda - W pula - S agacha - F defende - G soco - H chute - J agarrão", "Lutar");
SZGameKit.defineMold("chao", { w: 960, h: 60, health: 1, speed: 0, damage: 0, color: "#3d2b52", image: "", look: "" });
const azul = SZGameKit.createCharacter({ image: "", w: 50, h: 110, speed: 260, color: "#4a9eff" });
const vermelho = SZGameKit.createCharacter({ image: "", w: 50, h: 110, speed: 260, color: "#e0526a" });
SZGameKit.lutaMove("soco", azul, "rápido", 8, 70, false, false);
SZGameKit.lutaMove("chute", azul, "pesado", 18, 90, false, false);
SZGameKit.lutaMove("agarrao", azul, "médio", 12, 60, true, false);
SZGameKit.lutaMove("soco", vermelho, "rápido", 8, 70, false, false);
SZGameKit.lutaMove("chute", vermelho, "pesado", 18, 90, false, false);
SZGameKit.lutaMove("especial", vermelho, "médio", 25, 110, true, true);
SZGameKit.onEnterState("jogando", function () {
  SZGameKit.spawnFromMold("chao", 0, 480);
  SZGameKit.placeCharacter(azul, 250, 370);
  SZGameKit.placeCharacter(vermelho, 660, 370);
  SZGameKit.lutaMatch(azul, vermelho, 3, 45);
  SZGameKit.lutaAI(vermelho, "normal");
});
SZGameKit.on("luta:acabou", function () {
  SZGameKit.setScreenText("fim", "Fim da luta!", "Venceu: " + SZGameKit.lutaWinner(), "Revanche");
  SZGameKit.playEffect("win");
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.lutaFighter(azul, "a", "d", "w", "s", "f", dt);
  if (SZGameKit.keyPressed("g")) {
    SZGameKit.lutaAttack(azul, "soco");
  }
  if (SZGameKit.keyPressed("h")) {
    SZGameKit.lutaAttack(azul, "chute");
  }
  if (SZGameKit.keyPressed("j")) {
    SZGameKit.lutaAttack(azul, "agarrao");
  }
  SZGameKit.collideGroup(azul, "chao");
  SZGameKit.collideGroup(vermelho, "chao");
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#241733", false);
  SZGameKit.drawActive("chao");
  SZGameKit.drawCharacter(azul);
  SZGameKit.drawCharacter(vermelho);
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.lutaDrawHud();
});
SZGameKit.start();
`

describe('game-2d-advanced — exemplo Duelo dos Bonecos (🥊 Kit Luta)', () => {
  it('IR embutida é válida, sem rawJS, e usa o Kit Luta como manda a regra', () => {
    const parsed = SZIRSchema.safeParse(dueloDosBonecosExample.ir)
    expect(parsed.success).toBe(true)
    const types = collectTypes(dueloDosBonecosExample.ir)
    expect(types.has('rawJS')).toBe(false)
    for (const t of [
      // o KIT: partida, lutadores, golpes (rápido/pesado = combo emergente;
      // agarrão = atravessa; especial da IA), placar pronto e o vencedor
      'gk:lutaMatch',
      'gk:lutaFighter',
      'gk:lutaAI',
      'gk:lutaMove',
      'gk:lutaAttack',
      'gk:lutaDrawHud',
      'gk:lutaWinner',
      // e o CHÃO é geral, pela regra: molde + nascer + colidir
      'gk:defineMold',
      'gk:spawnFromMold',
      'gk:collideGroup',
      'gk:keyPressed',
      'gk:onEvent', // luta:acabou → tela de fim com o vencedor
      'if',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: parseJS(SOURCE) devolve EXATAMENTE a IR embutida', () => {
    expect(stripIds(parseJS(SOURCE_DUELO))).toEqual(dueloDosBonecosExample.ir.js)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(dueloDosBonecosExample.ir.js, 0)
    const code2 = compileStatements(stripIds(parseJS(code1)), 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por BLOCOS: IR → workspace → IR estável', () => {
    const state = buildWorkspaceStateFromIR(
      dueloDosBonecosExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      expect(stripIds(buildIRFromWorkspace(ws).js)).toEqual(dueloDosBonecosExample.ir.js)
    } finally {
      ws.dispose()
    }
  })
})

const SOURCE_DEFESA = `SZGameKit.setup({ width: 960, height: 540, background: "#26331f", accent: "#ffd166" });
SZGameKit.setScreenText("menu", "Defesa do Reino", "Clique nos lugares para comprar torres - não deixe os invasores passarem!", "Defender");
SZGameKit.setScreenText("fim", "O reino caiu!", "Os invasores passaram. Tente de novo!", "Jogar de novo");
SZGameKit.defineMold("invasor", { w: 34, h: 34, health: 30, speed: 0, damage: 0, color: "#e0526a", image: "", look: "" });
SZGameKit.defineMold("torre", { w: 40, h: 40, health: 1, speed: 0, damage: 0, color: "#4a9eff", image: "", look: "" });
SZGameKit.defineMold("tiro", { w: 10, h: 10, health: 1, speed: 0, damage: 0, color: "#ffe066", image: "", look: "" });
SZGameKit.defineEffect("estouro", { count: 12, color: "#ffd166", size: 4, life: 0.4, speed: 160, gravity: 0 });
const castelo = SZGameKit.createCharacter({ image: "", w: 44, h: 64, speed: 0, color: "#f4a259" });
let vidas = 5;
let leva = 3;
SZGameKit.definePath("trilha", function () {
  SZGameKit.pathPoint(-40, 120);
  SZGameKit.pathPoint(300, 120);
  SZGameKit.pathPoint(300, 400);
  SZGameKit.pathPoint(660, 400);
  SZGameKit.pathPoint(660, 200);
  SZGameKit.pathPoint(1000, 200);
});
SZGameKit.tdSetCoins(100);
SZGameKit.tdSlot(300, 220, 60);
SZGameKit.tdSlot(420, 300, 60);
SZGameKit.tdSlot(560, 320, 60);
SZGameKit.tdSlot(660, 120, 60);
SZGameKit.tdOnBuy(50, function (lugarX, lugarY) {
  SZGameKit.spawnFromMold("torre", lugarX - 20, lugarY - 20);
  SZGameKit.playEffect("click");
});
SZGameKit.on("compra:negada", function () {
  SZGameKit.floatText("sem moedas!", SZGameKit.mouseX(), SZGameKit.mouseY(), "#ff6b6b", 20);
});
SZGameKit.on("invasor:passou", function () {
  vidas = vidas - 1;
  SZGameKit.cameraShake(6, 0.3);
  if (vidas <= 0) {
    SZGameKit.endGame();
  }
});
SZGameKit.on("onda:limpa", function () {
  leva = leva + 2;
  SZGameKit.tdAddCoins(25);
  SZGameKit.tdWave("trilha", leva, "invasor", 150, 90);
});
SZGameKit.onEnterState("jogando", function () {
  vidas = 5;
  leva = 3;
  SZGameKit.placeCharacter(castelo, 936, 168);
  SZGameKit.tdWave("trilha", leva, "invasor", 150, 90);
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.forEachActive("torre", function (torre) {
    if (SZGameKit.cooldownReady(torre, 0.8)) {
      const alvo = SZGameKit.pickActive("invasor", "maior", "pathProgress");
      if (alvo) {
        if (SZGameKit.distanceBetween(torre, alvo) < 220) {
          const tiro = SZGameKit.spawnFromMold("tiro", SZGameKit.charX(torre), SZGameKit.charY(torre));
          SZGameKit.launchTowards(tiro, alvo, 420);
        }
      }
    }
  });
  SZGameKit.forEachActive("tiro", function (item) {
    SZGameKit.moveByVelocity(item, dt);
  });
  SZGameKit.cullOffscreen("tiro", 60);
  SZGameKit.overlapGroups("tiro", "invasor", function (t, inv) {
    SZGameKit.recycle(t);
    SZGameKit.hurt(inv, 15, 0);
    if (SZGameKit.isDead(inv)) {
      SZGameKit.burst("estouro", SZGameKit.charX(inv), SZGameKit.charY(inv));
      SZGameKit.tdAddCoins(10);
      SZGameKit.floatText("+10", SZGameKit.charX(inv), SZGameKit.charY(inv), "#ffd166", 20);
      SZGameKit.recycle(inv);
    }
  });
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#26331f", true);
  ctx.fillStyle = "#4a4028";
  ctx.fillRect(-40, 102, 340, 36);
  ctx.fillRect(282, 102, 36, 316);
  ctx.fillRect(282, 382, 396, 36);
  ctx.fillRect(642, 182, 36, 236);
  ctx.fillRect(642, 182, 358, 36);
  SZGameKit.tdDrawSlots();
  SZGameKit.forEachActive("torre", function (torre) {
    SZGameKit.tdDrawRange(torre, 220);
  });
  SZGameKit.drawActive("torre");
  SZGameKit.drawActive("invasor");
  SZGameKit.drawActive("tiro");
  SZGameKit.forEachActive("invasor", function (inv) {
    SZGameKit.drawHealthBar(inv, 0);
  });
  SZGameKit.drawCharacter(castelo);
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.drawHearts(vidas, 5, 20, 20);
  ctx.fillStyle = "#ffd166";
  ctx.font = "24px sans-serif";
  ctx.fillText("Moedas: " + SZGameKit.tdCoins(), 20, 70);
});
SZGameKit.start();
`

describe('game-2d-advanced — exemplo Defesa do Reino (🏰 Kit Defesa de Torre)', () => {
  it('IR embutida é válida, sem rawJS, e usa o Kit Defesa de Torre + o caminho geral', () => {
    const parsed = SZIRSchema.safeParse(defesaDoReinoExample.ir)
    expect(parsed.success).toBe(true)
    const types = collectTypes(defesaDoReinoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    for (const t of [
      // o KIT: carteira, lugares, compra que valida, alcance, e a onda pelo caminho
      'gk:tdSetCoins',
      'gk:tdSlot',
      'gk:tdDrawSlots',
      'gk:tdOnBuy',
      'gk:tdDrawRange',
      'gk:tdWave',
      'gk:tdAddCoins',
      'gk:tdCoins',
      // ⭐ o caminho e o alvo "mais avançado" vêm dos GERAIS do R25 (a regra:
      // genérico primeiro; o kit COMPÕE)
      'gk:definePath',
      'gk:pathPoint',
      'gk:pickActive',
      // e o resto do paradigma geral: torre mira sozinha, tiro, colisão, moeda
      'gk:spawnNamed',
      'gk:launchTowards',
      'gk:overlapGroups',
      'gk:cooldownReady',
      'gk:distanceBetween',
      'gk:onEvent', // compra:negada / invasor:passou / onda:limpa
      'if',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: parseJS(SOURCE) devolve EXATAMENTE a IR embutida', () => {
    expect(stripIds(parseJS(SOURCE_DEFESA))).toEqual(defesaDoReinoExample.ir.js)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(defesaDoReinoExample.ir.js, 0)
    const code2 = compileStatements(stripIds(parseJS(code1)), 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por BLOCOS: IR → workspace → IR estável', () => {
    const state = buildWorkspaceStateFromIR(
      defesaDoReinoExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      expect(stripIds(buildIRFromWorkspace(ws).js)).toEqual(defesaDoReinoExample.ir.js)
    } finally {
      ws.dispose()
    }
  })
})

const SOURCE_REINO = `SZGameKit.setup({ width: 960, height: 640, background: "#1c2b1c", accent: "#ffd166" });
SZGameKit.setScreenText("menu", "Reino Aberto", "Setas ou WASD andam - espaço conversa - explore os 4 cantos do reino!", "Explorar");
const heroi = SZGameKit.createCharacter({ image: "", w: 48, h: 48, speed: 320, color: "#4a9eff" });
SZGameKit.rpgOnMap("campo", function () {
  SZGameKit.rpgMapSize(15, 10);
  SZGameKit.rpgConnectEdge("leste", "praia");
  SZGameKit.rpgConnectEdge("sul", "bosque");
  SZGameKit.rpgBlockCell(5, 4);
  SZGameKit.rpgBlockCell(6, 4);
  SZGameKit.rpgBlockCell(9, 6);
  SZGameKit.placeCharacter(heroi, SZGameKit.rpgCell(2), SZGameKit.rpgCell(2));
});
SZGameKit.rpgOnMap("praia", function () {
  SZGameKit.rpgMapSize(15, 10);
  SZGameKit.rpgConnectEdge("oeste", "campo");
  SZGameKit.rpgConnectEdge("sul", "vila");
  SZGameKit.rpgCreateNpc("pescador", 7, 3, "", "");
});
SZGameKit.rpgOnMap("bosque", function () {
  SZGameKit.rpgMapSize(15, 10);
  SZGameKit.rpgConnectEdge("norte", "campo");
  SZGameKit.rpgConnectEdge("leste", "vila");
  SZGameKit.rpgBlockCell(4, 4);
  SZGameKit.rpgBlockCell(4, 5);
  SZGameKit.rpgBlockCell(10, 3);
});
SZGameKit.rpgOnMap("vila", function () {
  SZGameKit.rpgMapSize(30, 20);
  SZGameKit.rpgConnectEdge("norte", "praia");
  SZGameKit.rpgConnectEdge("oeste", "bosque");
  SZGameKit.rpgCreateNpc("prefeita", 20, 12, "", "");
});
SZGameKit.rpgOnTalk("pescador", function () {
  SZGameKit.rpgSay("O mar termina aqui, mas o reino continua pro sul!", "Pescador");
});
SZGameKit.rpgOnTalk("prefeita", function () {
  SZGameKit.rpgSay("Bem-vindo à vila GRANDE — repare a câmera te seguindo!", "Prefeita");
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.rpgMoveGrid(heroi, 64, dt);
});
SZGameKit.onEnterState("jogando", function () {
  SZGameKit.cameraFollow(heroi, 960, 640);
});
SZGameKit.onDraw(function (ctx) {
  if (SZGameKit.rpgCurrentMap() === "praia") {
    SZGameKit.drawBackground("#2b4a63", true);
  } else if (SZGameKit.rpgCurrentMap() === "bosque") {
    SZGameKit.drawBackground("#173317", true);
  } else if (SZGameKit.rpgCurrentMap() === "vila") {
    SZGameKit.drawBackground("#4a3c2b", true);
  } else {
    SZGameKit.drawBackground("#2d5a2d", true);
  }
  SZGameKit.rpgDrawNpcs();
  SZGameKit.drawCharacter(heroi);
});
SZGameKit.onDrawHud(function (ctx) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "22px sans-serif";
  ctx.fillText("Mapa: " + SZGameKit.rpgCurrentMap(), 20, 36);
});
SZGameKit.start();
`

describe('game-2d-advanced — exemplo Reino Aberto (🌍 mundo aberto)', () => {
  it('IR embutida é válida, sem rawJS, e usa os DOIS jeitos de mundo aberto', () => {
    const parsed = SZIRSchema.safeParse(reinoAbertoExample.ir)
    expect(parsed.success).toBe(true)
    const types = collectTypes(reinoAbertoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    for (const t of [
      // bordas ligadas (estilo Zelda) + tamanho do mapa
      'gk:rpgMapSize',
      'gk:rpgConnectEdge',
      'gk:rpgCurrentMap',
      // e a câmera clampando pelo tamanho do mapa (a vila é MAIOR que a tela)
      'gk:cameraFollow',
      // o mundo do Kit RPG que os liga
      'gk:rpgOnMap',
      'gk:rpgMoveGrid',
      'gk:rpgBlockCell',
      'gk:rpgCreateNpc',
      'gk:rpgOnTalk',
      'gk:rpgSay',
      'gk:onDrawHud',
      'if', // fundo por mapa via "o nome do mapa de agora"
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: parseJS(SOURCE) devolve EXATAMENTE a IR embutida', () => {
    expect(stripIds(parseJS(SOURCE_REINO))).toEqual(reinoAbertoExample.ir.js)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(reinoAbertoExample.ir.js, 0)
    const code2 = compileStatements(stripIds(parseJS(code1)), 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por BLOCOS: IR → workspace → IR estável', () => {
    const state = buildWorkspaceStateFromIR(
      reinoAbertoExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      expect(stripIds(buildIRFromWorkspace(ws).js)).toEqual(reinoAbertoExample.ir.js)
    } finally {
      ws.dispose()
    }
  })
})
