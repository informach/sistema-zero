import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectGeneratedTypes, printTypeScriptValue, stripGeneratedIds } from './generationUtils'

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
  SZGameKit.drawRectangle(8, 0, 28, 8, "#b8860b");
  SZGameKit.drawRectangle(13, 8, 18, 14, "#ffd8a8");
  SZGameKit.drawRectangle(8, 22, 28, 22, "#2e8b57");
  SZGameKit.drawRectangle(12, 44, 8, 12, "#2d3436");
  SZGameKit.drawRectangle(24, 44, 8, 12, "#2d3436");
}, 44, 56);
SZGameKit.defineLook("sabio", function (ctx) {
  SZGameKit.drawRectangle(8, 22, 28, 24, "#6a5acd");
  SZGameKit.drawRectangle(13, 10, 18, 14, "#ffe8cc");
  SZGameKit.drawRectangle(11, 4, 22, 8, "#ecf0f1");
}, 44, 56);
SZGameKit.defineLook("guarda", function (ctx) {
  SZGameKit.drawRectangle(8, 20, 28, 26, "#34495e");
  SZGameKit.drawRectangle(13, 8, 18, 14, "#ffd8a8");
  SZGameKit.drawRectangle(11, 2, 22, 8, "#95a5a6");
}, 44, 56);
SZGameKit.defineLook("verdinho", function (ctx) {
  SZGameKit.drawCircle(22, 24, 18, "#2f9e44");
  SZGameKit.drawRectangle(18, 2, 8, 14, "#69db7c");
  SZGameKit.drawRectangle(15, 20, 6, 6, "#ffffff");
  SZGameKit.drawRectangle(26, 20, 6, 6, "#ffffff");
}, 44, 44);
SZGameKit.defineLook("azulao", function (ctx) {
  SZGameKit.drawCircle(22, 24, 18, "#2b7de0");
  SZGameKit.drawRectangle(14, 4, 16, 8, "#a5d8ff");
  SZGameKit.drawRectangle(15, 20, 6, 6, "#ffffff");
  SZGameKit.drawRectangle(26, 20, 6, 6, "#ffffff");
}, 44, 44);
SZGameKit.defineLook("flamil", function (ctx) {
  SZGameKit.drawCircle(22, 24, 18, "#e05a2b");
  SZGameKit.drawRectangle(14, 2, 8, 12, "#ffd43b");
  SZGameKit.drawRectangle(15, 20, 6, 6, "#ffffff");
  SZGameKit.drawRectangle(26, 20, 6, 6, "#ffffff");
}, 44, 44);
SZGameKit.defineLook("rochoso", function (ctx) {
  SZGameKit.drawRectangle(6, 10, 32, 30, "#7f8c8d");
  SZGameKit.drawRectangle(12, 16, 8, 8, "#b2bec3");
  SZGameKit.drawRectangle(24, 16, 8, 8, "#b2bec3");
  SZGameKit.drawRectangle(14, 18, 4, 4, "#2d3436");
  SZGameKit.drawRectangle(26, 18, 4, 4, "#2d3436");
}, 44, 44);
SZGameKit.defineLook("sombrio", function (ctx) {
  SZGameKit.drawCircle(22, 24, 18, "#5a3a92");
  SZGameKit.drawRectangle(12, 6, 6, 12, "#d0bfff");
  SZGameKit.drawRectangle(26, 6, 6, 12, "#d0bfff");
  SZGameKit.drawRectangle(15, 22, 6, 6, "#ff5e5e");
  SZGameKit.drawRectangle(26, 22, 6, 6, "#ff5e5e");
}, 44, 44);
SZGameKit.defineLook("filhote", function (ctx) {
  SZGameKit.drawCircle(20, 22, 16, "#4fa3d1");
  SZGameKit.drawRectangle(13, 18, 6, 6, "#ffffff");
  SZGameKit.drawRectangle(24, 18, 6, 6, "#ffffff");
}, 40, 40);
SZGameKit.defineLook("adulto", function (ctx) {
  SZGameKit.drawTriangle(4, 22, 20, 4, 20, 22, "#2c78a8");
  SZGameKit.drawTriangle(40, 22, 24, 4, 24, 22, "#2c78a8");
  SZGameKit.drawCircle(22, 24, 17, "#4fa3d1");
  SZGameKit.drawRectangle(14, 18, 6, 6, "#ffe066");
  SZGameKit.drawRectangle(26, 18, 6, 6, "#ffe066");
}, 44, 44);
SZGameKit.defineLook("arvore", function (ctx) {
  SZGameKit.drawRectangle(26, 40, 12, 24, "#6b4226");
  SZGameKit.drawRectangle(6, 4, 52, 40, "#2f7d32");
}, 64, 64);
SZGameKit.defineLook("mato", function (ctx) {
  SZGameKit.drawRectangle(6, 22, 10, 34, "#2f9e44");
  SZGameKit.drawRectangle(24, 10, 10, 46, "#2f9e44");
  SZGameKit.drawRectangle(42, 24, 10, 32, "#2f9e44");
  SZGameKit.drawRectangle(15, 32, 8, 24, "#51cf66");
}, 64, 64);
SZGameKit.defineLook("pedra", function (ctx) {
  SZGameKit.drawRectangle(8, 20, 48, 40, "#616a6b");
  SZGameKit.drawRectangle(16, 28, 14, 12, "#808b8d");
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
  SZGameKit.drawRectangle(12, 12, 232, 40, "#0e2a1c");
  SZGameKit.drawText("Caderno de monstros: " + capturados + " de 5", 24, 38, 18, "#ffffff");
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
  const clean = stripGeneratedIds(JSON.parse(JSON.stringify(normalized))) as Record<string, unknown>
  const types = collectGeneratedTypes(behaviorStatements(normalized))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)

  const ordered = {
    html: clean.html,
    css: clean.css,
    extensions: clean.extensions,
    version: clean.version,
    behavior: clean.behavior,
  }
  console.log(printTypeScriptValue(ordered, '  '))
}
