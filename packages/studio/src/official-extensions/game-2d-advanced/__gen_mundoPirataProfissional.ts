import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Mundo Pirata Profissional" (nível 2 da
 * trilogia de plataforma lateral do Clear Code — Super Pirate World — no motor
 * avançado). Rode com
 * `bun src/official-extensions/game-2d-advanced/__gen_mundoPirataProfissional.ts`
 * e cole a saída em `examples/mundoPirataProfissionalExample.ts`. O drift test
 * (`__tests__/mundoPirataProfissionalExample.test.ts`) guarda.
 *
 * Diferencial sobre o base: o CONTROLADOR de plataforma do motor
 * (`platformerHero` + `oneWayPlatform` = pisar por cima e descer com ↓ nas
 * tábuas, a feature do Super-Pirate), CHECKPOINT com respawn, TRÊS inimigos
 * distintos (dente que persegue, casco que patrulha, canhão que atira pérolas),
 * moedas, TRÊS vidas, partículas e câmera que segue num mundo largo. Procedural.
 */
export const MUNDO_PIRATA_PROFISSIONAL_SOURCE = `
SZGameKit.setup({ width: 800, height: 400, background: "#8ecae6", accent: "#e63946" });
SZGameKit.setScreenText("menu", "Mundo Pirata Profissional", "Corra com as setas, pule com a seta para cima e desça pelas tábuas com a seta para baixo. Pise nos inimigos, pegue as moedas e chegue na bandeira sem perder as 3 vidas!", "Aventurar");
SZGameKit.setScreenText("vitoria", "Bandeira conquistada!", "Você atravessou o mundo pirata inteiro. Que capitão!", "Jogar de novo");
SZGameKit.setScreenText("fim", "Fim da linha...", "Suas vidas acabaram. Pise nos inimigos por cima e desvie das pérolas!", "Tentar de novo");
SZGameKit.defineLook("piratao", function (ctx) {
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(6, 14, 18, 18);
  ctx.fillStyle = "#f7c8a2";
  ctx.beginPath();
  ctx.arc(15, 9, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2c3e50";
  ctx.fillRect(3, 3, 24, 6);
  ctx.fillStyle = "#34495e";
  ctx.fillRect(8, 32, 6, 12);
  ctx.fillRect(17, 32, 6, 12);
}, 30, 44);
SZGameKit.defineLook("tijolo", function (ctx) {
  ctx.fillStyle = "#8d6e63";
  ctx.fillRect(0, 0, 80, 40);
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(0, 0, 80, 5);
  ctx.fillRect(0, 20, 80, 2);
}, 80, 40);
SZGameKit.defineLook("tabua", function (ctx) {
  ctx.fillStyle = "#a1887f";
  ctx.fillRect(0, 0, 90, 16);
  ctx.fillStyle = "#7a5628";
  ctx.fillRect(0, 12, 90, 4);
}, 90, 16);
SZGameKit.defineLook("dente", function (ctx) {
  ctx.fillStyle = "#8e44ad";
  ctx.fillRect(2, 6, 24, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(6, 0, 4, 8);
  ctx.fillRect(14, 0, 4, 8);
}, 28, 24);
SZGameKit.defineLook("casco", function (ctx) {
  ctx.fillStyle = "#16a085";
  ctx.fillRect(0, 4, 28, 16);
  ctx.fillStyle = "#0e6655";
  ctx.fillRect(4, 8, 20, 4);
}, 28, 20);
SZGameKit.defineLook("canhao", function (ctx) {
  ctx.fillStyle = "#5d4037";
  ctx.fillRect(0, 8, 26, 20);
  ctx.fillStyle = "#3e2723";
  ctx.fillRect(2, 0, 12, 12);
}, 26, 28);
SZGameKit.defineLook("perola", function (ctx) {
  ctx.fillStyle = "#e0f7fa";
  ctx.beginPath();
  ctx.arc(6, 6, 6, 0, Math.PI * 2);
  ctx.fill();
}, 12, 12);
SZGameKit.defineLook("moeda", function (ctx) {
  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(8, 8, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f0a500";
  ctx.fillRect(6, 4, 4, 8);
}, 16, 16);
SZGameKit.defineLook("bandeira", function (ctx) {
  ctx.fillStyle = "#8a8a8a";
  ctx.fillRect(4, 0, 4, 70);
  ctx.fillStyle = "#e63946";
  ctx.fillRect(8, 4, 36, 24);
}, 48, 70);
SZGameKit.setJumpFeel(0.1, 0.1, 0.3, 2000);
SZGameKit.defineMold("chao", { w: 80, h: 40, health: 1, speed: 0, damage: 0, color: "#8d6e63", look: "tijolo" });
SZGameKit.defineMold("tabua", { w: 90, h: 16, health: 1, speed: 0, damage: 0, color: "#a1887f", look: "tabua" });
SZGameKit.defineMold("moeda", { w: 16, h: 16, health: 1, speed: 0, damage: 0, color: "#ffd166", look: "moeda" });
SZGameKit.defineMold("dente", { w: 28, h: 24, health: 1, speed: 0, damage: 0, color: "#8e44ad", look: "dente" });
SZGameKit.defineMold("casco", { w: 28, h: 20, health: 1, speed: 0, damage: 0, color: "#16a085", look: "casco" });
SZGameKit.defineMold("canhao", { w: 26, h: 28, health: 1, speed: 0, damage: 0, color: "#5d4037", look: "canhao" });
SZGameKit.defineMold("perola", { w: 12, h: 12, health: 1, speed: 0, damage: 0, color: "#e0f7fa", look: "perola" });
SZGameKit.defineEffect("poeira", { count: 8, color: "#ffffff", size: 3, life: 0.4, speed: 100, gravity: 300 });
SZGameKit.defineEffect("estrela", { count: 12, color: "#ffd166", size: 4, life: 0.5, speed: 160, gravity: 0 });
const heroi = SZGameKit.createCharacter({ w: 30, h: 44, speed: 220, color: "#4a76b8" });
SZGameKit.stateLook(heroi, "parado", "piratao");
let vidas = 3;
let pontos = 0;
let proximaPerola = 1.6;
SZGameKit.setCheckpoint(40, 250);
SZGameKit.respawn(heroi);
SZGameKit.spawnFromMold("chao", 0, 340);
SZGameKit.spawnFromMold("chao", 80, 340);
SZGameKit.spawnFromMold("chao", 160, 340);
SZGameKit.spawnFromMold("chao", 240, 340);
SZGameKit.spawnFromMold("chao", 480, 340);
SZGameKit.spawnFromMold("chao", 560, 340);
SZGameKit.spawnFromMold("chao", 640, 340);
SZGameKit.spawnFromMold("chao", 880, 340);
SZGameKit.spawnFromMold("chao", 960, 340);
SZGameKit.spawnFromMold("chao", 1040, 340);
SZGameKit.spawnFromMold("chao", 1120, 340);
SZGameKit.spawnFromMold("chao", 1200, 340);
SZGameKit.spawnFromMold("chao", 1280, 340);
SZGameKit.spawnFromMold("chao", 1360, 340);
SZGameKit.spawnFromMold("chao", 1440, 340);
SZGameKit.spawnFromMold("chao", 1520, 340);
SZGameKit.spawnFromMold("tabua", 320, 250);
SZGameKit.spawnFromMold("tabua", 700, 230);
SZGameKit.spawnFromMold("tabua", 1080, 250);
SZGameKit.spawnFromMold("tabua", 1300, 220);
SZGameKit.spawnFromMold("moeda", 160, 300);
SZGameKit.spawnFromMold("moeda", 350, 210);
SZGameKit.spawnFromMold("moeda", 730, 190);
SZGameKit.spawnFromMold("moeda", 980, 300);
SZGameKit.spawnFromMold("moeda", 1110, 210);
SZGameKit.spawnFromMold("moeda", 1330, 180);
SZGameKit.spawnFromMold("moeda", 1480, 300);
SZGameKit.spawnFromMold("dente", 620, 316);
SZGameKit.spawnFromMold("casco", 1000, 320);
SZGameKit.spawnFromMold("canhao", 1240, 312);
SZGameKit.defineRegion("fim", 1560, 250, 90, 100);
SZGameKit.cameraFollow(heroi, 1700, 400);
SZGameKit.on("pirata:levou", function () {
  vidas = vidas - 1;
  SZGameKit.cameraShake(8, 0.3);
  SZGameKit.playEffect("hurt");
  SZGameKit.respawn(heroi);
  if (vidas < 1) {
    SZGameKit.playEffect("gameover");
    SZGameKit.setState("fim");
  }
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.platformerHero(heroi, 220, 640, dt);
  SZGameKit.dropThrough(heroi);
  SZGameKit.collideGroup(heroi, "chao");
  SZGameKit.oneWayPlatform(heroi, "tabua", dt);
  SZGameKit.platformerAnim(heroi);
  SZGameKit.forEachActive("moeda", function (moeda) {
    if (SZGameKit.touching(heroi, moeda)) {
      SZGameKit.burst("estrela", SZGameKit.charX(moeda) + 8, SZGameKit.charY(moeda) + 8);
      SZGameKit.playEffect("coin");
      pontos = pontos + 1;
      SZGameKit.recycle(moeda);
    }
  });
  SZGameKit.forEachActive("dente", function (bicho) {
    if (SZGameKit.charX(heroi) > SZGameKit.charX(bicho)) {
      SZGameKit.setVelocity(bicho, 70, 0);
    } else {
      SZGameKit.setVelocity(bicho, 0 - 70, 0);
    }
    SZGameKit.moveByVelocity(bicho, dt);
    SZGameKit.applyGravity(bicho, 1600, dt);
    SZGameKit.collideGroup(bicho, "chao");
    if (SZGameKit.touching(heroi, bicho)) {
      if (SZGameKit.charY(heroi) + 30 < SZGameKit.charY(bicho)) {
        SZGameKit.burst("poeira", SZGameKit.charX(bicho) + 14, SZGameKit.charY(bicho));
        SZGameKit.playEffect("hit");
        pontos = pontos + 2;
        SZGameKit.recycle(bicho);
      } else {
        SZGameKit.emit("pirata:levou");
      }
    }
  });
  SZGameKit.forEachActive("casco", function (bicho) {
    SZGameKit.moveByVelocity(bicho, dt);
    SZGameKit.applyGravity(bicho, 1600, dt);
    SZGameKit.collideGroup(bicho, "chao");
    if (SZGameKit.charX(bicho) < 900) {
      SZGameKit.setVelocity(bicho, 55, 0);
    }
    if (SZGameKit.charX(bicho) > 1140) {
      SZGameKit.setVelocity(bicho, 0 - 55, 0);
    }
    if (SZGameKit.touching(heroi, bicho)) {
      if (SZGameKit.charY(heroi) + 30 < SZGameKit.charY(bicho)) {
        SZGameKit.burst("poeira", SZGameKit.charX(bicho) + 14, SZGameKit.charY(bicho));
        SZGameKit.playEffect("hit");
        pontos = pontos + 2;
        SZGameKit.recycle(bicho);
      } else {
        SZGameKit.emit("pirata:levou");
      }
    }
  });
  proximaPerola = proximaPerola - dt;
  if (proximaPerola <= 0) {
    proximaPerola = 2;
    const bala = SZGameKit.spawnFromMold("perola", 1240, 306);
    if (SZGameKit.charX(heroi) < 1240) {
      SZGameKit.setVelocity(bala, 0 - 150, 0);
    } else {
      SZGameKit.setVelocity(bala, 150, 0);
    }
  }
  SZGameKit.forEachActive("perola", function (bala) {
    SZGameKit.moveByVelocity(bala, dt);
    if (SZGameKit.touching(heroi, bala)) {
      SZGameKit.recycle(bala);
      SZGameKit.emit("pirata:levou");
    }
  });
  SZGameKit.cullOffscreen("perola", 200);
  if (SZGameKit.charY(heroi) > 430) {
    SZGameKit.emit("pirata:levou");
  }
  if (SZGameKit.isInside(heroi, "fim")) {
    SZGameKit.playEffect("win");
    SZGameKit.setState("vitoria");
  }
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#8ecae6", false);
  SZGameKit.drawActive("chao");
  SZGameKit.drawActive("tabua");
  SZGameKit.drawActive("moeda");
  SZGameKit.drawLook("bandeira", 1560, 270, 48, 70);
  SZGameKit.drawActive("dente");
  SZGameKit.drawActive("casco");
  SZGameKit.drawActive("canhao");
  SZGameKit.drawActive("perola");
  SZGameKit.drawShadow(heroi);
  SZGameKit.drawCharacter(heroi);
  SZGameKit.drawEffects();
});
SZGameKit.onDrawHud(function (ctx) {
  ctx.fillStyle = "#0e2a38";
  ctx.font = "24px sans-serif";
  ctx.fillText("Vidas: " + vidas, 20, 36);
  ctx.fillText("Tesouro: " + pontos, 20, 68);
});
`.trim()

const stripIds = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripIds)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id') continue
      out[k] = stripIds(v)
    }
    return out
  }
  return value
}

const collectTypes = (value: unknown, out: Set<string> = new Set()): Set<string> => {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>
    if (typeof o.type === 'string') out.add(o.type)
    for (const v of Object.values(o)) collectTypes(v, out)
  }
  return out
}

if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(MUNDO_PIRATA_PROFISSIONAL_SOURCE),
    extensions: [{ extensionId: 'game-2d-advanced' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior } as typeof normalized))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
