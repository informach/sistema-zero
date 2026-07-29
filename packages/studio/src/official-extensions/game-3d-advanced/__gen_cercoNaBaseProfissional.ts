import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes } from './exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Cerco na Base Profissional". Rode com
 * `bun src/official-extensions/game-3d-advanced/__gen_cercoNaBaseProfissional.ts`
 * e cole a saída em examples.ts. O drift test
 * (`cercoNaBaseProfissionalExample.test.ts`) guarda o resultado.
 *
 * O FPS do SimonDev (Quick_FPS1 / SimonDoom) recriado no motor avançado como
 * DEFESA DE ARENA em primeira pessoa: olhe com o mouse (cameraFps) e ande com
 * WASD (moveFps). Os aliens nascem na borda e AVANÇAM em ondas. O tiro é
 * CARREGADO: segurar o espaço enche a `carga` e soltar dispara (mais carga = mais
 * dano, via entityValue no próprio tiro). A `munição` é limitada e recarrega
 * sozinha, então você precisa mirar bem. Derrote 12 antes que a vida acabe.
 * ⭐ DISTINTO do "Labirinto dos Robôs" (também 1ª pessoa): lá é um LABIRINTO de
 * paredes sólidas com tiro à vontade e o objetivo de limpar tudo; aqui é ARENA
 * ABERTA (sem makeSolid) com MUNIÇÃO + tiro CARREGADO e ondas. Sem .glb.
 */
export const CERCO_NA_BASE_PROFISSIONAL_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 55, sky: "#1a0f2e", ground: "#2d1b3d" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.4, vignette: true });
SZGameKit3D.setScreenText("menu", "Cerco na Base Profissional", "Olhe com o mouse e ande com WASD. Segure o espaço para CARREGAR o blaster e solte para atirar: quanto mais carregado, mais forte. A munição recarrega sozinha. Derrote 12 aliens antes que a vida acabe!", "Defender");
SZGameKit3D.setScreenText("vitoria", "Base salva!", "Você segurou a invasão e derrotou os 12 aliens.", "Defender de novo");
SZGameKit3D.setScreenText("fim", "A base caiu...", "Os aliens passaram. Carregue o tiro para acertar mais forte e cuide da munição!", "Tentar de novo");
SZGameKit3D.defineMold("heroi", { health: 6, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#22d3ee", w: 0.6, h: 0.6, d: 0.6, x: 0, y: 0, z: 0 });
});
SZGameKit3D.defineMold("alien", { health: 8, speed: 4 }, function () {
  SZGameKit3D.part({ shape: "sphere", color: "#4ade80", w: 1, h: 1.1, d: 1, x: 0, y: 0.4, z: 0 });
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#f87171", w: 0.3, h: 0.3, d: 0.3, x: 0.25, y: 0.6, z: 0.4 });
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#f87171", w: 0.3, h: 0.3, d: 0.3, x: -0.25, y: 0.6, z: 0.4 });
  SZGameKit3D.part({ shape: "box", color: "#166534", w: 0.3, h: 0.7, d: 0.3, x: 0.5, y: 0.2, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#166534", w: 0.3, h: 0.7, d: 0.3, x: -0.5, y: 0.2, z: 0 });
});
SZGameKit3D.defineMold("tiroFraco", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#fde047", w: 0.35, h: 0.35, d: 0.5, x: 0, y: 0, z: 0 });
});
SZGameKit3D.defineMold("tiroForte", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#fb923c", w: 0.6, h: 0.6, d: 0.9, x: 0, y: 0, z: 0 });
});
SZGameKit3D.makeTrigger("alien");
SZGameKit3D.defineEffect("faisca", { count: 12, colorFrom: "#fde047", colorTo: "#b45309", spread: 3, sizeFrom: 0.3, sizeTo: 0, life: 0.3, gravity: 0 });
SZGameKit3D.defineEffect("gosma", { count: 20, colorFrom: "#4ade80", colorTo: "#1a0f2e", spread: 6, sizeFrom: 0.6, sizeTo: 0, life: 0.5, gravity: 2 });
let derrotados = 0;
let municao = 6;
let carga = 0;
let proximoAlien = 1;
SZGameKit3D.onEnterState("jogando", function () {
  derrotados = 0;
  municao = 6;
  carga = 0;
  proximoAlien = 1;
  SZGameKit3D.setSeed(3);
  SZGameKit3D.setAmbient(0.45);
  SZGameKit3D.setFog("#1a0f2e", 40, 110);
  SZGameKit3D.addLight("#a78bfa", 0, 16, 0, 1.2);
  const guarda = SZGameKit3D.spawn("heroi", 0, 1, 0);
  SZGameKit3D.cameraFps(guarda);
  SZGameKit3D.spawn("alien", -12, 0.5, -10);
  SZGameKit3D.spawn("alien", 11, 0.5, -12);
  SZGameKit3D.spawn("alien", -9, 0.5, 12);
});
SZGameKit3D.onEntityStateUpdate("heroi", "parado", function (ela, dt) {
  SZGameKit3D.moveFps(ela, 7);
  if (SZGameKit3D.keyDown("espaço") || SZGameKit3D.mouseDown()) {
    carga = carga + dt;
    if (carga > 1.4) {
      carga = 1.4;
    }
  } else {
    if (carga > 0 && municao >= 1) {
      if (carga >= 0.8) {
        SZGameKit3D.spawnFrom("tiroForte", ela);
      } else {
        SZGameKit3D.spawnFrom("tiroFraco", ela);
      }
      municao = municao - 1;
      carga = 0;
      SZGameKit3D.playEffect("laser");
    } else {
      carga = 0;
    }
  }
});
SZGameKit3D.onEntityStateUpdate("tiroFraco", "parado", function (ela, dt) {
  SZGameKit3D.moveForward(ela, 50);
});
SZGameKit3D.onEntityStateUpdate("tiroForte", "parado", function (ela, dt) {
  SZGameKit3D.moveForward(ela, 55);
});
SZGameKit3D.stateTimer("tiroFraco", "parado", 1.2, "sumir");
SZGameKit3D.stateTimer("tiroForte", "parado", 1.2, "sumir");
SZGameKit3D.onEnterEntityState("tiroFraco", "sumir", function (ela) {
  SZGameKit3D.recycle(ela);
});
SZGameKit3D.onEnterEntityState("tiroForte", "sumir", function (ela) {
  SZGameKit3D.recycle(ela);
});
SZGameKit3D.stateTimer("alien", "parado", 0.3, "avancando");
SZGameKit3D.onEntityStateUpdate("alien", "avancando", function (ela, dt) {
  const alvo = SZGameKit3D.nearest("heroi", ela);
  if (SZGameKit3D.exists(alvo)) {
    SZGameKit3D.seekPoint(ela, SZGameKit3D.posOf(alvo, "x"), SZGameKit3D.posOf(alvo, "z"));
    SZGameKit3D.faceVelocity(ela);
    if (SZGameKit3D.touches(ela, alvo, 1.6)) {
      SZGameKit3D.hurt(alvo, 1);
      SZGameKit3D.cameraShake(0.3, 0.2);
    }
  }
});
SZGameKit3D.onOverlap("alien", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "tiroForte")) {
    SZGameKit3D.hurt(zona, 10);
    SZGameKit3D.burstOn("faisca", quem);
    SZGameKit3D.playEffect("hit");
    SZGameKit3D.recycle(quem);
  }
  if (SZGameKit3D.isMold(quem, "tiroFraco")) {
    SZGameKit3D.hurt(zona, 4);
    SZGameKit3D.burstOn("faisca", quem);
    SZGameKit3D.playEffect("hit");
    SZGameKit3D.recycle(quem);
  }
});
SZGameKit3D.onEntityDeath("alien", function (ela) {
  SZGameKit3D.burstOn("gosma", ela);
  SZGameKit3D.playEffect("coin");
  derrotados = derrotados + 1;
});
SZGameKit3D.onEntityDeath("heroi", function (ela) {
  SZGameKit3D.burstOn("gosma", ela);
  SZGameKit3D.playEffect("gameover");
  SZGameKit3D.setState("fim");
});
SZGameKit3D.onUpdate(function (dt) {
  municao = municao + dt * 0.9;
  if (municao > 6) {
    municao = 6;
  }
  proximoAlien = proximoAlien - dt;
  if (proximoAlien <= 0 && SZGameKit3D.countAlive("alien") < 6) {
    proximoAlien = 2;
    SZGameKit3D.spawn("alien", SZGameKit3D.randomBetween(-18, 18), 0.5, SZGameKit3D.randomBetween(-18, 18));
  }
  SZGameKit3D.cullFar("tiroFraco", 60);
  SZGameKit3D.cullFar("tiroForte", 60);
  SZGameKit3D.setHud("top-left", "Aliens: " + derrotados + " de 12");
  SZGameKit3D.setHud("top-right", "Munição: " + Math.floor(municao));
  SZGameKit3D.setHud("bottom-left", "Carga: " + Math.floor(carga * 70));
  if (derrotados >= 12) {
    SZGameKit3D.playEffect("win");
    SZGameKit3D.setState("vitoria");
  }
});
SZGameKit3D.start();
`.trim()

// Só gera quando RODADO direto — o drift test importa o SOURCE daqui.
if (import.meta.main) {
  const js = parseJS(CERCO_NA_BASE_PROFISSIONAL_SOURCE)
  const bad = [...collectTypes(js)].filter(
    (t) => t === 'rawJS' || t === 'memberCall' || t === 'memberCallExpr',
  )
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
    name: 'Cerco na Base Profissional',
    experience: 'game',
    description:
      'FPS de defesa em 1ª pessoa no motor avançado: olhe com o mouse, ande com WASD e segure o espaço para carregar o tiro. A munição recarrega. Derrote 12 aliens em ondas antes que a vida acabe.',
    ir: {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d-advanced' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const cercoNaBaseProfissionalExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
