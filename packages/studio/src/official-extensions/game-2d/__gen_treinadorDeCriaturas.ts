import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Treinador de Criaturas" (recriação BÁSICA e
 * ENXUTA do pokemon-style-game do Chris Courses). Rode com
 * `bun src/official-extensions/game-2d/__gen_treinadorDeCriaturas.ts` e cole a
 * saída em examples/gamesTwoD.ts. O drift test
 * (`treinadorDeCriaturasExample.test.ts`) guarda o resultado.
 *
 * O preparo do palco (setupStage + setStageDescription) NÃO aparece aqui de
 * propósito: quem o injeta é o wrapper `beginnerGameExample`, como em todos os
 * cartões do Jogo 2D.
 *
 * Decisões do degrau BÁSICO (fidelidade em ESPÍRITO ao original em index.js +
 * battleScene.js — RPG top-down + batalha por turnos):
 * - MAPA PEQUENO: o original tem um mapa 70×40 tiles com colisões e zonas de
 *   batalha na grama. Aqui o mundo é o palco 480×270 com muros de pedra em volta
 *   (um GRUPO de retângulos + collideGroup) e UMA zona de batalha (o mato alto).
 *   100% procedural, sem PNG.
 * - HERÓI (o Emby do original): anda nas 4 direções com as setas (topDown), como
 *   o WASD do jogo. Desenhado por código (createShapeSprite), sem os spritesheets.
 * - ZONA DE BATALHA: um sprite de mato; encostar nele (overlapSprites) enquanto
 *   anda no MAPA dispara a batalha (o battleZones + random do original — aqui,
 *   determinístico: encostou, batalhou). A cena troca de "mapa" para "batalha".
 * - BATALHA POR TURNOS (o battleScene.js): o herói e a criatura selvagem (o
 *   Draggle) frente a frente, cada um com barra de vida. O menu é por TECLAS
 *   (1/2/3) escritas na tela — o game-2d não tem menus clicáveis. Golpes:
 *   1 = Brasa (forte), 2 = Rajada (médio), 3 = Foco (recarrega e cura pouco).
 *   As teclas de dígito entram pelo evento GENÉRICO de teclado (o "Quando apertar
 *   a tecla" do g2d só lista setas, espaço e Enter). Depois do golpe do jogador,
 *   uma raiz "A cada 1,2 segundos" devolve o golpe da criatura selvagem e o turno.
 * - Flag `let podeJogar = true` + `if (podeJogar)` controla o turno (padrão que o
 *   parser entende; nada de estruturas que não parseiam).
 * - VENCER a batalha VENCE o jogo (o objetivo claro do básico); ficar sem vida
 *   PERDE. Telas de início/vitória/derrota com Enter para começar e reiniciar.
 */
export const TREINADOR_DE_CRIATURAS_SOURCE = `
SZGame2D.fitScreen(100);
SZGame2D.defineShape("treinador", function (ctx) {
  SZGame2D.paintRect(ctx, 8, 4, 14, 12, "#3a2a1a");
  SZGame2D.paintRect(ctx, 6, 14, 18, 8, "#c0392b");
  SZGame2D.paintCircle(ctx, 12, 10, 1, "#20122f");
  SZGame2D.paintCircle(ctx, 18, 10, 1, "#20122f");
  SZGame2D.paintRect(ctx, 8, 22, 14, 12, "#2c5aa0");
  SZGame2D.paintRect(ctx, 4, 22, 5, 9, "#e8b088");
  SZGame2D.paintRect(ctx, 21, 22, 5, 9, "#e8b088");
});
SZGame2D.defineShape("criatura", function (ctx) {
  SZGame2D.paintCircle(ctx, 16, 18, 13, "#7b4fbf");
  SZGame2D.paintTriangle(ctx, 8, 8, 4, 0, 13, 8, "#5a3a92");
  SZGame2D.paintTriangle(ctx, 24, 8, 28, 0, 19, 8, "#5a3a92");
  SZGame2D.paintCircle(ctx, 11, 16, 3, "#ffe066");
  SZGame2D.paintCircle(ctx, 21, 16, 3, "#ffe066");
  SZGame2D.paintCircle(ctx, 11, 16, 1, "#20122f");
  SZGame2D.paintCircle(ctx, 21, 16, 1, "#20122f");
});
const heroi = SZGame2D.createShapeSprite("treinador", { x: 90, y: 210, w: 30, h: 34 });
SZGame2D.setHitboxScale(heroi, 80);
const rival = SZGame2D.createShapeSprite("criatura", { x: 320, y: 60, w: 96, h: 96 });
SZGame2D.setHealth(heroi, 24);
SZGame2D.setHealth(rival, 24);
const muros = SZGame2D.createGroup();
SZGame2D.spawn(muros, { x: 0, y: 0, w: 480, h: 20, color: "#4a4038", vx: 0, vy: 0 });
SZGame2D.spawn(muros, { x: 0, y: 250, w: 480, h: 20, color: "#4a4038", vx: 0, vy: 0 });
SZGame2D.spawn(muros, { x: 0, y: 0, w: 20, h: 270, color: "#4a4038", vx: 0, vy: 0 });
SZGame2D.spawn(muros, { x: 460, y: 0, w: 20, h: 270, color: "#4a4038", vx: 0, vy: 0 });
SZGame2D.spawn(muros, { x: 150, y: 120, w: 60, h: 60, color: "#5a4e42", vx: 0, vy: 0 });
const mato = SZGame2D.createSprite({ x: 320, y: 170, w: 90, h: 70, color: "#2e7d4f" });
let turno = "espera";
let dano = 0;
let mensagem = "Ache o mato alto para achar uma criatura!";
SZGame2D.setScene("inicio");
SZGame2D.onKey("Enter", function () {
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("mapa");
  }
  if (SZGame2D.sceneIs("vitoria")) {
    SZGame2D.restart();
  }
  if (SZGame2D.sceneIs("derrota")) {
    SZGame2D.restart();
  }
});
document.addEventListener("keydown", (event) => {
  if (SZGame2D.sceneIs("batalha")) {
    if (turno == "jogador") {
      if (event.key == "1") {
        dano = 8;
        SZGame2D.changeHealth(rival, 0 - dano);
        SZGame2D.blink(rival, 24);
        SZGame2D.shake(ctx, 6);
        SZGame2D.playFx("explosion");
        mensagem = "Brasa! A criatura perdeu " + dano + " de vida";
        turno = "criatura";
      }
      if (event.key == "2") {
        dano = 5;
        SZGame2D.changeHealth(rival, 0 - dano);
        SZGame2D.blink(rival, 24);
        SZGame2D.playFx("hit");
        mensagem = "Rajada! A criatura perdeu " + dano + " de vida";
        turno = "criatura";
      }
      if (event.key == "3") {
        SZGame2D.changeHealth(heroi, 3);
        SZGame2D.playFx("heal");
        mensagem = "Foco! Você recuperou um pouco de vida";
        turno = "criatura";
      }
    }
  }
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Treinador de Criaturas", "Ande com as setas e entre no mato alto para encontrar uma criatura selvagem. Vença a batalha por turnos!", "Aperte Enter para começar", "#1f2a44");
  }
  if (SZGame2D.sceneIs("mapa")) {
    SZGame2D.topDown(heroi, 3);
    SZGame2D.collideGroup(heroi, muros);
    SZGame2D.drawSprite(ctx, mato);
    SZGame2D.drawGroup(ctx, muros);
    SZGame2D.drawSprite(ctx, heroi);
    SZGame2D.drawScore(ctx, ">", mensagem, 26, 40, "#f3f6ff", 14);
    if (SZGame2D.touches(heroi, mato)) {
      turno = "jogador";
      mensagem = "Uma criatura selvagem apareceu!";
      SZGame2D.playFx("start");
      SZGame2D.setScene("batalha");
    }
  }
  if (SZGame2D.sceneIs("batalha")) {
    SZGame2D.drawSprite(ctx, heroi);
    SZGame2D.drawSprite(ctx, rival);
    SZGame2D.drawLabel(ctx, "Você", 26, 208, "#a8d8ff", 14, "left");
    SZGame2D.drawBar(ctx, SZGame2D.getHealth(heroi), SZGame2D.getMaxHealth(heroi), 26, 216, 150, 12, "#3fbf6f");
    SZGame2D.drawLabel(ctx, "Criatura selvagem", 300, 36, "#d8b4ff", 14, "left");
    SZGame2D.drawBar(ctx, SZGame2D.getHealth(rival), SZGame2D.getMaxHealth(rival), 300, 44, 150, 12, "#3fbf6f");
    if (turno == "jogador") {
      SZGame2D.drawLabel(ctx, "Sua vez! Escolha o golpe com as teclas:", 26, 234, "#ffe9a8", 13, "left");
    }
    if (turno == "criatura") {
      SZGame2D.drawLabel(ctx, "A criatura prepara o golpe dela...", 26, 234, "#ffb4a8", 13, "left");
    }
    SZGame2D.drawScore(ctx, ">", mensagem, 26, 252, "#f3f6ff", 13);
    SZGame2D.drawLabel(ctx, "1 Brasa (forte)   2 Rajada (média)   3 Foco (cura)", 26, 270, "#c7d2fe", 13, "left");
    if (SZGame2D.healthDepleted(rival)) {
      SZGame2D.playFx("win");
      SZGame2D.setScene("vitoria");
    }
    if (SZGame2D.healthDepleted(heroi)) {
      SZGame2D.playFx("gameover");
      SZGame2D.setScene("derrota");
    }
  }
  if (SZGame2D.sceneIs("vitoria")) {
    SZGame2D.showScreen(ctx, "Você venceu a batalha!", "A criatura selvagem desmaiou. Você é um treinador de verdade!", "Aperte Enter para jogar de novo", "#1d4d33");
  }
  if (SZGame2D.sceneIs("derrota")) {
    SZGame2D.showScreen(ctx, "Você perdeu!", "Sua vida acabou nesta batalha. Escolha melhor os golpes e tente de novo!", "Aperte Enter para tentar de novo", "#5a2a2a");
  }
});
if (SZGame2D.everySeconds("vez-da-criatura", 1.2)) {
  if (SZGame2D.sceneIs("batalha")) {
    if (turno == "criatura") {
      if (SZGame2D.randomChance(50)) {
        dano = 4;
        mensagem = "A criatura mordeu! Você perdeu 4 de vida";
      } else {
        dano = 6;
        mensagem = "A criatura deu uma patada! Você perdeu 6 de vida";
      }
      SZGame2D.changeHealth(heroi, 0 - dano);
      SZGame2D.blink(heroi, 24);
      SZGame2D.shake(ctx, 5);
      SZGame2D.playFx("hurt");
      turno = "jogador";
    }
  }
}
`.trim()

// Só gera quando RODADO direto (o drift test importa o SOURCE daqui).
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(TREINADOR_DE_CRIATURAS_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
