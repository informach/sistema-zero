/** Canonical, page-free reference sources for the three small 3D kits. */
export const CROSSING_SOURCE = `
const mundo = SZGame3D.createFullscreenScene("#87ceeb", "crossing");
SZGame3D.setScreenText("fim", "Fim da travessia", "Cada linha atravessada vale um ponto.", "Tentar de novo");
const jogador = SZGame3D.createCrosser(mundo, { color: "#ffffff" });
SZGame3D.generateRows(mundo, 20);
SZGame3D.addScore(0);
SZGame3D.hudText("bottom-center", "Setas ou WASD: pular para a próxima casa.");
SZGame3D.onKey("ArrowUp", () => { SZGame3D.crosserMove(jogador, "forward"); });
SZGame3D.onKey("KeyW", () => { SZGame3D.crosserMove(jogador, "forward"); });
SZGame3D.onKey("ArrowDown", () => { SZGame3D.crosserMove(jogador, "backward"); });
SZGame3D.onKey("KeyS", () => { SZGame3D.crosserMove(jogador, "backward"); });
SZGame3D.onKey("ArrowLeft", () => { SZGame3D.crosserMove(jogador, "left"); });
SZGame3D.onKey("KeyA", () => { SZGame3D.crosserMove(jogador, "left"); });
SZGame3D.onKey("ArrowRight", () => { SZGame3D.crosserMove(jogador, "right"); });
SZGame3D.onKey("KeyD", () => { SZGame3D.crosserMove(jogador, "right"); });
SZGame3D.animate(mundo, () => {
  SZGame3D.crosserStep(jogador, mundo);
  SZGame3D.moveTraffic(mundo);
  SZGame3D.addScore(SZGame3D.crosserRow(jogador) - SZGame3D.score());
  if (SZGame3D.crosserHit(jogador, mundo)) { SZGame3D.endGame("perdeu"); }
});
`.trim()

export const RACE_SOURCE = `
const mundo = SZGame3D.createFullscreenScene("#bfe3ff", "race");
SZGame3D.setScreenText("fim", "Fim da corrida", "Cada volta completa vale um ponto.", "Correr de novo");
SZGame3D.createRaceTrack(mundo);
const carro = SZGame3D.createRaceCar(mundo, { color: "#ef2d56" });
SZGame3D.addScore(0);
SZGame3D.hudText("bottom-center", "Seta para cima: acelerar. Seta para baixo: frear. Solte para manter a velocidade normal.");
SZGame3D.animate(mundo, () => {
  if (SZGame3D.keyDown("ArrowUp")) {
    SZGame3D.raceControl(carro, "accelerate");
  } else {
    if (SZGame3D.keyDown("ArrowDown")) {
      SZGame3D.raceControl(carro, "decelerate");
    } else { SZGame3D.raceControl(carro, "normal"); }
  }
  SZGame3D.raceStep(carro, mundo);
  SZGame3D.runRivals(mundo);
  SZGame3D.addScore(SZGame3D.raceLaps(carro) - SZGame3D.score());
  if (SZGame3D.raceHit(carro, mundo)) { SZGame3D.endGame("perdeu"); }
});
`.trim()

export const STACK_SOURCE = `
const torre = SZGame3D.createFullscreenScene("#fbe7c6", "stack");
SZGame3D.setScreenText("fim", "A torre terminou!", "Cada bloco encaixado vale um ponto.", "Empilhar de novo");
SZGame3D.createStackTower(torre);
SZGame3D.addScore(0);
SZGame3D.hudText("bottom-center", "Espaço ou clique: soltar o bloco sobre a torre.");
SZGame3D.onKey("Space", () => { SZGame3D.stackDrop(torre); });
SZGame3D.onCanvasClick(() => { SZGame3D.stackDrop(torre); });
SZGame3D.animate(torre, () => {
  SZGame3D.stackStep(torre);
  SZGame3D.addScore(SZGame3D.stackScore(torre) - SZGame3D.score());
  if (SZGame3D.stackGameOver(torre)) { SZGame3D.endGame("perdeu"); }
});
`.trim()
