import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes } from './exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Caça Estelar Profissional". Rode com
 * `bun src/official-extensions/game-3d-advanced/__gen_cacaEstelarProfissional.ts`
 * e cole a saída em examples.ts. O drift test
 * (`cacaEstelarProfissionalExample.test.ts`) guarda o resultado.
 *
 * A batalha espacial do SimonDev (Quick_Game2_StarWarsThing) recriada como
 * DOGFIGHT no motor avançado: uma nave em VOO LIVRE (moveWithKeys + faceVelocity,
 * cameraFollow atrás) que ATIRA pra frente (spawnFrom + moveForward, com recarga)
 * e CAÇA naves inimigas com cérebro próprio (FSM vagando → perseguindo → fugindo).
 * A caça foge (dá uma finta pra um ponto sorteado) quando leva dano (onHurt) e
 * volta a perseguir. Abata 10 antes que os escudos acabem. ⭐ DISTINTO da
 * "Patrulha Espacial" (nave presa no eixo X + meteoros burros que caem em faixa):
 * aqui o voo é LIVRE e o inimigo é uma NAVE com IA que persegue e evade. Sem .glb.
 */
export const CACA_ESTELAR_PROFISSIONAL_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 60, sky: "#0b1030", ground: "#111827" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.3, vignette: true });
SZGameKit3D.setScreenText("menu", "Caça Estelar Profissional", "Voe com WASD ou as setas e atire com a barra de espaço ou o clique. As naves inimigas vagam, perseguem e fogem quando atingidas. Abata 10 antes que os escudos acabem!", "Decolar");
SZGameKit3D.setScreenText("vitoria", "Ás dos céus!", "Você abateu as 10 naves inimigas. O espaço está seguro!", "Voar de novo");
SZGameKit3D.setScreenText("fim", "Nave abatida...", "Os inimigos foram demais. Persiga as naves que fogem e desvie das que atacam!", "Tentar de novo");
SZGameKit3D.defineMold("nave", { health: 5, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#38bdf8", w: 0.8, h: 0.4, d: 1.6, x: 0, y: 0, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#0ea5e9", w: 2.2, h: 0.15, d: 0.6, x: 0, y: 0, z: -0.1 });
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#e0f2fe", w: 0.5, h: 0.4, d: 0.5, x: 0, y: 0.25, z: 0.3 });
  SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#fca5a5", w: 0.3, h: 0.5, d: 0.3, x: 0, y: 0, z: -1 });
});
SZGameKit3D.defineMold("caca", { health: 10, speed: 6 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#ef4444", w: 0.7, h: 0.4, d: 1.3, x: 0, y: 0, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#b91c1c", w: 1.8, h: 0.15, d: 0.5, x: 0, y: 0, z: 0 });
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#fecaca", w: 0.35, h: 0.35, d: 0.35, x: 0, y: 0.2, z: 0.3 });
});
SZGameKit3D.defineMold("tiro", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#fde047", w: 0.3, h: 0.3, d: 0.6, x: 0, y: 0, z: 0 });
});
SZGameKit3D.showHealthBar("nave", true);
SZGameKit3D.showHealthBar("caca", true);
SZGameKit3D.makeTrigger("caca");
SZGameKit3D.defineEffect("faisca", { count: 10, colorFrom: "#fde047", colorTo: "#b45309", spread: 3, sizeFrom: 0.3, sizeTo: 0, life: 0.3, gravity: 0 });
SZGameKit3D.defineEffect("estouro", { count: 24, colorFrom: "#f87171", colorTo: "#0b1030", spread: 7, sizeFrom: 0.7, sizeTo: 0, life: 0.6, gravity: 0 });
let pontos = 0;
let proximaCaca = 1;
let recarga = 0;
SZGameKit3D.onEnterState("jogando", function () {
  pontos = 0;
  proximaCaca = 1;
  recarga = 0;
  SZGameKit3D.setSeed(4);
  SZGameKit3D.setAmbient(0.5);
  SZGameKit3D.setFog("#0b1030", 50, 130);
  SZGameKit3D.addLight("#a5b4fc", -10, 18, -8, 1.1);
  const nave = SZGameKit3D.spawn("nave", 0, 1, 0);
  SZGameKit3D.cameraFollow(nave, 13, 7);
  SZGameKit3D.cameraSmooth(6);
  SZGameKit3D.spawn("caca", -14, 1, -12);
  SZGameKit3D.spawn("caca", 13, 1, -10);
  SZGameKit3D.spawn("caca", -8, 1, 13);
  SZGameKit3D.say(nave, "Ao ataque!", 2);
});
SZGameKit3D.onEntityStateUpdate("nave", "parado", function (ela, dt) {
  SZGameKit3D.moveWithKeys(ela, 14);
  SZGameKit3D.faceVelocity(ela);
  recarga = recarga - dt;
  if ((SZGameKit3D.keyDown("espaço") || SZGameKit3D.mousePressed()) && recarga <= 0) {
    recarga = 0.35;
    SZGameKit3D.spawnFrom("tiro", ela);
    SZGameKit3D.playEffect("laser");
  }
});
SZGameKit3D.onEntityStateUpdate("tiro", "parado", function (ela, dt) {
  SZGameKit3D.moveForward(ela, 45);
});
SZGameKit3D.stateTimer("tiro", "parado", 1.4, "sumir");
SZGameKit3D.onEnterEntityState("tiro", "sumir", function (ela) {
  SZGameKit3D.recycle(ela);
});
SZGameKit3D.stateTimer("caca", "parado", 0.3, "vagando");
SZGameKit3D.onEnterEntityState("caca", "vagando", function (ela) {
  SZGameKit3D.setEntityValue(ela, "alvoX", SZGameKit3D.randomBetween(-20, 20));
  SZGameKit3D.setEntityValue(ela, "alvoZ", SZGameKit3D.randomBetween(-20, 20));
});
SZGameKit3D.onEntityStateUpdate("caca", "vagando", function (ela, dt) {
  SZGameKit3D.seekPoint(ela, SZGameKit3D.entityValue(ela, "alvoX"), SZGameKit3D.entityValue(ela, "alvoZ"));
  SZGameKit3D.faceVelocity(ela);
  if (SZGameKit3D.randomChance(1)) {
    SZGameKit3D.setEntityValue(ela, "alvoX", SZGameKit3D.randomBetween(-20, 20));
    SZGameKit3D.setEntityValue(ela, "alvoZ", SZGameKit3D.randomBetween(-20, 20));
  }
  const nave = SZGameKit3D.nearest("nave", ela);
  if (SZGameKit3D.exists(nave) && SZGameKit3D.touches(ela, nave, 14)) {
    SZGameKit3D.setEntityState(ela, "perseguindo");
  }
});
SZGameKit3D.onEntityStateUpdate("caca", "perseguindo", function (ela, dt) {
  const nave = SZGameKit3D.nearest("nave", ela);
  if (!SZGameKit3D.exists(nave)) {
    SZGameKit3D.setEntityState(ela, "vagando");
  } else {
    SZGameKit3D.seekPoint(ela, SZGameKit3D.posOf(nave, "x"), SZGameKit3D.posOf(nave, "z"));
    SZGameKit3D.faceVelocity(ela);
    if (!SZGameKit3D.touches(ela, nave, 22)) {
      SZGameKit3D.setEntityState(ela, "vagando");
    }
  }
});
SZGameKit3D.onHurt("caca", function (ela) {
  SZGameKit3D.setEntityState(ela, "fugindo");
});
SZGameKit3D.onEnterEntityState("caca", "fugindo", function (ela) {
  SZGameKit3D.setEntityValue(ela, "alvoX", SZGameKit3D.randomBetween(-22, 22));
  SZGameKit3D.setEntityValue(ela, "alvoZ", SZGameKit3D.randomBetween(-22, 22));
});
SZGameKit3D.onEntityStateUpdate("caca", "fugindo", function (ela, dt) {
  SZGameKit3D.seekPoint(ela, SZGameKit3D.entityValue(ela, "alvoX"), SZGameKit3D.entityValue(ela, "alvoZ"));
  SZGameKit3D.faceVelocity(ela);
});
SZGameKit3D.stateTimer("caca", "fugindo", 1.5, "perseguindo");
SZGameKit3D.onOverlap("caca", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "tiro")) {
    SZGameKit3D.hurt(zona, 5);
    SZGameKit3D.burstOn("faisca", quem);
    SZGameKit3D.playEffect("hit");
    SZGameKit3D.recycle(quem);
  }
  if (SZGameKit3D.isMold(quem, "nave")) {
    SZGameKit3D.hurt(quem, 1);
    SZGameKit3D.burstOn("estouro", quem);
  }
});
SZGameKit3D.onEntityDeath("caca", function (ela) {
  SZGameKit3D.burstOn("estouro", ela);
  SZGameKit3D.playEffect("coin");
  pontos = pontos + 1;
});
SZGameKit3D.onEntityDeath("nave", function (ela) {
  SZGameKit3D.burstOn("estouro", ela);
  SZGameKit3D.playEffect("gameover");
  SZGameKit3D.setState("fim");
});
SZGameKit3D.onUpdate(function (dt) {
  proximaCaca = proximaCaca - dt;
  if (proximaCaca <= 0 && SZGameKit3D.countAlive("caca") < 5) {
    proximaCaca = 2;
    SZGameKit3D.spawn("caca", SZGameKit3D.randomBetween(-20, 20), 1, SZGameKit3D.randomBetween(-20, 20));
  }
  SZGameKit3D.cullFar("tiro", 60);
  SZGameKit3D.setHud("top-left", "Naves: " + pontos + " de 10");
  SZGameKit3D.setHud("top-right", "Atire com espaço ou clique");
  if (pontos >= 10) {
    SZGameKit3D.playEffect("win");
    SZGameKit3D.setState("vitoria");
  }
});
SZGameKit3D.start();
`.trim()

// Só gera quando RODADO direto — o drift test importa o SOURCE daqui (uma cópia
// só do fonte; duas divergiriam em silêncio). Emite a IR JÁ normalizada, pronta
// para colar como `.ir` do exemplo em examples.ts.
if (import.meta.main) {
  const js = parseJS(CACA_ESTELAR_PROFISSIONAL_SOURCE)
  const bad = [...collectTypes(js)].filter((t) => t === 'rawJS' || t === 'memberCall')
  if (bad.length) console.error('DRIFT:', bad)
  const norm = normalizeSZIR({
    html: [],
    css: [],
    js,
    extensions: [{ extensionId: 'game-3d-advanced' }],
  })
  const behavior = JSON.parse(
    JSON.stringify(norm.behavior, (k, v) => (k === '__id' ? undefined : v)),
  )
  const example = {
    name: 'Caça Estelar Profissional',
    experience: 'game',
    description:
      'Dogfight no motor avançado: pilote em voo livre e atire pra frente. As naves inimigas têm cérebro próprio: vagam, perseguem e fogem quando atingidas. Abata 10 antes dos escudos acabarem.',
    ir: {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d-advanced' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const cacaEstelarProfissionalExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
