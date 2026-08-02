import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectGeneratedTypes, printTypeScriptValue, stripGeneratedIds } from './generationUtils'

/**
 * Gerador one-off da IR do exemplo "Escalada do Guerreiro Profissional" — o
 * vertical-platformer do Chris Courses recriado com o 🏃 Kit Plataforma do motor
 * avançado (o mesmo kit do `saltoNaFlorestaExample`/`dinoProfissionalExample`),
 * SEM assets (o guerreiro, o chão, as tábuas e o fundo são retângulos e
 * `defineLook` em blocos de Canvas). Rode com
 * `bun src/official-extensions/game-2d-advanced/__gen_escaladaProfissional.ts`
 * e cole a saída em `examples/escaladaProfissionalExample.ts`. O drift test
 * (`__tests__/escaladaProfissionalExample.test.ts`) guarda o resultado.
 *
 * Fidelidade ao original (index.js do vertical-platformer):
 * - O guerreiro anda com A/D (o `keys.d/a` do original) e pula (o `w -> velocity
 *   = -4`) via o pulo gostoso do kit (`platformerHero`), com coyote/buffer/pulo
 *   variável de brinde.
 * - Os `collisionBlocks` (símbolo 202) viram um molde sólido de chão
 *   (`collideGroup`); os `platformCollisionBlocks` (height 4) viram o molde de
 *   tábua fina que se atravessa por baixo (`oneWayPlatform`, o `platform`
 *   one-way do original).
 * - A câmera que PANORAMA para seguir o herói subindo (o `shouldPanCameraDown/Up`
 *   do original) vira `cameraFollow` num mundo mais alto que a tela.
 * - Cair no buraco reposiciona no checkpoint (`setCheckpoint` + `respawn`), como
 *   o `checkForHorizontalCanvasCollision` que segurava o herói no mundo.
 * - Chegar no TOPO (uma região `defineRegion` + `isInside`) é a vitória; a maior
 *   altura vira RECORDE persistente (`saveValue`/`savedValue`).
 */
export const ESCALADA_PROFISSIONAL_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#4a6fa5", accent: "#e07a3f" });
SZGameKit.setScreenText("menu", "Escalada do Guerreiro Profissional", "Use as setas para andar e pular. Suba pelas tábuas até a bandeira no topo!", "Escalar");
SZGameKit.setScreenText("vitoria", "Chegou ao topo!", "Você escalou a torre inteira. A maior altura fica guardada!", "Escalar de novo");
SZGameKit.defineLook("guerreiro", function (ctx) {
  ctx.fillStyle = "#d9a066";
  ctx.fillRect(8, 2, 16, 14);
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(8, 0, 16, 5);
  ctx.fillStyle = "#4a76b8";
  ctx.fillRect(6, 16, 20, 20);
  ctx.fillStyle = "#3a3f58";
  ctx.fillRect(8, 36, 7, 12);
  ctx.fillRect(17, 36, 7, 12);
  ctx.fillStyle = "#c0c8d0";
  ctx.fillRect(26, 12, 4, 26);
}, 32, 48);
SZGameKit.defineLook("tijolo", function (ctx) {
  ctx.fillStyle = "#6b4f3a";
  ctx.fillRect(0, 0, 120, 24);
  ctx.fillStyle = "#5a4230";
  ctx.fillRect(0, 0, 120, 4);
  ctx.fillRect(0, 12, 120, 2);
  ctx.fillRect(38, 0, 3, 12);
  ctx.fillRect(80, 12, 3, 12);
}, 120, 24);
SZGameKit.defineLook("tabua", function (ctx) {
  ctx.fillStyle = "#a0763d";
  ctx.fillRect(0, 0, 110, 12);
  ctx.fillStyle = "#7a5628";
  ctx.fillRect(0, 9, 110, 3);
}, 110, 12);
SZGameKit.defineLook("bandeira", function (ctx) {
  ctx.fillStyle = "#8a8a8a";
  ctx.fillRect(4, 0, 4, 60);
  ctx.fillStyle = "#e63946";
  ctx.fillRect(8, 4, 34, 22);
}, 46, 60);
SZGameKit.setJumpFeel(0.1, 0.1, 0.3, 2000);
SZGameKit.defineMold("chao", { w: 120, h: 24, health: 1, speed: 0, damage: 0, color: "#6b4f3a", look: "tijolo" });
SZGameKit.defineMold("tabua", { w: 110, h: 12, health: 1, speed: 0, damage: 0, color: "#a0763d", look: "tabua" });
SZGameKit.defineEffect("poeira", { count: 8, color: "#ffffff", size: 3, life: 0.4, speed: 100, gravity: 300 });
const heroi = SZGameKit.createCharacter({ w: 32, h: 48, speed: 200, color: "#4a76b8" });
SZGameKit.stateLook(heroi, "parado", "guerreiro");
let recorde = SZGameKit.savedValue("recorde");
let altura = 0;
SZGameKit.setCheckpoint(80, 1360);
SZGameKit.respawn(heroi);
SZGameKit.spawnFromMold("chao", 0, 1420);
SZGameKit.spawnFromMold("chao", 120, 1420);
SZGameKit.spawnFromMold("chao", 240, 1420);
SZGameKit.spawnFromMold("chao", 360, 1420);
SZGameKit.spawnFromMold("tabua", 260, 1300);
SZGameKit.spawnFromMold("tabua", 120, 1080);
SZGameKit.spawnFromMold("tabua", 420, 940);
SZGameKit.spawnFromMold("tabua", 200, 780);
SZGameKit.spawnFromMold("tabua", 520, 640);
SZGameKit.spawnFromMold("tabua", 280, 480);
SZGameKit.spawnFromMold("tabua", 560, 320);
SZGameKit.spawnFromMold("tabua", 340, 180);
SZGameKit.defineRegion("topo", 300, 60, 200, 100);
SZGameKit.cameraFollow(heroi, 960, 1500);
SZGameKit.on("plataforma:pisou", function () {
  SZGameKit.burst("poeira", SZGameKit.charX(heroi) + 16, SZGameKit.charY(heroi) + 48);
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.platformerHero(heroi, 200, 620, dt);
  SZGameKit.dropThrough(heroi);
  SZGameKit.collideGroup(heroi, "chao");
  SZGameKit.oneWayPlatform(heroi, "tabua", dt);
  SZGameKit.platformerAnim(heroi);
  altura = Math.round(1420 - SZGameKit.charY(heroi));
  if (altura > recorde) {
    recorde = altura;
    SZGameKit.saveValue("recorde", recorde);
  }
  if (SZGameKit.charY(heroi) > 1560) {
    SZGameKit.respawn(heroi);
  }
  if (SZGameKit.isInside(heroi, "topo")) {
    SZGameKit.setState("vitoria");
  }
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#4a6fa5", false);
  SZGameKit.drawActive("chao");
  SZGameKit.drawActive("tabua");
  SZGameKit.drawLook("bandeira", 320, 100, 46, 60);
  SZGameKit.drawShadow(heroi);
  SZGameKit.drawCharacter(heroi);
  SZGameKit.drawEffects();
});
SZGameKit.onDrawHud(function (ctx) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "24px sans-serif";
  ctx.fillText("Altura: " + altura, 20, 36);
  ctx.fillText("Recorde: " + recorde, 20, 68);
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(ESCALADA_PROFISSIONAL_SOURCE),
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
