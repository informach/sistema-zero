import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Vila Ninja" (recriação BÁSICA e MINI do
 * ninja-adventure do Chris Courses). Rode com
 * `bun src/official-extensions/game-2d/__gen_vilaNinja.ts` e cole a saída em
 * examples/gamesTwoD/vilaNinja.ts. O drift test (`vilaNinjaExample.test.ts`) guarda o
 * resultado.
 *
 * O preparo do palco (setupStage + setStageDescription) NÃO aparece aqui de
 * propósito: quem o injeta é o wrapper `beginnerGameExample`, como em todos os
 * cartões do Jogo 2D.
 *
 * Decisões do degrau BÁSICO (fidelidade em ESPÍRITO ao original em index.js):
 * - MINI-MUNDO: o original tem um mapa 28×28. Aqui o mundo é 720×540 (a câmera
 *   segue o herói, cameraFollow), com quatro muros de pedra em volta e alguns
 *   blocos internos — feitos com um GRUPO de retângulos coloridos e colisão
 *   sólida (collideGroup). Nada de tilemap PNG: 100% procedural.
 * - HERÓI (Player top-down): anda nas 4 direções com as setas (topDown), o A/D/W/S
 *   do original. A "mira" (miraX/miraY) guarda a última direção olhada, para o
 *   ataque sair para o lado certo. 6 corações de vida (o original tem 3; damos um
 *   pouco a mais para a criança), com invencibilidade de piscar (hurtByEnemy).
 * - ATAQUE corpo-a-corpo: Espaço cria um golpe (sprite temporário num grupo,
 *   pruneOld 0,25s) na direção olhada — a hitbox direcional do original. O golpe
 *   fere o monstro (overlapGroups: changeHealth -1). Cada monstro tem 3 de vida
 *   (o "3 hits para matar" do original).
 * - MONSTROS que PATRULHAM (createEnemyType "patrulha"): andam e viram na parede.
 *   Encostar tira 1 coração. Derrotar todos VENCE (o "defeat all monsters" do
 *   original). Ficar sem corações PERDE (o game over do original).
 * - Telas de início/vitória/derrota com reinício por Enter. 100% procedural.
 */
export const VILA_NINJA_SOURCE = `
SZGame2D.fitScreen(100);
SZGame2D.defineShape("ninjazinho", function (ctx) {
  SZGame2D.paintRect(ctx, 6, 4, 18, 14, "#2a2a3a");
  SZGame2D.paintRect(ctx, 6, 10, 18, 5, "#e8e0d0");
  SZGame2D.paintCircle(ctx, 12, 12, 1, "#20122f");
  SZGame2D.paintCircle(ctx, 18, 12, 1, "#20122f");
  SZGame2D.paintRect(ctx, 8, 18, 14, 14, "#3a3a55");
  SZGame2D.paintRect(ctx, 4, 20, 5, 9, "#e8b0a0");
  SZGame2D.paintRect(ctx, 21, 20, 5, 9, "#e8b0a0");
});
SZGame2D.defineShape("monstrinho", function (ctx) {
  SZGame2D.paintCircle(ctx, 15, 16, 12, "#8b3a62");
  SZGame2D.paintTriangle(ctx, 8, 6, 4, 0, 12, 6, "#6e2a4c");
  SZGame2D.paintTriangle(ctx, 22, 6, 26, 0, 18, 6, "#6e2a4c");
  SZGame2D.paintCircle(ctx, 10, 14, 3, "#ffe066");
  SZGame2D.paintCircle(ctx, 20, 14, 3, "#ffe066");
  SZGame2D.paintCircle(ctx, 10, 14, 1, "#20122f");
  SZGame2D.paintCircle(ctx, 20, 14, 1, "#20122f");
});
const heroi = SZGame2D.createShapeSprite("ninjazinho", { x: 340, y: 260, w: 30, h: 34 });
SZGame2D.setHitboxScale(heroi, 80);
SZGame2D.setHealth(heroi, 6);
const muros = SZGame2D.createGroup();
SZGame2D.spawn(muros, { x: 0, y: 0, w: 720, h: 30, color: "#4a4038", vx: 0, vy: 0 });
SZGame2D.spawn(muros, { x: 0, y: 510, w: 720, h: 30, color: "#4a4038", vx: 0, vy: 0 });
SZGame2D.spawn(muros, { x: 0, y: 0, w: 30, h: 540, color: "#4a4038", vx: 0, vy: 0 });
SZGame2D.spawn(muros, { x: 690, y: 0, w: 30, h: 540, color: "#4a4038", vx: 0, vy: 0 });
SZGame2D.spawn(muros, { x: 150, y: 150, w: 90, h: 90, color: "#5a4e42", vx: 0, vy: 0 });
SZGame2D.spawn(muros, { x: 480, y: 300, w: 90, h: 90, color: "#5a4e42", vx: 0, vy: 0 });
const coracoes = SZGame2D.createGroup();
SZGame2D.spawn(coracoes, { x: 360, y: 440, w: 20, h: 18, color: "#ff6b81", vx: 0, vy: 0 });
const golpes = SZGame2D.createGroup();
const monstros = SZGame2D.createEnemyType({ behavior: "patrulha", color: "#8b3a62", image: "", shape: "monstrinho", hp: 3, speed: 1, dmg: 1, w: 30, h: 32 });
SZGame2D.spawnEnemy(monstros, 120, 100);
SZGame2D.spawnEnemy(monstros, 600, 130);
SZGame2D.spawnEnemy(monstros, 130, 420);
SZGame2D.spawnEnemy(monstros, 600, 430);
let pontos = 0;
let miraX = 30;
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
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.spawn(golpes, { x: SZGame2D.centerX(heroi) + miraX - 13, y: SZGame2D.centerY(heroi) + miraY - 13, w: 26, h: 26, color: "#c0c8d8", vx: 0, vy: 0 });
    SZGame2D.playFx("whoosh");
  }
});
SZGame2D.onEnemyDefeated(monstros, function (inimigo) {
  pontos = pontos + 5;
  SZGame2D.emitParticles(SZGame2D.centerX(inimigo), SZGame2D.centerY(inimigo), 16, "#f472b6");
  SZGame2D.playFx("explosion");
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Vila Ninja", "Explore a vila com as setas e use espaço para atacar. Derrote os 4 monstros para vencer, mas cuidado com a sua vida!", "Aperte Enter para começar", "#1f2340");
  }
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.cameraFollow(heroi, 720, 540);
    SZGame2D.topDown(heroi, 3);
    if (SZGame2D.keyDown("ArrowRight")) {
      miraX = 30;
      miraY = 0;
      SZGame2D.flipSprite(heroi, "right");
    }
    if (SZGame2D.keyDown("ArrowLeft")) {
      miraX = -30;
      miraY = 0;
      SZGame2D.flipSprite(heroi, "left");
    }
    if (SZGame2D.keyDown("ArrowUp")) {
      miraX = 0;
      miraY = -32;
    }
    if (SZGame2D.keyDown("ArrowDown")) {
      miraX = 0;
      miraY = 32;
    }
    SZGame2D.collideGroup(heroi, muros);
    SZGame2D.updateEnemyType(monstros, ctx, heroi);
    SZGame2D.forEachInGroup(monstros, (inimigo) => {
      SZGame2D.collideGroup(inimigo, muros);
    });
    SZGame2D.overlapGroups(golpes, monstros, (golpe, inimigo) => {
      SZGame2D.changeHealth(inimigo, -1);
      SZGame2D.removeFromGroup(golpes, golpe);
      SZGame2D.playFx("hit");
    });
    SZGame2D.pruneOld(golpes, 0.25);
    if (!SZGame2D.isInvincible(heroi)) {
      SZGame2D.overlapSpriteGroup(() => heroi, monstros, (inimigo) => {
        SZGame2D.hurtByEnemy(heroi, inimigo);
        SZGame2D.shake(ctx, 5);
        SZGame2D.playFx("hurt");
      });
    }
    SZGame2D.overlapSpriteGroup(() => heroi, coracoes, (coracao) => {
      SZGame2D.removeFromGroup(coracoes, coracao);
      SZGame2D.changeHealth(heroi, 1);
      SZGame2D.playFx("heal");
    });
    SZGame2D.drawGroup(ctx, muros);
    SZGame2D.drawGroup(ctx, coracoes);
    SZGame2D.drawGroup(ctx, golpes);
    SZGame2D.drawEnemyType(ctx, monstros);
    SZGame2D.drawSprite(ctx, heroi);
    SZGame2D.drawParticles(ctx);
    SZGame2D.drawSpriteHealth(ctx, heroi, "hearts", 14, 24, 16, "#ff6b81");
    SZGame2D.drawScore(ctx, "Monstros:", SZGame2D.countGroup(monstros), 14, 52, "#f9a8d4", 16);
    SZGame2D.drawScore(ctx, "Pontos:", pontos, 14, 74, "#ffffff", 16);
    if (SZGame2D.countGroup(monstros) == 0) {
      SZGame2D.playFx("win");
      SZGame2D.setScene("vitoria");
    }
    if (SZGame2D.healthDepleted(heroi)) {
      SZGame2D.playFx("gameover");
      SZGame2D.setScene("derrota");
    }
  }
  if (SZGame2D.sceneIs("vitoria")) {
    SZGame2D.showScreen(ctx, "A vila está em paz!", "Você derrotou os 4 monstros e fez " + pontos + " pontos. Um ninja de verdade!", "Aperte Enter para jogar de novo", "#1d4d33");
  }
  if (SZGame2D.sceneIs("derrota")) {
    SZGame2D.showScreen(ctx, "O ninja caiu!", "Os monstros venceram desta vez. Você fez " + pontos + " pontos.", "Aperte Enter para tentar de novo", "#5a2a2a");
  }
});
`.trim()

// Só gera quando RODADO direto (o drift test importa o SOURCE daqui).
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(VILA_NINJA_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
