import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'

/**
 * Gerador one-off da IR do exemplo "Safári de Monstros Profissional" — o Monster
 * Hunter / Python-Monsters do Clear Code recriado com o 🧙 Kit RPG do motor
 * avançado, SEM nenhum asset (herói, sábio, monstros e cenário são `defineLook`).
 * Rode com
 * `bun src/official-extensions/game-2d-advanced/__gen_safariDeMonstrosProfissional.ts`
 * e cole a saída em `examples/safariDeMonstrosProfissionalExample.ts`. O drift
 * test (`__tests__/safariDeMonstrosProfissionalExample.test.ts`) guarda o resultado.
 *
 * ⭐ DIFERENCIAL da trilogia (contra o "Treinador de Criaturas Profissional", que
 * usa o Kit Monstrinhos e PARA numa batalha por turnos): aqui NÃO há tela de
 * batalha. A captura acontece NO PRÓPRIO OVERWORLD — cada monstro selvagem é um
 * NPC na grama; chegar de frente e apertar ESPAÇO joga a rede e captura na hora.
 * O parceiro que te segue EVOLUI ao juntar 3, e o mundo tem DOIS biomas ligados
 * pela borda (rpgConnectEdge, estilo Zelda): a Floresta e a Caverna, com monstros
 * diferentes — a "rota com dificuldade progressiva" do original.
 *
 * Fidelidade em espírito ao Python-Monsters:
 * - mundo MAIOR que a tela (20x16 = 1280x1024) + câmera que segue (cameraFollow);
 * - andar por CÉLULAS com paredes (rpgMoveGrid + rpgBlockCell);
 * - NPCs que conversam ao apertar ESPAÇO de frente (rpgCreateNpc + rpgOnTalk +
 *   rpgSay), como o Sábio e a Guarda; os monstros selvagens são NPCs que você
 *   captura (rpgAddFlag marca quem já entrou no caderno, sem contar duas vezes);
 * - o Evolution.py vira o parceiro que evolui no HUD ao chegar em 3 capturas;
 * - juntar 5 monstros (3 na Floresta + 2 na Caverna) liga a tela de vitória.
 */
export const SAFARI_DE_MONSTROS_PROFISSIONAL_SOURCE = `
SZGameKit.setup({ width: 960, height: 540, background: "#3a7d44", accent: "#e6398b" });
SZGameKit.setScreenText("menu", "Safári de Monstros Profissional", "Setas: explorar os dois biomas. ESPAÇO de frente para um monstro selvagem: jogar a rede e capturar na hora. Ande para a borda leste e entre na Caverna. Junte 5 monstros e veja seu parceiro evoluir!", "Começar o safári");
SZGameKit.setScreenText("vitoria", "Safári completo!", "Você capturou os 5 monstros da Floresta e da Caverna, e seu parceiro evoluiu. Um verdadeiro caçador de monstros!", "Explorar de novo");
SZGameKit.defineLook("explorador", function (ctx) {
  ctx.fillStyle = "#b8860b";
  ctx.fillRect(8, 0, 28, 8);
  ctx.fillStyle = "#ffd8a8";
  ctx.fillRect(13, 8, 18, 14);
  ctx.fillStyle = "#2e8b57";
  ctx.fillRect(8, 22, 28, 22);
  ctx.fillStyle = "#2d3436";
  ctx.fillRect(12, 44, 8, 12);
  ctx.fillRect(24, 44, 8, 12);
}, 44, 56);
SZGameKit.defineLook("sabio", function (ctx) {
  ctx.fillStyle = "#6a5acd";
  ctx.fillRect(8, 22, 28, 24);
  ctx.fillStyle = "#ffe8cc";
  ctx.fillRect(13, 10, 18, 14);
  ctx.fillStyle = "#ecf0f1";
  ctx.fillRect(11, 4, 22, 8);
}, 44, 56);
SZGameKit.defineLook("guarda", function (ctx) {
  ctx.fillStyle = "#34495e";
  ctx.fillRect(8, 20, 28, 26);
  ctx.fillStyle = "#ffd8a8";
  ctx.fillRect(13, 8, 18, 14);
  ctx.fillStyle = "#95a5a6";
  ctx.fillRect(11, 2, 22, 8);
}, 44, 56);
SZGameKit.defineLook("verdinho", function (ctx) {
  ctx.fillStyle = "#2f9e44";
  ctx.beginPath();
  ctx.arc(22, 24, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#69db7c";
  ctx.fillRect(18, 2, 8, 14);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(15, 20, 6, 6);
  ctx.fillRect(26, 20, 6, 6);
}, 44, 44);
SZGameKit.defineLook("azulao", function (ctx) {
  ctx.fillStyle = "#2b7de0";
  ctx.beginPath();
  ctx.arc(22, 24, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a5d8ff";
  ctx.fillRect(14, 4, 16, 8);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(15, 20, 6, 6);
  ctx.fillRect(26, 20, 6, 6);
}, 44, 44);
SZGameKit.defineLook("flamil", function (ctx) {
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
SZGameKit.defineLook("rochoso", function (ctx) {
  ctx.fillStyle = "#7f8c8d";
  ctx.fillRect(6, 10, 32, 30);
  ctx.fillStyle = "#b2bec3";
  ctx.fillRect(12, 16, 8, 8);
  ctx.fillRect(24, 16, 8, 8);
  ctx.fillStyle = "#2d3436";
  ctx.fillRect(14, 18, 4, 4);
  ctx.fillRect(26, 18, 4, 4);
}, 44, 44);
SZGameKit.defineLook("sombrio", function (ctx) {
  ctx.fillStyle = "#5a3a92";
  ctx.beginPath();
  ctx.arc(22, 24, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d0bfff";
  ctx.fillRect(12, 6, 6, 12);
  ctx.fillRect(26, 6, 6, 12);
  ctx.fillStyle = "#ff5e5e";
  ctx.fillRect(15, 22, 6, 6);
  ctx.fillRect(26, 22, 6, 6);
}, 44, 44);
SZGameKit.defineLook("filhote", function (ctx) {
  ctx.fillStyle = "#4fa3d1";
  ctx.beginPath();
  ctx.arc(20, 22, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(13, 18, 6, 6);
  ctx.fillRect(24, 18, 6, 6);
}, 40, 40);
SZGameKit.defineLook("adulto", function (ctx) {
  ctx.fillStyle = "#2c78a8";
  ctx.beginPath();
  ctx.moveTo(4, 22);
  ctx.lineTo(20, 4);
  ctx.lineTo(20, 22);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(40, 22);
  ctx.lineTo(24, 4);
  ctx.lineTo(24, 22);
  ctx.fill();
  ctx.fillStyle = "#4fa3d1";
  ctx.beginPath();
  ctx.arc(22, 24, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(14, 18, 6, 6);
  ctx.fillRect(26, 18, 6, 6);
}, 44, 44);
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
SZGameKit.defineLook("pedra", function (ctx) {
  ctx.fillStyle = "#616a6b";
  ctx.fillRect(8, 20, 48, 40);
  ctx.fillStyle = "#808b8d";
  ctx.fillRect(16, 28, 14, 12);
}, 64, 64);
const heroi = SZGameKit.createCharacter({ w: 44, h: 56, speed: 220, color: "#2e8b57" });
SZGameKit.setHitbox(heroi, 8, 20, 28, 34);
SZGameKit.stateLook(heroi, "parado", "explorador");
SZGameKit.stateLook(heroi, "andando", "explorador");
SZGameKit.cameraFollow(heroi, 1280, 1024);
let capturados = 0;
let evoluido = false;
SZGameKit.rpgSetStartMap("floresta");
SZGameKit.rpgCreateMap("floresta", 20, 16, function (ctx) {
  SZGameKit.drawBackground("#3a7d44", false);
});
SZGameKit.rpgCreateMap("caverna", 20, 16, function (ctx) {
  SZGameKit.drawBackground("#3b3550", false);
});
SZGameKit.rpgOnEnterMap("floresta", function () {
  SZGameKit.rpgConnectEdge("leste", "caverna");
  SZGameKit.rpgCreateNpc("Sabio", 4, 3, "", "sabio");
  SZGameKit.rpgCreateNpc("Verdinho", 9, 8, "", "verdinho");
  SZGameKit.rpgCreateNpc("Azulao", 14, 11, "", "azulao");
  SZGameKit.rpgCreateNpc("Flamil", 6, 12, "", "flamil");
  SZGameKit.rpgBlockCell(2, 8);
  SZGameKit.rpgBlockCell(17, 4);
  SZGameKit.rpgBlockCell(11, 6);
  if (SZGameKit.rpgHasFlag("spawnou") == false) {
    SZGameKit.placeCharacter(heroi, 448, 384);
    SZGameKit.rpgAddFlag("spawnou");
  }
});
SZGameKit.rpgOnEnterMap("caverna", function () {
  SZGameKit.rpgConnectEdge("oeste", "floresta");
  SZGameKit.rpgCreateNpc("Guarda", 3, 3, "", "guarda");
  SZGameKit.rpgCreateNpc("Rochoso", 8, 6, "", "rochoso");
  SZGameKit.rpgCreateNpc("Sombrio", 14, 9, "", "sombrio");
  SZGameKit.rpgBlockCell(10, 4);
  SZGameKit.rpgBlockCell(6, 11);
});
SZGameKit.rpgOnTalk("Sabio", function () {
  if (SZGameKit.rpgHasFlag("dica")) {
    SZGameKit.rpgSay("A Caverna fica na borda leste. Lá vivem os monstros raros!", "Sabio");
  } else {
    SZGameKit.rpgSay("Bem-vindo ao safari! Chegue de frente num monstro e aperte Espaco para jogar a rede.", "Sabio");
    SZGameKit.rpgAddFlag("dica");
  }
});
SZGameKit.rpgOnTalk("Guarda", function () {
  SZGameKit.rpgSay("A Caverna e mais dificil. O Rochoso e o Sombrio so aparecem aqui!", "Guarda");
});
SZGameKit.rpgOnTalk("Verdinho", function () {
  if (SZGameKit.rpgHasFlag("pego_verdinho")) {
    SZGameKit.rpgSay("O Verdinho ja esta no seu caderno!", "Safari");
  } else {
    SZGameKit.rpgAddFlag("pego_verdinho");
    capturados = capturados + 1;
    SZGameKit.rpgSay("Voce jogou a rede e capturou o Verdinho!", "Safari");
    SZGameKit.playEffect("win");
  }
});
SZGameKit.rpgOnTalk("Azulao", function () {
  if (SZGameKit.rpgHasFlag("pego_azulao")) {
    SZGameKit.rpgSay("O Azulao ja esta no seu caderno!", "Safari");
  } else {
    SZGameKit.rpgAddFlag("pego_azulao");
    capturados = capturados + 1;
    SZGameKit.rpgSay("Voce jogou a rede e capturou o Azulao!", "Safari");
    SZGameKit.playEffect("win");
  }
});
SZGameKit.rpgOnTalk("Flamil", function () {
  if (SZGameKit.rpgHasFlag("pego_flamil")) {
    SZGameKit.rpgSay("O Flamil ja esta no seu caderno!", "Safari");
  } else {
    SZGameKit.rpgAddFlag("pego_flamil");
    capturados = capturados + 1;
    SZGameKit.rpgSay("Voce jogou a rede e capturou o Flamil!", "Safari");
    SZGameKit.playEffect("win");
  }
});
SZGameKit.rpgOnTalk("Rochoso", function () {
  if (SZGameKit.rpgHasFlag("pego_rochoso")) {
    SZGameKit.rpgSay("O Rochoso ja esta no seu caderno!", "Safari");
  } else {
    SZGameKit.rpgAddFlag("pego_rochoso");
    capturados = capturados + 1;
    SZGameKit.rpgSay("Que forca! Voce capturou o Rochoso da caverna!", "Safari");
    SZGameKit.playEffect("win");
  }
});
SZGameKit.rpgOnTalk("Sombrio", function () {
  if (SZGameKit.rpgHasFlag("pego_sombrio")) {
    SZGameKit.rpgSay("O Sombrio ja esta no seu caderno!", "Safari");
  } else {
    SZGameKit.rpgAddFlag("pego_sombrio");
    capturados = capturados + 1;
    SZGameKit.rpgSay("O raro Sombrio caiu na rede! Que caçada!", "Safari");
    SZGameKit.playEffect("win");
  }
});
SZGameKit.onUpdate(function (dt) {
  SZGameKit.rpgMoveGrid(heroi, 64, dt);
  SZGameKit.autoAnimate(heroi);
  if (capturados >= 3) {
    if (evoluido == false) {
      evoluido = true;
      SZGameKit.playEffect("powerup");
    }
  }
  if (capturados >= 5) {
    SZGameKit.setState("vitoria");
  }
});
SZGameKit.onDraw(function (ctx) {
  for (let i = 0; i < 5; i += 1) {
    SZGameKit.drawLook("mato", 320 + i * 64, 448, 64, 64);
    SZGameKit.drawLook("mato", 320 + i * 64, 640, 64, 64);
  }
  SZGameKit.drawLook("arvore", 128, 128, 64, 64);
  SZGameKit.drawLook("arvore", 1088, 192, 64, 64);
  SZGameKit.drawLook("pedra", 640, 256, 64, 64);
  if (evoluido == true) {
    SZGameKit.drawLook("adulto", SZGameKit.charX(heroi) - 46, SZGameKit.charY(heroi) + 8, 44, 44);
  } else {
    SZGameKit.drawLook("filhote", SZGameKit.charX(heroi) - 42, SZGameKit.charY(heroi) + 12, 40, 40);
  }
  SZGameKit.rpgDrawNpcs();
  SZGameKit.drawByDepth(heroi);
});
SZGameKit.onDrawHud(function (ctx) {
  ctx.fillStyle = "#0e2a1c";
  ctx.fillRect(12, 12, 232, 40);
  ctx.fillStyle = "#ffffff";
  ctx.font = "18px sans-serif";
  ctx.fillText("Caderno de monstros: " + capturados + " de 5", 24, 38);
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(SAFARI_DE_MONSTROS_PROFISSIONAL_SOURCE),
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
