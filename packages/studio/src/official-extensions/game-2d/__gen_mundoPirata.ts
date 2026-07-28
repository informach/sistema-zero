import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Mundo Pirata" (o degrau BÁSICO da trilogia
 * de plataforma lateral estilo Mario do Clear Code — Super Pirate World). Rode
 * com `bun src/official-extensions/game-2d/__gen_mundoPirata.ts` e cole a saída
 * em examples/clearcode.ts. O drift test (`mundoPirataExample.test.ts`) guarda.
 *
 * Fidelidade em ESPÍRITO ao side-scroller: um mundo LARGO (1600) com a câmera
 * seguindo o herói (cameraFollow), gravidade + pulo (só no chão, como o Dino),
 * chão em segmentos com 2 BURACOS, plataformas flutuantes para pular, moedas
 * para pegar, caranguejos que patrulham (pisão por cima derrota, encostar do
 * lado perde) e uma bandeira no fim. 100% procedural, sem assets.
 */
export const MUNDO_PIRATA_SOURCE = `
SZGame2D.fitScreen(100);
SZGame2D.setGravity(0.5);
SZGame2D.defineShape("pirata", function (ctx) {
  SZGame2D.paintRect(ctx, 6, 14, 16, 18, "#c0392b");
  SZGame2D.paintCircle(ctx, 14, 9, 7, "#f7c8a2");
  SZGame2D.paintRect(ctx, 3, 3, 22, 6, "#2c3e50");
  SZGame2D.paintRect(ctx, 8, 32, 5, 11, "#34495e");
  SZGame2D.paintRect(ctx, 15, 32, 5, 11, "#34495e");
});
SZGame2D.defineShape("caranguejo", function (ctx) {
  SZGame2D.paintEllipse(ctx, 12, 12, 11, 7, "#e67e22");
  SZGame2D.paintRect(ctx, 2, 6, 4, 6, "#c0392b");
  SZGame2D.paintRect(ctx, 18, 6, 4, 6, "#c0392b");
});
const heroi = SZGame2D.createShapeSprite("pirata", { x: 40, y: 190, w: 28, h: 44 });
SZGame2D.setHitboxScale(heroi, 80);
const plataformas = SZGame2D.createGroup();
SZGame2D.spawn(plataformas, { x: 0, y: 264, w: 360, h: 40, color: "#8d6e63", vx: 0, vy: 0 });
SZGame2D.spawn(plataformas, { x: 440, y: 264, w: 360, h: 40, color: "#8d6e63", vx: 0, vy: 0 });
SZGame2D.spawn(plataformas, { x: 880, y: 264, w: 720, h: 40, color: "#8d6e63", vx: 0, vy: 0 });
SZGame2D.spawn(plataformas, { x: 300, y: 196, w: 90, h: 18, color: "#a1887f", vx: 0, vy: 0 });
SZGame2D.spawn(plataformas, { x: 590, y: 184, w: 90, h: 18, color: "#a1887f", vx: 0, vy: 0 });
SZGame2D.spawn(plataformas, { x: 1040, y: 196, w: 90, h: 18, color: "#a1887f", vx: 0, vy: 0 });
SZGame2D.spawn(plataformas, { x: 1280, y: 176, w: 90, h: 18, color: "#a1887f", vx: 0, vy: 0 });
const moedas = SZGame2D.createGroup();
SZGame2D.spawn(moedas, { x: 200, y: 224, w: 16, h: 16, color: "#ffd166", vx: 0, vy: 0 });
SZGame2D.spawn(moedas, { x: 330, y: 168, w: 16, h: 16, color: "#ffd166", vx: 0, vy: 0 });
SZGame2D.spawn(moedas, { x: 620, y: 156, w: 16, h: 16, color: "#ffd166", vx: 0, vy: 0 });
SZGame2D.spawn(moedas, { x: 700, y: 224, w: 16, h: 16, color: "#ffd166", vx: 0, vy: 0 });
SZGame2D.spawn(moedas, { x: 1070, y: 168, w: 16, h: 16, color: "#ffd166", vx: 0, vy: 0 });
SZGame2D.spawn(moedas, { x: 1310, y: 148, w: 16, h: 16, color: "#ffd166", vx: 0, vy: 0 });
SZGame2D.spawn(moedas, { x: 1460, y: 224, w: 16, h: 16, color: "#ffd166", vx: 0, vy: 0 });
const inimigos = SZGame2D.createGroup();
SZGame2D.spawn(inimigos, { x: 520, y: 240, w: 24, h: 20, color: "#e67e22", vx: 0.7, vy: 0 });
SZGame2D.spawn(inimigos, { x: 980, y: 240, w: 24, h: 20, color: "#e67e22", vx: 0.7, vy: 0 });
SZGame2D.spawn(inimigos, { x: 1200, y: 240, w: 24, h: 20, color: "#e67e22", vx: 0.7, vy: 0 });
const bandeira = SZGame2D.createSprite({ x: 1540, y: 200, w: 16, h: 64, color: "#ffd166" });
let pontos = 0;
SZGame2D.playMusic("adventure");
SZGame2D.setScene("inicio");
SZGame2D.onKey("Enter", function () {
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("jogando");
  }
  if (SZGame2D.sceneIs("venceu")) {
    SZGame2D.restart();
  }
  if (SZGame2D.sceneIs("perdeu")) {
    SZGame2D.restart();
  }
});
SZGame2D.onKey("ArrowUp", function () {
  if (SZGame2D.sceneIs("jogando")) {
    if (SZGame2D.spriteVy(heroi) == 0) {
      heroi.vy = -11;
      SZGame2D.playFx("jump");
    }
  }
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Mundo Pirata", "Corra com as setas e pule com a seta para cima. Pegue as moedas, pise nos caranguejos e chegue na bandeira do fim. Cuidado com os buracos!", "Aperte Enter para começar a aventura", "#123a4a");
  }
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.cameraFollow(heroi, 1600, 300);
    SZGame2D.arrowsX(heroi, 3);
    SZGame2D.applyVelocity(heroi);
    SZGame2D.collideGroup(heroi, plataformas);
    SZGame2D.forEachInGroup(inimigos, function (bicho) {
      bicho.x = bicho.x + bicho.vx;
      if (bicho.x < 460) {
        bicho.vx = 0.7;
      }
      if (bicho.x > 1500) {
        bicho.vx = -0.7;
      }
    });
    SZGame2D.overlapSpriteGroup(() => heroi, moedas, function (moeda) {
      SZGame2D.removeFromGroup(moedas, moeda);
      pontos = pontos + 1;
      SZGame2D.playFx("coin");
    });
    SZGame2D.overlapSpriteGroup(() => heroi, inimigos, function (bicho) {
      if (SZGame2D.spriteVy(heroi) > 0 && SZGame2D.spriteY(heroi) + 30 < bicho.y) {
        SZGame2D.removeFromGroup(inimigos, bicho);
        heroi.vy = -8;
        pontos = pontos + 2;
        SZGame2D.explodeSprite(bicho, "#e67e22");
        SZGame2D.playFx("coin");
      } else {
        SZGame2D.shake(ctx, 8);
        SZGame2D.playFx("gameover");
        SZGame2D.setScene("perdeu");
      }
    });
    if (SZGame2D.spriteY(heroi) > 340) {
      SZGame2D.playFx("gameover");
      SZGame2D.setScene("perdeu");
    }
    if (SZGame2D.spriteX(heroi) > 1524) {
      SZGame2D.playFx("win");
      SZGame2D.setScene("venceu");
    }
    SZGame2D.drawGroup(ctx, plataformas);
    SZGame2D.drawGroup(ctx, moedas);
    SZGame2D.drawGroup(ctx, inimigos);
    SZGame2D.drawSprite(ctx, bandeira);
    SZGame2D.drawSprite(ctx, heroi);
    SZGame2D.drawScore(ctx, "Tesouro:", pontos, 12, 26, "#ffffff", 16);
  }
  if (SZGame2D.sceneIs("venceu")) {
    SZGame2D.showScreen(ctx, "Chegou na bandeira!", "Você atravessou o Mundo Pirata inteiro e pegou " + pontos + " de tesouro. Que aventureiro!", "Aperte Enter para jogar de novo", "#14532d");
  }
  if (SZGame2D.sceneIs("perdeu")) {
    SZGame2D.showScreen(ctx, "Que perrengue!", "O pirata caiu ou encostou de lado num caranguejo. Pise em cima deles e desvie dos buracos!", "Aperte Enter para tentar de novo", "#5a2a2a");
  }
});
`.trim()

if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(MUNDO_PIRATA_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
