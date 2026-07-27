import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Vale Ensolarado" (recriação BÁSICA do
 * sunnyland-platformer do Chris Courses). Rode com
 * `bun src/official-extensions/game-2d/__gen_valeEnsolarado.ts` e cole a saída em
 * examples/gamesTwoD.ts. O drift test (`valeEnsolaradoExample.test.ts`) guarda o
 * resultado.
 *
 * O preparo do palco (setupStage + setStageDescription) NÃO aparece aqui de
 * propósito: quem o injeta é o wrapper `beginnerGameExample`, como em todos os
 * cartões do Jogo 2D.
 *
 * Decisões do degrau BÁSICO (fidelidade em ESPÍRITO ao original em index.js):
 * - O HERÓI (Player que estende Sprite) vira um sprite comum desenhado por
 *   código (createShapeSprite, sem os PNGs). Anda com as setas e pula com a seta
 *   pra cima (o A/D + pulo do original), com gravidade e colisão sólida
 *   (platformer + collideGroup contra o grupo de plataformas). As "collisions"
 *   do original (CollisionBlock a partir da grade) viram retângulos coloridos.
 * - MUNDO MAIOR que a tela: o palco 480×270 mostra parte de um vale 960×270,
 *   e a câmera acompanha (cameraFollow), como o scroll do original.
 * - GEMAS: o coletável do original (símbolo 18 no l_Gems). Junte as 6 gemas para
 *   VENCER (o "colete todas as gemas" do original). overlapSpriteGroup remove a
 *   gema, dá 10 pontos e som.
 * - CORAÇÃO: no original o coração era só HUD; aqui vira um item de vida no mundo
 *   que cura 1 (mais gentil para a criança). overlapSpriteGroup.
 * - GAMBÁ (Oposum): inimigo que PATRULHA no chão (createEnemyType behavior
 *   "patrulha", com gravidade do mundo). ÁGUIA (Eagle): inimigo VOADOR na
 *   horizontal (behavior "voador", sem gravidade). Encostar em qualquer um tira
 *   1 coração com invencibilidade de piscar (hurtByEnemy) — a versão gentil do
 *   dano do original.
 * - PERDER: ficar sem corações (as 3 vidas do original). VENCER: juntar as 6
 *   gemas. Telas de início/vitória/derrota com reinício por Enter.
 * - 100% procedural (formas e cores, sem tilemap nem PNGs).
 */
export const VALE_ENSOLARADO_SOURCE = `
SZGame2D.fitScreen(100);
SZGame2D.setGravity(0.6);
SZGame2D.defineShape("raposinha", function (ctx) {
  SZGame2D.paintCircle(ctx, 14, 9, 8, "#e8813a");
  SZGame2D.paintRect(ctx, 6, 15, 16, 15, "#f0a05a");
  SZGame2D.paintTriangle(ctx, 8, 5, 4, 0, 12, 3, "#e8813a");
  SZGame2D.paintTriangle(ctx, 20, 5, 24, 0, 16, 3, "#e8813a");
  SZGame2D.paintCircle(ctx, 11, 9, 2, "#20122f");
  SZGame2D.paintCircle(ctx, 17, 9, 2, "#20122f");
  SZGame2D.paintRect(ctx, 8, 30, 5, 8, "#7a4a21");
  SZGame2D.paintRect(ctx, 15, 30, 5, 8, "#7a4a21");
});
SZGame2D.defineShape("gambazinho", function (ctx) {
  SZGame2D.paintCircle(ctx, 15, 15, 12, "#7a5a3a");
  SZGame2D.paintCircle(ctx, 10, 12, 3, "#f6f2ff");
  SZGame2D.paintCircle(ctx, 20, 12, 3, "#f6f2ff");
  SZGame2D.paintCircle(ctx, 10, 12, 1, "#20122f");
  SZGame2D.paintCircle(ctx, 20, 12, 1, "#20122f");
  SZGame2D.paintRect(ctx, 6, 8, 5, 5, "#5a3f28");
  SZGame2D.paintRect(ctx, 19, 8, 5, 5, "#5a3f28");
});
SZGame2D.defineShape("aguiazinha", function (ctx) {
  SZGame2D.paintCircle(ctx, 15, 12, 9, "#a8763a");
  SZGame2D.paintTriangle(ctx, 3, 12, 15, 6, 15, 18, "#c69150");
  SZGame2D.paintTriangle(ctx, 27, 12, 15, 6, 15, 18, "#c69150");
  SZGame2D.paintTriangle(ctx, 15, 12, 22, 10, 22, 14, "#ffd166");
  SZGame2D.paintCircle(ctx, 15, 10, 2, "#20122f");
});
const heroi = SZGame2D.createShapeSprite("raposinha", { x: 60, y: 150, w: 28, h: 38 });
SZGame2D.setHitboxScale(heroi, 80);
SZGame2D.setHealth(heroi, 3);
const chao = SZGame2D.createGroup();
SZGame2D.spawn(chao, { x: 0, y: 236, w: 340, h: 34, color: "#5a8f3a", vx: 0, vy: 0 });
SZGame2D.spawn(chao, { x: 400, y: 236, w: 560, h: 34, color: "#5a8f3a", vx: 0, vy: 0 });
SZGame2D.spawn(chao, { x: 150, y: 186, w: 90, h: 18, color: "#7a5a3a", vx: 0, vy: 0 });
SZGame2D.spawn(chao, { x: 330, y: 150, w: 90, h: 18, color: "#7a5a3a", vx: 0, vy: 0 });
SZGame2D.spawn(chao, { x: 520, y: 176, w: 90, h: 18, color: "#7a5a3a", vx: 0, vy: 0 });
SZGame2D.spawn(chao, { x: 700, y: 140, w: 90, h: 18, color: "#7a5a3a", vx: 0, vy: 0 });
const gemas = SZGame2D.createGroup();
SZGame2D.spawn(gemas, { x: 190, y: 156, w: 18, h: 18, color: "#38bdf8", vx: 0, vy: 0 });
SZGame2D.spawn(gemas, { x: 366, y: 120, w: 18, h: 18, color: "#38bdf8", vx: 0, vy: 0 });
SZGame2D.spawn(gemas, { x: 470, y: 206, w: 18, h: 18, color: "#38bdf8", vx: 0, vy: 0 });
SZGame2D.spawn(gemas, { x: 556, y: 146, w: 18, h: 18, color: "#38bdf8", vx: 0, vy: 0 });
SZGame2D.spawn(gemas, { x: 736, y: 110, w: 18, h: 18, color: "#38bdf8", vx: 0, vy: 0 });
SZGame2D.spawn(gemas, { x: 890, y: 206, w: 18, h: 18, color: "#38bdf8", vx: 0, vy: 0 });
const coracoes = SZGame2D.createGroup();
SZGame2D.spawn(coracoes, { x: 420, y: 204, w: 18, h: 16, color: "#ff6b81", vx: 0, vy: 0 });
const gambas = SZGame2D.createEnemyType({ behavior: "patrulha", color: "#7a5a3a", image: "", shape: "gambazinho", hp: 1, speed: 0.8, dmg: 1, w: 30, h: 30 });
SZGame2D.spawnEnemy(gambas, 260, 206);
SZGame2D.spawnEnemy(gambas, 620, 206);
const aguias = SZGame2D.createEnemyType({ behavior: "voador", color: "#a8763a", image: "", shape: "aguiazinha", hp: 1, speed: 1, dmg: 1, w: 30, h: 24 });
SZGame2D.spawnEnemy(aguias, 480, 90);
SZGame2D.spawnEnemy(aguias, 760, 70);
let pontos = 0;
let gemasVale = 6;
SZGame2D.playMusic("happy");
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
    SZGame2D.showScreen(ctx, "Vale Ensolarado", "Ande e pule pelo vale para juntar as 6 gemas azuis. Desvie do gambá e da águia. Use as setas e a seta pra cima para pular!", "Aperte Enter para começar", "#1d5a78");
  }
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.cameraFollow(heroi, 960, 270);
    SZGame2D.arrowsX(heroi, 3);
    SZGame2D.applyVelocity(heroi);
    SZGame2D.collideGroup(heroi, chao);
    SZGame2D.updateEnemyType(gambas, ctx, heroi);
    SZGame2D.forEachInGroup(gambas, (gamba) => {
      SZGame2D.collideGroup(gamba, chao);
    });
    SZGame2D.updateEnemyType(aguias, ctx, heroi);
    SZGame2D.drawGroup(ctx, chao);
    SZGame2D.drawGroup(ctx, gemas);
    SZGame2D.drawGroup(ctx, coracoes);
    SZGame2D.drawEnemyType(ctx, gambas);
    SZGame2D.drawEnemyType(ctx, aguias);
    SZGame2D.drawSprite(ctx, heroi);
    SZGame2D.overlapSpriteGroup(() => heroi, gemas, (gema) => {
      SZGame2D.removeFromGroup(gemas, gema);
      pontos = pontos + 10;
      gemasVale = gemasVale - 1;
      SZGame2D.emitParticles(SZGame2D.centerX(gema), SZGame2D.centerY(gema), 12, "#7dd3fc");
      SZGame2D.playFx("gem");
    });
    SZGame2D.overlapSpriteGroup(() => heroi, coracoes, (coracao) => {
      SZGame2D.removeFromGroup(coracoes, coracao);
      SZGame2D.changeHealth(heroi, 1);
      SZGame2D.playFx("heal");
    });
    if (!SZGame2D.isInvincible(heroi)) {
      SZGame2D.overlapSpriteGroup(() => heroi, gambas, (gamba) => {
        SZGame2D.hurtByEnemy(heroi, gamba);
        SZGame2D.shake(ctx, 5);
        SZGame2D.playFx("hurt");
      });
      SZGame2D.overlapSpriteGroup(() => heroi, aguias, (aguia) => {
        SZGame2D.hurtByEnemy(heroi, aguia);
        SZGame2D.shake(ctx, 5);
        SZGame2D.playFx("hurt");
      });
    }
    SZGame2D.drawParticles(ctx);
    SZGame2D.drawSpriteHealth(ctx, heroi, "hearts", 14, 24, 16, "#ff6b81");
    SZGame2D.drawScore(ctx, "Gemas:", gemasVale, 14, 52, "#7dd3fc", 16);
    SZGame2D.drawScore(ctx, "Pontos:", pontos, 14, 74, "#ffffff", 16);
    if (gemasVale <= 0) {
      SZGame2D.playFx("win");
      SZGame2D.setScene("vitoria");
    }
    if (SZGame2D.healthDepleted(heroi)) {
      SZGame2D.playFx("gameover");
      SZGame2D.setScene("derrota");
    }
  }
  if (SZGame2D.sceneIs("vitoria")) {
    SZGame2D.showScreen(ctx, "Você juntou as gemas!", "Todas as 6 gemas brilham no seu bolso e você fez " + pontos + " pontos. Que aventura no vale!", "Aperte Enter para jogar de novo", "#1d4d33");
  }
  if (SZGame2D.sceneIs("derrota")) {
    SZGame2D.showScreen(ctx, "O herói cansou!", "Os bichos do vale venceram desta vez. Você juntou " + (6 - gemasVale) + " gemas.", "Aperte Enter para tentar de novo", "#5a2a2a");
  }
});
`.trim()

// Só gera quando RODADO direto (o drift test importa o SOURCE daqui).
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(VALE_ENSOLARADO_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
