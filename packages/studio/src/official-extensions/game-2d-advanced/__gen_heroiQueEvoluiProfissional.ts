import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Herói que Evolui Profissional" (nível 2 da
 * família Zelda do Clear Code, sobre o motor avançado). Rode com
 * `bun src/official-extensions/game-2d-advanced/__gen_heroiQueEvoluiProfissional.ts`
 * e cole a saída em `examples/heroiQueEvoluiProfissionalExample.ts`. O drift test
 * (`__tests__/heroiQueEvoluiProfissionalExample.test.ts`) guarda o resultado.
 *
 * REUSA o combate do "Vila Ninja Profissional" (mundo com câmera, FSM de
 * inimigo por distância parado -> perseguir -> golpe via entityState, ataque na
 * direção com attackFacing + didHit, hurt + knockback + i-frames, drawHearts).
 * O DIFERENCIAL (o único sistema que o Vila Ninja NÃO ensina, o Upgrade do
 * original em pygame): cada monstro derrotado dá EXP; ao encher a barra o herói
 * SOBE DE NÍVEL e um MENU DE MELHORIA (rpgMenu) deixa gastar o nível em espada
 * mais forte, golpe mais longe ou passos mais rápidos. Os monstros nascem em
 * ondas (startSpawner). Chegar ao nível 6 vence (setState "vitoria").
 */
export const HEROI_QUE_EVOLUI_PROFISSIONAL_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#2f5d3a", accent: "#ffd166" });
SZGameKit.setScreenText("menu", "Herói que Evolui Profissional", "Setas ou WASD: andar. Espaço: golpe na direção. A cada nível, escolha uma melhoria. Chegue ao nível 6!", "Começar");
SZGameKit.setScreenText("vitoria", "Herói lendário!", "Você chegou ao nível 6 evoluindo a cada batalha!", "Jogar de novo");
SZGameKit.setScreenText("fim", "O herói caiu!", "Os monstros venceram. Treine para evoluir mais!", "Tentar de novo");
SZGameKit.defineLook("heroi parado", function (ctx) {
  ctx.fillStyle = "#2f6fbf";
  ctx.fillRect(9, 2, 20, 12);
  ctx.fillStyle = "#f2c6a0";
  ctx.fillRect(12, 12, 14, 8);
  ctx.fillStyle = "#274b7a";
  ctx.fillRect(7, 20, 24, 20);
  ctx.fillStyle = "#1a2f4a";
  ctx.fillRect(11, 40, 7, 14);
  ctx.fillRect(20, 40, 7, 14);
}, 38, 54);
SZGameKit.defineLook("heroi andando", function (ctx) {
  ctx.fillStyle = "#2f6fbf";
  ctx.fillRect(9, 2, 20, 12);
  ctx.fillStyle = "#f2c6a0";
  ctx.fillRect(12, 12, 14, 8);
  ctx.fillStyle = "#274b7a";
  ctx.fillRect(7, 20, 24, 20);
  ctx.fillStyle = "#1a2f4a";
  ctx.fillRect(9, 40, 7, 14);
  ctx.fillRect(22, 40, 7, 14);
}, 38, 54);
SZGameKit.defineLook("heroi golpe", function (ctx) {
  ctx.fillStyle = "#2f6fbf";
  ctx.fillRect(5, 2, 20, 12);
  ctx.fillStyle = "#f2c6a0";
  ctx.fillRect(8, 12, 14, 8);
  ctx.fillStyle = "#274b7a";
  ctx.fillRect(3, 20, 24, 20);
  ctx.fillStyle = "#e9edf2";
  ctx.fillRect(27, 24, 11, 5);
}, 38, 54);
SZGameKit.defineLook("monstro", function (ctx) {
  ctx.fillStyle = "#8d55c9";
  ctx.fillRect(4, 8, 32, 28);
  ctx.fillStyle = "#f6f2ff";
  ctx.fillRect(10, 16, 7, 7);
  ctx.fillRect(23, 16, 7, 7);
  ctx.fillStyle = "#20122f";
  ctx.fillRect(12, 18, 3, 3);
  ctx.fillRect(25, 18, 3, 3);
}, 40, 40);
SZGameKit.defineEffect("faisca", { count: 12, color: "#ffe066", size: 4, life: 0.35, speed: 190, gravity: 0 });
SZGameKit.createEmptyTilemap("campo", 26, 16, -1, "");
SZGameKit.defineMold("monstro", { w: 40, h: 40, health: 12, speed: 96, damage: 10, color: "#8d55c9", look: "monstro" });
const heroi = SZGameKit.createCharacter({ w: 38, h: 54, speed: 230, color: "#2f6fbf" });
SZGameKit.placeCharacter(heroi, 600, 400);
SZGameKit.setHitbox(heroi, 6, 22, 26, 30);
SZGameKit.setSwingWindow(heroi, 0.08, 0.16);
SZGameKit.stateLook(heroi, "parado", "heroi parado");
SZGameKit.stateLook(heroi, "andando", "heroi andando");
SZGameKit.stateLook(heroi, "golpe", "heroi golpe");
SZGameKit.stateLook(heroi, "dano", "heroi parado");
let exp = 0;
let nivel = 1;
let dano = 6;
let alcance = 48;
let rapidez = 1;
let escolhendo = 0;
SZGameKit.cameraFollowMap(heroi, "campo");
SZGameKit.startSpawner("monstro", 1.1);
SZGameKit.onEnterState("vitoria", function () {
  SZGameKit.playEffect("win");
});
SZGameKit.onEnterState("fim", function () {
  SZGameKit.playEffect("gameover");
});
SZGameKit.onUpdate(function (dt) {
  if (escolhendo === 0) {
  SZGameKit.moveWithKeys(heroi, dt);
  SZGameKit.setSpeedMultiplier(heroi, rapidez);
  SZGameKit.keepOnScreen(heroi);
  if (SZGameKit.keyPressed(" ")) {
    SZGameKit.playEffect("click");
    SZGameKit.attackFacing(heroi, alcance, 0.3);
  }
  SZGameKit.forEachActive("monstro", function (item) {
    if (SZGameKit.entityState(item) === "golpe") {
      SZGameKit.seek(item, heroi, dt);
    } else if (SZGameKit.distanceBetween(item, heroi) < 60) {
      SZGameKit.setEntityState(item, "golpe", 0.5);
    } else {
      SZGameKit.setEntityState(item, "andando", 0.1);
      SZGameKit.seek(item, heroi, dt);
    }
    if (SZGameKit.didHit(heroi, item)) {
      SZGameKit.hurt(item, dano, 0.25);
      SZGameKit.knockback(item, heroi, 380);
      SZGameKit.playEffect("hit");
      if (SZGameKit.isDead(item)) {
        SZGameKit.burst("faisca", SZGameKit.charX(item), SZGameKit.charY(item));
        SZGameKit.recycle(item);
        exp = exp + 1;
        if (exp >= nivel * 3) {
          nivel = nivel + 1;
          exp = 0;
          escolhendo = 1;
          SZGameKit.playEffect("powerup");
          SZGameKit.rpgMenu("Subiu de nivel! Escolha a melhoria:", function () {
            SZGameKit.rpgOption("Espada mais forte", function () {
              dano = dano + 6;
              escolhendo = 0;
            });
            SZGameKit.rpgOption("Golpe mais longe", function () {
              alcance = alcance + 12;
              escolhendo = 0;
            });
            SZGameKit.rpgOption("Passos mais rapidos", function () {
              rapidez = rapidez + 0.2;
              escolhendo = 0;
            });
          });
        }
      }
    }
    if (SZGameKit.entityState(item) === "golpe" && SZGameKit.touching(item, heroi) && !SZGameKit.isInvincible(heroi)) {
      SZGameKit.hurt(heroi, SZGameKit.propertyOf(item, "damage"), 1);
      SZGameKit.knockback(heroi, item, 320);
      SZGameKit.playEffect("hurt");
      SZGameKit.cameraShake(6, 0.25);
    }
  });
  SZGameKit.cullOffscreen("monstro", 320);
  SZGameKit.autoAnimate(heroi);
  if (nivel >= 6 && escolhendo === 0) {
    SZGameKit.setState("vitoria");
  }
  if (SZGameKit.isDead(heroi)) {
    SZGameKit.endGame();
  }
  }
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#3f7d4e", true);
  SZGameKit.drawShadow(heroi);
  SZGameKit.drawByDepth(heroi);
  SZGameKit.drawEffects();
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.drawHearts(SZGameKit.healthOf(heroi) / 100, 4, 20, 20);
  ctx.fillStyle = "#f3f6ff";
  ctx.font = "20px sans-serif";
  ctx.fillText("Nivel: " + nivel, 20, 66);
  ctx.fillText("EXP: " + exp, 20, 92);
  SZGameKit.drawBar(exp, nivel * 3, 20, 104, 160, 12, "#ffd166");
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(HEROI_QUE_EVOLUI_PROFISSIONAL_SOURCE),
    extensions: [{ extensionId: 'game-2d-advanced' }],
  })
  const stripIds = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stripIds)
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (key !== '__id') out[key] = stripIds(child)
      }
      return out
    }
    return value
  }
  const clean = stripIds(JSON.parse(JSON.stringify(normalized))) as Record<string, unknown>
  const collectTypes = (value: unknown, out: Set<string> = new Set()): Set<string> => {
    if (Array.isArray(value)) {
      for (const item of value) collectTypes(item, out)
    } else if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      if (typeof record.type === 'string') out.add(record.type)
      for (const child of Object.values(record)) collectTypes(child, out)
    }
    return out
  }
  const types = collectTypes(behaviorStatements(normalized))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)

  const printTS = (value: unknown, indent: string): string => {
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]'
      const inner = indent + '  '
      const items = value.map((item) => inner + printTS(item, inner))
      return '[\n' + items.join(',\n') + ',\n' + indent + ']'
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
      if (entries.length === 0) return '{}'
      const inner = indent + '  '
      const lines = entries.map(([key, child]) => `${inner}${key}: ${printTS(child, inner)}`)
      return '{\n' + lines.join(',\n') + ',\n' + indent + '}'
    }
    if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
    return String(value)
  }
  const ordered = {
    html: clean.html,
    css: clean.css,
    extensions: clean.extensions,
    version: clean.version,
    behavior: clean.behavior,
  }
  console.log(printTS(ordered, '  '))
}
