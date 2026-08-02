import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Pong" (o degrau BÁSICO da trilogia Pong do
 * Clear Code — refaz o antigo card isolado "Pong simples", que usava member-set
 * cru demais). Rode com `bun src/official-extensions/game-2d/__gen_pong.ts` e
 * cole a saída em examples/clearcode/pong.ts. O drift test (`pongExample.test.ts`)
 * guarda o resultado.
 *
 * Campo 440×300 (o `beginnerGameExample` lê o tamanho do <canvas> declarado).
 * Raquete do jogador à esquerda (setas ↑↓), computador à direita seguindo a
 * bola; a bola quica nas paredes de cima/baixo e nas raquetes (acelerando um
 * tico), e quem deixa a bola passar entrega o ponto. Primeiro a 5 vence.
 */
export const PONG_SOURCE = `
const jogador = SZGame2D.createSprite({ x: 20, y: 128, w: 12, h: 44, color: "#22d3ee" });
const computador = SZGame2D.createSprite({ x: 408, y: 128, w: 12, h: 44, color: "#f472b6" });
const bola = SZGame2D.createSprite({ x: 214, y: 144, w: 12, h: 12, color: "#fbbf24" });
bola.vx = 3;
bola.vy = 2;
let pontos = 0;
let pontosComputador = 0;
SZGame2D.setScene("inicio");
SZGame2D.onKey("Enter", function () {
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("jogando");
  }
  if (SZGame2D.sceneIs("vitoria")) {
    SZGame2D.restart();
  }
  if (SZGame2D.sceneIs("derrota")) {
    SZGame2D.restart();
  }
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Pong", "Mova a raquete azul com as setas para cima e para baixo. O primeiro a 5 pontos vence!", "Aperte Enter para começar", "#11172a");
  }
  if (SZGame2D.sceneIs("jogando")) {
    if (SZGame2D.keyDown("ArrowUp")) {
      jogador.y = jogador.y - 5;
    }
    if (SZGame2D.keyDown("ArrowDown")) {
      jogador.y = jogador.y + 5;
    }
    SZGame2D.clampToScreen(jogador, ctx);
    if (bola.y > computador.y + 26) {
      computador.y = computador.y + 3.4;
    }
    if (bola.y < computador.y + 18) {
      computador.y = computador.y - 3.4;
    }
    SZGame2D.clampToScreen(computador, ctx);
    SZGame2D.applyVelocity(bola);
    if (bola.y <= 0) {
      bola.vy = Math.abs(bola.vy);
    }
    if (bola.y + bola.h >= 300) {
      bola.vy = 0 - Math.abs(bola.vy);
    }
    if (SZGame2D.touches(jogador, bola) && bola.vx < 0) {
      bola.vx = Math.abs(bola.vx) + 0.3;
      bola.vy = bola.vy + (bola.y - jogador.y - 16) * 0.08;
      SZGame2D.playFx("coin");
    }
    if (SZGame2D.touches(computador, bola) && bola.vx > 0) {
      bola.vx = 0 - Math.abs(bola.vx) - 0.3;
      bola.vy = bola.vy + (bola.y - computador.y - 16) * 0.08;
      SZGame2D.playFx("coin");
    }
    if (bola.x < 0) {
      pontosComputador = pontosComputador + 1;
      bola.x = 214;
      bola.y = 144;
      bola.vx = 3;
      bola.vy = SZGame2D.randomBetween(-2, 2);
      SZGame2D.playFx("gameover");
    }
    if (bola.x > 440) {
      pontos = pontos + 1;
      bola.x = 214;
      bola.y = 144;
      bola.vx = -3;
      bola.vy = SZGame2D.randomBetween(-2, 2);
      SZGame2D.playFx("jump");
    }
    SZGame2D.drawSprite(ctx, jogador);
    SZGame2D.drawSprite(ctx, computador);
    SZGame2D.drawSprite(ctx, bola);
    SZGame2D.drawScore(ctx, "Você:", pontos, 20, 28, "#22d3ee", 20);
    SZGame2D.drawScore(ctx, "PC:", pontosComputador, 330, 28, "#f472b6", 20);
    if (pontos >= 5) {
      SZGame2D.setScene("vitoria");
    }
    if (pontosComputador >= 5) {
      SZGame2D.setScene("derrota");
    }
  }
  if (SZGame2D.sceneIs("vitoria")) {
    SZGame2D.showScreen(ctx, "Você venceu!", "Você fez 5 pontos antes do computador. Mandou bem!", "Aperte Enter para jogar de novo", "#14532d");
  }
  if (SZGame2D.sceneIs("derrota")) {
    SZGame2D.showScreen(ctx, "O computador venceu", "Ele chegou a 5 pontos primeiro. Tente rebater com a beirada da raquete!", "Aperte Enter para jogar de novo", "#5a2a2a");
  }
});
`.trim()

if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(PONG_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
