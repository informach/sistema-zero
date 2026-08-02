import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectGeneratedTypes, printTypeScriptValue, stripGeneratedIds } from './generationUtils'

/**
 * Gerador one-off da IR do exemplo "Dino Corredor Profissional" (nível 2 da
 * família Dino: o runner do Clear Code recriado com o motor avançado). Rode com
 * `bun src/official-extensions/game-2d-advanced/__gen_dinoProfissional.ts` e
 * cole a saída em `examples/dinoProfissionalExample.ts`. O drift test
 * (`__tests__/dinoProfissionalExample.test.ts`) guarda o resultado.
 *
 * ⭐ Decisão de motor: o nascedouro contínuo é `everySeconds + spawnFromMold`
 * (não `startSpawner`, que nasce numa BORDA SORTEADA — o runner precisa nascer
 * sempre à direita, na altura certa de cada obstáculo).
 */
export const DINO_PROFISSIONAL_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#dff6ff", accent: "#2f9e44" });
SZGameKit.setScreenText("menu", "Dino Corredor Profissional", "Espaço, seta para cima ou clique: pular. Salte os cactos e não bata nos pássaros!", "Correr");
SZGameKit.setScreenText("fim", "Bateu!", "O recorde fica guardado. Tente de novo!", "Correr de novo");
SZGameKit.defineLook("sol", function (ctx) {
  ctx.fillStyle = "#ffd43b";
  ctx.beginPath();
  ctx.arc(40, 40, 32, 0, Math.PI * 2);
  ctx.fill();
}, 80, 80);
SZGameKit.defineLook("nuvem", function (ctx) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(10, 20, 100, 18);
  ctx.fillRect(26, 8, 40, 20);
  ctx.fillRect(64, 12, 32, 16);
}, 120, 44);
SZGameKit.defineLook("risco", function (ctx) {
  ctx.fillStyle = "#b08d57";
  ctx.fillRect(0, 0, 36, 6);
  ctx.fillRect(46, 0, 10, 6);
}, 60, 6);
SZGameKit.defineLook("dino correndo", function (ctx) {
  ctx.fillStyle = "#495057";
  ctx.fillRect(0, 24, 12, 8);
  ctx.fillRect(8, 18, 32, 26);
  ctx.fillRect(28, 0, 26, 20);
  ctx.fillRect(36, 24, 10, 6);
  ctx.fillRect(12, 44, 10, 20);
  ctx.fillRect(30, 44, 10, 12);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(44, 4, 6, 6);
}, 60, 64);
SZGameKit.defineLook("dino pulando", function (ctx) {
  ctx.fillStyle = "#495057";
  ctx.fillRect(0, 20, 12, 8);
  ctx.fillRect(8, 16, 32, 26);
  ctx.fillRect(28, 0, 26, 20);
  ctx.fillRect(36, 22, 10, 6);
  ctx.fillRect(14, 42, 10, 12);
  ctx.fillRect(30, 42, 10, 12);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(44, 4, 6, 6);
}, 60, 64);
SZGameKit.defineLook("cacto", function (ctx) {
  ctx.fillStyle = "#2f9e44";
  ctx.fillRect(13, 0, 8, 52);
  ctx.fillRect(3, 10, 6, 20);
  ctx.fillRect(3, 24, 12, 6);
  ctx.fillRect(25, 16, 6, 18);
  ctx.fillRect(21, 28, 10, 6);
}, 34, 52);
SZGameKit.defineLook("passaro", function (ctx) {
  ctx.fillStyle = "#7048e8";
  ctx.fillRect(10, 12, 26, 12);
  ctx.fillRect(18, 2, 14, 12);
  ctx.fillRect(34, 10, 10, 6);
  ctx.fillStyle = "#ffd43b";
  ctx.fillRect(2, 14, 8, 6);
}, 44, 30);
SZGameKit.defineMold("chao", { w: 960, h: 80, health: 1, speed: 0, damage: 0, color: "#e6c98c" });
SZGameKit.defineMold("cacto", { w: 34, h: 52, health: 1, speed: 0, damage: 0, color: "#2f9e44", look: "cacto" });
SZGameKit.defineMold("passaro", { w: 44, h: 30, health: 1, speed: 0, damage: 0, color: "#7048e8", look: "passaro" });
SZGameKit.spawnFromMold("chao", 0, 460);
const dino = SZGameKit.createCharacter({ w: 60, h: 64, speed: 0, color: "#495057" });
SZGameKit.placeCharacter(dino, 120, 396);
SZGameKit.setHitbox(dino, 12, 10, 36, 50);
SZGameKit.stateLook(dino, "parado", "dino correndo");
SZGameKit.stateLook(dino, "andando", "dino correndo");
SZGameKit.stateLook(dino, "pulando", "dino pulando");
let pontos = 0;
let velocidade = 320;
let recorde = SZGameKit.savedValue("recorde");
let nuvemX = 0;
let riscoX = 0;
SZGameKit.on("dino:bateu", function () {
  SZGameKit.playEffect("hit");
  SZGameKit.cameraShake(8, 0.35);
  if (pontos > recorde) {
    recorde = pontos;
    SZGameKit.saveValue("recorde", recorde);
  }
  SZGameKit.setScreenText("fim", "Bateu!", "Pontos: " + pontos + " / Recorde: " + recorde, "Correr de novo");
  SZGameKit.endGame();
});
SZGameKit.onGameClick(function (px, py) {
  if (SZGameKit.stateIs("jogando") && SZGameKit.isOnGround(dino)) {
    SZGameKit.playEffect("jump");
    SZGameKit.jump(dino, 860);
  }
});
SZGameKit.onUpdate(function (dt) {
  if (SZGameKit.keyPressed(" ") || SZGameKit.keyPressed("arrowup")) {
    if (SZGameKit.isOnGround(dino)) {
      SZGameKit.playEffect("jump");
      SZGameKit.jump(dino, 860);
    }
  }
  SZGameKit.applyGravity(dino, 2160, dt);
  SZGameKit.moveByVelocity(dino, dt);
  SZGameKit.collideGroup(dino, "chao");
  if (SZGameKit.isOnGround(dino)) {
    SZGameKit.setEntityState(dino, "andando", 0.05);
  }
  SZGameKit.autoAnimate(dino);
  if (velocidade < 720) {
    velocidade = velocidade + 8 * dt;
  }
  if (SZGameKit.everySeconds("ponto", 0.1)) {
    pontos = pontos + 1;
  }
  nuvemX = nuvemX - velocidade * 0.2 * dt;
  if (nuvemX < 0 - 320) {
    nuvemX = nuvemX + 320;
  }
  riscoX = riscoX - velocidade * dt;
  if (riscoX < 0 - 240) {
    riscoX = riscoX + 240;
  }
  if (SZGameKit.everySeconds("cacto", 1.4)) {
    SZGameKit.spawnFromMold("cacto", SZGameKit.width() + 80, 408);
  }
  if (SZGameKit.everySeconds("passaro", 4.7)) {
    SZGameKit.spawnFromMold("passaro", SZGameKit.width() + 80, 330);
  }
  SZGameKit.forEachActive("cacto", function (item) {
    SZGameKit.setVelocity(item, 0 - velocidade, 0);
    SZGameKit.moveByVelocity(item, dt);
    if (SZGameKit.touching(dino, item)) {
      SZGameKit.emit("dino:bateu");
    }
    if (SZGameKit.charX(item) < 0 - 80) {
      pontos = pontos + 5;
      SZGameKit.playEffect("coin");
      SZGameKit.recycle(item);
    }
  });
  SZGameKit.forEachActive("passaro", function (item) {
    SZGameKit.setVelocity(item, 0 - velocidade, 0);
    SZGameKit.moveByVelocity(item, dt);
    if (SZGameKit.touching(dino, item)) {
      SZGameKit.emit("dino:bateu");
    }
  });
  SZGameKit.cullOffscreen("cacto", 200);
  SZGameKit.cullOffscreen("passaro", 200);
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#dff6ff", false);
  SZGameKit.drawLook("sol", 800, 48, 80, 80);
  SZGameKit.drawLook("nuvem", nuvemX, 84, 120, 44);
  SZGameKit.drawLook("nuvem", nuvemX + 320, 138, 120, 44);
  SZGameKit.drawLook("nuvem", nuvemX + 640, 66, 120, 44);
  SZGameKit.drawLook("nuvem", nuvemX + 960, 116, 120, 44);
  SZGameKit.drawActive("chao");
  SZGameKit.drawLook("risco", riscoX, 502, 60, 6);
  SZGameKit.drawLook("risco", riscoX + 240, 502, 60, 6);
  SZGameKit.drawLook("risco", riscoX + 480, 502, 60, 6);
  SZGameKit.drawLook("risco", riscoX + 720, 502, 60, 6);
  SZGameKit.drawLook("risco", riscoX + 960, 502, 60, 6);
  SZGameKit.drawActive("cacto");
  SZGameKit.drawActive("passaro");
  SZGameKit.drawCharacter(dino);
});
SZGameKit.onDrawHud(function (ctx) {
  ctx.fillStyle = "#343a40";
  ctx.font = "26px sans-serif";
  ctx.fillText("Pontos: " + pontos, 20, 40);
  ctx.fillText("Recorde: " + recorde, 20, 72);
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(DINO_PROFISSIONAL_SOURCE),
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
