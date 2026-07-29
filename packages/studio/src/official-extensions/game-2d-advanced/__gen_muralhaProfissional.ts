import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Muralha do Reino Profissional" — o
 * tower-defense do Chris Courses recriado com o 🏰 Kit Defesa de Torre do motor
 * avançado (o mesmo kit do `defesaDoReinoExample`), SEM assets (o mapa, os orcs,
 * as torres e os tiros são `defineLook`/`drawBackground` em blocos de Canvas).
 * Rode com `bun src/official-extensions/game-2d-advanced/__gen_muralhaProfissional.ts`
 * e cole a saída em `examples/muralhaProfissionalExample.ts`. O drift test
 * (`__tests__/muralhaProfissionalExample.test.ts`) guarda o resultado.
 *
 * Fidelidade ao original (js/index.js do tower-defense):
 * - O caminho por waypoints do original (o L com curvas) vira `definePath` com
 *   pathPoint por ponto; a `tdWave` faz os orcs marcharem ponto a ponto.
 * - Os "placement tiles" (símbolo 14 na grade) viram `tdSlot`: os lugares onde
 *   se compra torre. Comprar custa 50 (o `coins - 50 >= 0` do original) via
 *   `tdOnBuy`; sem moeda, o kit avisa `compra:negada`.
 * - A torre mira o invasor MAIS avançado no alcance (o `validEnemies[0]` do
 *   original, que era o 1º da lista = o da frente) com `pickActive` maior por
 *   `pathProgress` + `distanceBetween < alcance`, e atira com `launchTowards`.
 * - O tiro derruba 20 de vida do orc (`enemy.health -= 20`); orc morto dá +25
 *   moedas (`coins += 25`) e explode por EFEITO pooled.
 * - Cada orc que passa tira 1 coração (`hearts -= 1`); zerar = fim de jogo (o
 *   `hearts === 0 -> game over` do original). Começa com 10 corações, 100 moedas
 *   e ondas de 3, crescendo +2 a cada onda limpa (o `enemyCount += 2`).
 */
export const MURALHA_PROFISSIONAL_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#3a5a40", accent: "#ffd166" });
SZGameKit.setScreenText("menu", "Muralha do Reino Profissional", "Clique nos lugares de terra para comprar torres. Elas miram sozinhas o invasor mais na frente. Segure as ondas!", "Defender");
SZGameKit.setScreenText("fim", "A muralha caiu!", "O recorde fica guardado. Tente de novo!", "Defender de novo");
SZGameKit.defineLook("orc", function (ctx) {
  ctx.fillStyle = "#6a994e";
  ctx.fillRect(6, 8, 28, 26);
  ctx.fillStyle = "#386641";
  ctx.fillRect(6, 30, 28, 6);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(12, 16, 6, 6);
  ctx.fillRect(24, 16, 6, 6);
  ctx.fillStyle = "#2b2d42";
  ctx.fillRect(14, 18, 3, 3);
  ctx.fillRect(26, 18, 3, 3);
}, 40, 40);
SZGameKit.defineLook("torre", function (ctx) {
  ctx.fillStyle = "#6c757d";
  ctx.fillRect(6, 20, 36, 24);
  ctx.fillStyle = "#adb5bd";
  ctx.fillRect(10, 6, 28, 18);
  ctx.fillStyle = "#495057";
  ctx.fillRect(16, 10, 16, 10);
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(20, 0, 8, 10);
}, 48, 48);
SZGameKit.defineLook("flecha", function (ctx) {
  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.arc(7, 7, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f4a259";
  ctx.beginPath();
  ctx.arc(7, 7, 3, 0, Math.PI * 2);
  ctx.fill();
}, 14, 14);
SZGameKit.defineMold("invasor", { w: 40, h: 40, health: 60, speed: 0, damage: 0, color: "#6a994e", look: "orc" });
SZGameKit.defineMold("torre", { w: 48, h: 48, health: 1, speed: 0, damage: 0, color: "#6c757d", look: "torre" });
SZGameKit.defineMold("tiro", { w: 14, h: 14, health: 1, speed: 0, damage: 0, color: "#ffe066", look: "flecha" });
SZGameKit.defineEffect("estouro", { count: 16, color: "#ffd166", size: 5, life: 0.4, speed: 200, gravity: 0 });
let vidas = 10;
let leva = 3;
SZGameKit.definePath("trilha", function () {
  SZGameKit.pathPoint(-60, 356);
  SZGameKit.pathPoint(207, 354);
  SZGameKit.pathPoint(207, 118);
  SZGameKit.pathPoint(551, 119);
  SZGameKit.pathPoint(551, 304);
  SZGameKit.pathPoint(454, 305);
  SZGameKit.pathPoint(454, 502);
  SZGameKit.pathPoint(785, 499);
  SZGameKit.pathPoint(787, 216);
  SZGameKit.pathPoint(1020, 215);
});
SZGameKit.tdSetCoins(100);
SZGameKit.tdSlot(120, 230, 60);
SZGameKit.tdSlot(320, 230, 60);
SZGameKit.tdSlot(340, 400, 60);
SZGameKit.tdSlot(620, 400, 60);
SZGameKit.tdSlot(640, 150, 60);
SZGameKit.tdSlot(880, 340, 60);
vidas = 10;
leva = 3;
SZGameKit.tdWave("trilha", leva, "invasor", 150, 80);
SZGameKit.tdOnBuy(50, function (lugarX, lugarY) {
  SZGameKit.spawnFromMold("torre", lugarX - 24, lugarY - 24);
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
  SZGameKit.tdWave("trilha", leva, "invasor", 150, 80);
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.forEachActive("torre", function (torre) {
    if (SZGameKit.cooldownReady(torre, 0.7)) {
      const alvo = SZGameKit.pickActive("invasor", "maior", "pathProgress");
      if (alvo) {
        if (SZGameKit.distanceBetween(torre, alvo) < 200) {
          const tiro = SZGameKit.spawnFromMold("tiro", SZGameKit.charX(torre) + 17, SZGameKit.charY(torre) + 4);
          SZGameKit.launchTowards(tiro, alvo, 460);
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
    SZGameKit.hurt(inv, 20, 0);
    if (SZGameKit.isDead(inv)) {
      SZGameKit.burst("estouro", SZGameKit.charX(inv), SZGameKit.charY(inv));
      SZGameKit.tdAddCoins(25);
      SZGameKit.floatText("+25", SZGameKit.charX(inv), SZGameKit.charY(inv), "#ffd166", 20);
      SZGameKit.recycle(inv);
    }
  });
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#3a5a40", true);
  ctx.fillStyle = "#a68a64";
  ctx.fillRect(-60, 336, 267, 40);
  ctx.fillRect(187, 118, 40, 258);
  ctx.fillRect(187, 118, 384, 40);
  ctx.fillRect(531, 119, 40, 205);
  ctx.fillRect(434, 285, 137, 40);
  ctx.fillRect(434, 285, 40, 237);
  ctx.fillRect(434, 482, 371, 40);
  ctx.fillRect(765, 216, 40, 306);
  ctx.fillRect(767, 216, 253, 40);
  SZGameKit.tdDrawSlots();
  SZGameKit.forEachActive("torre", function (torre) {
    SZGameKit.tdDrawRange(torre, 200);
  });
  SZGameKit.drawActive("torre");
  SZGameKit.drawActive("invasor");
  SZGameKit.drawActive("tiro");
  SZGameKit.forEachActive("invasor", function (inv) {
    SZGameKit.drawHealthBar(inv, 0);
  });
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.drawHearts(vidas, 10, 20, 20);
  ctx.fillStyle = "#ffd166";
  ctx.font = "24px sans-serif";
  ctx.fillText("Moedas: " + SZGameKit.tdCoins(), 20, 76);
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(MURALHA_PROFISSIONAL_SOURCE),
    extensions: [{ extensionId: 'game-2d-advanced' }],
  })
  // IR persistida é JSON: derruba chaves `undefined` e os `__id` efêmeros.
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

  // Impressão compacta no estilo dos exemplos: objetos-folha inline, aspas simples.
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
      const flat =
        '{ ' + entries.map(([key, child]) => `${key}: ${printTS(child, indent)}`).join(', ') + ' }'
      if (!flat.includes('\n') && indent.length + flat.length <= 96) return flat
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
