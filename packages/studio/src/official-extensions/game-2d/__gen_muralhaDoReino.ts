import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Muralha do Reino" (recriação BÁSICA do
 * tower-defense do Chris Courses). Rode com
 * `bun src/official-extensions/game-2d/__gen_muralhaDoReino.ts` e cole a saída em
 * examples/gamesTwoD.ts. O drift test (`muralhaDoReinoExample.test.ts`) guarda o
 * resultado.
 *
 * O preparo do palco (setupStage + setStageDescription) NÃO aparece aqui de
 * propósito: quem o injeta é o wrapper `beginnerGameExample`, como em todos os
 * cartões do Jogo 2D.
 *
 * Decisões do degrau BÁSICO (fidelidade em ESPÍRITO ao original em index.js):
 * - O CAMINHO em ziguezague por waypoints (waypoints.js + Enemy.waypointIndex) é
 *   grande demais para o básico. SIMPLIFICO para uma FILA reta: os inimigos nascem
 *   na borda esquerda e marcham para a direita (vx positivo, updateGroup) rumo ao
 *   castelo. É o mesmo conceito que a criança entende: "os invasores vêm em direção
 *   à muralha". 100% procedural (quadrados coloridos, SEM os PNGs de orc/torre).
 * - COMPRAR torre clicando: o canvas.addEventListener('click') do original vira
 *   onPointer((px, py) => {...}). Clicou na FAIXA de construção e tem moedas? Gasta
 *   50 e cria uma torre (spawn no grupo torres) na coluna do clique. O "activeTile
 *   ocupado" e o grid de placementTiles viram uma regra simples de posição/custo.
 * - Torres ATIRAM sozinhas: no original a torre mira o inimigo mais próximo e o
 *   Projectile persegue. Aqui, a cada 0,5 s, cada torre (forEachInGroup) solta um
 *   tiro que voa para a ESQUERDA (spawn com vx negativo), na direção de quem vem.
 *   O culling ±? do original vira pruneOffscreen nos dois grupos.
 * - tiro x inimigo = explosão + som + remover os dois + moedas (o coins += 25 do
 *   original), via overlapGroups.
 * - inimigo x castelo = tira 1 coração e some (o hearts -= 1 quando enemy passa da
 *   borda), via overlapSpriteGroup. Coração 0 → cena "perdeu" (o gameOver original).
 * - Ondas que crescem (o enemyCount += 2 quando enemies.length === 0): uma raiz
 *   "A cada 8 segundos" sobe a onda e um teto de moedas por onda; vencer = chegar
 *   à onda 6 (o original é infinito; damos um fim comemorável).
 */
export const MURALHA_DO_REINO_SOURCE = `
SZGame2D.fitScreen(100);
SZGame2D.defineShape("torreDoReino", function (ctx) {
  SZGame2D.paintRect(ctx, 6, 20, 24, 24, "#8a8f99");
  SZGame2D.paintRect(ctx, 10, 4, 16, 18, "#6f7681");
  SZGame2D.paintRect(ctx, 14, 8, 8, 8, "#2f3540");
  SZGame2D.paintCircle(ctx, 18, 12, 3, "#ffd166");
});
SZGame2D.defineShape("casteloDoReino", function (ctx) {
  SZGame2D.paintRect(ctx, 6, 20, 44, 60, "#b0785a");
  SZGame2D.paintRect(ctx, 0, 8, 14, 72, "#8a5c42");
  SZGame2D.paintRect(ctx, 42, 8, 14, 72, "#8a5c42");
  SZGame2D.paintTriangle(ctx, 7, 8, 0, 0, 14, 0, "#d64550");
  SZGame2D.paintTriangle(ctx, 49, 8, 42, 0, 56, 0, "#d64550");
  SZGame2D.paintRect(ctx, 22, 46, 12, 34, "#4a2f22");
});
const castelo = SZGame2D.createShapeSprite("casteloDoReino", { x: 408, y: 150, w: 56, h: 80 });
const inimigos = SZGame2D.createGroup();
const torres = SZGame2D.createGroup();
const tiros = SZGame2D.createGroup();
let moedas = 100;
let vidas = 10;
let onda = 1;
let porOnda = 3;
SZGame2D.playMusic("tense");
SZGame2D.setScene("inicio");
SZGame2D.onKey("Enter", function () {
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("jogando");
  }
  if (SZGame2D.sceneIs("perdeu")) {
    SZGame2D.restart();
  }
  if (SZGame2D.sceneIs("venceu")) {
    SZGame2D.restart();
  }
});
SZGame2D.onPointer(function (px, py) {
  if (SZGame2D.sceneIs("jogando")) {
    if (px < 380) {
      if (moedas >= 50) {
        moedas = moedas - 50;
        SZGame2D.spawn(torres, { x: px - 18, y: 196, w: 36, h: 44, color: "#8a8f99", vx: 0, vy: 0 });
        SZGame2D.playFx("confirm");
      }
    }
  }
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Muralha do Reino", "Clique embaixo para comprar torres (50 moedas). Elas atiram sozinhas nos invasores. Não deixe eles chegarem no castelo!", "Aperte Enter para começar", "#1d2440");
  }
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.drawLabel(ctx, "Faixa de construção: clique aqui para pôr uma torre", 12, 214, "#7f8aa8", 12, "left");
    SZGame2D.updateGroup(inimigos);
    SZGame2D.updateGroup(tiros);
    SZGame2D.drawSprite(ctx, castelo);
    SZGame2D.drawGroup(ctx, torres);
    SZGame2D.drawGroup(ctx, inimigos);
    SZGame2D.drawGroup(ctx, tiros);
    SZGame2D.overlapGroups(tiros, inimigos, (tiro, invasor) => {
      SZGame2D.explodeSprite(invasor, "#ffb347");
      SZGame2D.playExplosion();
      SZGame2D.removeFromGroup(tiros, tiro);
      SZGame2D.removeFromGroup(inimigos, invasor);
      moedas = moedas + 25;
    });
    SZGame2D.overlapSpriteGroup(() => castelo, inimigos, (invasor) => {
      SZGame2D.explodeSprite(invasor, "#ff5d3d");
      SZGame2D.shake(ctx, 6);
      SZGame2D.playFx("hurt");
      SZGame2D.removeFromGroup(inimigos, invasor);
      vidas = vidas - 1;
    });
    SZGame2D.pruneOffscreen(ctx, tiros, 40, (tiro) => {});
    SZGame2D.drawScore(ctx, "Moedas:", moedas, 12, 28, "#ffd166", 18);
    SZGame2D.drawScore(ctx, "Vidas:", vidas, 200, 28, "#ff8a8a", 18);
    SZGame2D.drawScore(ctx, "Onda:", onda, 340, 28, "#a7e3ff", 18);
    if (vidas <= 0) {
      SZGame2D.playFx("gameover");
      SZGame2D.setScene("perdeu");
    }
    if (onda > 6) {
      SZGame2D.playFx("win");
      SZGame2D.setScene("venceu");
    }
  }
  if (SZGame2D.sceneIs("perdeu")) {
    SZGame2D.showScreen(ctx, "O castelo caiu!", "Os invasores passaram pela muralha. Você segurou até a onda " + onda + ".", "Aperte Enter para defender de novo", "#5a2a2a");
  }
  if (SZGame2D.sceneIs("venceu")) {
    SZGame2D.showScreen(ctx, "O reino está a salvo!", "Você segurou todas as 6 ondas de invasores. Muralha firme!", "Aperte Enter para jogar de novo", "#1d4d33");
  }
});
if (SZGame2D.everySeconds("nasce-invasor", 1.2)) {
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.spawn(inimigos, { x: -40, y: 168, w: 30, h: 30, color: "#c0504d", vx: onda + 1, vy: 0 });
  }
}
if (SZGame2D.everySeconds("torres-atiram", 0.5)) {
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.forEachInGroup(torres, (torre) => {
      SZGame2D.spawnBullet(tiros, { x: SZGame2D.centerX(torre), y: 182, radius: 5, color: "#9cff57", vx: -6, vy: 0 });
    });
  }
}
if (SZGame2D.everySeconds("proxima-onda", 8)) {
  if (SZGame2D.sceneIs("jogando")) {
    onda = onda + 1;
    porOnda = porOnda + 2;
  }
}
`.trim()

// Só gera quando RODADO direto (o drift test importa o SOURCE daqui).
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(MURALHA_DO_REINO_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
