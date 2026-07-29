import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Sobrevivente Profissional" (nível 2 da
 * família Vampire Survivor do Clear Code "5 games", sobre o motor avançado).
 * Rode com `bun src/official-extensions/game-2d-advanced/__gen_sobreviventeProfissional.ts`
 * e cole a saída em `examples/sobreviventeProfissionalExample.ts`. O drift test
 * (`__tests__/sobreviventeProfissionalExample.test.ts`) guarda o resultado.
 *
 * Decisões de motor (o que o degrau BÁSICO não tinha):
 * - MUNDO MAIOR que a tela + cameraFollow: a arena rola atrás do herói (o
 *   custom_draw com offset do original em pygame).
 * - MIRA CONTÍNUA NO MOUSE: a arma atira sozinha na direção do cursor com
 *   launchToPoint(bala, mouseX(), mouseY(), ...) no ritmo do cooldown (o gun que
 *   girava para o mouse + o clique do original, aqui automático).
 * - Horda com POOL: monstro é molde + startSpawner numa borda + seek(dt) que
 *   persegue + cullOffscreen (o object pooling + os inimigos que buscam o
 *   jogador do original).
 * - Combate P24: touchCircle + isInvincible → hurt + knockback + drawHealthBar;
 *   isDead(herói) encerra (o player_collision do original).
 * - PROGRESSÃO (o que o Profissional acrescenta): cada monstrinho dá EXP; ao
 *   encher a barra o herói SOBE DE NÍVEL e a arma fica mais rápida (a cadência
 *   encurta). Placar por tempo + recorde persistente.
 * - setMission(90, 30): sobreviver 90s OU derrotar 30 monstrinhos = vitória.
 */
export const SOBREVIVENTE_PROFISSIONAL_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#140f24", accent: "#9cff57" });
SZGameKit.setScreenText("menu", "Sobrevivente Profissional", "Setas ou WASD: fugir. O mouse mira e a arma atira sozinha. Aguente 90 segundos ou derrote 30 monstrinhos!", "Começar");
SZGameKit.setScreenText("fim", "Os monstrinhos te alcançaram!", "O recorde fica guardado. Tente de novo!", "Tentar de novo");
SZGameKit.defineLook("heroi", function (ctx) {
  ctx.fillStyle = "#4f8fea";
  ctx.beginPath();
  ctx.arc(17, 17, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#dbe9ff";
  ctx.beginPath();
  ctx.arc(12, 12, 4, 0, Math.PI * 2);
  ctx.fill();
}, 34, 34);
SZGameKit.defineLook("monstro", function (ctx) {
  ctx.fillStyle = "#e05a5a";
  ctx.beginPath();
  ctx.arc(16, 16, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a0f14";
  ctx.beginPath();
  ctx.arc(11, 13, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(21, 13, 3, 0, Math.PI * 2);
  ctx.fill();
}, 32, 32);
SZGameKit.defineLook("bala", function (ctx) {
  ctx.fillStyle = "#9cff57";
  ctx.beginPath();
  ctx.arc(5, 5, 5, 0, Math.PI * 2);
  ctx.fill();
}, 10, 10);
SZGameKit.defineMold("monstro", { w: 32, h: 32, health: 2, speed: 62, damage: 1, color: "#e05a5a", look: "monstro" });
SZGameKit.defineMold("bala", { w: 10, h: 10, health: 1, speed: 0, damage: 0, color: "#9cff57", look: "bala" });
SZGameKit.defineEffect("estouro", { count: 16, color: "#ffb347", size: 4, life: 0.4, speed: 220, gravity: 0 });
const heroi = SZGameKit.createCharacter({ w: 34, h: 34, speed: 190, color: "#4f8fea" });
SZGameKit.placeCharacter(heroi, 800, 500);
SZGameKit.stateLook(heroi, "parado", "heroi");
let pontos = 0;
let exp = 0;
let nivel = 1;
let cadencia = 0.35;
let recorde = SZGameKit.savedValue("recorde");
SZGameKit.cameraFollow(heroi, 1600, 1000);
SZGameKit.setMission(90, 30);
SZGameKit.startSpawner("monstro", 0.7);
SZGameKit.on("heroi:morreu", function () {
  SZGameKit.burst("estouro", SZGameKit.charX(heroi) + 17, SZGameKit.charY(heroi) + 17);
  SZGameKit.playEffect("explosion");
  SZGameKit.cameraShake(10, 0.4);
  if (pontos > recorde) {
    recorde = pontos;
    SZGameKit.saveValue("recorde", recorde);
  }
  SZGameKit.setScreenText("fim", "Os monstrinhos te alcançaram!", "Pontos: " + pontos + " / Recorde: " + recorde, "Tentar de novo");
  SZGameKit.endGame();
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.moveWithKeys(heroi, dt);
  SZGameKit.keepOnScreen(heroi);
  if (SZGameKit.cooldownReady(heroi, cadencia)) {
    const bala = SZGameKit.spawnFromMold("bala", SZGameKit.charX(heroi) + 12, SZGameKit.charY(heroi) + 12);
    SZGameKit.launchToPoint(bala, SZGameKit.mouseX(), SZGameKit.mouseY(), 640);
    SZGameKit.playEffect("laser");
  }
  SZGameKit.forEachActive("monstro", function (item) {
    SZGameKit.seek(item, heroi, dt);
    if (SZGameKit.touchCircle(heroi, item)) {
      if (!SZGameKit.isInvincible(heroi)) {
        SZGameKit.hurt(heroi, 8, 0.8);
        SZGameKit.knockback(heroi, item, 7);
        SZGameKit.playEffect("hurt");
      }
    }
  });
  SZGameKit.forEachActive("bala", function (item) {
    SZGameKit.moveByVelocity(item, dt);
  });
  SZGameKit.overlapGroups("bala", "monstro", function (tiro, bicho) {
    SZGameKit.hurt(bicho, 1, 0);
    SZGameKit.recycle(tiro);
    if (SZGameKit.isDead(bicho)) {
      SZGameKit.burst("estouro", SZGameKit.charX(bicho) + 16, SZGameKit.charY(bicho) + 16);
      SZGameKit.playEffect("explosion");
      SZGameKit.recycle(bicho);
      SZGameKit.missionKill();
      pontos = pontos + 3;
      exp = exp + 1;
      SZGameKit.floatText("+1", SZGameKit.charX(bicho) + 16, SZGameKit.charY(bicho), "#9cff57", 18);
      if (exp >= nivel * 4) {
        exp = 0;
        nivel = nivel + 1;
        if (cadencia > 0.14) {
          cadencia = cadencia - 0.03;
        }
        SZGameKit.floatText("Nivel " + nivel, SZGameKit.charX(heroi) + 8, SZGameKit.charY(heroi) - 24, "#ffd166", 20);
        SZGameKit.playEffect("powerup");
      }
    }
  });
  SZGameKit.cullOffscreen("monstro", 260);
  SZGameKit.cullOffscreen("bala", 260);
  if (SZGameKit.isDead(heroi)) {
    SZGameKit.emit("heroi:morreu");
  }
  if (SZGameKit.everySeconds("ponto", 1)) {
    pontos = pontos + 1;
  }
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#1c1533", true);
  SZGameKit.drawActive("monstro");
  SZGameKit.drawActive("bala");
  SZGameKit.drawCharacter(heroi);
  SZGameKit.drawHealthBar(heroi, 0);
  SZGameKit.drawEffects();
});
SZGameKit.onDrawHud(function (ctx) {
  ctx.fillStyle = "#f3f6ff";
  ctx.font = "22px sans-serif";
  ctx.fillText("Pontos: " + pontos, 20, 34);
  ctx.fillText("Nivel: " + nivel, 20, 62);
  SZGameKit.drawTimer(820, 34);
  SZGameKit.drawBar(exp, nivel * 4, 20, 76, 160, 12, "#ffd166");
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(SOBREVIVENTE_PROFISSIONAL_SOURCE),
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
