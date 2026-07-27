import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Aventura do Herói Profissional" (nível 2 da
 * família de aventura: o Zelda-style do Clear Code recriado com o motor
 * avançado — SEM Kit RPG e SEM Kit Monstrinhos, só as peças gerais). Rode com
 * `bun src/official-extensions/game-2d-advanced/__gen_aventuraProfissional.ts`
 * e cole a saída em `examples/aventuraProfissionalExample.ts`. O drift test
 * (`__tests__/aventuraProfissionalExample.test.ts`) guarda o resultado.
 *
 * ⭐ Decisões de motor:
 * - o mundo é MAIOR que a tela: createEmptyTilemap dá o tamanho e
 *   cameraFollowMap prende a câmera nele (o keepOnScreen passa a valer o mundo);
 * - o mato destrutível vive no TILEMAP (setTileAt/tileAt/breakTileAt) — o mapa
 *   vazio não tem folha de imagem, então o desenho de cada tufo é um drawLook
 *   condicionado ao tileAt (peça cortada some do mapa E do desenho). ⚠️ O tile
 *   checado fica SOB OS PÉS do herói enquanto o golpe é direcional — por isso
 *   a tela de menu avisa "Fique EM CIMA do mato e golpeie para cortar";
 * - inimigos têm FSM POR ENTIDADE dirigida por distância (entityState/
 *   setEntityState + distanceBetween): parado/patrulha -> perseguir -> golpe.
 *   ⚠️ No estado golpe o bicho INVESTE (seek continua): o playthrough pegou o
 *   bug clássico de "alcance do golpe > alcance do toque" — parar a 80px do
 *   herói significava nunca encostar, e o dano nunca saía;
 * - o Y-sort é do kit: drawByDepth desenha herói, árvores e inimigos por
 *   profundidade (o herói passa ATRÁS das árvores).
 */
export const AVENTURA_PROFISSIONAL_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#79b365", accent: "#2b8a3e" });
SZGameKit.setScreenText("menu", "Aventura do Herói Profissional", "Setas: andar. ESPAÇO: golpe de espada. Fique EM CIMA do mato e golpeie para cortar. Passe atrás das árvores e derrote os 7 monstros do campo!", "Aventurar");
SZGameKit.setScreenText("vitoria", "Campo em paz!", "Você derrotou todos os monstros. O reino agradece, herói!", "Jogar de novo");
SZGameKit.setScreenText("fim", "O herói caiu!", "Os monstros venceram desta vez. Tente de novo!", "Tentar de novo");
SZGameKit.defineLook("heroi parado", function (ctx) {
  ctx.fillStyle = "#74491f";
  ctx.fillRect(12, 0, 20, 10);
  ctx.fillStyle = "#ffd8a8";
  ctx.fillRect(14, 10, 16, 10);
  ctx.fillStyle = "#2f9e44";
  ctx.fillRect(8, 20, 28, 20);
  ctx.fillStyle = "#5c4425";
  ctx.fillRect(14, 40, 17, 16);
}, 44, 56);
SZGameKit.defineLook("heroi andando", function (ctx) {
  ctx.fillStyle = "#74491f";
  ctx.fillRect(12, 0, 20, 10);
  ctx.fillStyle = "#ffd8a8";
  ctx.fillRect(14, 10, 16, 10);
  ctx.fillStyle = "#2f9e44";
  ctx.fillRect(8, 20, 28, 20);
  ctx.fillStyle = "#5c4425";
  ctx.fillRect(10, 40, 7, 16);
  ctx.fillRect(28, 40, 7, 16);
}, 44, 56);
SZGameKit.defineLook("heroi golpe", function (ctx) {
  ctx.fillStyle = "#74491f";
  ctx.fillRect(8, 0, 20, 10);
  ctx.fillStyle = "#ffd8a8";
  ctx.fillRect(10, 10, 16, 10);
  ctx.fillStyle = "#2f9e44";
  ctx.fillRect(4, 20, 28, 20);
  ctx.fillStyle = "#5c4425";
  ctx.fillRect(10, 40, 17, 16);
  ctx.fillStyle = "#dee2e6";
  ctx.fillRect(30, 24, 14, 6);
}, 44, 56);
SZGameKit.defineLook("javali", function (ctx) {
  ctx.fillStyle = "#845ef7";
  ctx.fillRect(6, 12, 40, 22);
  ctx.fillRect(40, 6, 10, 16);
  ctx.fillStyle = "#3b2a63";
  ctx.fillRect(10, 34, 30, 6);
}, 52, 40);
SZGameKit.defineLook("lobo", function (ctx) {
  ctx.fillStyle = "#868e96";
  ctx.fillRect(4, 12, 30, 16);
  ctx.fillRect(30, 4, 12, 14);
  ctx.fillRect(0, 8, 8, 8);
  ctx.fillStyle = "#ffd43b";
  ctx.fillRect(34, 8, 4, 4);
}, 44, 34);
SZGameKit.defineLook("arvore", function (ctx) {
  ctx.fillStyle = "#7f5539";
  ctx.fillRect(26, 58, 12, 38);
  ctx.fillStyle = "#2b8a3e";
  ctx.fillRect(6, 6, 52, 58);
}, 64, 96);
SZGameKit.defineLook("mato", function (ctx) {
  ctx.fillStyle = "#37b24c";
  ctx.fillRect(6, 24, 12, 36);
  ctx.fillRect(26, 10, 12, 50);
  ctx.fillRect(46, 26, 12, 34);
  ctx.fillStyle = "#69db7c";
  ctx.fillRect(16, 36, 10, 24);
}, 64, 64);
SZGameKit.defineEffect("folhas", { count: 12, color: "#69db7c", size: 5, life: 0.5, speed: 140, gravity: 300 });
SZGameKit.defineEffect("faisca", { count: 10, color: "#ffe066", size: 4, life: 0.35, speed: 180, gravity: 0 });
SZGameKit.createEmptyTilemap("campo", 30, 17, -1, "");
SZGameKit.defineMold("arvore", { w: 64, h: 96, health: 1, speed: 0, damage: 0, color: "#2b8a3e", look: "arvore" });
SZGameKit.defineMold("javali", { w: 52, h: 40, health: 30, speed: 70, damage: 12, color: "#845ef7", look: "javali" });
SZGameKit.defineMold("lobo", { w: 44, h: 34, health: 10, speed: 130, damage: 6, color: "#868e96", look: "lobo" });
for (let i = 0; i < 7; i += 1) {
  SZGameKit.setTileAt("campo", 896 + i * 64, 704, 1);
}
SZGameKit.spawnFromMold("arvore", 500, 140);
SZGameKit.spawnFromMold("arvore", 820, 400);
SZGameKit.spawnFromMold("arvore", 300, 740);
SZGameKit.spawnFromMold("arvore", 620, 860);
SZGameKit.spawnFromMold("arvore", 1250, 560);
SZGameKit.spawnFromMold("arvore", 1620, 170);
SZGameKit.spawnFromMold("javali", 1450, 320);
SZGameKit.spawnFromMold("javali", 1580, 430);
SZGameKit.spawnFromMold("javali", 1400, 520);
SZGameKit.spawnFromMold("javali", 1660, 300);
SZGameKit.spawnFromMold("lobo", 1150, 880);
SZGameKit.spawnFromMold("lobo", 1320, 940);
SZGameKit.spawnFromMold("lobo", 1480, 860);
const heroi = SZGameKit.createCharacter({ w: 44, h: 56, speed: 250, color: "#2f9e44" });
SZGameKit.placeCharacter(heroi, 200, 480);
SZGameKit.setHitbox(heroi, 8, 24, 28, 30);
SZGameKit.setSwingWindow(heroi, 0.08, 0.14);
SZGameKit.stateLook(heroi, "parado", "heroi parado");
SZGameKit.stateLook(heroi, "andando", "heroi andando");
SZGameKit.stateLook(heroi, "golpe", "heroi golpe");
SZGameKit.stateLook(heroi, "dano", "heroi parado");
SZGameKit.cameraFollowMap(heroi, "campo");
SZGameKit.setMission(0, 7);
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
  SZGameKit.moveWithKeys(heroi, dt);
  SZGameKit.collideGroup(heroi, "arvore");
  SZGameKit.keepOnScreen(heroi);
  if (SZGameKit.keyPressed(" ")) {
    SZGameKit.playEffect("click");
    SZGameKit.attackFacing(heroi, 56, 0.3);
    if (SZGameKit.tileAt("campo", SZGameKit.charX(heroi) + 22, SZGameKit.charY(heroi) + 28) === 1) {
      SZGameKit.breakTileAt("campo", heroi);
      SZGameKit.burst("folhas", SZGameKit.charX(heroi) + 22, SZGameKit.charY(heroi) + 28);
      SZGameKit.playEffect("hit");
    }
  }
  SZGameKit.forEachActive("javali", function (item) {
    if (SZGameKit.entityState(item) === "golpe") {
      SZGameKit.seek(item, heroi, dt);
    } else if (SZGameKit.distanceBetween(item, heroi) < 80) {
      SZGameKit.setEntityState(item, "golpe", 0.5);
    } else if (SZGameKit.distanceBetween(item, heroi) < 240) {
      SZGameKit.setEntityState(item, "andando", 0.1);
      SZGameKit.seek(item, heroi, dt);
    } else {
      SZGameKit.setEntityState(item, "parado", 0.1);
      SZGameKit.patrolAround(item, 1520, 400, 130);
    }
    if (SZGameKit.didHit(heroi, item)) {
      SZGameKit.hurt(item, 12, 0.25);
      SZGameKit.knockback(item, heroi, 380);
      SZGameKit.playEffect("hit");
      if (SZGameKit.isDead(item)) {
        SZGameKit.burst("faisca", SZGameKit.charX(item), SZGameKit.charY(item));
        SZGameKit.missionKill();
        SZGameKit.emit("inimigo:caiu");
        SZGameKit.recycle(item);
      }
    }
    if (SZGameKit.entityState(item) === "golpe" && SZGameKit.touching(item, heroi) && !SZGameKit.isInvincible(heroi)) {
      SZGameKit.hurt(heroi, SZGameKit.propertyOf(item, "damage"), 1);
      SZGameKit.knockback(heroi, item, 340);
      SZGameKit.playEffect("hurt");
      SZGameKit.cameraShake(6, 0.25);
    }
  });
  SZGameKit.forEachActive("lobo", function (item) {
    if (SZGameKit.entityState(item) === "golpe") {
      SZGameKit.seek(item, heroi, dt);
    } else if (SZGameKit.distanceBetween(item, heroi) < 60) {
      SZGameKit.setEntityState(item, "golpe", 0.4);
    } else if (SZGameKit.distanceBetween(item, heroi) < 340) {
      SZGameKit.setEntityState(item, "andando", 0.1);
      SZGameKit.seek(item, heroi, dt);
    } else {
      SZGameKit.setEntityState(item, "parado", 0.1);
      SZGameKit.patrolAround(item, 1320, 890, 160);
    }
    if (SZGameKit.didHit(heroi, item)) {
      SZGameKit.hurt(item, 12, 0.25);
      SZGameKit.knockback(item, heroi, 420);
      SZGameKit.playEffect("hit");
      if (SZGameKit.isDead(item)) {
        SZGameKit.burst("faisca", SZGameKit.charX(item), SZGameKit.charY(item));
        SZGameKit.missionKill();
        SZGameKit.emit("inimigo:caiu");
        SZGameKit.recycle(item);
      }
    }
    if (SZGameKit.entityState(item) === "golpe" && SZGameKit.touching(item, heroi) && !SZGameKit.isInvincible(heroi)) {
      SZGameKit.hurt(heroi, SZGameKit.propertyOf(item, "damage"), 1);
      SZGameKit.knockback(heroi, item, 300);
      SZGameKit.playEffect("hurt");
    }
  });
  SZGameKit.autoAnimate(heroi);
  if (SZGameKit.isDead(heroi)) {
    SZGameKit.endGame();
  }
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#79b365", false);
  for (let i = 0; i < 7; i += 1) {
    if (SZGameKit.tileAt("campo", 928 + i * 64, 736) === 1) {
      SZGameKit.drawLook("mato", 896 + i * 64, 704, 64, 64);
    }
  }
  SZGameKit.drawShadow(heroi);
  SZGameKit.drawByDepth(heroi);
  SZGameKit.drawEffects();
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.drawHearts(SZGameKit.healthOf(heroi) / 20, 5, 20, 20);
  ctx.fillStyle = "#123018";
  ctx.font = "18px sans-serif";
  ctx.fillText("Javalis: " + SZGameKit.countActive("javali"), 20, 72);
  ctx.fillText("Lobos: " + SZGameKit.countActive("lobo"), 20, 96);
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(AVENTURA_PROFISSIONAL_SOURCE),
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
