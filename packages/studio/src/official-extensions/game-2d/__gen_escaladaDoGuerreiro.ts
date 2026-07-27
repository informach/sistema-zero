import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Escalada do Guerreiro" (recriação BÁSICA do
 * vertical-platformer do Chris Courses). Rode com
 * `bun src/official-extensions/game-2d/__gen_escaladaDoGuerreiro.ts` e cole a
 * saída em examples/gamesTwoD.ts. O drift test
 * (`escaladaDoGuerreiroExample.test.ts`) guarda o resultado.
 *
 * O preparo do palco (setupStage + setStageDescription) NÃO aparece aqui de
 * propósito: quem o injeta é o wrapper `beginnerGameExample`, como em todos os
 * cartões do Jogo 2D.
 *
 * Decisões do degrau BÁSICO (fidelidade em ESPÍRITO ao original em index.js):
 * - Mundo MAIOR que a tela: o palco é 320x480 mas o mundo tem 960 de altura; a
 *   câmera sobe junto com o herói (cameraFollow), que é o pan da câmera do
 *   original (shouldPanCameraUp/Down/…). O herói começa embaixo e SOBE.
 * - Gravidade + pulo + andar montados NA MÃO (sem o helper platformer, que ancora
 *   o chão na BORDA da tela e brigaria com a câmera): setGravity deixa a queda
 *   leve como o gravity = 0.1 do original; arrowsX anda para os lados; applyVelocity
 *   integra a velocidade somando a gravidade e PRESERVA o "no chão" da colisão do
 *   quadro anterior. O pulo é um evento (seta pra cima) que só age quando o herói
 *   está PARADO na vertical (spriteVy == 0), o mesmo truque do Dino: assim ele pula
 *   das plataformas mas não voa no ar.
 * - As plataformas (floorCollisions/platformCollisions viradas em CollisionBlock)
 *   viram um GRUPO de retângulos coloridos, e a colisão sólida (checkForVertical/
 *   HorizontalCollisions) vira collideGroup(heroi, plataformas): o herói pousa em
 *   cima e bate nas laterais. 100% procedural (SEM os PNGs do warrior/background).
 *   As plataformas ficam em ziguezague para o herói pular ao LADO da de cima.
 * - Objetivo = chegar ao TOPO: uma bandeira desenhada lá em cima; quando o herói
 *   passa da linha do topo (spriteY < 90) o jogo vai para a cena "venceu". O
 *   original é livre (sem fim); damos uma meta comemorável para a criança.
 * - Telas de início e vitória com reinício por Enter.
 */
export const ESCALADA_DO_GUERREIRO_SOURCE = `
SZGame2D.fitScreen(100);
SZGame2D.setGravity(0.5);
SZGame2D.defineShape("guerreirinho", function (ctx) {
  SZGame2D.paintCircle(ctx, 14, 8, 7, "#f7c8a2");
  SZGame2D.paintRect(ctx, 6, 15, 16, 16, "#4a6fd6");
  SZGame2D.paintRect(ctx, 2, 17, 5, 11, "#f7c8a2");
  SZGame2D.paintRect(ctx, 21, 17, 5, 11, "#f7c8a2");
  SZGame2D.paintRect(ctx, 8, 31, 5, 11, "#33407a");
  SZGame2D.paintRect(ctx, 16, 31, 5, 11, "#33407a");
});
const heroi = SZGame2D.createShapeSprite("guerreirinho", { x: 40, y: 860, w: 28, h: 44 });
SZGame2D.setHitboxScale(heroi, 80);
const plataformas = SZGame2D.createGroup();
SZGame2D.spawn(plataformas, { x: 0, y: 916, w: 320, h: 44, color: "#5a7a3a", vx: 0, vy: 0 });
SZGame2D.spawn(plataformas, { x: 180, y: 806, w: 120, h: 20, color: "#7a5a3a", vx: 0, vy: 0 });
SZGame2D.spawn(plataformas, { x: 20, y: 706, w: 120, h: 20, color: "#7a5a3a", vx: 0, vy: 0 });
SZGame2D.spawn(plataformas, { x: 190, y: 606, w: 110, h: 20, color: "#7a5a3a", vx: 0, vy: 0 });
SZGame2D.spawn(plataformas, { x: 30, y: 506, w: 110, h: 20, color: "#7a5a3a", vx: 0, vy: 0 });
SZGame2D.spawn(plataformas, { x: 180, y: 406, w: 120, h: 20, color: "#7a5a3a", vx: 0, vy: 0 });
SZGame2D.spawn(plataformas, { x: 20, y: 306, w: 120, h: 20, color: "#7a5a3a", vx: 0, vy: 0 });
SZGame2D.spawn(plataformas, { x: 170, y: 206, w: 120, h: 20, color: "#7a5a3a", vx: 0, vy: 0 });
SZGame2D.spawn(plataformas, { x: 40, y: 116, w: 130, h: 20, color: "#7a5a3a", vx: 0, vy: 0 });
const bandeira = SZGame2D.createSprite({ x: 84, y: 72, w: 16, h: 44, color: "#ffd166" });
SZGame2D.playMusic("adventure");
SZGame2D.setScene("inicio");
SZGame2D.onKey("Enter", function () {
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("jogando");
  }
  if (SZGame2D.sceneIs("venceu")) {
    SZGame2D.restart();
  }
});
SZGame2D.onKey("ArrowUp", function () {
  if (SZGame2D.sceneIs("jogando")) {
    if (SZGame2D.spriteVy(heroi) == 0) {
      heroi.vx = 0;
      heroi.vy = -11;
      SZGame2D.playFx("jump");
    }
  }
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Escalada do Guerreiro", "Use as setas para andar e a seta pra cima para pular de plataforma em plataforma. Chegue lá no alto, na bandeira dourada!", "Aperte Enter para começar a subir", "#243a1c");
  }
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.cameraFollow(heroi, 320, 960);
    SZGame2D.arrowsX(heroi, 3);
    SZGame2D.applyVelocity(heroi);
    SZGame2D.collideGroup(heroi, plataformas);
    SZGame2D.clampToScreen(heroi, ctx);
    SZGame2D.drawGroup(ctx, plataformas);
    SZGame2D.drawSprite(ctx, bandeira);
    SZGame2D.drawSprite(ctx, heroi);
    if (SZGame2D.spriteY(heroi) < 90) {
      SZGame2D.playFx("win");
      SZGame2D.setScene("venceu");
    }
    SZGame2D.drawLabel(ctx, "Suba até a bandeira!", 12, 26, "#ffffff", 14, "left");
  }
  if (SZGame2D.sceneIs("venceu")) {
    SZGame2D.showScreen(ctx, "Chegou ao topo!", "O guerreiro escalou a torre inteira e fincou a bandeira. Escalada perfeita!", "Aperte Enter para escalar de novo", "#1d4d33");
  }
});
`.trim()

// Só gera quando RODADO direto (o drift test importa o SOURCE daqui).
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(ESCALADA_DO_GUERREIRO_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
