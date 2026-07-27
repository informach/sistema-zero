import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Treinador de Criaturas Profissional" — o
 * pokemon-style-game (Pellet Town do Chris Courses) recriado com o 👾 Kit
 * Monstrinhos + o 🧙 Kit RPG do motor avançado, SEM nenhum asset (o treinador,
 * os aldeões, as casas, a grama e as criaturas são retângulos e formas em
 * `defineLook`). Rode com
 * `bun src/official-extensions/game-2d-advanced/__gen_treinadorDeCriaturas.ts`
 * e cole a saída em `examples/treinadorDeCriaturasExample.ts`. O drift test
 * (`__tests__/treinadorDeCriaturasExample.test.ts`) guarda o resultado.
 *
 * Fidelidade ao original (pokemon-style-game):
 * - o mundo é MAIOR que a tela (mapa 20x16 celulas = 1280x1024) e a CÂMERA
 *   segue o treinador estilo Pellet Town (cameraFollow + rpgCreateMap dá o
 *   tamanho; a câmera prende nas bordas do mundo);
 * - andar por CÉLULAS com paredes (rpgMoveGrid + rpgBlockCell = os boundaries
 *   do original: casas, lago e cercas), o mesmo WASD/setas top-down;
 * - as ZONAS de batalha do original viram grama alta (pkmGrassCells) e cada
 *   passo na grama pode disparar um encontro selvagem por turnos (pkmWild);
 * - os NPCs conversam ao apertar ESPAÇO de frente (rpgCreateNpc + rpgOnTalk +
 *   rpgSay), como o villager e o oldMan do original; o Professor DÁ a criatura
 *   inicial e as bolas, a Enfermeira CURA o time (o Centro de Cura num bloco);
 * - a BATALHA é por turnos com tipo/vantagem (fogo vence planta, planta vence
 *   água, água vence fogo — a criança escreve a tabela em 3 blocos), golpes
 *   nomeados e captura com a bola;
 * - o objetivo: capturar 3 criaturas (o time chega a 4 com a inicial) liga a
 *   tela de vitória pronta (rpgOnBattleEnd + pkmCaught + pkmTeamSize).
 *
 * ⭐ pkm + rpg CONVIVEM (o bichinhosDoQuintal já prova): o MUNDO é o Kit RPG
 * (grade, NPCs, fala, mapa) e só a BATALHA é do Kit Monstrinhos. rpgOnBattleEnd
 * é o conceito COMPARTILHADO de fim de batalha (não existe pkmOnBattleEnd). O
 * fundo é desenhado DENTRO do mapa (rpgCreateMap), nunca por cima no onDraw.
 */
export const TREINADOR_DE_CRIATURAS_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#5c9e4a", accent: "#e6398b" });
SZGameKit.setScreenText("menu", "Treinador de Criaturas Profissional", "Setas: andar pela cidade. ESPAÇO de frente para um aldeão: conversar. Pise na grama alta para achar criaturas selvagens, batalhe por turnos e jogue a bola para capturar. Pegue 3 criaturas!", "Começar a jornada");
SZGameKit.setScreenText("vitoria", "Você é um Mestre!", "Capturou 3 criaturas da cidade e virou a nova lenda dos treinadores!", "Jogar de novo");
SZGameKit.defineLook("treinador", function (ctx) {
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(10, 0, 24, 12);
  ctx.fillStyle = "#ffd8a8";
  ctx.fillRect(13, 12, 18, 12);
  ctx.fillStyle = "#2b6cb0";
  ctx.fillRect(8, 24, 28, 20);
  ctx.fillStyle = "#2d3436";
  ctx.fillRect(12, 44, 8, 12);
  ctx.fillRect(24, 44, 8, 12);
}, 44, 56);
SZGameKit.defineLook("professor", function (ctx) {
  ctx.fillStyle = "#ecf0f1";
  ctx.fillRect(8, 22, 28, 24);
  ctx.fillStyle = "#ffd8a8";
  ctx.fillRect(13, 10, 18, 14);
  ctx.fillStyle = "#bdc3c7";
  ctx.fillRect(11, 4, 22, 8);
}, 44, 56);
SZGameKit.defineLook("aldea", function (ctx) {
  ctx.fillStyle = "#8e44ad";
  ctx.fillRect(8, 20, 28, 26);
  ctx.fillStyle = "#ffe8cc";
  ctx.fillRect(13, 8, 18, 14);
  ctx.fillStyle = "#f1c40f";
  ctx.fillRect(11, 2, 22, 8);
}, 44, 56);
SZGameKit.defineLook("idoso", function (ctx) {
  ctx.fillStyle = "#7f8c8d";
  ctx.fillRect(8, 22, 28, 24);
  ctx.fillStyle = "#ffe8cc";
  ctx.fillRect(13, 10, 18, 14);
  ctx.fillStyle = "#ecf0f1";
  ctx.fillRect(12, 6, 20, 6);
}, 44, 56);
SZGameKit.defineLook("enfermeira", function (ctx) {
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(8, 22, 28, 24);
  ctx.fillStyle = "#ffd8a8";
  ctx.fillRect(13, 10, 18, 14);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(11, 4, 22, 8);
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(19, 5, 6, 6);
}, 44, 56);
SZGameKit.defineLook("chaminho", function (ctx) {
  ctx.fillStyle = "#e05a2b";
  ctx.beginPath();
  ctx.arc(22, 24, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd43b";
  ctx.fillRect(14, 2, 8, 12);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(15, 20, 6, 6);
  ctx.fillRect(26, 20, 6, 6);
}, 44, 44);
SZGameKit.defineLook("gotoso", function (ctx) {
  ctx.fillStyle = "#2b7de0";
  ctx.beginPath();
  ctx.arc(22, 24, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a5d8ff";
  ctx.fillRect(18, 4, 8, 12);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(15, 20, 6, 6);
  ctx.fillRect(26, 20, 6, 6);
}, 44, 44);
SZGameKit.defineLook("brotim", function (ctx) {
  ctx.fillStyle = "#3f9d3f";
  ctx.beginPath();
  ctx.arc(22, 24, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#69db7c";
  ctx.fillRect(18, 2, 8, 14);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(15, 20, 6, 6);
  ctx.fillRect(26, 20, 6, 6);
}, 44, 44);
SZGameKit.defineLook("casa", function (ctx) {
  ctx.fillStyle = "#c9a76b";
  ctx.fillRect(0, 24, 64, 40);
  ctx.fillStyle = "#8e3b2a";
  ctx.fillRect(0, 4, 64, 22);
  ctx.fillStyle = "#3a271a";
  ctx.fillRect(24, 42, 16, 22);
}, 64, 64);
SZGameKit.defineLook("arvore", function (ctx) {
  ctx.fillStyle = "#6b4226";
  ctx.fillRect(26, 40, 12, 24);
  ctx.fillStyle = "#2f7d32";
  ctx.fillRect(6, 4, 52, 40);
}, 64, 64);
SZGameKit.defineLook("mato", function (ctx) {
  ctx.fillStyle = "#2f9e44";
  ctx.fillRect(6, 22, 10, 34);
  ctx.fillRect(24, 10, 10, 46);
  ctx.fillRect(42, 24, 10, 32);
  ctx.fillStyle = "#51cf66";
  ctx.fillRect(15, 32, 8, 24);
}, 64, 64);
SZGameKit.pkmCreature("Chaminho", "fogo", 30, 9, 4, 7, "", "chaminho");
SZGameKit.pkmCreature("Gotoso", "água", 32, 8, 5, 6, "", "gotoso");
SZGameKit.pkmCreature("Brotim", "planta", 34, 7, 6, 5, "", "brotim");
SZGameKit.pkmMove("Brasa", "Chaminho", "fogo", 16, 95, "bola", "#ff8800");
SZGameKit.pkmMove("Investida", "Chaminho", "normal", 10, 100, "investida", "#999999");
SZGameKit.pkmMove("Jato", "Gotoso", "água", 16, 95, "onda", "#2b7de0");
SZGameKit.pkmMove("Chicote", "Brotim", "planta", 16, 95, "raio", "#3f9d3f");
SZGameKit.pkmTypeChart("fogo", "planta", 2);
SZGameKit.pkmTypeChart("planta", "água", 2);
SZGameKit.pkmTypeChart("água", "fogo", 2);
SZGameKit.pkmCatchDifficulty("Brotim", "normal");
SZGameKit.rpgSetStartMap("cidade");
SZGameKit.rpgCreateMap("cidade", 20, 16, function (ctx) {
  SZGameKit.drawBackground("#5c9e4a", false);
});
const heroi = SZGameKit.createCharacter({ w: 44, h: 56, speed: 220, color: "#c0392b" });
SZGameKit.setHitbox(heroi, 8, 20, 28, 34);
SZGameKit.stateLook(heroi, "parado", "treinador");
SZGameKit.stateLook(heroi, "andando", "treinador");
SZGameKit.cameraFollow(heroi, 1280, 1024);
SZGameKit.on("monstrinho:pegou", function () {
  SZGameKit.playEffect("win");
});
SZGameKit.rpgOnEnterMap("cidade", function () {
  SZGameKit.rpgCreateNpc("Professor", 4, 3, "", "professor");
  SZGameKit.rpgCreateNpc("Idoso", 14, 4, "", "idoso");
  SZGameKit.rpgCreateNpc("Aldea", 8, 5, "", "aldea");
  SZGameKit.rpgCreateNpc("Enfermeira", 3, 12, "", "enfermeira");
  SZGameKit.rpgBlockCell(4, 2);
  SZGameKit.rpgBlockCell(14, 3);
  SZGameKit.rpgBlockCell(3, 11);
  SZGameKit.rpgBlockCell(17, 13);
  SZGameKit.pkmGrassCells(6, 8, 18, 14);
  SZGameKit.pkmWild("Gotoso", 3, 6);
  SZGameKit.pkmWild("Brotim", 3, 6);
  SZGameKit.pkmWild("Chaminho", 4, 7);
  SZGameKit.placeCharacter(heroi, 448, 384);
});
SZGameKit.rpgOnTalk("Professor", function () {
  if (SZGameKit.rpgHasFlag("comecou")) {
    SZGameKit.rpgSay("Vá para a grama alta lá embaixo e capture 3 criaturas!", "Professor");
  } else {
    SZGameKit.rpgSay("Bem-vindo, treinador! Leve o Chaminho e 6 bolas. Pegue 3 criaturas na grama!", "Professor");
    SZGameKit.pkmGive("Chaminho", 5);
    SZGameKit.pkmGiveBall(6, 60);
    SZGameKit.rpgAddFlag("comecou");
  }
});
SZGameKit.rpgOnTalk("Idoso", function () {
  SZGameKit.rpgSay("Meus ossos doem. No meu tempo, fogo vencia planta e água apagava o fogo!", "Idoso");
});
SZGameKit.rpgOnTalk("Aldea", function () {
  SZGameKit.rpgSay("Ei, treinador! Você viu a minha criatura? Ela fugiu para a grama alta.", "Aldea");
});
SZGameKit.rpgOnTalk("Enfermeira", function () {
  SZGameKit.rpgSay("Deixe suas criaturas descansarem. Prontas de novo!", "Enfermeira");
  SZGameKit.pkmHealTeam();
});
SZGameKit.rpgOnBattleEnd(function () {
  if (SZGameKit.pkmCaught()) {
    if (SZGameKit.pkmTeamSize() >= 4) {
      SZGameKit.setState("vitoria");
    }
  }
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.rpgMoveGrid(heroi, 64, dt);
  SZGameKit.autoAnimate(heroi);
});
SZGameKit.onDraw(function (ctx) {
  for (let i = 0; i < 6; i += 1) {
    SZGameKit.drawLook("mato", 384 + i * 64, 512, 64, 64);
    SZGameKit.drawLook("mato", 384 + i * 64, 704, 64, 64);
  }
  SZGameKit.drawLook("casa", 256, 128, 64, 64);
  SZGameKit.drawLook("casa", 896, 192, 64, 64);
  SZGameKit.drawLook("arvore", 192, 704, 64, 64);
  SZGameKit.drawLook("arvore", 1088, 832, 64, 64);
  SZGameKit.rpgDrawNpcs();
  SZGameKit.drawByDepth(heroi);
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.pkmDrawTeam(16, 14);
  ctx.fillStyle = "#123018";
  ctx.font = "16px sans-serif";
  ctx.fillText("Criaturas capturadas: " + (SZGameKit.pkmTeamSize() - 1) + " de 3", 20, 128);
  ctx.fillText("Bolas: " + SZGameKit.pkmBallCount(), 20, 150);
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(TREINADOR_DE_CRIATURAS_SOURCE),
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
