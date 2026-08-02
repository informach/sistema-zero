import { behaviorStatements, normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './__gen_dinoCorredor'

/**
 * Gerador one-off da IR do exemplo "Batalha de Monstrinhos" (o degrau BÁSICO da
 * família Pokemon-style Battle do Clear Code). Rode com
 * `bun src/official-extensions/game-2d/__gen_batalhaMonstrinhos.ts` e cole a
 * saída em examples/clearcode/batalhaMonstrinhos.ts. O drift test
 * (`batalhaMonstrinhosExample.test.ts`) guarda o resultado.
 *
 * O preparo do palco (setupStage + setStageDescription) NÃO aparece aqui de
 * propósito: quem o injeta é o wrapper `beginnerGameExample`.
 *
 * Decisões do degrau básico:
 * - Sem movimento: dois monstrinhos DESENHADOS POR CÓDIGO (defineShape) frente
 *   a frente, como no estudo original.
 * - Menu por TECLAS (1/2/3) com as opções escritas na tela (drawLabel): o
 *   game-2d não tem menus navegáveis. As teclas de dígito entram pelo evento
 *   GENÉRICO de teclado (o "Quando apertar a tecla" do g2d só lista setas,
 *   espaço e Enter).
 * - Tabela de vantagem em `se`s explícitos: fogo contra planta = dano x2.
 * - Cura = dano negativo: changeHealth(+5); o runtime CLAMPA no máximo
 *   (utilities.ts) e a mensagem avisa "curou até 5".
 * - Poção LIMITADA: pocoes = 3 por partida; o placar "3 Poção (cura 5) x"
 *   mostra quantas restam (drawScore: o texto do drawLabel é campo fixo, não
 *   aceita concatenação); com 0, a tecla 3 só avisa e NÃO gasta o turno (a
 *   cura vira estratégia e a derrota fica alcançável).
 * - ⭐ afterSeconds ("Depois de N segundos"): one-shot por partida que marca
 *   aberturaPronta = 1 aos 2s. Quem LIBERA o turno é uma raiz "A cada 0,5
 *   segundos" que exige cena jogando + aberturaPronta + turno "espera" — assim
 *   a liberação acontece no que vier POR ÚLTIMO (o timer ou entrar na cena) e
 *   ficar parado na tela de título nunca consome o beat nem trava os comandos.
 *   ⚠️ NÃO embrulhar o corpo do afterSeconds em "se cena é jogando": o one-shot
 *   seria CONSUMIDO no título sem liberar o turno (softlock).
 * - Turnos: raiz "A cada 1,5 segundos" que SÓ age quando turno == "inimigo"
 *   (sorteia o golpe com randomChance/randomBetween e devolve o turno).
 */
export const BATALHA_MONSTRINHOS_SOURCE = `
SZGame2D.fitScreen(100);
SZGame2D.defineShape("brasinha", function (ctx) {
  SZGame2D.paintTriangle(ctx, 16, 26, 34, 58, 6, 62, "#ff5d3d");
  SZGame2D.paintCircle(ctx, 62, 52, 30, "#ff8c42");
  SZGame2D.paintEllipse(ctx, 46, 56, 34, 24, "#ffd166");
  SZGame2D.paintCircle(ctx, 76, 40, 5, "#1c2030");
  SZGame2D.paintRect(ctx, 48, 80, 12, 10, "#e07030");
  SZGame2D.paintRect(ctx, 70, 80, 12, 10, "#e07030");
});
SZGame2D.defineShape("folhito", function (ctx) {
  SZGame2D.paintTriangle(ctx, 55, 4, 40, 30, 70, 30, "#2f8f46");
  SZGame2D.paintCircle(ctx, 55, 56, 28, "#58b368");
  SZGame2D.paintCircle(ctx, 42, 48, 5, "#1c2030");
  SZGame2D.paintRect(ctx, 40, 78, 12, 10, "#3e9d52");
  SZGame2D.paintRect(ctx, 60, 78, 12, 10, "#3e9d52");
});
const meu = SZGame2D.createShapeSprite("brasinha", { x: 60, y: 140, w: 110, h: 90 });
const rival = SZGame2D.createShapeSprite("folhito", { x: 310, y: 44, w: 110, h: 90 });
SZGame2D.setHealth(meu, 20);
SZGame2D.setHealth(rival, 20);
let turno = "espera";
let forca = 4;
let dano = 0;
let pocoes = 3;
let aberturaPronta = 0;
let mensagem = "Os monstrinhos se encaram!";
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
document.addEventListener("keydown", (event) => {
  if (SZGame2D.sceneIs("jogando")) {
    if (turno == "jogador") {
      if (event.key == "1") {
        dano = forca * 2;
        SZGame2D.changeHealth(rival, 0 - dano);
        SZGame2D.blink(rival, 24);
        SZGame2D.shake(ctx, 6);
        SZGame2D.playFx("explosion");
        mensagem = "Faísca! Fogo contra planta tira o dobro: " + dano + " de dano";
        turno = "inimigo";
      }
      if (event.key == "2") {
        dano = forca * 1;
        SZGame2D.changeHealth(rival, 0 - dano);
        SZGame2D.blink(rival, 24);
        SZGame2D.playFx("hit");
        mensagem = "Jato de água! Dano normal: " + dano;
        turno = "inimigo";
      }
      if (event.key == "3") {
        if (pocoes > 0) {
          pocoes = pocoes - 1;
          SZGame2D.changeHealth(meu, 5);
          SZGame2D.playFx("heal");
          mensagem = "Poção! Brasinha curou até 5 de vida";
          turno = "inimigo";
        } else {
          mensagem = "As poções acabaram! Use a Faísca ou o Jato";
        }
      }
    }
  }
});
SZGame2D.gameLoop(function update() {
  SZGame2D.clear();
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.showScreen(ctx, "Batalha de Monstrinhos", "Brasinha, o monstrinho de fogo, desafia Folhito, o monstrinho de planta!", "Aperte Enter para batalhar", "#233457");
  }
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.drawSprite(ctx, meu);
    SZGame2D.drawSprite(ctx, rival);
    SZGame2D.drawLabel(ctx, "Brasinha (fogo)", 20, 122, "#ffd166", 14, "left");
    SZGame2D.drawBar(ctx, SZGame2D.getHealth(meu), SZGame2D.getMaxHealth(meu), 20, 130, 150, 12, "#3fbf6f");
    SZGame2D.drawLabel(ctx, "Folhito (planta)", 310, 22, "#9be48b", 14, "left");
    SZGame2D.drawBar(ctx, SZGame2D.getHealth(rival), SZGame2D.getMaxHealth(rival), 310, 30, 150, 12, "#3fbf6f");
    if (turno == "espera") {
      SZGame2D.drawLabel(ctx, "Os monstrinhos se preparam...", 20, 232, "#aab7d8", 13, "left");
    }
    if (turno == "jogador") {
      SZGame2D.drawLabel(ctx, "Sua vez! Escolha o golpe com as teclas:", 20, 232, "#ffe9a8", 13, "left");
    }
    if (turno == "inimigo") {
      SZGame2D.drawLabel(ctx, "Folhito prepara o golpe dele...", 20, 232, "#ffb4a8", 13, "left");
    }
    SZGame2D.drawScore(ctx, ">", mensagem, 20, 252, "#f3f6ff", 13);
    SZGame2D.drawLabel(ctx, "1 Faísca (fogo, dano x2 na planta)", 20, 272, "#ffd166", 13, "left");
    SZGame2D.drawLabel(ctx, "2 Jato (água, dano x1)", 20, 290, "#8fd0ff", 13, "left");
    SZGame2D.drawScore(ctx, "3 Poção (cura 5) x", pocoes, 200, 290, "#8fd0ff", 13);
    if (SZGame2D.healthDepleted(rival)) {
      SZGame2D.playFx("win");
      SZGame2D.setScene("vitoria");
    }
    if (SZGame2D.healthDepleted(meu)) {
      SZGame2D.playFx("gameover");
      SZGame2D.setScene("derrota");
    }
  }
  if (SZGame2D.sceneIs("vitoria")) {
    SZGame2D.showScreen(ctx, "Você venceu!", "Folhito não aguentou a Faísca em dobro. Fogo é forte contra planta!", "Aperte Enter para batalhar de novo", "#1d4d33");
  }
  if (SZGame2D.sceneIs("derrota")) {
    SZGame2D.showScreen(ctx, "Você perdeu!", "Brasinha ficou sem vida. Use a Poção na hora certa e tente de novo!", "Aperte Enter para batalhar de novo", "#5a2a2a");
  }
});
if (SZGame2D.afterSeconds("abertura-da-batalha", 2)) {
  aberturaPronta = 1;
}
if (SZGame2D.everySeconds("liberar-comandos", 0.5)) {
  if (SZGame2D.sceneIs("jogando")) {
    if (aberturaPronta == 1) {
      if (turno == "espera") {
        turno = "jogador";
        mensagem = "Sua vez! Aperte 1, 2 ou 3";
      }
    }
  }
}
if (SZGame2D.everySeconds("vez-do-folhito", 1.5)) {
  if (SZGame2D.sceneIs("jogando")) {
    if (turno == "inimigo") {
      if (SZGame2D.randomChance(60)) {
        SZGame2D.changeHealth(meu, -3);
        mensagem = "Chicote de Cipó! Brasinha perdeu 3 de vida";
      } else {
        dano = SZGame2D.randomBetween(2, 5);
        SZGame2D.changeHealth(meu, 0 - dano);
        mensagem = "Folha Afiada! Brasinha perdeu " + dano + " de vida";
      }
      SZGame2D.blink(meu, 24);
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
    js: parseJS(BATALHA_MONSTRINHOS_SOURCE),
    extensions: [{ extensionId: 'game-2d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behaviorStatements({ ...normalized, behavior }))
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
