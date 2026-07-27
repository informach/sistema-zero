import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Vale Ensolarado Profissional" — o
 * sunnyland-platformer recriado com o 🏃 Kit Plataforma do motor avançado (o
 * mesmo kit do `saltoNaFlorestaExample`/`escaladaProfissionalExample`), SEM
 * assets (o gambá, o gavião, as gemas, os corações, o chão, as tábuas e o fundo
 * são retângulos e `defineLook` em blocos de Canvas). Rode com
 * `bun src/official-extensions/game-2d-advanced/__gen_valeEnsolarado.ts` e cole
 * a saída em `examples/valeEnsolaradoExample.ts`. O drift test
 * (`__tests__/valeEnsolaradoExample.test.ts`) guarda o resultado.
 *
 * Fidelidade ao original (sunnyland-platformer):
 * - o herói anda (o A/D do original) e pula (o W) com o pulo gostoso do kit
 *   (`platformerHero`, coyote/buffer/pulo variável de brinde);
 * - os `collisionBlocks` viram um molde sólido de chão (`collideGroup`); as
 *   `platforms` (height 4, que se atravessa por baixo) viram o molde de tábua
 *   fina one-way (`oneWayPlatform`, o `platform` do original);
 * - as `Gems` (a coleta que fecha a fase com "YOU WIN!") viram um molde
 *   coletado por toque (`touching` + `recycle`); pegar TODAS é a vitória;
 * - o `oposum` PATRULHA (anda e vira na beirada) e o `eagle` VOA parado no ar
 *   patrulhando na horizontal — os dois se derrota PISANDO (`stompKill`, o pulo
 *   em cima do original); encostar de lado tira um coração;
 * - a câmera segue o herói num vale mais LARGO que a tela (`cameraFollow`);
 * - cair no buraco reposiciona no checkpoint (`setCheckpoint` + `respawn`).
 */
export const VALE_ENSOLARADO_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#8ecde6", accent: "#e9c46a" });
SZGameKit.setScreenText("menu", "Vale Ensolarado Profissional", "Use as setas para andar e pular. Pise nos bichos, junte as 6 gemas e não caia no buraco!", "Explorar o vale");
SZGameKit.setScreenText("vitoria", "Vale limpo!", "Você juntou todas as gemas do vale ensolarado. Que aventura!", "Explorar de novo");
SZGameKit.setScreenText("fim", "Ai!", "Um bicho tirou todos os seus corações. Tente de novo!", "Tentar de novo");
SZGameKit.defineLook("raposinha", function (ctx) {
  ctx.fillStyle = "#e8a33d";
  ctx.fillRect(6, 12, 24, 20);
  ctx.fillStyle = "#fff3d6";
  ctx.fillRect(10, 20, 16, 12);
  ctx.fillStyle = "#e8a33d";
  ctx.fillRect(4, 6, 8, 10);
  ctx.fillRect(24, 6, 8, 10);
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(12, 16, 4, 4);
  ctx.fillRect(22, 16, 4, 4);
  ctx.fillStyle = "#c67d2a";
  ctx.fillRect(8, 32, 8, 12);
  ctx.fillRect(20, 32, 8, 12);
}, 36, 44);
SZGameKit.defineLook("gramado", function (ctx) {
  ctx.fillStyle = "#6b4f2a";
  ctx.fillRect(0, 0, 96, 32);
  ctx.fillStyle = "#4caf50";
  ctx.fillRect(0, 0, 96, 8);
  ctx.fillStyle = "#8bc34a";
  ctx.fillRect(0, 0, 96, 3);
}, 96, 32);
SZGameKit.defineLook("tabua", function (ctx) {
  ctx.fillStyle = "#a97c50";
  ctx.fillRect(0, 0, 96, 12);
  ctx.fillStyle = "#7a5a34";
  ctx.fillRect(0, 9, 96, 3);
}, 96, 12);
SZGameKit.defineLook("gema", function (ctx) {
  ctx.fillStyle = "#26c6da";
  ctx.fillRect(4, 2, 16, 8);
  ctx.fillRect(6, 10, 12, 10);
  ctx.fillStyle = "#b2ebf2";
  ctx.fillRect(7, 4, 5, 5);
}, 24, 24);
SZGameKit.defineLook("gambá", function (ctx) {
  ctx.fillStyle = "#7e6a99";
  ctx.fillRect(2, 10, 36, 18);
  ctx.fillStyle = "#efe6ff";
  ctx.fillRect(28, 4, 12, 14);
  ctx.fillStyle = "#2a2135";
  ctx.fillRect(33, 8, 4, 4);
}, 40, 30);
SZGameKit.defineLook("gavião", function (ctx) {
  ctx.fillStyle = "#8d6e63";
  ctx.fillRect(10, 6, 20, 16);
  ctx.fillStyle = "#5d4037";
  ctx.fillRect(0, 8, 12, 6);
  ctx.fillRect(28, 8, 12, 6);
  ctx.fillStyle = "#ffca28";
  ctx.fillRect(18, 20, 6, 6);
}, 40, 28);
SZGameKit.setJumpFeel(0.1, 0.1, 0.3, 2000);
SZGameKit.defineMold("chao", { w: 96, h: 32, health: 1, speed: 0, damage: 0, color: "#6b4f2a", look: "gramado" });
SZGameKit.defineMold("tabua", { w: 96, h: 12, health: 1, speed: 0, damage: 0, color: "#a97c50", look: "tabua" });
SZGameKit.defineMold("gema", { w: 24, h: 24, health: 1, speed: 0, damage: 0, color: "#26c6da", look: "gema" });
SZGameKit.defineMold("gambá", { w: 40, h: 30, health: 1, speed: 40, damage: 1, color: "#7e6a99", look: "gambá" });
SZGameKit.defineMold("gavião", { w: 40, h: 28, health: 1, speed: 60, damage: 1, color: "#8d6e63", look: "gavião" });
SZGameKit.defineEffect("poeira", { count: 8, color: "#ffffff", size: 3, life: 0.4, speed: 100, gravity: 300 });
SZGameKit.defineEffect("brilho", { count: 12, color: "#b2ebf2", size: 4, life: 0.5, speed: 160, gravity: 0 });
const heroi = SZGameKit.createCharacter({ w: 36, h: 44, speed: 220, color: "#e8a33d" });
SZGameKit.stateLook(heroi, "parado", "raposinha");
let gemas = 0;
let vidas = 3;
SZGameKit.setCheckpoint(80, 380);
SZGameKit.respawn(heroi);
SZGameKit.spawnFromMold("chao", 0, 460);
SZGameKit.spawnFromMold("chao", 96, 460);
SZGameKit.spawnFromMold("chao", 192, 460);
SZGameKit.spawnFromMold("chao", 480, 460);
SZGameKit.spawnFromMold("chao", 576, 460);
SZGameKit.spawnFromMold("chao", 960, 460);
SZGameKit.spawnFromMold("chao", 1056, 460);
SZGameKit.spawnFromMold("chao", 1152, 460);
SZGameKit.spawnFromMold("chao", 1440, 460);
SZGameKit.spawnFromMold("chao", 1536, 460);
SZGameKit.spawnFromMold("tabua", 300, 360);
SZGameKit.spawnFromMold("tabua", 700, 320);
SZGameKit.spawnFromMold("tabua", 1080, 340);
SZGameKit.spawnFromMold("tabua", 1260, 260);
SZGameKit.spawnFromMold("gema", 120, 400);
SZGameKit.spawnFromMold("gema", 316, 320);
SZGameKit.spawnFromMold("gema", 540, 400);
SZGameKit.spawnFromMold("gema", 716, 280);
SZGameKit.spawnFromMold("gema", 1096, 300);
SZGameKit.spawnFromMold("gema", 1480, 400);
SZGameKit.spawnFromMold("gambá", 520, 430);
SZGameKit.spawnFromMold("gambá", 1000, 430);
SZGameKit.spawnFromMold("gavião", 780, 260);
SZGameKit.spawnFromMold("gavião", 1300, 220);
SZGameKit.cameraFollow(heroi, 1632, 540);
SZGameKit.on("plataforma:pisou", function () {
  SZGameKit.burst("poeira", SZGameKit.charX(heroi) + 18, SZGameKit.charY(heroi) + 44);
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.platformerHero(heroi, 220, 640, dt);
  SZGameKit.dropThrough(heroi);
  SZGameKit.collideGroup(heroi, "chao");
  SZGameKit.oneWayPlatform(heroi, "tabua", dt);
  SZGameKit.forEachActive("gambá", function (item) {
    SZGameKit.patrolTurnAtWall(item, 40);
    SZGameKit.applyGravity(item, 2160, dt);
    SZGameKit.moveByVelocity(item, dt);
    SZGameKit.collideGroup(item, "chao");
  });
  SZGameKit.forEachActive("gavião", function (item) {
    SZGameKit.patrolAround(item, SZGameKit.charX(item), SZGameKit.charY(item), 120);
  });
  SZGameKit.stompKill(heroi, "gambá", 420);
  SZGameKit.stompKill(heroi, "gavião", 420);
  SZGameKit.platformerAnim(heroi);
  SZGameKit.forEachActive("gema", function (item) {
    if (SZGameKit.touching(heroi, item)) {
      gemas = gemas + 1;
      SZGameKit.burst("brilho", SZGameKit.charX(item) + 12, SZGameKit.charY(item) + 12);
      SZGameKit.recycle(item);
    }
  });
  SZGameKit.forEachActive("gambá", function (item) {
    if (SZGameKit.touching(heroi, item) && !SZGameKit.isInvincible(heroi)) {
      vidas = vidas - 1;
      SZGameKit.hurt(heroi, 0, 1);
      SZGameKit.knockback(heroi, item, 320);
      SZGameKit.cameraShake(6, 0.2);
    }
  });
  SZGameKit.forEachActive("gavião", function (item) {
    if (SZGameKit.touching(heroi, item) && !SZGameKit.isInvincible(heroi)) {
      vidas = vidas - 1;
      SZGameKit.hurt(heroi, 0, 1);
      SZGameKit.knockback(heroi, item, 320);
      SZGameKit.cameraShake(6, 0.2);
    }
  });
  if (SZGameKit.charY(heroi) > 620) {
    vidas = vidas - 1;
    SZGameKit.respawn(heroi);
  }
  if (vidas <= 0) {
    SZGameKit.endGame();
  }
  if (gemas >= 6) {
    SZGameKit.setState("vitoria");
  }
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#8ecde6", false);
  SZGameKit.drawActive("chao");
  SZGameKit.drawActive("tabua");
  SZGameKit.drawActive("gema");
  SZGameKit.drawActive("gambá");
  SZGameKit.drawActive("gavião");
  SZGameKit.drawShadow(heroi);
  SZGameKit.drawCharacter(heroi);
  SZGameKit.drawEffects();
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.drawHearts(vidas / 3, 3, 20, 20);
  ctx.fillStyle = "#123018";
  ctx.font = "24px sans-serif";
  ctx.fillText("Gemas: " + gemas + "/6", 20, 72);
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(VALE_ENSOLARADO_SOURCE),
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
