import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Duelo de Heróis" (recriação BÁSICA da luta
 * 1v1 do fighting-game do Chris Courses). Rode com
 * `bun src/official-extensions/game-2d/__gen_dueloDeHerois.ts` e cole a saída em
 * examples/gamesTwoD.ts. O drift test (`dueloDeHeroisExample.test.ts`) guarda o
 * resultado.
 *
 * O preparo do palco (setupStage + setStageDescription) NÃO aparece aqui de
 * propósito: quem o injeta é o wrapper `beginnerGameExample`, como em todos os
 * cartões do Jogo 2D.
 *
 * Decisões do degrau BÁSICO (fidelidade em ESPÍRITO ao original em index.js):
 * - Os dois lutadores (Fighter que estende Sprite) viram sprites comuns
 *   desenhados por código (createShapeSprite, sem os PNGs de samuraiMack/kenji).
 *   Gravidade + chão montados na mão: setGravity, applyVelocity e um chão sólido
 *   (collideGroup) valem o velocity.y += gravity e o piso do original.
 * - DOIS jogadores no MESMO teclado, como o original: o herói 1 anda com A/D,
 *   pula com W e golpeia com F; o herói 2 anda com as setas, pula com a seta pra
 *   cima e golpeia com a seta pra baixo. O andar é lido a cada quadro (keyDown),
 *   o pulo e o golpe são eventos (só agem no chão / com a recarga pronta).
 * - O GOLPE é a caixa de ataque do original (attackBox à frente do lutador): uma
 *   caixinha que aparece por alguns quadros VIRADA PARA O OPONENTE (comparando os
 *   centros), e se ela encostar (touches) no adversário tira vida uma vez por
 *   golpe (o takeHit com health -= 20). Cada lutador tem recarga própria.
 * - Barras de vida no topo (drawBar lendo getHealth), como as #playerHealth /
 *   #enemyHealth do original, e um CRONÔMETRO regressivo (o decreaseTimer): uma
 *   raiz "A cada 1 segundo" tira 1 de 60. Zerar a vida do rival é KO; se o tempo
 *   acabar, ganha quem tiver mais vida (empate se estiverem iguais) — o
 *   determineWinner do original. 100% procedural (formas e cores, sem PNGs).
 * - Telas de início e fim (com o nome do vencedor) e reinício por Enter.
 */
export const DUELO_DE_HEROIS_SOURCE = `
SZGame2D.fitScreen(100);
SZGame2D.setGravity(0.7);
SZGame2D.defineShape("heroiAzul", function (ctx) {
  SZGame2D.paintCircle(ctx, 15, 9, 8, "#f7c8a2");
  SZGame2D.paintRect(ctx, 6, 17, 20, 22, "#3b6fd6");
  SZGame2D.paintRect(ctx, 8, 39, 7, 13, "#26356e");
  SZGame2D.paintRect(ctx, 17, 39, 7, 13, "#26356e");
});
SZGame2D.defineShape("heroiVermelho", function (ctx) {
  SZGame2D.paintCircle(ctx, 15, 9, 8, "#f7c8a2");
  SZGame2D.paintRect(ctx, 6, 17, 20, 22, "#d64550");
  SZGame2D.paintRect(ctx, 8, 39, 7, 13, "#7a2530");
  SZGame2D.paintRect(ctx, 17, 39, 7, 13, "#7a2530");
});
const heroi1 = SZGame2D.createShapeSprite("heroiAzul", { x: 90, y: 180, w: 32, h: 52 });
const heroi2 = SZGame2D.createShapeSprite("heroiVermelho", { x: 358, y: 180, w: 32, h: 52 });
SZGame2D.setHealth(heroi1, 100);
SZGame2D.setHealth(heroi2, 100);
const chao = SZGame2D.createGroup();
SZGame2D.spawn(chao, { x: 0, y: 256, w: 480, h: 44, color: "#3a2f22", vx: 0, vy: 0 });
const golpe1 = SZGame2D.createSprite({ x: 0, y: 0, w: 26, h: 30, color: "#ffe08a" });
const golpe2 = SZGame2D.createSprite({ x: 0, y: 0, w: 26, h: 30, color: "#ffe08a" });
let atacando1 = 0;
let atacando2 = 0;
let tempo = 60;
SZGame2D.playMusic("tense");
SZGame2D.setScene("inicio");
SZGame2D.onKey("Enter", function () {
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("jogando");
  }
  if (SZGame2D.sceneIs("ganhou1")) {
    SZGame2D.restart();
  }
  if (SZGame2D.sceneIs("ganhou2")) {
    SZGame2D.restart();
  }
  if (SZGame2D.sceneIs("empate")) {
    SZGame2D.restart();
  }
});
SZGame2D.onKey("w", function () {
  if (SZGame2D.sceneIs("jogando")) {
    if (SZGame2D.spriteVy(heroi1) == 0) {
      heroi1.vy = -13;
      SZGame2D.playFx("jump");
    }
  }
});
SZGame2D.onKey("ArrowUp", function () {
  if (SZGame2D.sceneIs("jogando")) {
    if (SZGame2D.spriteVy(heroi2) == 0) {
      heroi2.vy = -13;
      SZGame2D.playFx("jump");
    }
  }
});
SZGame2D.onKey("f", function () {
  if (SZGame2D.sceneIs("jogando")) {
    if (atacando1 == 0) {
      if (SZGame2D.cooldownReady(heroi1, 30, "soco1")) {
        atacando1 = 12;
        SZGame2D.playFx("punch");
      }
    }
  }
});
SZGame2D.onKey("ArrowDown", function () {
  if (SZGame2D.sceneIs("jogando")) {
    if (atacando2 == 0) {
      if (SZGame2D.cooldownReady(heroi2, 30, "soco2")) {
        atacando2 = 12;
        SZGame2D.playFx("punch");
      }
    }
  }
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Duelo de Heróis", "Dois jogadores no mesmo teclado. Azul anda com A e D, pula com W e golpeia com F. Vermelho usa as setas e a seta pra baixo golpeia. Zere a vida do outro!", "Aperte Enter para lutar", "#241830");
  }
  if (SZGame2D.sceneIs("jogando")) {
    heroi1.vx = 0;
    if (SZGame2D.keyDown("a")) {
      heroi1.vx = -3;
    }
    if (SZGame2D.keyDown("d")) {
      heroi1.vx = 3;
    }
    heroi2.vx = 0;
    if (SZGame2D.keyDown("ArrowLeft")) {
      heroi2.vx = -3;
    }
    if (SZGame2D.keyDown("ArrowRight")) {
      heroi2.vx = 3;
    }
    SZGame2D.applyVelocity(heroi1);
    SZGame2D.applyVelocity(heroi2);
    SZGame2D.collideGroup(heroi1, chao);
    SZGame2D.collideGroup(heroi2, chao);
    SZGame2D.clampToScreen(heroi1, ctx);
    SZGame2D.clampToScreen(heroi2, ctx);
    SZGame2D.drawGroup(ctx, chao);
    SZGame2D.drawSprite(ctx, heroi1);
    SZGame2D.drawSprite(ctx, heroi2);
    if (atacando1 > 0) {
      golpe1.y = SZGame2D.spriteY(heroi1) + 10;
      if (SZGame2D.centerX(heroi1) < SZGame2D.centerX(heroi2)) {
        golpe1.x = SZGame2D.spriteX(heroi1) + 30;
      }
      if (SZGame2D.centerX(heroi1) >= SZGame2D.centerX(heroi2)) {
        golpe1.x = SZGame2D.spriteX(heroi1) - 24;
      }
      SZGame2D.drawSprite(ctx, golpe1);
      if (SZGame2D.touches(golpe1, heroi2)) {
        if (atacando1 == 12) {
          SZGame2D.changeHealth(heroi2, -8);
          SZGame2D.explodeSprite(heroi2, "#ffb347");
          SZGame2D.shake(ctx, 5);
          SZGame2D.playFx("hurt");
        }
      }
      atacando1 = atacando1 - 1;
    }
    if (atacando2 > 0) {
      golpe2.y = SZGame2D.spriteY(heroi2) + 10;
      if (SZGame2D.centerX(heroi2) < SZGame2D.centerX(heroi1)) {
        golpe2.x = SZGame2D.spriteX(heroi2) + 30;
      }
      if (SZGame2D.centerX(heroi2) >= SZGame2D.centerX(heroi1)) {
        golpe2.x = SZGame2D.spriteX(heroi2) - 24;
      }
      SZGame2D.drawSprite(ctx, golpe2);
      if (SZGame2D.touches(golpe2, heroi1)) {
        if (atacando2 == 12) {
          SZGame2D.changeHealth(heroi1, -8);
          SZGame2D.explodeSprite(heroi1, "#ffb347");
          SZGame2D.shake(ctx, 5);
          SZGame2D.playFx("hurt");
        }
      }
      atacando2 = atacando2 - 1;
    }
    SZGame2D.drawBar(ctx, SZGame2D.getHealth(heroi1), 100, 12, 14, 190, 16, "#4f8fea");
    SZGame2D.drawBar(ctx, SZGame2D.getHealth(heroi2), 100, 278, 14, 190, 16, "#e05a5a");
    SZGame2D.drawScore(ctx, "Tempo:", tempo, 210, 26, "#ffffff", 18);
    if (SZGame2D.getHealth(heroi2) <= 0) {
      SZGame2D.playFx("win");
      SZGame2D.setScene("ganhou1");
    }
    if (SZGame2D.getHealth(heroi1) <= 0) {
      SZGame2D.playFx("win");
      SZGame2D.setScene("ganhou2");
    }
    if (tempo <= 0) {
      if (SZGame2D.getHealth(heroi1) > SZGame2D.getHealth(heroi2)) {
        SZGame2D.setScene("ganhou1");
      }
      if (SZGame2D.getHealth(heroi2) > SZGame2D.getHealth(heroi1)) {
        SZGame2D.setScene("ganhou2");
      }
      if (SZGame2D.getHealth(heroi1) == SZGame2D.getHealth(heroi2)) {
        SZGame2D.setScene("empate");
      }
    }
  }
  if (SZGame2D.sceneIs("ganhou1")) {
    SZGame2D.showScreen(ctx, "O herói Azul venceu!", "O lutador azul derrubou o adversário. Que duelo!", "Aperte Enter para lutar de novo", "#1b2b5a");
  }
  if (SZGame2D.sceneIs("ganhou2")) {
    SZGame2D.showScreen(ctx, "O herói Vermelho venceu!", "O lutador vermelho derrubou o adversário. Que duelo!", "Aperte Enter para lutar de novo", "#5a2020");
  }
  if (SZGame2D.sceneIs("empate")) {
    SZGame2D.showScreen(ctx, "Empate!", "O tempo acabou com os dois heróis igualmente fortes. Ninguém caiu!", "Aperte Enter para o desempate", "#3a3352");
  }
});
if (SZGame2D.everySeconds("relogio", 1)) {
  if (SZGame2D.sceneIs("jogando")) {
    if (tempo > 0) {
      tempo = tempo - 1;
    }
  }
}
`.trim()

// Só gera quando RODADO direto (o drift test importa o SOURCE daqui).
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(DUELO_DE_HEROIS_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
