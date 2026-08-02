import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Fazenda Feliz" (o degrau BÁSICO da família
 * farming/Stardew do Clear Code). Rode com
 * `bun src/official-extensions/game-2d/__gen_fazendaFeliz.ts` e cole a saída em
 * examples/clearcode/fazendaFeliz.ts. O drift test (`fazendaFelizExample.test.ts`) guarda o
 * resultado.
 *
 * Decisões do degrau BÁSICO (fidelidade ao original em pygame, simplificando):
 * - Uma tela só (sem câmera) com uma GRADE FIXA de canteiros. O MODELO de cada
 *   canteiro é um número numa LISTA (0 terra, 1 broto, 2 crescendo, 3 maduro) e
 *   o VISUAL é desenhado por código (paintRect + paintCircle) por estágio. A
 *   câmera que segue + inventário + loja vêm nos níveis Profissional e "na mão".
 * - PLANTAR: andar até um canteiro e apertar espaço planta ali (terra vira
 *   broto). O mesmo espaço num canteiro maduro COLHE (vira moedas e volta a
 *   terra) — o hoe + plant + harvest do original, num gesto só, amigável.
 * - CRESCER: "A cada 3 segundos" cada broto avança um estágio até maduro (o
 *   update_plants que rodava ao dormir, aqui pelo relógio do jogo).
 * - Placar por MOEDAS; juntar 30 moedas vence.
 */
export const FAZENDA_FELIZ_SOURCE = `
SZGame2D.fitScreen(100);
SZGame2D.defineShape("fazendeiro", function (ctx) {
  SZGame2D.paintRect(ctx, 6, 2, 22, 5, "#8a5a2b");
  SZGame2D.paintCircle(ctx, 17, 11, 8, "#f7c8a2");
  SZGame2D.paintRect(ctx, 8, 18, 18, 16, "#d98c40");
});
const fazendeiro = SZGame2D.createShapeSprite("fazendeiro", { x: 60, y: 250, w: 34, h: 34 });
const canteiroX = [];
const canteiroY = [];
const canteiro = [];
for (let i = 0; i < 15; i++) {
  canteiroX.push(82 + (i % 5) * 70);
  canteiroY.push(44 + Math.floor(i / 5) * 70);
  canteiro.push(0);
}
let moedas = 0;
SZGame2D.setScene("inicio");
SZGame2D.onKey("Enter", function () {
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("jogando");
  }
  if (SZGame2D.sceneIs("venceu")) {
    SZGame2D.restart();
  }
});
SZGame2D.onKey("Space", function () {
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("jogando");
  }
  if (SZGame2D.sceneIs("jogando")) {
    for (let i = 0; i < 15; i++) {
      if (SZGame2D.centerX(fazendeiro) >= canteiroX[i] && SZGame2D.centerX(fazendeiro) < canteiroX[i] + 64 && SZGame2D.centerY(fazendeiro) >= canteiroY[i] && SZGame2D.centerY(fazendeiro) < canteiroY[i] + 64) {
        if (canteiro[i] == 0) {
          canteiro[i] = 1;
          SZGame2D.playFx("collect");
        }
        if (canteiro[i] == 3) {
          canteiro[i] = 0;
          moedas = moedas + 3;
          SZGame2D.playFx("coin");
        }
      }
    }
  }
  if (SZGame2D.sceneIs("venceu")) {
    SZGame2D.restart();
  }
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Fazenda Feliz", "Ande com as setas até um canteiro e aperte espaço para plantar. Espere crescer, colha o que estiver maduro e junte 30 moedas!", "Aperte Enter ou espaço para começar", "#3a5a2a");
  }
  if (SZGame2D.sceneIs("jogando")) {
    for (let i = 0; i < 15; i++) {
      SZGame2D.paintRect(ctx, canteiroX[i], canteiroY[i], 64, 64, "#6b4a2b");
      SZGame2D.paintRect(ctx, canteiroX[i] + 4, canteiroY[i] + 4, 56, 56, "#7a5636");
      if (canteiro[i] == 1) {
        SZGame2D.paintCircle(ctx, canteiroX[i] + 32, canteiroY[i] + 44, 6, "#7ec850");
      }
      if (canteiro[i] == 2) {
        SZGame2D.paintCircle(ctx, canteiroX[i] + 32, canteiroY[i] + 38, 12, "#4fae3a");
      }
      if (canteiro[i] == 3) {
        SZGame2D.paintCircle(ctx, canteiroX[i] + 32, canteiroY[i] + 34, 16, "#ffd24a");
      }
    }
    SZGame2D.topDown(fazendeiro, 3);
    SZGame2D.clampToScreen(fazendeiro, ctx);
    SZGame2D.drawSprite(ctx, fazendeiro);
    SZGame2D.drawScore(ctx, "Moedas:", moedas, 12, 24, "#fff8e1", 20);
    if (moedas >= 30) {
      SZGame2D.playFx("win");
      SZGame2D.setScene("venceu");
    }
  }
  if (SZGame2D.sceneIs("venceu")) {
    SZGame2D.showScreen(ctx, "Que colheita!", "Você juntou 30 moedas cuidando da sua fazenda!", "Aperte Enter para plantar de novo", "#3a5a2a");
  }
});
if (SZGame2D.everySeconds("crescer", 3)) {
  if (SZGame2D.sceneIs("jogando")) {
    for (let i = 0; i < 15; i++) {
      if (canteiro[i] == 1) {
        canteiro[i] = 2;
      } else if (canteiro[i] == 2) {
        canteiro[i] = 3;
      }
    }
  }
}
`.trim()

// Só gera quando RODADO direto (o drift test importa o SOURCE daqui).
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(FAZENDA_FELIZ_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
