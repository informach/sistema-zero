import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Portas do Castelo Profissional" — o
 * kings-and-pigs do Chris Courses (o rei que anda pelo castelo e entra na porta
 * para trocar de fase) recriado com o 🏃 Kit Plataforma do motor avançado (o
 * mesmo kit do `saltoNaFlorestaExample`/`escaladaProfissionalExample`), SEM
 * assets (o rei, o chão, as paredes e as portas são retângulos e `defineLook`
 * em blocos de Canvas). Rode com
 * `bun src/official-extensions/game-2d-advanced/__gen_portasDoCasteloProfissional.ts`
 * e cole a saída em `examples/portasDoCasteloProfissionalExample.ts`. O drift test
 * (`__tests__/portasDoCasteloProfissionalExample.test.ts`) guarda o resultado.
 *
 * Fidelidade ao original (index.js + eventListeners.js do kings-and-pigs):
 * - O rei anda com A/D (o `keys.a/d`) e pula com espaço/W (o `velocity.y = -25`),
 *   com colisão contra os `collisionBlocks` (símbolo 202). Vira o pulo gostoso do
 *   kit (`platformerHero`) + chão sólido de moldes (`collideGroup`).
 * - Os TRÊS níveis do original (`levels[1..3]`, cada um com seu mapa e sua porta)
 *   viram três REGIÕES lado a lado num mundo largo (`defineRegion` por porta) com
 *   a câmera acompanhando (`cameraFollow`). Uma variável `fase` guarda em qual
 *   sala o rei está.
 * - A porta do original (o `w` em frente à porta → `switchSprite('enterDoor')` →
 *   `level++`) vira: encostar na região da porta da fase atual troca a `fase` e
 *   teleporta o rei para o começo da próxima sala (`setCheckpoint` + `respawn`),
 *   igual ao `levels[level].init()` que reposicionava o player.
 * - A porta da TERCEIRA sala é a saída do castelo: entrar nela é a vitória
 *   (`setState`), como o `level === 4 -> level = 1` que fechava a volta.
 * - Cair de uma plataforma para fora do mundo reposiciona no começo da sala (o
 *   `checkForHorizontalCanvasCollision` que segurava o rei dentro do mapa).
 */
export const PORTAS_DO_CASTELO_PROFISSIONAL_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#2b2136", accent: "#ffd166" });
SZGameKit.setScreenText("menu", "Portas do Castelo Profissional", "A/D ou setas para andar. Espaço para pular. Chegue na porta de cada sala para passar de fase. São 3 salas ate a saída!", "Entrar");
SZGameKit.setScreenText("vitoria", "Você escapou do castelo!", "Passou pelas 3 salas e achou a porta de saída. O rei está livre!", "Jogar de novo");
SZGameKit.defineLook("rei", function (ctx) {
  ctx.fillStyle = "#f2d16b";
  ctx.fillRect(4, 0, 24, 8);
  ctx.fillStyle = "#e8c48a";
  ctx.fillRect(6, 8, 20, 14);
  ctx.fillStyle = "#2b2d42";
  ctx.fillRect(11, 13, 4, 4);
  ctx.fillRect(18, 13, 4, 4);
  ctx.fillStyle = "#3a6ea5";
  ctx.fillRect(4, 22, 24, 20);
  ctx.fillStyle = "#284b73";
  ctx.fillRect(4, 22, 24, 6);
  ctx.fillStyle = "#2a2f45";
  ctx.fillRect(7, 42, 7, 12);
  ctx.fillRect(18, 42, 7, 12);
}, 32, 54);
SZGameKit.defineLook("pedra", function (ctx) {
  ctx.fillStyle = "#4a4258";
  ctx.fillRect(0, 0, 120, 40);
  ctx.fillStyle = "#3a3446";
  ctx.fillRect(0, 0, 120, 5);
  ctx.fillRect(0, 20, 120, 2);
  ctx.fillRect(40, 0, 3, 20);
  ctx.fillRect(84, 20, 3, 20);
}, 120, 40);
SZGameKit.defineLook("porta", function (ctx) {
  ctx.fillStyle = "#5a3d2b";
  ctx.fillRect(0, 0, 48, 72);
  ctx.fillStyle = "#3a2718";
  ctx.fillRect(6, 6, 36, 66);
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(34, 36, 6, 6);
}, 48, 72);
SZGameKit.setJumpFeel(0.1, 0.1, 0.3, 2200);
SZGameKit.defineMold("chao", { w: 120, h: 40, health: 1, speed: 0, damage: 0, color: "#4a4258", look: "pedra" });
SZGameKit.defineEffect("poeira", { count: 8, color: "#c9b8e0", size: 3, life: 0.4, speed: 100, gravity: 300 });
const rei = SZGameKit.createCharacter({ w: 32, h: 54, speed: 210, color: "#f2d16b" });
SZGameKit.stateLook(rei, "parado", "rei");
let fase = 1;
SZGameKit.setCheckpoint(80, 440);
SZGameKit.respawn(rei);
SZGameKit.spawnFromMold("chao", 0, 500);
SZGameKit.spawnFromMold("chao", 120, 500);
SZGameKit.spawnFromMold("chao", 240, 500);
SZGameKit.spawnFromMold("chao", 360, 500);
SZGameKit.spawnFromMold("chao", 480, 500);
SZGameKit.spawnFromMold("chao", 600, 500);
SZGameKit.spawnFromMold("chao", 720, 500);
SZGameKit.spawnFromMold("chao", 840, 500);
SZGameKit.spawnFromMold("chao", 960, 500);
SZGameKit.spawnFromMold("chao", 1080, 500);
SZGameKit.spawnFromMold("chao", 1200, 500);
SZGameKit.spawnFromMold("chao", 1320, 500);
SZGameKit.spawnFromMold("chao", 1440, 500);
SZGameKit.spawnFromMold("chao", 1560, 500);
SZGameKit.spawnFromMold("chao", 1680, 500);
SZGameKit.spawnFromMold("chao", 1800, 500);
SZGameKit.spawnFromMold("chao", 1920, 500);
SZGameKit.spawnFromMold("chao", 2040, 500);
SZGameKit.spawnFromMold("chao", 2160, 500);
SZGameKit.spawnFromMold("chao", 2280, 500);
SZGameKit.spawnFromMold("chao", 2400, 500);
SZGameKit.spawnFromMold("chao", 2520, 500);
SZGameKit.spawnFromMold("chao", 2640, 500);
SZGameKit.spawnFromMold("chao", 2760, 500);
SZGameKit.spawnFromMold("chao", 520, 380);
SZGameKit.spawnFromMold("chao", 1300, 360);
SZGameKit.spawnFromMold("chao", 2280, 380);
SZGameKit.defineRegion("porta1", 860, 428, 48, 72);
SZGameKit.defineRegion("porta2", 1820, 428, 48, 72);
SZGameKit.defineRegion("saida", 2820, 428, 48, 72);
SZGameKit.cameraFollow(rei, 2900, 540);
SZGameKit.on("plataforma:pisou", function () {
  SZGameKit.burst("poeira", SZGameKit.charX(rei) + 16, SZGameKit.charY(rei) + 54);
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.platformerHero(rei, 210, 700, dt);
  SZGameKit.collideGroup(rei, "chao");
  SZGameKit.platformerAnim(rei);
  if (fase === 1 && SZGameKit.isInside(rei, "porta1")) {
    fase = 2;
    SZGameKit.setCheckpoint(1040, 440);
    SZGameKit.respawn(rei);
    SZGameKit.playEffect("click");
  }
  if (fase === 2 && SZGameKit.isInside(rei, "porta2")) {
    fase = 3;
    SZGameKit.setCheckpoint(2000, 440);
    SZGameKit.respawn(rei);
    SZGameKit.playEffect("click");
  }
  if (fase === 3 && SZGameKit.isInside(rei, "saida")) {
    SZGameKit.setState("vitoria");
  }
  if (SZGameKit.charY(rei) > 620) {
    SZGameKit.respawn(rei);
  }
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#2b2136", false);
  SZGameKit.drawActive("chao");
  SZGameKit.drawLook("porta", 860, 428, 48, 72);
  SZGameKit.drawLook("porta", 1820, 428, 48, 72);
  SZGameKit.drawLook("porta", 2820, 428, 48, 72);
  SZGameKit.drawShadow(rei);
  SZGameKit.drawCharacter(rei);
  SZGameKit.drawEffects();
});
SZGameKit.onDrawHud(function (ctx) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "24px sans-serif";
  ctx.fillText("Sala " + fase + " de 3", 20, 36);
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(PORTAS_DO_CASTELO_PROFISSIONAL_SOURCE),
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
