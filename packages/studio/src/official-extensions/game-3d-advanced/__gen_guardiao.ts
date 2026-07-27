import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from './exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Guardião do Portal" (v0.5.0). Rode com
 * `bun src/official-extensions/game-3d-advanced/__gen_guardiao.ts` e cole a saída
 * em examples.ts. O drift test (`guardiaoExample.test.ts`) guarda o resultado.
 *
 * ⚠️ SEM .glb embutido de propósito: os modelos do curso pesam MB e estourariam a
 * cota de assets. A animação de modelo fica provada por TESTE (model.test.ts, com
 * um .glb mínimo montado na hora) — o mesmo veredito do V9/P6 no núcleo.
 */
export const GUARDIAO_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 60, sky: "#082f49", ground: "#134e4a" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.2, vignette: true });
SZGameKit3D.setScreenText("menu", "Guardião do Portal", "Segure os invasores por 30 segundos! Fale com eles, tremam as pedras. E o acaso é sempre o mesmo, por causa da semente.", "Guardar");
SZGameKit3D.setScreenText("vitoria", "O portal resistiu!", "Você segurou até o fim.", "Guardar de novo");
SZGameKit3D.setScreenText("fim", "O portal caiu...", "Os invasores passaram.", "Tentar de novo");
SZGameKit3D.defineMold("portal", { health: 100, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "torus", material: "brilho", color: "#22d3ee", w: 4, h: 4, d: 0.8, x: 0, y: 2.5, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#0e7490", w: 3, h: 0.5, d: 3, x: 0, y: 0, z: 0 });
});
SZGameKit3D.defineMold("guardiao", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#38bdf8", w: 0.9, h: 1.2, d: 0.9, x: 0, y: 0.6, z: 0 });
  SZGameKit3D.part({ shape: "sphere", color: "#e0f2fe", w: 0.7, h: 0.7, d: 0.7, x: 0, y: 1.4, z: 0 });
  SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#facc15", w: 0.3, h: 0.5, d: 0.3, x: 0, y: 1, z: 0.5 });
});
SZGameKit3D.defineMold("invasor", { health: 20, speed: 4 }, function () {
  SZGameKit3D.part({ shape: "sphere", color: "#f43f5e", w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 });
  SZGameKit3D.part({ shape: "cone", color: "#881337", w: 0.6, h: 0.7, d: 0.6, x: 0, y: 1.3, z: 0 });
});
SZGameKit3D.defineMold("pedra", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "sphere", color: "#a8a29e", w: 1.4, h: 1.4, d: 1.4, x: 0, y: 0, z: 0 });
});
SZGameKit3D.setPhysics("guardiao", "personagem");
SZGameKit3D.setPhysics("pedra", "bola");
SZGameKit3D.showHealthBar("portal", true);
SZGameKit3D.defineEffect("poeira", { count: 20, colorFrom: "#f43f5e", colorTo: "#082f49", spread: 6, sizeFrom: 0.5, sizeTo: 0, life: 0.6, gravity: 2 });
let segurou = 0;
SZGameKit3D.onEnterState("jogando", function () {
  segurou = 0;
  SZGameKit3D.setSeed(9);
  SZGameKit3D.setAmbient(0.5);
  SZGameKit3D.setFog("#082f49", 30, 90);
  SZGameKit3D.startTimer(30);
  SZGameKit3D.spawn("portal", 0, 0, 0);
  const heroi = SZGameKit3D.spawn("guardiao", 0, 1, 8);
  SZGameKit3D.cameraFollow(heroi, 14, 7);
  SZGameKit3D.say(heroi, "Aguenta firme!", 3);
  SZGameKit3D.spawn("pedra", SZGameKit3D.randomBetween(-12, 12), 10, SZGameKit3D.randomBetween(-12, 12));
  SZGameKit3D.spawn("pedra", SZGameKit3D.randomBetween(-12, 12), 14, SZGameKit3D.randomBetween(-12, 12));
  SZGameKit3D.startSpawner("invasor", 1.5, "edge");
});
SZGameKit3D.onTimerEnd(function () {
  SZGameKit3D.setState("vitoria");
});
SZGameKit3D.onUpdate(function (dt) {
  SZGameKit3D.setHud("top-left", "Faltam: " + Math.ceil(SZGameKit3D.timeLeft()) + "s");
  SZGameKit3D.setHud("top-right", "Parados: " + segurou);
});
SZGameKit3D.onEntityStateUpdate("guardiao", "parado", function (ela, dt) {
  SZGameKit3D.platformerKeys(ela, 8, 10);
  SZGameKit3D.faceVelocity(ela);
});
SZGameKit3D.onEntityStateUpdate("invasor", "parado", function (ela, dt) {
  const alvo = SZGameKit3D.nearest("portal", ela);
  if (SZGameKit3D.exists(alvo)) {
    SZGameKit3D.seek(ela, alvo);
    if (SZGameKit3D.touches(ela, alvo, 2.2)) {
      SZGameKit3D.hurt(alvo, 15);
      SZGameKit3D.burstOn("poeira", ela);
      SZGameKit3D.playEffect("hit");
      SZGameKit3D.recycle(ela);
    }
  }
  SZGameKit3D.faceVelocity(ela);
  SZGameKit3D.forEachNear(ela, "guardiao", 1.6, function (vizinho) {
    SZGameKit3D.burstOn("poeira", ela);
    SZGameKit3D.playEffect("hit");
    SZGameKit3D.cameraShake(0.25, 0.2);
    if (SZGameKit3D.randomChance(30)) {
      SZGameKit3D.say(vizinho, "Essa foi por pouco!", 1.5);
    }
    SZGameKit3D.recycle(ela);
    segurou = segurou + 1;
  });
});
SZGameKit3D.onEntityDeath("portal", function (ela) {
  SZGameKit3D.burstOn("poeira", ela);
  SZGameKit3D.playEffect("gameover");
  SZGameKit3D.endGame();
});
SZGameKit3D.start();
`.trim()

// Só gera quando RODADO direto — o drift test importa o SOURCE daqui (uma cópia
// só do fonte; duas divergiriam em silêncio).
if (import.meta.main) {
  const parsed = stripIds(parseJS(GUARDIAO_SOURCE))
  const types = collectTypes(parsed)
  const bad = [...types].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(parsed, null, 4))
}
