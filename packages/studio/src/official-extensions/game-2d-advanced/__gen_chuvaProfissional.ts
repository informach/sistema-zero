import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Chuva de Meteoros Profissional" (nível 2
 * da família Space Shooter do curso raylib_intro, sobre o motor avançado).
 * Rode com `bun src/official-extensions/game-2d-advanced/__gen_chuvaProfissional.ts`
 * e cole a saída em `examples/chuvaProfissionalExample.ts`. O drift test
 * (`__tests__/chuvaProfissionalExample.test.ts`) guarda o resultado.
 *
 * Decisões de motor (fidelidade ao original em pyray):
 * - Nave nas 4 direções com diagonal normalizada = moveWithKeys + keepOnScreen
 *   (o input()/constraint() do Player original), com leanOnMove como animação
 *   de inclinação ao voar de lado.
 * - Meteoro e laser são MOLDES com pool (defineMold + spawnFromMold + recycle
 *   + cullOffscreen 300 — o culling ±300 do original). O giro contínuo do
 *   Meteor (rotation += 50*dt) vira setAngle(item, angleOf(item) + 120*dt) no
 *   forEachActive: o motor não gira molde sozinho, então o giro é POR ESTADO
 *   do item, na unha.
 * - O nascedouro NÃO é startSpawner (nasce numa borda sorteada): é
 *   everySeconds + spawnFromMold no topo, com a CADÊNCIA numa variável que
 *   ENCURTA com o dt (0,9s → 0,35s) e a velocidade de queda que cresce — a
 *   dificuldade progressiva em duas variáveis.
 * - Tiro por keyPressed(" ") (edge-trigger) + cooldownReady(0,25s); o laser
 *   sobe por setVelocity(0, -720) e anda com moveByVelocity.
 * - laser × meteoro = overlapGroups + defineEffect/burst (a explosão é EFEITO
 *   pooled, não animação de folha) + som + recycle dos dois (+2 pontos).
 * - nave × meteoro = aviso "nave:bateu" no event bus → explosão + tremida +
 *   RECORDE persistente (saveValue/savedValue) + endGame (o close_window).
 * - Placar POR TEMPO: everySeconds("ponto", 1) soma 1 (o int(get_time())).
 * - O céu de 30 estrelas do original é o naveStarfield(30, …) no onDraw.
 */
export const CHUVA_PROFISSIONAL_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#0f0a19", accent: "#ffb347" });
SZGameKit.setScreenText("menu", "Chuva de Meteoros Profissional", "Setas ou WASD: voar para os 4 lados. Espaço: atirar. Desvie da chuva e destrua o que puder!", "Decolar");
SZGameKit.setScreenText("fim", "A nave explodiu!", "O recorde fica guardado. Tente de novo!", "Decolar de novo");
SZGameKit.defineLook("nave", function (ctx) {
  ctx.fillStyle = "#4f8fea";
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(52, 44);
  ctx.lineTo(4, 44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#9cd3ff";
  ctx.fillRect(22, 22, 12, 14);
  ctx.fillStyle = "#ffb347";
  ctx.fillRect(24, 44, 8, 4);
}, 56, 48);
SZGameKit.defineLook("meteoro", function (ctx) {
  ctx.fillStyle = "#8d99ae";
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6c757d";
  ctx.beginPath();
  ctx.arc(22, 24, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(42, 40, 9, 0, Math.PI * 2);
  ctx.fill();
}, 64, 64);
SZGameKit.defineLook("laser", function (ctx) {
  ctx.fillStyle = "#9cff57";
  ctx.fillRect(0, 0, 6, 22);
}, 6, 22);
SZGameKit.defineMold("meteoro", { w: 64, h: 64, health: 1, speed: 0, damage: 1, color: "#8d99ae", look: "meteoro" });
SZGameKit.defineMold("laser", { w: 6, h: 22, health: 1, speed: 0, damage: 0, color: "#9cff57", look: "laser" });
SZGameKit.defineEffect("explosao", { count: 26, color: "#ffb347", size: 5, life: 0.5, speed: 240, gravity: 0 });
const nave = SZGameKit.createCharacter({ w: 56, h: 48, speed: 340, color: "#4f8fea" });
SZGameKit.placeCharacter(nave, 452, 420);
SZGameKit.setHitbox(nave, 7, 6, 42, 36);
SZGameKit.stateLook(nave, "parado", "nave");
SZGameKit.leanOnMove(nave, 10);
let pontos = 0;
let recorde = SZGameKit.savedValue("recorde");
let cadencia = 0.9;
let queda = 240;
SZGameKit.on("nave:bateu", function () {
  SZGameKit.burst("explosao", SZGameKit.charX(nave) + 28, SZGameKit.charY(nave) + 24);
  SZGameKit.playEffect("explosion");
  SZGameKit.cameraShake(10, 0.4);
  if (pontos > recorde) {
    recorde = pontos;
    SZGameKit.saveValue("recorde", recorde);
  }
  SZGameKit.setScreenText("fim", "A nave explodiu!", "Pontos: " + pontos + " / Recorde: " + recorde, "Decolar de novo");
  SZGameKit.endGame();
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.moveWithKeys(nave, dt);
  SZGameKit.keepOnScreen(nave);
  SZGameKit.autoAnimate(nave);
  if (SZGameKit.keyPressed(" ")) {
    if (SZGameKit.cooldownReady(nave, 0.25)) {
      const tiro = SZGameKit.spawnFromMold("laser", SZGameKit.charX(nave) + 25, SZGameKit.charY(nave) - 20);
      SZGameKit.setVelocity(tiro, 0, -720);
      SZGameKit.playEffect("laser");
    }
  }
  if (cadencia > 0.35) {
    cadencia = cadencia - 0.03 * dt;
  }
  if (queda < 430) {
    queda = queda + 10 * dt;
  }
  if (SZGameKit.everySeconds("meteoro", cadencia)) {
    const pedra = SZGameKit.spawnFromMold("meteoro", Math.random() * (SZGameKit.width() - 64), -80);
    SZGameKit.setVelocity(pedra, Math.random() * 240 - 120, queda + Math.random() * 120);
  }
  if (SZGameKit.everySeconds("ponto", 1)) {
    pontos = pontos + 1;
  }
  SZGameKit.forEachActive("meteoro", function (item) {
    SZGameKit.moveByVelocity(item, dt);
    SZGameKit.setAngle(item, SZGameKit.angleOf(item) + 120 * dt);
    if (SZGameKit.touching(nave, item)) {
      SZGameKit.emit("nave:bateu");
    }
  });
  SZGameKit.forEachActive("laser", function (item) {
    SZGameKit.moveByVelocity(item, dt);
  });
  SZGameKit.overlapGroups("laser", "meteoro", function (tiro, pedra) {
    SZGameKit.burst("explosao", SZGameKit.charX(pedra) + 32, SZGameKit.charY(pedra) + 32);
    SZGameKit.playEffect("explosion");
    pontos = pontos + 2;
    SZGameKit.recycle(tiro);
    SZGameKit.recycle(pedra);
  });
  SZGameKit.cullOffscreen("meteoro", 300);
  SZGameKit.cullOffscreen("laser", 300);
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#0f0a19", false);
  SZGameKit.naveStarfield(30, 26);
  SZGameKit.drawActive("meteoro");
  SZGameKit.drawActive("laser");
  SZGameKit.drawCharacter(nave);
  SZGameKit.drawEffects();
});
SZGameKit.onDrawHud(function (ctx) {
  ctx.fillStyle = "#f3f6ff";
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
    js: parseJS(CHUVA_PROFISSIONAL_SOURCE),
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

  // Impressão no estilo dos exemplos: um campo por linha, aspas simples.
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
