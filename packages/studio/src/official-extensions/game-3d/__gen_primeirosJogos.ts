/**
 * Fontes JavaScript dos dois exemplos novos do review 3D (lote 7, 24/10/2026). O
 * `ir.behavior` de cada um sai DAQUI pelo `bun run gen:game-3d-examples` (HTML, CSS e
 * assets continuam no `examples.ts`).
 *
 * - **Pega-Estrelas** é o PRIMEIRO jogo completo do catálogo: só blocos do núcleo
 *   `iniciante-3d` (`INICIANTE_3D_G3D`) mais o "se" da Programação. Tem início, placar,
 *   contagem de 30 s que aparece na tela (o "Começar a contagem" e o "Quando a
 *   contagem acabar"), fim com os pontos e recomeçar pela tela, sem HTML nenhum. O
 *   `exampleProgression.test.ts` trava o degrau.
 * - **Meu herói do Molda** mostra o personagem do Molda no Jogo 3D: modelo com ossos
 *   (o GLB embutido no exemplo), animação conforme anda ou fica parado, câmera que segue
 *   de trás, céu e som pronto.
 */

/** Pega-Estrelas: estrelas nascem num grupo a cada segundo; encostar pega. */
export const PEGA_ESTRELAS_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#0b1026");
SZGame3D.setScreenText("inicio", "Pega-Estrelas", "Ande com as setas ou WASD e pule com espaço. Pegue o máximo de estrelas em 30 segundos!", "Jogar");
SZGame3D.setScreenText("vitoria", "Acabou o tempo!", "Veja quantas estrelas você pegou.", "Jogar de novo");
const chao = SZGame3D.createBlock(cena, { width: 24, height: 1, depth: 24, color: "#15803d" });
SZGame3D.setPosition(chao, 0, -0.5, 0);
const heroi = SZGame3D.createBox(cena, { size: 1, color: "#38bdf8" });
SZGame3D.setPosition(heroi, 0, 1, 0);
SZGame3D.cameraMode(cena, "tras", heroi);
const estrela = SZGame3D.createSphere(cena, { radius: 0.4, color: "#facc15" });
SZGame3D.setPosition(estrela, 0, -20, 0);
const estrelas = SZGame3D.createGroup();
SZGame3D.hudText("top-left", "Pegue as estrelas amarelas!");
SZGame3D.startTimer(30);
SZGame3D.onTouchGroup(heroi, estrelas, (item) => {
  SZGame3D.addScore(1);
  SZGame3D.playEffect("coin");
  SZGame3D.remove(cena, item);
});
SZGame3D.animate(cena, () => {
  SZGame3D.controlWithKeys(heroi, 5);
  if (SZGame3D.keyDown("Space")) {
    SZGame3D.jump(heroi, 6);
  }
  SZGame3D.applyGravity(heroi, chao);
});
SZGame3D.everySecondsLoop(1, () => {
  SZGame3D.spawnCopy(estrelas, estrela, SZGame3D.randomBetween(-9, 9), 0.6, SZGame3D.randomBetween(-9, 9));
});
SZGame3D.onTimerEnd(() => {
  SZGame3D.endGame("ganhou");
});
`.trim()

/**
 * Meu herói do Molda: o modelo "heroi-do-molda" (asset GLB do exemplo, com os clipes
 * "Acenar" e "Esticar") anda com o teclado e toca uma animação andando e outra parado.
 * Pedir a mesma animação a cada quadro só a deixa continuar; trocar o nome troca suave.
 */
export const MEU_HEROI_MOLDA_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#7dd3fc");
SZGame3D.setSky(cena, "#38bdf8", "#e0f2fe");
const chao = SZGame3D.createBlock(cena, { width: 30, height: 1, depth: 30, color: "#4ade80" });
SZGame3D.setPosition(chao, 0, -0.5, 0);
const heroi = SZGame3D.createModelFile(cena, "heroi-do-molda", 2);
SZGame3D.setPosition(heroi, 0, 1.5, 0);
SZGame3D.cameraMode(cena, "tras", heroi);
SZGame3D.hudText("top-left", "Setas ou WASD: andar. Espaço: pular.");
SZGame3D.onKey("Space", () => {
  SZGame3D.jump(heroi, 6);
  SZGame3D.playEffect("jump");
});
SZGame3D.animate(cena, () => {
  SZGame3D.controlWithKeys(heroi, 4);
  SZGame3D.applyGravity(heroi, chao);
  if (SZGame3D.isMoving(heroi)) {
    SZGame3D.playAnimation(heroi, "Esticar", "repetir");
  } else {
    SZGame3D.playAnimation(heroi, "Acenar", "repetir");
  }
});
`.trim()
