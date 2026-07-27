import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes } from './exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Labirinto dos Robôs Profissional". Rode com
 * `bun src/official-extensions/game-3d-advanced/__gen_labirintoProfissional.ts`
 * e cole a saída em examples.ts. O drift test
 * (`labirintoProfissionalExample.test.ts`) guarda o resultado.
 *
 * O FPS estilo Doom do motor avançado (nível 2 da família "Labirinto"):
 * camera_fps + move_fps (clique trava a mira; o mouse gira o CORPO do herói),
 * labirinto de paredes como MOLDES sólidos (makeSolid + spawns em corredores) e
 * ROBÔS com FSM de 3 estados (patrulhar → perseguir → atacar), em DOIS tipos
 * data-driven (vigia rápido/frágil × tanque lento/forte — só os NÚMEROS mudam).
 * O TIRO é o veredito do spike: sob pointer lock o mouse interno CONGELA, então
 * NADA de pick/groundPoint/pointerOver — o gatilho é mousePressed() e o projétil
 * é spawnFrom(tiro, herói) + moveForward (o yaw do FPS gira o mesmo mesh).
 * ⭐ COOLDOWN DE TIRO (full review Lote C): os i-frames do motor são de 0,5 s,
 * então dois cliques mais rápidos que isso gastariam DOIS tiros por UM dano
 * (o 2º acerto toca faísca+som mas não machuca). O relógio proximoTiro (por
 * dt, como os relógios de spawn da Corrida) trava o gatilho em 1 tiro a cada
 * 0,5 s — clique afobado não desperdiça munição de feedback.
 * Zona de tiro (makeTrigger + onOverlap + isMold), i-frames via onHurt com
 * cameraShake, vinheta ligada, HUD, telas, névoa e setSeed. Sem .glb.
 */
export const LABIRINTO_PROFISSIONAL_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 44, sky: "#0b1120", ground: "#1e293b" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.2, vignette: true });
SZGameKit3D.setScreenText("menu", "Labirinto dos Robôs", "Clique para travar a mira. Ande com WASD, olhe com o mouse e atire com o clique. Robôs patrulham os corredores: desligue os 5!", "Entrar");
SZGameKit3D.setScreenText("vitoria", "Labirinto limpo!", "Todos os robôs foram desligados. Que pontaria!", "Jogar de novo");
SZGameKit3D.setScreenText("fim", "Os robôs venceram...", "Sua energia acabou. Atire de longe e recue pelos corredores!", "Tentar de novo");
SZGameKit3D.defineMold("heroi", { health: 60, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#0ea5e9", w: 0.8, h: 1, d: 0.8, x: 0, y: 0.5, z: 0 });
  SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#22d3ee", w: 0.25, h: 0.5, d: 0.25, x: 0, y: 0.9, z: 0.55 });
});
SZGameKit3D.defineMold("tiro", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#fde047", w: 0.3, h: 0.3, d: 0.3, x: 0, y: 1.15, z: 0.3 });
});
SZGameKit3D.defineMold("vigia", { health: 20, speed: 4.2 }, function () {
  SZGameKit3D.part({ shape: "sphere", color: "#ef4444", w: 1.1, h: 1.1, d: 1.1, x: 0, y: 0.6, z: 0 });
  SZGameKit3D.part({ shape: "box", material: "brilho", color: "#fca5a5", w: 0.35, h: 0.18, d: 0.2, x: 0, y: 0.75, z: 0.55 });
  SZGameKit3D.part({ shape: "cone", color: "#7f1d1d", w: 0.4, h: 0.5, d: 0.4, x: 0, y: 1.35, z: 0 });
});
SZGameKit3D.defineMold("tanque", { health: 45, speed: 2.2 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#7c3aed", w: 1.6, h: 1.4, d: 1.2, x: 0, y: 0.7, z: 0 });
  SZGameKit3D.part({ shape: "box", material: "brilho", color: "#c4b5fd", w: 0.6, h: 0.25, d: 0.2, x: 0, y: 1, z: 0.65 });
  SZGameKit3D.part({ shape: "cylinder", color: "#4c1d95", w: 0.8, h: 0.4, d: 0.8, x: 0, y: 1.6, z: 0 });
});
SZGameKit3D.defineMold("muralha", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#334155", w: 38, h: 3, d: 1, x: 0, y: 1.5, z: 0 });
});
SZGameKit3D.defineMold("muralhaLado", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#334155", w: 1, h: 3, d: 38, x: 0, y: 1.5, z: 0 });
});
SZGameKit3D.defineMold("parede", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#475569", w: 12, h: 3, d: 1, x: 0, y: 1.5, z: 0 });
});
SZGameKit3D.defineMold("paredeLado", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#475569", w: 1, h: 3, d: 12, x: 0, y: 1.5, z: 0 });
});
SZGameKit3D.setPhysics("heroi", "personagem");
SZGameKit3D.makeTrigger("tiro");
SZGameKit3D.makeSolid("muralha");
SZGameKit3D.makeSolid("muralhaLado");
SZGameKit3D.makeSolid("parede");
SZGameKit3D.makeSolid("paredeLado");
SZGameKit3D.defineEffect("faisca", { count: 14, colorFrom: "#fde047", colorTo: "#7f1d1d", spread: 4, sizeFrom: 0.35, sizeTo: 0, life: 0.4, gravity: 0 });
SZGameKit3D.defineEffect("choque", { count: 12, colorFrom: "#f43f5e", colorTo: "#111827", spread: 5, sizeFrom: 0.4, sizeTo: 0, life: 0.45, gravity: 0 });
SZGameKit3D.defineEffect("explosao", { count: 30, colorFrom: "#fb923c", colorTo: "#111827", spread: 8, sizeFrom: 0.6, sizeTo: 0, life: 0.7, gravity: -6 });
let restantes = 5;
let proximoTiro = 0;
SZGameKit3D.onEnterState("jogando", function () {
  restantes = 5;
  proximoTiro = 0;
  SZGameKit3D.setSeed(7);
  SZGameKit3D.setAmbient(0.4);
  SZGameKit3D.setFog("#0b1120", 10, 38);
  SZGameKit3D.addLight("#f97316", 0, 6, 0, 1.4);
  SZGameKit3D.spawn("muralha", 0, 0, 17);
  SZGameKit3D.spawn("muralha", 0, 0, -17);
  SZGameKit3D.spawn("muralhaLado", 17, 0, 0);
  SZGameKit3D.spawn("muralhaLado", -17, 0, 0);
  SZGameKit3D.spawn("parede", -6, 0, 8);
  SZGameKit3D.spawn("parede", 6, 0, -8);
  SZGameKit3D.spawn("parede", 0, 0, 0);
  SZGameKit3D.spawn("paredeLado", 8, 0, 6);
  SZGameKit3D.spawn("paredeLado", -8, 0, -6);
  SZGameKit3D.spawn("vigia", -12, 0, 12);
  SZGameKit3D.spawn("vigia", 12, 0, 12);
  SZGameKit3D.spawn("vigia", 12, 0, -12);
  SZGameKit3D.spawn("tanque", -12, 0, -12);
  SZGameKit3D.spawn("tanque", 5, 0, 5);
  const jogador = SZGameKit3D.spawn("heroi", 0, 1, -13);
  SZGameKit3D.cameraFps(jogador);
  SZGameKit3D.say(jogador, "Limpe o labirinto!", 2);
});
SZGameKit3D.onEntityStateUpdate("heroi", "parado", function (ela, dt) {
  SZGameKit3D.moveFps(ela, 7);
  proximoTiro = proximoTiro - dt;
  if (SZGameKit3D.mousePressed() && proximoTiro <= 0) {
    SZGameKit3D.spawnFrom("tiro", ela);
    SZGameKit3D.playEffect("laser");
    proximoTiro = 0.5;
  }
  SZGameKit3D.setHud("top-left", "Vida: " + SZGameKit3D.healthOf(ela));
});
SZGameKit3D.onEntityStateUpdate("tiro", "parado", function (ela, dt) {
  SZGameKit3D.moveForward(ela, 26);
});
SZGameKit3D.stateTimer("tiro", "parado", 1.1, "sumir");
SZGameKit3D.onEnterEntityState("tiro", "sumir", function (ela) {
  SZGameKit3D.recycle(ela);
});
SZGameKit3D.stateTimer("vigia", "parado", 0.2, "patrulhar");
SZGameKit3D.onEnterEntityState("vigia", "patrulhar", function (ela) {
  SZGameKit3D.setEntityValue(ela, "alvoX", SZGameKit3D.randomBetween(-13, 13));
  SZGameKit3D.setEntityValue(ela, "alvoZ", SZGameKit3D.randomBetween(-13, 13));
});
SZGameKit3D.onEntityStateUpdate("vigia", "patrulhar", function (ela, dt) {
  SZGameKit3D.seekPoint(ela, SZGameKit3D.entityValue(ela, "alvoX"), SZGameKit3D.entityValue(ela, "alvoZ"));
  SZGameKit3D.faceVelocity(ela);
  if (SZGameKit3D.randomChance(1)) {
    SZGameKit3D.setEntityValue(ela, "alvoX", SZGameKit3D.randomBetween(-13, 13));
    SZGameKit3D.setEntityValue(ela, "alvoZ", SZGameKit3D.randomBetween(-13, 13));
  }
  const alvo = SZGameKit3D.nearest("heroi", ela);
  if (SZGameKit3D.exists(alvo) && SZGameKit3D.touches(ela, alvo, 9)) {
    SZGameKit3D.setEntityState(ela, "perseguir");
    SZGameKit3D.say(ela, "Te vi!", 1);
  }
});
SZGameKit3D.onEntityStateUpdate("vigia", "perseguir", function (ela, dt) {
  const alvo = SZGameKit3D.nearest("heroi", ela);
  if (!SZGameKit3D.exists(alvo)) {
    SZGameKit3D.setEntityState(ela, "patrulhar");
  } else {
    SZGameKit3D.seekPoint(ela, SZGameKit3D.posOf(alvo, "x"), SZGameKit3D.posOf(alvo, "z"));
    SZGameKit3D.faceVelocity(ela);
    if (SZGameKit3D.touches(ela, alvo, 1.6)) {
      SZGameKit3D.setEntityState(ela, "atacar");
    }
    if (!SZGameKit3D.touches(ela, alvo, 12)) {
      SZGameKit3D.setEntityState(ela, "patrulhar");
    }
  }
});
SZGameKit3D.onEnterEntityState("vigia", "atacar", function (ela) {
  const alvo = SZGameKit3D.nearest("heroi", ela);
  if (SZGameKit3D.exists(alvo)) {
    SZGameKit3D.hurt(alvo, 8);
    SZGameKit3D.burstOn("choque", ela);
  }
});
SZGameKit3D.stateTimer("vigia", "atacar", 0.8, "perseguir");
SZGameKit3D.stateTimer("tanque", "parado", 0.2, "patrulhar");
SZGameKit3D.onEnterEntityState("tanque", "patrulhar", function (ela) {
  SZGameKit3D.setEntityValue(ela, "alvoX", SZGameKit3D.randomBetween(-13, 13));
  SZGameKit3D.setEntityValue(ela, "alvoZ", SZGameKit3D.randomBetween(-13, 13));
});
SZGameKit3D.onEntityStateUpdate("tanque", "patrulhar", function (ela, dt) {
  SZGameKit3D.seekPoint(ela, SZGameKit3D.entityValue(ela, "alvoX"), SZGameKit3D.entityValue(ela, "alvoZ"));
  SZGameKit3D.faceVelocity(ela);
  if (SZGameKit3D.randomChance(1)) {
    SZGameKit3D.setEntityValue(ela, "alvoX", SZGameKit3D.randomBetween(-13, 13));
    SZGameKit3D.setEntityValue(ela, "alvoZ", SZGameKit3D.randomBetween(-13, 13));
  }
  const alvo = SZGameKit3D.nearest("heroi", ela);
  if (SZGameKit3D.exists(alvo) && SZGameKit3D.touches(ela, alvo, 7)) {
    SZGameKit3D.setEntityState(ela, "perseguir");
    SZGameKit3D.say(ela, "Intruso!", 1);
  }
});
SZGameKit3D.onEntityStateUpdate("tanque", "perseguir", function (ela, dt) {
  const alvo = SZGameKit3D.nearest("heroi", ela);
  if (!SZGameKit3D.exists(alvo)) {
    SZGameKit3D.setEntityState(ela, "patrulhar");
  } else {
    SZGameKit3D.seekPoint(ela, SZGameKit3D.posOf(alvo, "x"), SZGameKit3D.posOf(alvo, "z"));
    SZGameKit3D.faceVelocity(ela);
    if (SZGameKit3D.touches(ela, alvo, 1.8)) {
      SZGameKit3D.setEntityState(ela, "atacar");
    }
    if (!SZGameKit3D.touches(ela, alvo, 10)) {
      SZGameKit3D.setEntityState(ela, "patrulhar");
    }
  }
});
SZGameKit3D.onEnterEntityState("tanque", "atacar", function (ela) {
  const alvo = SZGameKit3D.nearest("heroi", ela);
  if (SZGameKit3D.exists(alvo)) {
    SZGameKit3D.hurt(alvo, 15);
    SZGameKit3D.burstOn("choque", ela);
  }
});
SZGameKit3D.stateTimer("tanque", "atacar", 1.2, "perseguir");
SZGameKit3D.onOverlap("tiro", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "vigia") || SZGameKit3D.isMold(quem, "tanque")) {
    SZGameKit3D.hurt(quem, 15);
    SZGameKit3D.burstOn("faisca", quem);
    SZGameKit3D.playEffect("hit");
    SZGameKit3D.recycle(zona);
  }
  if (!SZGameKit3D.isMold(quem, "heroi") && !SZGameKit3D.isMold(quem, "vigia") && !SZGameKit3D.isMold(quem, "tanque") && !SZGameKit3D.isMold(quem, "tiro")) {
    SZGameKit3D.recycle(zona);
  }
});
SZGameKit3D.onHurt("heroi", function (ela) {
  SZGameKit3D.cameraShake(0.5, 0.4);
  SZGameKit3D.playEffect("hurt");
});
SZGameKit3D.onEntityDeath("vigia", function (ela) {
  SZGameKit3D.burstOn("explosao", ela);
  SZGameKit3D.playEffect("explosion");
});
SZGameKit3D.onEntityDeath("tanque", function (ela) {
  SZGameKit3D.burstOn("explosao", ela);
  SZGameKit3D.playEffect("explosion");
});
SZGameKit3D.onEntityDeath("heroi", function (ela) {
  SZGameKit3D.burstOn("explosao", ela);
  SZGameKit3D.playEffect("gameover");
  SZGameKit3D.endGame();
});
SZGameKit3D.onUpdate(function (dt) {
  SZGameKit3D.cullFar("tiro", 34);
  restantes = SZGameKit3D.countAlive("vigia") + SZGameKit3D.countAlive("tanque");
  SZGameKit3D.setHud("top-right", "Robôs: " + restantes);
  if (restantes < 1) {
    SZGameKit3D.playEffect("win");
    SZGameKit3D.setState("vitoria");
  }
});
SZGameKit3D.start();
`.trim()

// Só gera quando RODADO direto — o drift test importa o SOURCE daqui (uma cópia
// só do fonte; duas divergiriam em silêncio). Emite a IR JÁ normalizada (o
// mesmo pipeline do drift: normalizeSZIR bucketiza start/events/loops e some
// com o boot start()), pronta para colar como `.ir` do exemplo em examples.ts.
if (import.meta.main) {
  const js = parseJS(LABIRINTO_PROFISSIONAL_SOURCE)
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
    name: 'Labirinto dos Robôs Profissional',
    experience: 'game',
    description:
      'Um FPS de labirinto: trave a mira, ande com WASD e atire com o clique. Robôs de dois tipos patrulham, perseguem e atacam com cérebro de 3 estados. Desligue todos. Tudo de peças, sem imagem.',
    ir: {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d-advanced' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const labirintoDosRobosProfissionalExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
