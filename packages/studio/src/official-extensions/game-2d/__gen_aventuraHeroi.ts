import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Aventura do Herói" (o degrau BÁSICO da
 * família Zelda-style Adventure do Clear Code). Rode com
 * `bun src/official-extensions/game-2d/__gen_aventuraHeroi.ts` e cole a saída
 * em examples/clearcode/aventuraHeroi.ts. O drift test (`aventuraHeroiExample.test.ts`)
 * guarda o resultado.
 *
 * Decisões do degrau básico:
 * - Mundo MAIOR que a tela: tilemap 40×30 com tiles de 40px na tela
 *   (mundo 1600×1200) com câmera. O mapa pertence ao mundo e é desenhado na
 *   canvas, então o deslocamento (560, 420) devolve o canto do mapa para
 *   (0, 0) do mundo — os mesmos [0..1600]×[0..1200] que a câmera prende.
 * - MATO DESTRUTÍVEL: peça 2 do tileset é sólida; o golpe da espada em cima
 *   dela quebra o tile (breakTileAtSprite) + partículas + ponto. A sala do
 *   tesouro tem uma PORTA de mato: só entra quem corta.
 * - ESPADA = sprite temporário num grupo com pruneOld (0,3s). A direção
 *   olhada mora nas variáveis miraX/miraY, alimentadas pelas setas (keyDown).
 * - ⭐ drawGroupByY: o HERÓI entra no MESMO grupo do cenário (o grupo é só um
 *   objeto com a lista `items`; a lista recebe o herói com o bloco genérico
 *   de "adicionar à lista") e as árvores são sprites do grupo — quem está
 *   mais para baixo desenha na frente, então o herói passa ATRÁS da árvore.
 * - ⭐ setHitboxScale(80) no herói: colisão de dano perdoadora.
 * - Inimigos do kit (perseguidor) + hurtByEnemy com i-frames; a espada fere
 *   via overlapGroups(golpes, guarda).
 */

/**
 * O mapa da vila, uma linha por STRING COMPACTA (1 char = 1 célula):
 * '.' = grama (vazio), '0' = terra batida, '1' = pedra (sólida),
 * '2' = mato (sólido e CORTÁVEL). A sala de cima é decorativa (porta de mato
 * a leste); a sala de baixo prende um guardião (porta de mato a oeste).
 */
const MAPA_LINHAS = [
  '1111111111111111111111111111111111111111',
  '1......................................1',
  '1..22..................................1',
  '1..2...........111111111...............1',
  '1..............100000001...............1',
  '1..............100000002...............1',
  '1..............100000001...............1',
  '1..............111111111...............1',
  '1......................................1',
  '1......................................1',
  '1.............................222......1',
  '1.............................222......1',
  '1......................................1',
  '1......................................1',
  '1......................................1',
  '1......................................1',
  '1......................................1',
  '1.......2222...........................1',
  '1.......2222...........................1',
  '1..........................111111111...1',
  '1..........................100000001...1',
  '1..........................200000001...1',
  '1..........................100000001...1',
  '1..........................111111111...1',
  '1......................................1',
  '1......................................1',
  '1..............2222222222..............1',
  '1......................................1',
  '1......................................1',
  '1111111111111111111111111111111111111111',
]

for (const [index, linha] of MAPA_LINHAS.entries()) {
  if (linha.length !== 40) {
    throw new Error(`MAPA_LINHAS[${index}] tem ${linha.length} colunas (esperado 40)`)
  }
}
if (MAPA_LINHAS.length !== 29 + 1) {
  throw new Error(`MAPA_LINHAS tem ${MAPA_LINHAS.length} linhas (esperado 30)`)
}

export const AVENTURA_GRID = MAPA_LINHAS.map((linha) => linha.split('').join(' ')).join(';')

export const AVENTURA_HEROI_SOURCE = `
SZGame2D.fitScreen(100);
SZGame2D.defineShape("heroizinho", function (ctx) {
  SZGame2D.paintCircle(ctx, 17, 9, 8, "#f7c8a2");
  SZGame2D.paintRect(ctx, 8, 16, 18, 14, "#2f8f46");
  SZGame2D.paintRect(ctx, 10, 30, 5, 10, "#7a4a21");
  SZGame2D.paintRect(ctx, 19, 30, 5, 10, "#7a4a21");
});
SZGame2D.defineShape("guardiao", function (ctx) {
  SZGame2D.paintCircle(ctx, 17, 17, 14, "#8d55c9");
  SZGame2D.paintTriangle(ctx, 6, 6, 12, 2, 12, 8, "#5d3591");
  SZGame2D.paintTriangle(ctx, 28, 6, 22, 2, 22, 8, "#5d3591");
  SZGame2D.paintCircle(ctx, 11, 14, 4, "#f6f2ff");
  SZGame2D.paintCircle(ctx, 23, 14, 4, "#f6f2ff");
  SZGame2D.paintCircle(ctx, 11, 14, 2, "#20122f");
  SZGame2D.paintCircle(ctx, 23, 14, 2, "#20122f");
});
const mapa = SZGame2D.createTileMap({ image: "pecas-da-vila", tile: 32, solid: "1 2", grid: ${JSON.stringify(AVENTURA_GRID)} });
const heroi = SZGame2D.createShapeSprite("heroizinho", { x: 773, y: 580, w: 34, h: 40 });
const areaJogo = SZGame2D.createWorldFromTileMap(mapa, 40);
SZGame2D.configureWorldCamera(areaJogo, "free", "free", 0, 0);
SZGame2D.setHitboxScale(heroi, 80);
SZGame2D.setHealth(heroi, 6);
const cenario = SZGame2D.createGroup();
const pecasDoCenario = cenario.items;
pecasDoCenario.push(heroi);
SZGame2D.spawn(cenario, { x: 700, y: 470, w: 54, h: 70, image: "arvore", vx: 0, vy: 0 });
SZGame2D.spawn(cenario, { x: 860, y: 540, w: 54, h: 70, image: "arvore", vx: 0, vy: 0 });
SZGame2D.spawn(cenario, { x: 640, y: 640, w: 54, h: 70, image: "arvore", vx: 0, vy: 0 });
SZGame2D.spawn(cenario, { x: 900, y: 660, w: 54, h: 70, image: "arvore", vx: 0, vy: 0 });
SZGame2D.spawn(cenario, { x: 500, y: 320, w: 54, h: 70, image: "arvore", vx: 0, vy: 0 });
SZGame2D.spawn(cenario, { x: 1060, y: 420, w: 54, h: 70, image: "arvore", vx: 0, vy: 0 });
const golpes = SZGame2D.createGroup();
const guarda = SZGame2D.createEnemyType({ behavior: "perseguidor", color: "#8d55c9", image: "", shape: "guardiao", hp: 3, speed: 1.2, dmg: 1, w: 34, h: 34 });
SZGame2D.spawnEnemy(guarda, 200, 200);
SZGame2D.spawnEnemy(guarda, 1360, 240);
SZGame2D.spawnEnemy(guarda, 240, 960);
SZGame2D.spawnEnemy(guarda, 1320, 880);
let pontos = 0;
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
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.spawn(golpes, { x: SZGame2D.centerX(heroi) + miraX - 13, y: SZGame2D.centerY(heroi) + miraY - 13, w: 26, h: 26, color: "#f7d154", vx: 0, vy: 0 });
    SZGame2D.playFx("whoosh");
  }
});
SZGame2D.onEnemyDefeated(guarda, function (inimigo) {
  pontos = pontos + 5;
  SZGame2D.emitParticles(SZGame2D.centerX(inimigo), SZGame2D.centerY(inimigo), 18, "#c084fc");
  SZGame2D.playFx("explosion");
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Aventura do Herói", "Corte o mato com espaço e derrote os 4 guardiões que rondam a vila!", "Aperte Enter para começar", "#1d4d33");
  }
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.followCameraInWorld(heroi, areaJogo);
    SZGame2D.drawWorld(ctx, areaJogo);
    SZGame2D.topDown(heroi, 3);
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
    SZGame2D.collideTileMap(heroi, mapa);
    SZGame2D.updateEnemyType(guarda, ctx, heroi);
    SZGame2D.forEachInGroup(guarda, (inimigo) => {
      SZGame2D.collideTileMap(inimigo, mapa);
    });
    SZGame2D.overlapGroups(golpes, guarda, (golpe, inimigo) => {
      SZGame2D.changeHealth(inimigo, -1);
      SZGame2D.removeFromGroup(golpes, golpe);
      SZGame2D.playFx("punch");
    });
    SZGame2D.forEachInGroup(golpes, (golpe) => {
      if (SZGame2D.tileAtSprite(mapa, golpe) == 2) {
        SZGame2D.breakTileAtSprite(mapa, golpe);
        pontos = pontos + 1;
        SZGame2D.emitParticles(SZGame2D.centerX(golpe), SZGame2D.centerY(golpe), 12, "#69c25f");
        SZGame2D.playFx("collect");
      }
    });
    SZGame2D.pruneOld(golpes, 0.3);
    if (!SZGame2D.isInvincible(heroi)) {
      SZGame2D.overlapSpriteGroup(() => heroi, guarda, (inimigo) => {
        SZGame2D.hurtByEnemy(heroi, inimigo);
        SZGame2D.shake(ctx, 5);
        SZGame2D.playFx("hurt");
      });
    }
    SZGame2D.drawGroupByY(ctx, cenario);
    SZGame2D.drawGroup(ctx, golpes);
    SZGame2D.drawEnemyType(ctx, guarda);
    SZGame2D.drawParticles(ctx);
    SZGame2D.drawSpriteHealth(ctx, heroi, "hearts", 14, 26, 16, "#ff6b81");
    SZGame2D.drawScore(ctx, "Pontos:", pontos, 14, 56, "#ffffff", 16);
    SZGame2D.drawScore(ctx, "Guardiões:", SZGame2D.countGroup(guarda), 14, 78, "#e8d5ff", 14);
    if (SZGame2D.countGroup(guarda) == 0) {
      SZGame2D.playFx("win");
      SZGame2D.setScene("vitoria");
    }
    if (SZGame2D.healthDepleted(heroi)) {
      SZGame2D.playFx("gameover");
      SZGame2D.setScene("derrota");
    }
  }
  if (SZGame2D.sceneIs("vitoria")) {
    SZGame2D.showScreen(ctx, "A vila está a salvo!", "Você derrotou os 4 guardiões e fez " + pontos + " pontos!", "Aperte Enter para jogar de novo", "#1d4d33");
  }
  if (SZGame2D.sceneIs("derrota")) {
    SZGame2D.showScreen(ctx, "O herói caiu!", "Os guardiões venceram desta vez. Você fez " + pontos + " pontos.", "Aperte Enter para tentar de novo", "#5a2a2a");
  }
});
`.trim()

// Só gera quando RODADO direto (o drift test importa o SOURCE daqui).
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(AVENTURA_HEROI_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
