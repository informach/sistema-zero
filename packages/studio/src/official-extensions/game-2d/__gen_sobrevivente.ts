import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Sobrevivente" (o degrau BÁSICO da família
 * Vampire Survivor do curso Clear Code "5 games"). Rode com
 * `bun src/official-extensions/game-2d/__gen_sobrevivente.ts` e cole a saída em
 * examples/clearcode/sobrevivente.ts. O drift test (`sobreviventeExample.test.ts`) guarda o
 * resultado.
 *
 * O preparo do palco (setupStage + setStageDescription) NÃO aparece aqui de
 * propósito: quem o injeta é o wrapper `beginnerGameExample`.
 *
 * Decisões do degrau BÁSICO (fidelidade ao original em pygame, simplificando):
 * - Arena de UMA TELA (clampToScreen) em vez de mundo com câmera — a câmera que
 *   segue o herói é a progressão dos níveis Profissional e "na mão". Assim o
 *   degrau básico não paga o custo da câmera + limites de mundo.
 * - A arma ATIRA SOZINHA no inimigo mais PERTO (o auto-fire do gênero): a cada
 *   quadro varre o grupo de inimigos com distance(), mira o herói com aimAt no
 *   mais perto e dispara com shootFrom quando o cooldown está pronto. O herói é
 *   um círculo com um cano que aponta para a direita (ângulo 0) — aimAt o gira.
 * - Inimigos do Kit (perseguidor) nascem nas bordas "A cada 0,8 segundos" e
 *   perseguem o herói (updateEnemyType). Encostar tira um coração (hurtByEnemy
 *   com i-frames); acabar os corações = fim.
 * - Placar POR TEMPO (soma 1 por segundo) + bônus de 3 por inimigo derrotado.
 */
export const SOBREVIVENTE_SOURCE = `
SZGame2D.fitScreen(100);
SZGame2D.defineShape("heroizinho", function (ctx) {
  SZGame2D.paintCircle(ctx, 17, 17, 12, "#4f8fea");
  SZGame2D.paintCircle(ctx, 13, 13, 3, "#dbe9ff");
  SZGame2D.paintRect(ctx, 17, 14, 18, 6, "#c9d7ef");
});
SZGame2D.defineShape("monstrinho", function (ctx) {
  SZGame2D.paintCircle(ctx, 15, 15, 13, "#e05a5a");
  SZGame2D.paintCircle(ctx, 10, 12, 3, "#2a0f14");
  SZGame2D.paintCircle(ctx, 20, 12, 3, "#2a0f14");
});
const heroi = SZGame2D.createShapeSprite("heroizinho", { x: 223, y: 133, w: 34, h: 34 });
SZGame2D.setHitboxScale(heroi, 70);
SZGame2D.setHealth(heroi, 5);
const tiros = SZGame2D.createGroup();
const inimigos = SZGame2D.createEnemyType({ behavior: "perseguidor", color: "#e05a5a", image: "", shape: "monstrinho", hp: 2, speed: 1, dmg: 1, w: 30, h: 30 });
let pontos = 0;
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
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("jogando");
  }
  if (SZGame2D.sceneIs("perdeu")) {
    SZGame2D.restart();
  }
});
SZGame2D.onEnemyDefeated(inimigos, function (bicho) {
  pontos = pontos + 3;
  SZGame2D.emitParticles(SZGame2D.centerX(bicho), SZGame2D.centerY(bicho), 14, "#ffb347");
  SZGame2D.playExplosion();
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Sobrevivente", "Fuja dos monstrinhos com as setas. Sua arma atira sozinha no inimigo mais perto. Aguente o máximo que você conseguir!", "Aperte Enter ou espaço para começar", "#241a33");
  }
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.topDown(heroi, 3);
    SZGame2D.clampToScreen(heroi, ctx);
    SZGame2D.updateEnemyType(inimigos, ctx, heroi);
    let maisPerto = heroi;
    let menorDistancia = 9999;
    SZGame2D.forEachInGroup(inimigos, function (bicho) {
      const dist = SZGame2D.distance(heroi, bicho);
      if (dist < menorDistancia) {
        menorDistancia = dist;
        maisPerto = bicho;
      }
    });
    if (SZGame2D.countGroup(inimigos) > 0) {
      SZGame2D.aimAt(heroi, maisPerto);
      if (SZGame2D.cooldownReady(heroi, 16)) {
        SZGame2D.shootFrom(heroi, tiros, { speed: 7, color: "#9cff57" });
        SZGame2D.playShoot();
      }
    }
    SZGame2D.updateGroup(tiros);
    SZGame2D.overlapGroups(tiros, inimigos, function (tiro, bicho) {
      SZGame2D.changeHealth(bicho, -1);
      SZGame2D.removeFromGroup(tiros, tiro);
    });
    if (!SZGame2D.isInvincible(heroi)) {
      SZGame2D.overlapSpriteGroup(() => heroi, inimigos, (bicho) => {
        SZGame2D.hurtByEnemy(heroi, bicho);
        SZGame2D.shake(ctx, 5);
        SZGame2D.playFx("hurt");
      });
    }
    SZGame2D.pruneOffscreen(ctx, tiros, 60, function (tiro) {});
    SZGame2D.drawGroup(ctx, tiros);
    SZGame2D.drawEnemyType(ctx, inimigos);
    SZGame2D.drawSprite(ctx, heroi);
    SZGame2D.drawParticles(ctx);
    SZGame2D.drawSpriteHealth(ctx, heroi, "hearts", 14, 26, 16, "#ff6b81");
    SZGame2D.drawScore(ctx, "Pontos:", pontos, 14, 54, "#ffffff", 16);
    if (SZGame2D.healthDepleted(heroi)) {
      SZGame2D.playFx("gameover");
      SZGame2D.setScene("perdeu");
    }
  }
  if (SZGame2D.sceneIs("perdeu")) {
    SZGame2D.showScreen(ctx, "Os monstrinhos te alcançaram!", "Você fez " + pontos + " pontos. Tente aguentar mais tempo!", "Aperte Enter ou espaço para tentar de novo", "#5a2a2a");
  }
});
if (SZGame2D.everySeconds("nasce-inimigo", 0.8)) {
  if (SZGame2D.sceneIs("jogando")) {
    let bx = SZGame2D.randomBetween(30, 450);
    let by = 20;
    if (SZGame2D.randomChance(50)) {
      by = 280;
    }
    SZGame2D.spawnEnemy(inimigos, bx, by);
  }
}
if (SZGame2D.everySeconds("ponto-por-segundo", 1)) {
  if (SZGame2D.sceneIs("jogando")) {
    pontos = pontos + 1;
  }
}
`.trim()

// Só gera quando RODADO direto (o drift test importa o SOURCE daqui).
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(SOBREVIVENTE_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
