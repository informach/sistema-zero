import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Chuva de Meteoros" (o degrau BÁSICO da
 * família Space Shooter do curso raylib_intro). Rode com
 * `bun src/official-extensions/game-2d/__gen_chuvaDeMeteoros.ts` e cole a
 * saída em examples/clearcode/chuvaDeMeteoros.ts. O drift test
 * (`chuvaDeMeteorosExample.test.ts`) guarda o resultado.
 *
 * O preparo do palco (setupStage + setStageDescription) NÃO aparece aqui de
 * propósito: quem o injeta é o wrapper `beginnerGameExample`.
 *
 * Decisões do degrau básico (fidelidade ao original em pyray):
 * - Nave nas 4 DIREÇÕES com diagonal normalizada (topDown) + presa na tela
 *   (clampToScreen) — o input()/constraint() do Player original.
 * - Espaço atira laser para CIMA (spawnBullet com vy negativo). Jogo espacial
 *   SEM gravidade: updateGroup puro nos dois grupos.
 * - Meteoros CAEM do topo numa raiz "A cada 0,5 segundos" (0,4 no original;
 *   calibrado pro palco menor): x sorteado na largura (randomX), direção
 *   diagonal sorteada (vx -1..1 ~ o uniform(-0.5, 0.5)) e velocidade sorteada
 *   (vy = velocidade + 0..2). O spawnAsteroid do Kit espaço já desenha a pedra
 *   GIRANDO — o rotation += 50*dt do Meteor original de graça.
 * - laser × meteoro = explosão + som + remover os dois (o culling ±300 do
 *   original vira pruneOffscreen nos dois grupos, com a margem fixa de 40
 *   representada pelo bloco).
 * - nave × meteoro = fim (o close_window do original vira a cena "perdeu"),
 *   com colisão PERDOADORA de 75% na nave (setHitboxScale).
 * - Placar POR TEMPO (int(get_time()) do original): raiz "A cada 1 segundo"
 *   soma 1; destruir meteoro dá +2 de bônus (gameplay melhor, mesmo espírito).
 * - O fundo de 30 estrelas do original é o drawStarfield do Kit espaço; a
 *   música é o playMusic("tense") genérico.
 * - Dificuldade leve: raiz "A cada 6 segundos" acelera a queda até um teto.
 */
export const CHUVA_DE_METEOROS_SOURCE = `
SZGame2D.fitScreen(100);
const nave = SZGame2D.createShip({ x: 216, y: 230, w: 48, h: 42, body: "#4f8fea", wings: "#9cd3ff" });
SZGame2D.setHitboxScale(nave, 75);
const tiros = SZGame2D.createGroup();
const meteoros = SZGame2D.createGroup();
let pontos = 0;
let velocidade = 2;
SZGame2D.playMusic("tense");
SZGame2D.setScene("inicio");
SZGame2D.onKey("Enter", function () {
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("jogando");
  }
  if (SZGame2D.sceneIs("perdeu")) {
    SZGame2D.restart();
  }
});
SZGame2D.onKey("Space", function () {
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.spawnBullet(tiros, { x: SZGame2D.centerX(nave), y: SZGame2D.spriteY(nave), radius: 4, color: "#9cff57", vx: 0, vy: -6 });
    SZGame2D.playShoot();
  }
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("jogando");
  }
  if (SZGame2D.sceneIs("perdeu")) {
    SZGame2D.restart();
  }
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  SZGame2D.drawStarfield(ctx, 2);
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Chuva de Meteoros", "Voe com as setas para os 4 lados e atire com espaço. Sobreviva o máximo que você conseguir!", "Aperte Enter ou espaço para decolar", "#1d2440");
  }
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.topDown(nave, 3);
    SZGame2D.clampToScreen(nave, ctx);
    SZGame2D.updateGroup(tiros);
    SZGame2D.updateGroup(meteoros);
    SZGame2D.drawSprite(ctx, nave);
    SZGame2D.drawGroup(ctx, tiros);
    SZGame2D.drawGroup(ctx, meteoros);
    SZGame2D.overlapGroups(tiros, meteoros, (tiro, pedra) => {
      SZGame2D.explodeSprite(pedra, "#ffb347");
      SZGame2D.playExplosion();
      SZGame2D.removeFromGroup(tiros, tiro);
      SZGame2D.removeFromGroup(meteoros, pedra);
      pontos = pontos + 2;
    });
    SZGame2D.overlapSpriteGroup(() => nave, meteoros, (pedra) => {
      SZGame2D.explodeSprite(nave, "#ff5d3d");
      SZGame2D.shake(ctx, 8);
      SZGame2D.playFx("gameover");
      SZGame2D.setScene("perdeu");
    });
    SZGame2D.pruneOffscreen(ctx, tiros, 40, (tiro) => {});
    SZGame2D.pruneOffscreen(ctx, meteoros, 40, (pedra) => {});
    SZGame2D.drawScore(ctx, "Pontos:", pontos, 12, 28, "#f3f6ff", 22);
  }
  if (SZGame2D.sceneIs("perdeu")) {
    SZGame2D.showScreen(ctx, "A nave explodiu!", "Você fez " + pontos + " pontos. Tente voar por mais tempo!", "Aperte Enter ou espaço para decolar de novo", "#5a2a2a");
  }
});
if (SZGame2D.everySeconds("nasce-meteoro", 0.5)) {
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.spawnAsteroid(meteoros, { x: SZGame2D.randomX(), y: -40, size: SZGame2D.randomBetween(22, 40), color: "#b08968", vx: SZGame2D.randomBetween(-1, 1), vy: velocidade + SZGame2D.randomBetween(0, 2) });
  }
}
if (SZGame2D.everySeconds("ponto-por-segundo", 1)) {
  if (SZGame2D.sceneIs("jogando")) {
    pontos = pontos + 1;
  }
}
if (SZGame2D.everySeconds("acelera", 6)) {
  if (SZGame2D.sceneIs("jogando")) {
    if (velocidade < 4) {
      velocidade = velocidade + 1;
    }
  }
}
`.trim()

// Só gera quando RODADO direto (o drift test importa o SOURCE daqui).
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(CHUVA_DE_METEOROS_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
