import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Batalha de Monstrinhos Profissional" (nível
 * 2 da família de batalha de monstrinhos: o Pokemon do Clear Code recriado com
 * o 👾 Kit Monstrinhos COMPLETO do motor avançado, SEM nenhum bloco do Kit
 * RPG). Rode com
 * `bun src/official-extensions/game-2d-advanced/__gen_batalhaProfissional.ts` e
 * cole a saída em `examples/batalhaProfissionalExample.ts`. O drift test
 * (`__tests__/batalhaProfissionalExample.test.ts`) guarda o resultado.
 *
 * ⭐ Decisões de motor:
 * - o pátio é MOVIMENTO LIVRE (moveWithKeys + regiões), não a grade do RPG —
 *   por isso o encontro selvagem usa overlapPercent + chance + pkmBattleWild
 *   (a grama do pkmGrassCells só sorteia por PASSO do rpgMoveGrid, que é RPG);
 * - a vitória é a CAPTURA: pkmCaught() lido no TOPO do onUpdate (a batalha
 *   devolve "jogando" sozinha ao terminar e o laço volta a rodar).
 *   ⚠️ onEnterState("jogando") NÃO serve aqui: fechar batalha é RETOMADA
 *   (isMidResume) e o motor de propósito não roda os hooks de entrada nesse
 *   caminho — o playthrough pegou isso;
 * - a vida do time é LEMBRADA entre trocas e batalhas pelo próprio kit; a fonte
 *   (pkmHealTeam) é o Centro de Cura num bloco, e TAMBÉM repõe as bolas quando
 *   zeram (pkmBallCount() == 0 → pkmGiveBall(3, 65)) — a captura é a ÚNICA
 *   vitória, então sem reposição queimar as 5 bolas tornava vencer impossível
 *   para sempre (softlock provado por playthrough no review);
 * - rpgOnBattleEnd/rpgBattleWon são o conceito COMPARTILHADO de fim de batalha
 *   (não existe pkmOnBattleEnd — ver ai.ts): o hook marca timeCaido = 1 quando
 *   a batalha termina sem vitória e sem captura, e o root do mato só tenta o
 *   encontro selvagem com timeCaido == 0 — sem isso, o time desmaiado no mato
 *   virava spam de "Você não tem nenhum monstrinho em pé!" a cada 1-3s. A
 *   fonte zera timeCaido junto com a cura (fugir também exige passar na fonte:
 *   é o único leitor de estado do time que os blocos expõem).
 */
export const BATALHA_PROFISSIONAL_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#8fce77", accent: "#2b8a3e" });
SZGameKit.setScreenText("menu", "Batalha de Monstrinhos Profissional", "Setas: andar. ESPAÇO perto da rival Alice: batalhar! Fogo vence planta, planta vence água e água vence fogo. Cure o time na fonte e capture o Faiscolosso no mato fundo.", "Começar");
SZGameKit.setScreenText("vitoria", "Capturou!", "O Faiscolosso entrou para o seu time. Você é a nova lenda do quintal!", "Jogar de novo");
SZGameKit.defineLook("treinadora", function (ctx) {
  ctx.fillStyle = "#e8590c";
  ctx.fillRect(10, 0, 24, 10);
  ctx.fillStyle = "#ffd8a8";
  ctx.fillRect(12, 10, 20, 12);
  ctx.fillStyle = "#1971c2";
  ctx.fillRect(8, 22, 28, 18);
  ctx.fillStyle = "#343a40";
  ctx.fillRect(12, 40, 20, 16);
}, 44, 56);
SZGameKit.defineLook("rival", function (ctx) {
  ctx.fillStyle = "#2f9e44";
  ctx.fillRect(10, 0, 24, 10);
  ctx.fillStyle = "#ffe8cc";
  ctx.fillRect(12, 10, 20, 12);
  ctx.fillStyle = "#e03131";
  ctx.fillRect(8, 22, 28, 18);
  ctx.fillStyle = "#212529";
  ctx.fillRect(12, 40, 20, 16);
}, 44, 56);
SZGameKit.defineLook("fonte", function (ctx) {
  ctx.fillStyle = "#adb5bd";
  ctx.fillRect(5, 70, 120, 30);
  ctx.fillStyle = "#74c0fc";
  ctx.fillRect(15, 76, 100, 18);
  ctx.fillStyle = "#ced4da";
  ctx.fillRect(52, 30, 26, 44);
  ctx.fillStyle = "#a5d8ff";
  ctx.beginPath();
  ctx.arc(65, 22, 14, 0, Math.PI * 2);
  ctx.fill();
}, 130, 110);
SZGameKit.defineLook("grama", function (ctx) {
  ctx.fillStyle = "#2f9e44";
  ctx.fillRect(6, 24, 10, 32);
  ctx.fillRect(24, 12, 10, 44);
  ctx.fillRect(42, 26, 10, 30);
  ctx.fillStyle = "#51cf66";
  ctx.fillRect(15, 34, 8, 22);
}, 56, 56);
SZGameKit.defineLook("faisco", function (ctx) {
  ctx.fillStyle = "#ff922b";
  ctx.fillRect(14, 26, 46, 30);
  ctx.fillRect(18, 10, 12, 18);
  ctx.fillStyle = "#ffd43b";
  ctx.fillRect(54, 6, 14, 24);
  ctx.fillStyle = "#212529";
  ctx.fillRect(46, 34, 6, 6);
}, 80, 64);
SZGameKit.defineLook("gotinha", function (ctx) {
  ctx.fillStyle = "#4dabf7";
  ctx.beginPath();
  ctx.arc(36, 38, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(30, 4, 12, 16);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(26, 32, 6, 8);
}, 72, 64);
SZGameKit.defineLook("brotinho", function (ctx) {
  ctx.fillStyle = "#69db7c";
  ctx.fillRect(16, 28, 40, 32);
  ctx.fillStyle = "#2f9e44";
  ctx.fillRect(31, 6, 10, 24);
  ctx.fillRect(39, 10, 16, 8);
  ctx.fillStyle = "#212529";
  ctx.fillRect(44, 38, 6, 6);
}, 72, 68);
SZGameKit.defineLook("folhito", function (ctx) {
  ctx.fillStyle = "#8ce99a";
  ctx.fillRect(12, 20, 40, 28);
  ctx.fillStyle = "#2b8a3e";
  ctx.fillRect(16, 6, 8, 16);
  ctx.fillStyle = "#212529";
  ctx.fillRect(40, 28, 5, 5);
}, 64, 56);
SZGameKit.defineLook("pingo", function (ctx) {
  ctx.fillStyle = "#74c0fc";
  ctx.beginPath();
  ctx.arc(28, 30, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(24, 2, 8, 14);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(22, 24, 5, 7);
}, 56, 52);
SZGameKit.defineLook("braseiro", function (ctx) {
  ctx.fillStyle = "#fa5252";
  ctx.fillRect(14, 24, 44, 30);
  ctx.fillStyle = "#ffa94d";
  ctx.fillRect(26, 4, 10, 22);
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(28, 0, 6, 8);
  ctx.fillStyle = "#212529";
  ctx.fillRect(48, 32, 6, 6);
}, 72, 60);
SZGameKit.defineLook("faiscolosso", function (ctx) {
  ctx.fillStyle = "#f59f00";
  ctx.fillRect(12, 30, 72, 44);
  ctx.fillStyle = "#ffd43b";
  ctx.fillRect(28, 4, 16, 28);
  ctx.fillRect(52, 10, 14, 22);
  ctx.fillStyle = "#e8590c";
  ctx.fillRect(12, 14, 10, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(62, 42, 10, 8);
}, 96, 80);
SZGameKit.pkmCreature("Faisco", "fogo", 34, 9, 5, 8, "", "faisco");
SZGameKit.pkmCreature("Gotinha", "água", 36, 8, 6, 6, "", "gotinha");
SZGameKit.pkmCreature("Brotinho", "planta", 38, 8, 7, 5, "", "brotinho");
SZGameKit.pkmCreature("Folhito", "planta", 30, 7, 5, 6, "", "folhito");
SZGameKit.pkmCreature("Pingo", "água", 32, 8, 5, 7, "", "pingo");
SZGameKit.pkmCreature("Braseiro", "fogo", 34, 10, 6, 8, "", "braseiro");
SZGameKit.pkmCreature("Faiscolosso", "fogo", 60, 12, 8, 10, "", "faiscolosso");
SZGameKit.pkmMove("Brasa", "Faisco", "fogo", 14, 95, "bola", "#ff922b");
SZGameKit.pkmMove("Rasteira", "Faisco", "normal", 9, 100, "investida", "#ced4da");
SZGameKit.pkmMove("Esguicho", "Gotinha", "água", 14, 95, "onda", "#339af0");
SZGameKit.pkmMove("Chicote de Folha", "Brotinho", "planta", 14, 95, "raio", "#51cf66");
SZGameKit.pkmMove("Folha Afiada", "Folhito", "planta", 12, 95, "raio", "#40c057");
SZGameKit.pkmMove("Bolha", "Pingo", "água", 12, 95, "bola", "#4dabf7");
SZGameKit.pkmMove("Labareda", "Braseiro", "fogo", 16, 90, "bola", "#fa5252");
SZGameKit.pkmMove("Trovão de Fogo", "Faiscolosso", "fogo", 22, 90, "raio", "#ffd43b");
SZGameKit.pkmTypeChart("fogo", "planta", 2);
SZGameKit.pkmTypeChart("planta", "fogo", 0.5);
SZGameKit.pkmTypeChart("água", "fogo", 2);
SZGameKit.pkmTypeChart("fogo", "água", 0.5);
SZGameKit.pkmTypeChart("planta", "água", 2);
SZGameKit.pkmTypeChart("água", "planta", 0.5);
SZGameKit.pkmCatchDifficulty("Faiscolosso", "difícil");
SZGameKit.pkmGive("Faisco", 5);
SZGameKit.pkmGive("Gotinha", 5);
SZGameKit.pkmGive("Brotinho", 5);
SZGameKit.pkmGiveBall(5, 65);
SZGameKit.defineRegion("fonte", 50, 40, 130, 110);
SZGameKit.defineRegion("grama", 660, 360, 240, 150);
SZGameKit.defineMold("rival", { w: 44, h: 56, health: 1, speed: 0, damage: 0, color: "#e03131", look: "rival" });
const rival = SZGameKit.spawnFromMold("rival", 760, 230);
const heroi = SZGameKit.createCharacter({ w: 44, h: 56, speed: 240, color: "#1971c2" });
SZGameKit.placeCharacter(heroi, 140, 420);
SZGameKit.setHitbox(heroi, 8, 8, 28, 44);
SZGameKit.stateLook(heroi, "parado", "treinadora");
SZGameKit.stateLook(heroi, "andando", "treinadora");
let timeCaido = 0;
SZGameKit.on("monstrinho:pegou", function () {
  SZGameKit.playEffect("win");
});
SZGameKit.rpgOnBattleEnd(function () {
  if (!SZGameKit.rpgBattleWon() && !SZGameKit.pkmCaught()) {
    timeCaido = 1;
  }
});
SZGameKit.onUpdate(function (dt) {
  if (SZGameKit.pkmCaught()) {
    SZGameKit.setState("vitoria");
  }
  SZGameKit.moveWithKeys(heroi, dt);
  SZGameKit.keepOnScreen(heroi);
  SZGameKit.autoAnimate(heroi);
  if (SZGameKit.touching(heroi, rival) && SZGameKit.keyPressed(" ")) {
    SZGameKit.playEffect("click");
    SZGameKit.pkmBattleTrainer("Alice", function () {
      SZGameKit.pkmTrainerCreature("Folhito", 5);
      SZGameKit.pkmTrainerCreature("Pingo", 6);
      SZGameKit.pkmTrainerCreature("Braseiro", 7);
    });
  }
  if (SZGameKit.everySeconds("cura", 1.5)) {
    if (SZGameKit.overlapPercent(heroi, "fonte") > 50) {
      SZGameKit.pkmHealTeam();
      timeCaido = 0;
      if (SZGameKit.pkmBallCount() == 0) {
        SZGameKit.pkmGiveBall(3, 65);
        SZGameKit.floatText("Bolas novas!", SZGameKit.charX(heroi), SZGameKit.charY(heroi) - 44, "#fff3bf", 18);
      }
      SZGameKit.playEffect("powerup");
      SZGameKit.floatText("Time curado!", SZGameKit.charX(heroi), SZGameKit.charY(heroi) - 20, "#e7f5ff", 18);
    }
  }
  if (SZGameKit.everySeconds("mato", 1)) {
    if (timeCaido == 0 && SZGameKit.overlapPercent(heroi, "grama") > 50 && SZGameKit.chance(35)) {
      SZGameKit.pkmBattleWild("Faiscolosso", 9);
    }
  }
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#8fce77", false);
  SZGameKit.drawLook("fonte", 50, 40, 130, 110);
  for (let i = 0; i < 4; i += 1) {
    SZGameKit.drawLook("grama", 660 + i * 60, 366, 56, 56);
    SZGameKit.drawLook("grama", 690 + i * 60, 440, 56, 56);
  }
  SZGameKit.drawActive("rival");
  SZGameKit.drawCharacter(heroi);
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.pkmDrawTeam(16, 14);
  ctx.fillStyle = "#14331a";
  ctx.font = "16px sans-serif";
  ctx.fillText("Bolas de captura: " + SZGameKit.pkmBallCount(), 20, 128);
  ctx.fillText("Fonte: cura o time e repõe as bolas. Mato fundo: monstrinho raro!", 20, 528);
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(BATALHA_PROFISSIONAL_SOURCE),
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
