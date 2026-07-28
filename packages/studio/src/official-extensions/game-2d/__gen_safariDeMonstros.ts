import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Safári de Monstros" (recriação BÁSICA e
 * ENXUTA do Monster Hunter / Python-Monsters do Clear Code). Rode com
 * `bun src/official-extensions/game-2d/__gen_safariDeMonstros.ts` e cole a saída
 * em examples/clearcode.ts. O drift test (`safariDeMonstrosExample.test.ts`)
 * guarda o resultado. O preparo do palco vem do wrapper `beginnerGameExample`.
 *
 * ⭐ DIFERENCIAL da trilogia (contra "Treinador de Criaturas" e "Batalha de
 * Monstrinhos", que são BATALHA por turnos): aqui o foco é EXPLORAR o mundo,
 * o monstro selvagem aparece NO PRÓPRIO MAPA (sem tela de batalha), você
 * CAPTURA na hora apertando Espaço perto dele, e o seu parceiro EVOLUI quando
 * a coleção cresce. É o laço do Monster Hunter: andar → mato → aparecer →
 * capturar → evoluir, sem parar para um combate.
 *
 * Decisões do degrau BÁSICO (fidelidade em ESPÍRITO ao original):
 * - MUNDO top-down 480×270 com muros de pedra em volta + arbustos (a "grama alta"
 *   MonsterPatchSprite do original). 100% procedural, sem PNG.
 * - HERÓI anda nas 4 direções (topDown), como o WASD/setas do jogo.
 * - ENCONTRO: andar no mato tem chance de fazer um monstro selvagem APARECER
 *   colado no herói (o encounter_timer + monster_encounter do original), mas
 *   NO MAPA — nada de trocar de cena.
 * - CAPTURA: perto do selvagem, Espaço joga a rede (chance). Deu certo →
 *   coleção +1 e o selvagem some; falhou → ele foge (some) e você procura outro.
 * - EVOLUÇÃO: ao chegar em 3 capturas, o parceiro que te segue EVOLUI (troca a
 *   forma) — o Evolution.py do original, aqui visível no overworld.
 * - NPC Sábio: encostar mostra a dica (o DialogTree do original, simplificado).
 * - OBJETIVO: completar o safári capturando 5. Telas início/vitória com Enter.
 */
export const SAFARI_DE_MONSTROS_SOURCE = `
SZGame2D.fitScreen(100);
SZGame2D.defineShape("explorador", function (ctx) {
  SZGame2D.paintRect(ctx, 6, 6, 20, 5, "#b8860b");
  SZGame2D.paintRect(ctx, 9, 9, 14, 6, "#e8b088");
  SZGame2D.paintCircle(ctx, 13, 12, 1, "#20122f");
  SZGame2D.paintCircle(ctx, 19, 12, 1, "#20122f");
  SZGame2D.paintRect(ctx, 7, 15, 18, 12, "#2e8b57");
  SZGame2D.paintRect(ctx, 4, 16, 4, 9, "#e8b088");
  SZGame2D.paintRect(ctx, 24, 16, 4, 9, "#e8b088");
});
SZGame2D.defineShape("filhote", function (ctx) {
  SZGame2D.paintCircle(ctx, 12, 14, 9, "#4fa3d1");
  SZGame2D.paintCircle(ctx, 9, 12, 2, "#ffffff");
  SZGame2D.paintCircle(ctx, 15, 12, 2, "#ffffff");
  SZGame2D.paintCircle(ctx, 9, 12, 1, "#20122f");
  SZGame2D.paintCircle(ctx, 15, 12, 1, "#20122f");
});
SZGame2D.defineShape("adulto", function (ctx) {
  SZGame2D.paintTriangle(ctx, 2, 18, 12, 6, 12, 22, "#2c78a8");
  SZGame2D.paintTriangle(ctx, 22, 18, 12, 6, 12, 22, "#2c78a8");
  SZGame2D.paintCircle(ctx, 12, 15, 11, "#4fa3d1");
  SZGame2D.paintCircle(ctx, 8, 12, 2, "#ffe066");
  SZGame2D.paintCircle(ctx, 16, 12, 2, "#ffe066");
  SZGame2D.paintCircle(ctx, 8, 12, 1, "#20122f");
  SZGame2D.paintCircle(ctx, 16, 12, 1, "#20122f");
});
SZGame2D.defineShape("selvagem", function (ctx) {
  SZGame2D.paintCircle(ctx, 14, 16, 12, "#8e44ad");
  SZGame2D.paintTriangle(ctx, 6, 8, 3, 0, 11, 8, "#5a2d82");
  SZGame2D.paintTriangle(ctx, 22, 8, 25, 0, 17, 8, "#5a2d82");
  SZGame2D.paintCircle(ctx, 10, 15, 3, "#ff5e5e");
  SZGame2D.paintCircle(ctx, 18, 15, 3, "#ff5e5e");
  SZGame2D.paintCircle(ctx, 10, 15, 1, "#20122f");
  SZGame2D.paintCircle(ctx, 18, 15, 1, "#20122f");
});
SZGame2D.defineShape("sabio", function (ctx) {
  SZGame2D.paintRect(ctx, 8, 4, 12, 8, "#dcd6c8");
  SZGame2D.paintCircle(ctx, 12, 9, 1, "#20122f");
  SZGame2D.paintCircle(ctx, 16, 9, 1, "#20122f");
  SZGame2D.paintRect(ctx, 10, 12, 8, 6, "#c0c0c0");
  SZGame2D.paintRect(ctx, 6, 18, 16, 12, "#6a5acd");
});
const explorador = SZGame2D.createShapeSprite("explorador", { x: 90, y: 210, w: 30, h: 30 });
SZGame2D.setHitboxScale(explorador, 80);
const filhote = SZGame2D.createShapeSprite("filhote", { x: 60, y: 210, w: 24, h: 26 });
const adulto = SZGame2D.createShapeSprite("adulto", { x: 60, y: 210, w: 28, h: 30 });
const selvagem = SZGame2D.createShapeSprite("selvagem", { x: -100, y: -100, w: 30, h: 32 });
const sabio = SZGame2D.createShapeSprite("sabio", { x: 240, y: 60, w: 28, h: 34 });
const muros = SZGame2D.createGroup();
SZGame2D.spawn(muros, { x: 0, y: 0, w: 480, h: 20, color: "#4a4038", vx: 0, vy: 0 });
SZGame2D.spawn(muros, { x: 0, y: 250, w: 480, h: 20, color: "#4a4038", vx: 0, vy: 0 });
SZGame2D.spawn(muros, { x: 0, y: 0, w: 20, h: 270, color: "#4a4038", vx: 0, vy: 0 });
SZGame2D.spawn(muros, { x: 460, y: 0, w: 20, h: 270, color: "#4a4038", vx: 0, vy: 0 });
SZGame2D.spawn(muros, { x: 150, y: 120, w: 40, h: 40, color: "#5a4e42", vx: 0, vy: 0 });
const matos = SZGame2D.createGroup();
SZGame2D.spawn(matos, { x: 300, y: 150, w: 90, h: 70, color: "#2e7d4f", vx: 0, vy: 0 });
SZGame2D.spawn(matos, { x: 60, y: 60, w: 80, h: 60, color: "#2e7d4f", vx: 0, vy: 0 });
SZGame2D.spawn(matos, { x: 340, y: 210, w: 90, h: 40, color: "#2e7d4f", vx: 0, vy: 0 });
let capturados = 0;
let selvagemAtivo = false;
let evoluido = false;
let mensagem = "Ande no mato para achar um monstro selvagem!";
SZGame2D.setScene("inicio");
SZGame2D.onKey("Enter", function () {
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("mundo");
  }
  if (SZGame2D.sceneIs("vitoria")) {
    SZGame2D.restart();
  }
});
SZGame2D.onKey("Space", function () {
  if (SZGame2D.sceneIs("mundo")) {
    if (selvagemAtivo == true) {
      if (SZGame2D.touches(explorador, selvagem)) {
        if (SZGame2D.randomChance(70)) {
          capturados = capturados + 1;
          mensagem = "Capturou! Monstros no caderno: " + capturados;
          SZGame2D.playFx("win");
        } else {
          mensagem = "O monstro fugiu! Procure outro no mato.";
          SZGame2D.playFx("hurt");
        }
        selvagemAtivo = false;
        selvagem.x = -100;
        selvagem.y = -100;
      }
    }
  }
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Safári de Monstros", "Ande com as setas pelo mundo. No mato alto aparecem monstros selvagens. Chegue perto e aperte Espaço para capturar. Junte 5 e seu parceiro evolui!", "Aperte Enter para começar", "#1f2a44");
  }
  if (SZGame2D.sceneIs("mundo")) {
    SZGame2D.topDown(explorador, 3);
    SZGame2D.collideGroup(explorador, muros);
    SZGame2D.drawGroup(ctx, matos);
    SZGame2D.drawGroup(ctx, muros);
    SZGame2D.drawSprite(ctx, sabio);
    if (evoluido == true) {
      adulto.x = SZGame2D.spriteX(explorador) - 26;
      adulto.y = SZGame2D.spriteY(explorador) + 4;
      SZGame2D.drawSprite(ctx, adulto);
    } else {
      filhote.x = SZGame2D.spriteX(explorador) - 24;
      filhote.y = SZGame2D.spriteY(explorador) + 4;
      SZGame2D.drawSprite(ctx, filhote);
    }
    if (selvagemAtivo == true) {
      SZGame2D.drawSprite(ctx, selvagem);
    }
    SZGame2D.drawSprite(ctx, explorador);
    SZGame2D.drawScore(ctx, "Caderno de monstros:", capturados, 26, 40, "#f3f6ff", 14);
    SZGame2D.drawScore(ctx, ">", mensagem, 26, 262, "#ffe9a8", 13);
    if (SZGame2D.touches(explorador, sabio)) {
      mensagem = "Sabio: fique no mato e aperte Espaco colado no monstro!";
    }
    if (selvagemAtivo == false) {
      SZGame2D.overlapSpriteGroup(() => explorador, matos, function (mato) {
        if (selvagemAtivo == false) {
          if (SZGame2D.randomChance(3)) {
            selvagem.x = Math.min(SZGame2D.spriteX(explorador) + 32, 420);
            selvagem.y = SZGame2D.spriteY(explorador);
            selvagemAtivo = true;
            mensagem = "Um monstro selvagem apareceu! Aperte Espaco!";
            SZGame2D.playFx("start");
          }
        }
      });
    }
    if (capturados >= 3) {
      if (evoluido == false) {
        evoluido = true;
        mensagem = "Seu parceiro evoluiu!";
        SZGame2D.shake(ctx, 6);
        SZGame2D.playFx("powerup");
      }
    }
    if (capturados >= 5) {
      SZGame2D.playFx("win");
      SZGame2D.setScene("vitoria");
    }
  }
  if (SZGame2D.sceneIs("vitoria")) {
    SZGame2D.showScreen(ctx, "Safari completo!", "Voce capturou 5 monstros e seu parceiro evoluiu. Um verdadeiro cacador de monstros!", "Aperte Enter para jogar de novo", "#1d4d33");
  }
});
`.trim()

// Só gera quando RODADO direto (o drift test importa o SOURCE daqui).
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(SAFARI_DE_MONSTROS_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
