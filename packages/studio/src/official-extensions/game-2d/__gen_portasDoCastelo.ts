import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Portas do Castelo" (recriação BÁSICA do
 * plataforma por fases do kings-and-pigs do Chris Courses). Rode com
 * `bun src/official-extensions/game-2d/__gen_portasDoCastelo.ts` e cole a saída
 * em examples/gamesTwoD/portasDoCastelo.ts. O drift test (`portasDoCasteloExample.test.ts`)
 * guarda o resultado.
 *
 * O preparo do palco (setupStage + setStageDescription) NÃO aparece aqui de
 * propósito: quem o injeta é o wrapper `beginnerGameExample`, como em todos os
 * cartões do Jogo 2D.
 *
 * Decisões do degrau BÁSICO (fidelidade em ESPÍRITO ao original em index.js):
 * - O REI (Player que estende Sprite) vira um sprite comum desenhado por código
 *   (createShapeSprite, sem os PNGs de king/idle/run). Ele anda com as setas e
 *   pula com a seta pra cima, o mesmo handleInput do original (a/d + pulo).
 * - Os blocos de colisão (collisionsLevelN.parse2D → CollisionBlock) viram um
 *   GRUPO de retângulos coloridos, e a colisão sólida (checkForVertical/
 *   HorizontalCollisions) vira collideGroup(rei, blocos): o rei pousa em cima e
 *   bate nas paredes. Gravidade + pulo montados na mão como na Escalada.
 * - A PORTA (o Sprite doorOpen do original) é um sprite; quando o rei encosta
 *   nela (touches), dispara a TRANSIÇÃO: um clarão preto (flash) que escurece a
 *   tela por alguns quadros — o gsap.to(overlay, {opacity}) do original — e no
 *   fim troca de FASE (o level++ com volta ao 1 depois da última), remontando os
 *   blocos e reposicionando o rei, exatamente como o levels[level].init().
 * - São 3 fases com layouts diferentes de plataforma. Passar pela porta da 3ª
 *   fase vence o jogo (o original volta pro começo; damos uma vitória
 *   comemorável). 100% procedural (formas e cores, sem tilemap nem PNGs).
 * - Telas de início e vitória com reinício por Enter.
 */
export const PORTAS_DO_CASTELO_SOURCE = `
SZGame2D.fitScreen(100);
SZGame2D.setGravity(0.6);
SZGame2D.defineShape("reizinho", function (ctx) {
  SZGame2D.paintRect(ctx, 6, 2, 16, 6, "#f4d35e");
  SZGame2D.paintRect(ctx, 9, 8, 12, 8, "#f7c8a2");
  SZGame2D.paintRect(ctx, 5, 16, 20, 18, "#6a8cd6");
  SZGame2D.paintRect(ctx, 5, 34, 8, 8, "#33407a");
  SZGame2D.paintRect(ctx, 17, 34, 8, 8, "#33407a");
});
const rei = SZGame2D.createShapeSprite("reizinho", { x: 60, y: 200, w: 30, h: 42 });
SZGame2D.setHitboxScale(rei, 85);
const blocos = SZGame2D.createGroup();
const porta = SZGame2D.createSprite({ x: 420, y: 216, w: 34, h: 52, color: "#4a2f22" });
let fase = 1;
let vitoria = false;
let escurecendo = 0;
SZGame2D.playMusic("adventure");
SZGame2D.spawn(blocos, { x: 0, y: 268, w: 480, h: 32, color: "#5a4632", vx: 0, vy: 0 });
SZGame2D.spawn(blocos, { x: 150, y: 210, w: 90, h: 18, color: "#6f5640", vx: 0, vy: 0 });
SZGame2D.spawn(blocos, { x: 300, y: 160, w: 90, h: 18, color: "#6f5640", vx: 0, vy: 0 });
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
    if (escurecendo == 0) {
      if (SZGame2D.spriteVy(rei) == 0) {
        rei.vy = -12;
        SZGame2D.playFx("jump");
      }
    }
  }
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Portas do Castelo", "Use as setas para andar e a seta pra cima para pular. Chegue na porta de cada fase para atravessar o castelo!", "Aperte Enter para entrar no castelo", "#1b2440");
  }
  if (SZGame2D.sceneIs("jogando")) {
    if (escurecendo == 0) {
      SZGame2D.arrowsX(rei, 3);
    }
    SZGame2D.applyGravity(rei);
    SZGame2D.applyVelocity(rei);
    SZGame2D.collideGroup(rei, blocos);
    SZGame2D.clampToScreen(rei, ctx);
    SZGame2D.drawGroup(ctx, blocos);
    SZGame2D.drawSprite(ctx, porta);
    SZGame2D.drawSprite(ctx, rei);
    if (escurecendo == 0) {
      if (SZGame2D.touches(rei, porta)) {
        escurecendo = 40;
        SZGame2D.playFx("select");
      }
    }
    if (escurecendo > 0) {
      SZGame2D.flash(ctx, "#050510");
      escurecendo = escurecendo - 1;
      if (escurecendo == 20) {
        if (fase == 3) {
          vitoria = true;
        }
        fase = fase + 1;
        SZGame2D.clearGroup(blocos);
        SZGame2D.spawn(blocos, { x: 0, y: 268, w: 480, h: 32, color: "#5a4632", vx: 0, vy: 0 });
        rei.x = 60;
        rei.y = 200;
        rei.vx = 0;
        rei.vy = 0;
        if (fase == 2) {
          SZGame2D.spawn(blocos, { x: 90, y: 200, w: 80, h: 18, color: "#6f5640", vx: 0, vy: 0 });
          SZGame2D.spawn(blocos, { x: 250, y: 150, w: 80, h: 18, color: "#6f5640", vx: 0, vy: 0 });
          porta.x = 410;
          porta.y = 216;
        }
        if (fase == 3) {
          SZGame2D.spawn(blocos, { x: 120, y: 170, w: 70, h: 18, color: "#6f5640", vx: 0, vy: 0 });
          SZGame2D.spawn(blocos, { x: 240, y: 220, w: 70, h: 18, color: "#6f5640", vx: 0, vy: 0 });
          SZGame2D.spawn(blocos, { x: 340, y: 150, w: 70, h: 18, color: "#6f5640", vx: 0, vy: 0 });
          porta.x = 360;
          porta.y = 98;
        }
      }
      if (escurecendo == 0) {
        if (vitoria) {
          SZGame2D.playFx("win");
          SZGame2D.setScene("venceu");
        }
      }
    }
    SZGame2D.drawScore(ctx, "Fase:", fase, 12, 28, "#ffd166", 20);
    SZGame2D.drawLabel(ctx, "Ache a porta para a próxima fase", 12, 292, "#c7d2fe", 12, "left");
  }
  if (SZGame2D.sceneIs("venceu")) {
    SZGame2D.showScreen(ctx, "Você cruzou o castelo!", "O rei atravessou as três portas e chegou ao salão do trono. Que jornada!", "Aperte Enter para explorar de novo", "#1d4d33");
  }
});
`.trim()

// Só gera quando RODADO direto (o drift test importa o SOURCE daqui).
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(PORTAS_DO_CASTELO_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
