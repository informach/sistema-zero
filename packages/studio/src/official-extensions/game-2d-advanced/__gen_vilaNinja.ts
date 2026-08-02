import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectGeneratedTypes, printTypeScriptValue, stripGeneratedIds } from './generationUtils'

/**
 * Gerador one-off da IR do exemplo "Vila Ninja Profissional" — o
 * ninja-adventure (aventura top-down) recriado com as peças do 🧙 Kit RPG do
 * motor avançado (mapa MAIOR que a tela + câmera + FSM de inimigos por
 * distância, como `aventuraProfissionalExample`/`vilaDoDragaoExample`), SEM
 * assets (o ninja, os monstros, as casas, as árvores e o chão são retângulos e
 * `defineLook` em blocos de Canvas). Rode com
 * `bun src/official-extensions/game-2d-advanced/__gen_vilaNinja.ts` e cole a
 * saída em `examples/vilaNinjaExample.ts`. O drift test
 * (`__tests__/vilaNinjaExample.test.ts`) guarda o resultado.
 *
 * Fidelidade ao original (ninja-adventure):
 * - o ninja anda nas 4 direções (o WASD/setas do original) num mundo top-down
 *   maior que a tela (createEmptyTilemap dá o tamanho; cameraFollowMap prende a
 *   câmera nele), com colisão contra as casas e árvores (collideGroup);
 * - o ataque é a lançada NA DIREÇÃO que olha (attackFacing + setSwingWindow, o
 *   golpe direcional do original), que só machuca na janela certa (didHit);
 * - cada monstro tem 3 de vida (hurt some com 3 golpes) e VAGUEIA em anel em
 *   volta do posto (patrolAround = o Monster.setVelocity do original), mas
 *   PERSEGUE quando o ninja chega perto (FSM por distância: parado -> perseguir
 *   -> golpe, por ENTIDADE via entityState/setEntityState + distanceBetween);
 * - o ninja tem 3 corações (drawHearts); encostar num monstro em golpe tira 1
 *   com i-frames (isInvincible) e empurra (knockback);
 * - derrotar TODOS os 6 monstros (bambu + dragão) liga a tela de vitória pronta
 *   (setMission + missionKill).
 */
export const VILA_NINJA_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#3f7d4e", accent: "#e63946" });
SZGameKit.setScreenText("menu", "Vila Ninja Profissional", "Setas: andar nas 4 direções. ESPAÇO: lançada na direção que olha. Derrote os 6 monstros da vila ninja!", "Começar a missão");
SZGameKit.setScreenText("vitoria", "Vila em paz!", "Você derrotou todos os monstros. A vila ninja está a salvo!", "Jogar de novo");
SZGameKit.setScreenText("fim", "O ninja caiu!", "Os monstros venceram desta vez. Tente de novo!", "Tentar de novo");
SZGameKit.defineLook("ninja parado", function (ctx) {
  ctx.fillStyle = "#2b3a67";
  ctx.fillRect(10, 2, 20, 12);
  ctx.fillStyle = "#f2c6a0";
  ctx.fillRect(13, 12, 14, 8);
  ctx.fillStyle = "#26314f";
  ctx.fillRect(8, 20, 24, 20);
  ctx.fillStyle = "#1a2238";
  ctx.fillRect(12, 40, 7, 14);
  ctx.fillRect(21, 40, 7, 14);
}, 40, 54);
SZGameKit.defineLook("ninja andando", function (ctx) {
  ctx.fillStyle = "#2b3a67";
  ctx.fillRect(10, 2, 20, 12);
  ctx.fillStyle = "#f2c6a0";
  ctx.fillRect(13, 12, 14, 8);
  ctx.fillStyle = "#26314f";
  ctx.fillRect(8, 20, 24, 20);
  ctx.fillStyle = "#1a2238";
  ctx.fillRect(10, 40, 7, 14);
  ctx.fillRect(23, 40, 7, 14);
}, 40, 54);
SZGameKit.defineLook("ninja golpe", function (ctx) {
  ctx.fillStyle = "#2b3a67";
  ctx.fillRect(6, 2, 20, 12);
  ctx.fillStyle = "#f2c6a0";
  ctx.fillRect(9, 12, 14, 8);
  ctx.fillStyle = "#26314f";
  ctx.fillRect(4, 20, 24, 20);
  ctx.fillStyle = "#d0d7de";
  ctx.fillRect(28, 24, 12, 5);
}, 40, 54);
SZGameKit.defineLook("bambu", function (ctx) {
  ctx.fillStyle = "#6ab04c";
  ctx.fillRect(6, 8, 32, 30);
  ctx.fillStyle = "#3d7a2a";
  ctx.fillRect(6, 8, 32, 6);
  ctx.fillStyle = "#1b3a12";
  ctx.fillRect(12, 20, 6, 6);
  ctx.fillRect(26, 20, 6, 6);
}, 44, 40);
SZGameKit.defineLook("dragao", function (ctx) {
  ctx.fillStyle = "#b33939";
  ctx.fillRect(4, 10, 36, 26);
  ctx.fillStyle = "#e55039";
  ctx.fillRect(36, 4, 12, 16);
  ctx.fillStyle = "#f6e58d";
  ctx.fillRect(10, 20, 8, 8);
  ctx.fillRect(24, 20, 8, 8);
}, 50, 38);
SZGameKit.defineLook("casa", function (ctx) {
  ctx.fillStyle = "#c9a76b";
  ctx.fillRect(0, 26, 72, 46);
  ctx.fillStyle = "#7d4f2a";
  ctx.fillRect(0, 6, 72, 24);
  ctx.fillStyle = "#3a271a";
  ctx.fillRect(28, 44, 18, 28);
}, 72, 72);
SZGameKit.defineLook("arvore", function (ctx) {
  ctx.fillStyle = "#6b4226";
  ctx.fillRect(22, 52, 12, 32);
  ctx.fillStyle = "#2f7d32";
  ctx.fillRect(4, 4, 48, 52);
  ctx.fillStyle = "#43a047";
  ctx.fillRect(12, 12, 20, 20);
}, 56, 84);
SZGameKit.defineEffect("faisca", { count: 10, color: "#ffe066", size: 4, life: 0.35, speed: 180, gravity: 0 });
SZGameKit.defineEffect("fumaca", { count: 12, color: "#dfe6e9", size: 5, life: 0.45, speed: 130, gravity: 0 });
SZGameKit.createEmptyTilemap("vila", 30, 17, -1, "");
SZGameKit.defineMold("casa", { w: 72, h: 72, health: 1, speed: 0, damage: 0, color: "#c9a76b", look: "casa" });
SZGameKit.defineMold("arvore", { w: 56, h: 84, health: 1, speed: 0, damage: 0, color: "#2f7d32", look: "arvore" });
SZGameKit.defineMold("bambu", { w: 44, h: 40, health: 30, speed: 90, damage: 8, color: "#6ab04c", look: "bambu" });
SZGameKit.defineMold("dragao", { w: 50, h: 38, health: 30, speed: 110, damage: 12, color: "#b33939", look: "dragao" });
SZGameKit.spawnFromMold("casa", 260, 180);
SZGameKit.spawnFromMold("casa", 1180, 320);
SZGameKit.spawnFromMold("arvore", 520, 500);
SZGameKit.spawnFromMold("arvore", 900, 160);
SZGameKit.spawnFromMold("arvore", 1400, 640);
SZGameKit.spawnFromMold("arvore", 700, 780);
SZGameKit.spawnFromMold("bambu", 1000, 420);
SZGameKit.spawnFromMold("bambu", 1250, 560);
SZGameKit.spawnFromMold("bambu", 820, 640);
SZGameKit.spawnFromMold("dragao", 1450, 300);
SZGameKit.spawnFromMold("dragao", 1550, 500);
SZGameKit.spawnFromMold("dragao", 1350, 720);
const ninja = SZGameKit.createCharacter({ w: 40, h: 54, speed: 240, color: "#2b3a67" });
SZGameKit.placeCharacter(ninja, 180, 440);
SZGameKit.setHitbox(ninja, 6, 22, 28, 30);
SZGameKit.setSwingWindow(ninja, 0.08, 0.14);
SZGameKit.stateLook(ninja, "parado", "ninja parado");
SZGameKit.stateLook(ninja, "andando", "ninja andando");
SZGameKit.stateLook(ninja, "golpe", "ninja golpe");
SZGameKit.stateLook(ninja, "dano", "ninja parado");
SZGameKit.cameraFollowMap(ninja, "vila");
SZGameKit.setMission(0, 6);
SZGameKit.on("inimigo:caiu", function () {
  SZGameKit.playEffect("explosion");
});
SZGameKit.onEnterState("vitoria", function () {
  SZGameKit.playEffect("win");
});
SZGameKit.onEnterState("fim", function () {
  SZGameKit.playEffect("gameover");
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.moveWithKeys(ninja, dt);
  SZGameKit.collideGroup(ninja, "casa");
  SZGameKit.collideGroup(ninja, "arvore");
  SZGameKit.keepOnScreen(ninja);
  if (SZGameKit.keyPressed(" ")) {
    SZGameKit.playEffect("click");
    SZGameKit.attackFacing(ninja, 52, 0.3);
  }
  SZGameKit.forEachActive("bambu", function (item) {
    if (SZGameKit.entityState(item) === "golpe") {
      SZGameKit.seek(item, ninja, dt);
    } else if (SZGameKit.distanceBetween(item, ninja) < 70) {
      SZGameKit.setEntityState(item, "golpe", 0.5);
    } else if (SZGameKit.distanceBetween(item, ninja) < 260) {
      SZGameKit.setEntityState(item, "andando", 0.1);
      SZGameKit.seek(item, ninja, dt);
    } else {
      SZGameKit.setEntityState(item, "parado", 0.1);
      SZGameKit.patrolAround(item, 1000, 500, 150);
    }
    if (SZGameKit.didHit(ninja, item)) {
      SZGameKit.hurt(item, 12, 0.25);
      SZGameKit.knockback(item, ninja, 380);
      SZGameKit.playEffect("hit");
      if (SZGameKit.isDead(item)) {
        SZGameKit.burst("faisca", SZGameKit.charX(item), SZGameKit.charY(item));
        SZGameKit.missionKill();
        SZGameKit.emit("inimigo:caiu");
        SZGameKit.recycle(item);
      }
    }
    if (SZGameKit.entityState(item) === "golpe" && SZGameKit.touching(item, ninja) && !SZGameKit.isInvincible(ninja)) {
      SZGameKit.hurt(ninja, SZGameKit.propertyOf(item, "damage"), 1);
      SZGameKit.knockback(ninja, item, 340);
      SZGameKit.playEffect("hurt");
      SZGameKit.cameraShake(6, 0.25);
    }
  });
  SZGameKit.forEachActive("dragao", function (item) {
    if (SZGameKit.entityState(item) === "golpe") {
      SZGameKit.seek(item, ninja, dt);
    } else if (SZGameKit.distanceBetween(item, ninja) < 60) {
      SZGameKit.setEntityState(item, "golpe", 0.4);
    } else if (SZGameKit.distanceBetween(item, ninja) < 320) {
      SZGameKit.setEntityState(item, "andando", 0.1);
      SZGameKit.seek(item, ninja, dt);
    } else {
      SZGameKit.setEntityState(item, "parado", 0.1);
      SZGameKit.patrolAround(item, 1450, 500, 160);
    }
    if (SZGameKit.didHit(ninja, item)) {
      SZGameKit.hurt(item, 12, 0.25);
      SZGameKit.knockback(item, ninja, 420);
      SZGameKit.playEffect("hit");
      if (SZGameKit.isDead(item)) {
        SZGameKit.burst("faisca", SZGameKit.charX(item), SZGameKit.charY(item));
        SZGameKit.missionKill();
        SZGameKit.emit("inimigo:caiu");
        SZGameKit.recycle(item);
      }
    }
    if (SZGameKit.entityState(item) === "golpe" && SZGameKit.touching(item, ninja) && !SZGameKit.isInvincible(ninja)) {
      SZGameKit.hurt(ninja, SZGameKit.propertyOf(item, "damage"), 1);
      SZGameKit.knockback(ninja, item, 300);
      SZGameKit.playEffect("hurt");
    }
  });
  SZGameKit.autoAnimate(ninja);
  if (SZGameKit.isDead(ninja)) {
    SZGameKit.endGame();
  }
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#3f7d4e", false);
  SZGameKit.drawShadow(ninja);
  SZGameKit.drawByDepth(ninja);
  SZGameKit.drawEffects();
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.drawHearts(SZGameKit.healthOf(ninja) / 30, 3, 20, 20);
  ctx.fillStyle = "#0f2417";
  ctx.font = "18px sans-serif";
  ctx.fillText("Bambus: " + SZGameKit.countActive("bambu"), 20, 72);
  ctx.fillText("Dragões: " + SZGameKit.countActive("dragao"), 20, 96);
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(VILA_NINJA_SOURCE),
    extensions: [{ extensionId: 'game-2d-advanced' }],
  })
  // IR persistida é JSON: derruba chaves `undefined` e os `__id` efêmeros.
  const clean = stripGeneratedIds(JSON.parse(JSON.stringify(normalized))) as Record<string, unknown>
  const types = collectGeneratedTypes(behaviorStatements(normalized))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)

  // Impressão compacta no estilo dos exemplos: objetos-folha inline, aspas simples.
  const ordered = {
    html: clean.html,
    css: clean.css,
    extensions: clean.extensions,
    version: clean.version,
    behavior: clean.behavior,
  }
  console.log(printTypeScriptValue(ordered, '  '))
}
