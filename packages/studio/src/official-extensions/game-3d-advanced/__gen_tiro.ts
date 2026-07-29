import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Tiro ao Alvo" (v0.7.0). Rode com
 * `bun src/official-extensions/game-3d-advanced/__gen_tiro.ts` e cole a saída
 * em examples.ts. O drift test (`tiroExample.test.ts`) guarda o resultado.
 *
 * É o exemplo do POINT-AND-CLICK: cobre as famílias que nenhum outro exercitava
 * — mira & clique (mousePressed/pick), avisos (on/emit), tela própria
 * (createScreen/addButton/showScreen/hideScreens), gaveta da entidade
 * (setEntityValue/entityValue), teclado por keyPressed, céu em runtime (setSky)
 * e os ajustes de câmera por código (cameraAngle/cameraLens).
 */
export const TIRO_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 40, sky: "#1e1b4b", ground: "#365314" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.1, vignette: true });
SZGameKit3D.setScreenText("menu", "Tiro ao Alvo", "Clique nos alvos antes que eles fujam. O dourado vale 3! Faça 12 pontos em 25 segundos. Aperte H para a dica.", "Valendo!");
SZGameKit3D.setScreenText("vitoria", "Olho de águia!", "Pontaria perfeita.", "De novo");
SZGameKit3D.setScreenText("fim", "O tempo acabou...", "Foi por pouco!", "Tentar de novo");
SZGameKit3D.defineMold("alvo", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "cylinder", color: "#b91c1c", w: 1.7, h: 0.25, d: 1.7, x: 0, y: 1.5, z: 0 });
  SZGameKit3D.part({ shape: "cylinder", color: "#fef2f2", w: 1, h: 0.3, d: 1, x: 0, y: 1.5, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#78350f", w: 0.25, h: 1.5, d: 0.25, x: 0, y: 0.75, z: 0 });
});
SZGameKit3D.defineMold("dourado", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "cylinder", material: "brilho", color: "#f59e0b", w: 1.7, h: 0.25, d: 1.7, x: 0, y: 1.5, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#78350f", w: 0.25, h: 1.5, d: 0.25, x: 0, y: 0.75, z: 0 });
});
SZGameKit3D.defineEffect("acerto", { count: 18, colorFrom: "#fde047", colorTo: "#b91c1c", spread: 5, sizeFrom: 0.4, sizeTo: 0, life: 0.5, gravity: 2 });
SZGameKit3D.createScreen("dica", "Dica de caçador", "O dourado foge mais rápido! Aperte C para a lente de mira e V para a lente normal.");
SZGameKit3D.addButton("dica", "Entendi!", function () {
  SZGameKit3D.hideScreens();
});
let pontos = 0;
SZGameKit3D.onEnterState("jogando", function () {
  pontos = 0;
  SZGameKit3D.setSeed(3);
  SZGameKit3D.setSky("#312e81", "#f59e0b");
  SZGameKit3D.setAmbient(0.55);
  SZGameKit3D.cameraOrbit(24);
  SZGameKit3D.cameraAngle(0, 42);
  SZGameKit3D.cameraLens(50);
  SZGameKit3D.startTimer(25);
  SZGameKit3D.startSpawner("alvo", 1, "anywhere");
  SZGameKit3D.startSpawner("dourado", 5, "anywhere");
});
SZGameKit3D.onEnterEntityState("alvo", "parado", function (ela) {
  SZGameKit3D.setEntityValue(ela, "valor", 1);
});
SZGameKit3D.onEnterEntityState("dourado", "parado", function (ela) {
  SZGameKit3D.setEntityValue(ela, "valor", 3);
});
SZGameKit3D.stateTimer("alvo", "parado", 2.6, "fugiu");
SZGameKit3D.stateTimer("dourado", "parado", 1.6, "fugiu");
SZGameKit3D.onEnterEntityState("alvo", "fugiu", function (ela) {
  SZGameKit3D.recycle(ela);
});
SZGameKit3D.onEnterEntityState("dourado", "fugiu", function (ela) {
  SZGameKit3D.recycle(ela);
});
SZGameKit3D.on("acertou", function () {
  SZGameKit3D.playEffect("coin");
  SZGameKit3D.cameraShake(0.15, 0.15);
});
SZGameKit3D.onUpdate(function (dt) {
  SZGameKit3D.setHud("top-left", "Pontos: " + pontos + "/12");
  SZGameKit3D.setHud("top-right", "Tempo: " + Math.ceil(SZGameKit3D.timeLeft()) + "s");
  if (SZGameKit3D.keyPressed("h")) {
    SZGameKit3D.showScreen("dica");
  }
  if (SZGameKit3D.keyPressed("c")) {
    SZGameKit3D.cameraLens(30);
  }
  if (SZGameKit3D.keyPressed("v")) {
    SZGameKit3D.cameraLens(50);
  }
  if (SZGameKit3D.mousePressed()) {
    const alvoClicado = SZGameKit3D.pick("alvo");
    if (SZGameKit3D.exists(alvoClicado)) {
      pontos = pontos + SZGameKit3D.entityValue(alvoClicado, "valor");
      SZGameKit3D.burstOn("acerto", alvoClicado);
      SZGameKit3D.recycle(alvoClicado);
      SZGameKit3D.emit("acertou");
    }
    const douradoClicado = SZGameKit3D.pick("dourado");
    if (SZGameKit3D.exists(douradoClicado)) {
      pontos = pontos + SZGameKit3D.entityValue(douradoClicado, "valor");
      SZGameKit3D.burstOn("acerto", douradoClicado);
      SZGameKit3D.recycle(douradoClicado);
      SZGameKit3D.emit("acertou");
    }
  }
  if (pontos >= 12) {
    SZGameKit3D.setState("vitoria");
  }
});
SZGameKit3D.onTimerEnd(function () {
  SZGameKit3D.endGame();
});
SZGameKit3D.start();
`.trim()

// Só gera quando RODADO direto — o drift test importa o SOURCE daqui (uma cópia
// só do fonte; duas divergiriam em silêncio).
if (import.meta.main) {
  const parsed = stripIds(parseJS(TIRO_SOURCE))
  const types = collectTypes(parsed)
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(parsed, null, 4))
}
