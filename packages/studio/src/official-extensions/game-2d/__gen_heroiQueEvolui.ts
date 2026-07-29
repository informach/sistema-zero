import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Herói que Evolui" (o degrau BÁSICO da
 * família Zelda-style Adventure do Clear Code, focado no DIFERENCIAL que o
 * "Aventura do Herói"/"Vila Ninja" NÃO ensinam: a economia de EXP e o SUBIR DE
 * NÍVEL). Rode com `bun src/official-extensions/game-2d/__gen_heroiQueEvolui.ts`
 * e cole a saída em examples/clearcode.ts. O drift test
 * (`heroiQueEvoluiExample.test.ts`) guarda o resultado.
 *
 * Decisões do degrau BÁSICO:
 * - Arena de UMA tela (clampToScreen). A câmera que segue e o menu de melhoria
 *   vêm nos níveis Profissional e "na mão".
 * - ESPADA na direção olhada (o create_attack do original): espaço solta um
 *   golpe temporário à frente; a direção mora em miraX/miraY, alimentada pelas
 *   setas. O golpe fere o inimigo por overlapGroups (o attack_sprites do original).
 * - Inimigos do Kit (perseguidor) nascem em ondas e perseguem; encostar tira um
 *   coração (hurtByEnemy com i-frames).
 * - ⭐ O DIFERENCIAL: cada inimigo derrotado dá EXP; ao encher a barra o herói
 *   SOBE DE NÍVEL, fica mais rápido e cura corações (o add_exp + upgrade do
 *   original, aqui automático). Chegar ao nível 5 vence.
 */
export const HEROI_QUE_EVOLUI_SOURCE = `
SZGame2D.fitScreen(100);
SZGame2D.defineShape("heroizinho", function (ctx) {
  SZGame2D.paintCircle(ctx, 17, 9, 8, "#f7c8a2");
  SZGame2D.paintRect(ctx, 8, 16, 18, 14, "#2f6fbf");
  SZGame2D.paintRect(ctx, 10, 30, 5, 10, "#7a4a21");
  SZGame2D.paintRect(ctx, 19, 30, 5, 10, "#7a4a21");
});
SZGame2D.defineShape("monstro", function (ctx) {
  SZGame2D.paintCircle(ctx, 15, 15, 14, "#8d55c9");
  SZGame2D.paintCircle(ctx, 10, 12, 4, "#f6f2ff");
  SZGame2D.paintCircle(ctx, 20, 12, 4, "#f6f2ff");
  SZGame2D.paintCircle(ctx, 10, 12, 2, "#20122f");
  SZGame2D.paintCircle(ctx, 20, 12, 2, "#20122f");
});
const heroi = SZGame2D.createShapeSprite("heroizinho", { x: 223, y: 133, w: 34, h: 40 });
SZGame2D.setHitboxScale(heroi, 80);
SZGame2D.setHealth(heroi, 5);
const golpes = SZGame2D.createGroup();
const inimigos = SZGame2D.createEnemyType({ behavior: "perseguidor", color: "#8d55c9", image: "", shape: "monstro", hp: 2, speed: 1, dmg: 1, w: 32, h: 32 });
let exp = 0;
let nivel = 1;
let velocidade = 3;
let miraX = 34;
let miraY = 0;
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
SZGame2D.onKey("Space", function () {
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("jogando");
  }
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.spawn(golpes, { x: SZGame2D.centerX(heroi) + miraX - 13, y: SZGame2D.centerY(heroi) + miraY - 13, w: 26, h: 26, color: "#f7d154", vx: 0, vy: 0 });
    SZGame2D.playFx("whoosh");
  }
});
SZGame2D.onEnemyDefeated(inimigos, function (bicho) {
  exp = exp + 1;
  SZGame2D.emitParticles(SZGame2D.centerX(bicho), SZGame2D.centerY(bicho), 14, "#c084fc");
  SZGame2D.playFx("explosion");
  if (exp >= nivel * 3) {
    nivel = nivel + 1;
    exp = 0;
    if (velocidade < 5) {
      velocidade = velocidade + 0.4;
    }
    SZGame2D.changeHealth(heroi, 2);
    SZGame2D.emitParticles(SZGame2D.centerX(heroi), SZGame2D.centerY(heroi), 22, "#ffd166");
    SZGame2D.playFx("powerup");
  }
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Herói que Evolui", "Corte os monstros com espaço para ganhar experiência. Suba de nível para ficar mais forte e chegue ao nível 5!", "Aperte Enter ou espaço para começar", "#1d2f4d");
  }
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.topDown(heroi, velocidade);
    SZGame2D.clampToScreen(heroi, ctx);
    if (SZGame2D.keyDown("ArrowRight")) {
      miraX = 34;
      miraY = 0;
      SZGame2D.flipSprite(heroi, "right");
    }
    if (SZGame2D.keyDown("ArrowLeft")) {
      miraX = -34;
      miraY = 0;
      SZGame2D.flipSprite(heroi, "left");
    }
    if (SZGame2D.keyDown("ArrowUp")) {
      miraX = 0;
      miraY = -37;
    }
    if (SZGame2D.keyDown("ArrowDown")) {
      miraX = 0;
      miraY = 37;
    }
    SZGame2D.updateEnemyType(inimigos, ctx, heroi);
    SZGame2D.overlapGroups(golpes, inimigos, (golpe, bicho) => {
      SZGame2D.changeHealth(bicho, -1);
      SZGame2D.removeFromGroup(golpes, golpe);
      SZGame2D.playFx("punch");
    });
    SZGame2D.pruneOld(golpes, 0.25);
    if (!SZGame2D.isInvincible(heroi)) {
      SZGame2D.overlapSpriteGroup(() => heroi, inimigos, (bicho) => {
        SZGame2D.hurtByEnemy(heroi, bicho);
        SZGame2D.shake(ctx, 5);
        SZGame2D.playFx("hurt");
      });
    }
    SZGame2D.drawGroup(ctx, golpes);
    SZGame2D.drawEnemyType(ctx, inimigos);
    SZGame2D.drawSprite(ctx, heroi);
    SZGame2D.drawParticles(ctx);
    SZGame2D.drawSpriteHealth(ctx, heroi, "hearts", 14, 26, 16, "#ff6b81");
    SZGame2D.drawScore(ctx, "Nível:", nivel, 14, 54, "#ffe066", 16);
    SZGame2D.drawScore(ctx, "EXP:", exp, 14, 76, "#f3f6ff", 14);
    if (nivel >= 5) {
      SZGame2D.playFx("win");
      SZGame2D.setScene("vitoria");
    }
    if (SZGame2D.healthDepleted(heroi)) {
      SZGame2D.playFx("gameover");
      SZGame2D.setScene("derrota");
    }
  }
  if (SZGame2D.sceneIs("vitoria")) {
    SZGame2D.showScreen(ctx, "Virou um herói lendário!", "Você chegou ao nível 5 evoluindo a cada monstro derrotado!", "Aperte Enter para jogar de novo", "#1d2f4d");
  }
  if (SZGame2D.sceneIs("derrota")) {
    SZGame2D.showScreen(ctx, "O herói caiu!", "Você chegou ao nível " + nivel + ". Treine para evoluir mais!", "Aperte Enter para tentar de novo", "#5a2a2a");
  }
});
if (SZGame2D.everySeconds("nasce-monstro", 1.4)) {
  if (SZGame2D.sceneIs("jogando")) {
    let bx = SZGame2D.randomBetween(30, 450);
    let by = 20;
    if (SZGame2D.randomChance(50)) {
      by = 280;
    }
    SZGame2D.spawnEnemy(inimigos, bx, by);
  }
}
`.trim()

// Só gera quando RODADO direto (o drift test importa o SOURCE daqui).
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(HEROI_QUE_EVOLUI_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
