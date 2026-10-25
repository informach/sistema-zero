import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes } from './exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "A Lenda do Herói Profissional". Rode com
 * `bun src/official-extensions/game-3d-advanced/__gen_aLendaDoHeroiProfissional.ts`
 * e cole a saída em examples.ts. O drift test
 * (`aLendaDoHeroiProfissionalExample.test.ts`) guarda o resultado.
 *
 * O RPG de ação do SimonDev (Quick_3D_RPG) recriado no motor avançado: um herói
 * em TERCEIRA PESSOA (cameraFollow, WASD/setas por moveWithKeys) que ATACA de
 * PERTO com a espada (barra de espaço ou clique → forEachNear + hurt). Cada golpe
 * é um APERTO (keyPressed, com recarga de meio segundo, a mesma dos i-frames do
 * monstro): segurar o espaço parado dá um golpe só, e os monstros vencem. Com o
 * keyDown, a espada virava uma aura que vencia o jogo sem a criança se mexer. Cada
 * monstro tem CÉREBRO PRÓPRIO (FSM por-entidade: vagando → perseguindo) e caça o
 * herói pela vizinhança do motor (nearest("heroi")). Encostar no herói tira um
 * coração (hurt com i-frames); a morte do monstro conta ponto (onEntityDeath).
 * O golpe EMPURRA o monstro para longe do herói (estado "empurrado": velocidade pra fora
 * e "Frear aos poucos", que zera ao sair), e meio segundo depois ele volta a perseguir.
 * Derrote 10 antes que os corações acabem. ⭐ DISTINTO do "Labirinto dos Robôs"
 * (1ª pessoa + tiro): aqui é 3ª pessoa + espada de perto. Tudo procedural, sem .glb.
 */
export const A_LENDA_DO_HEROI_PROFISSIONAL_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 55, sky: "#86efac", ground: "#14532d" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1, vignette: true });
SZGameKit3D.setScreenText("inicio", "A Lenda do Herói Profissional", "Ande com WASD ou as setas e ataque com a barra de espaço ou o clique. Cada monstro tem cérebro próprio: vaga pela clareira e persegue você. Derrote 10 antes que seus corações acabem!", "Começar a aventura");
SZGameKit3D.setScreenText("vitoria", "Herói lendário!", "Você derrotou os 10 monstros da clareira. A floresta está a salvo!", "Jogar de novo");
SZGameKit3D.setScreenText("fim", "O herói caiu...", "Os monstros foram demais. Ataque de perto e recue quando estiver sem corações!", "Tentar de novo");
SZGameKit3D.defineMold("heroi", { health: 6, speed: 9 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#2563eb", w: 0.9, h: 1.2, d: 0.9, x: 0, y: 0.6, z: 0 });
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#fcd34d", w: 0.75, h: 0.75, d: 0.75, x: 0, y: 1.45, z: 0 });
  SZGameKit3D.part({ shape: "box", material: "metal", color: "#e5e7eb", w: 0.18, h: 1.1, d: 0.18, x: 0.65, y: 0.95, z: 0.25 });
});
SZGameKit3D.defineMold("monstro", { health: 12, speed: 3.4 }, function () {
  SZGameKit3D.part({ shape: "sphere", color: "#7c3aed", w: 1.1, h: 1, d: 1.1, x: 0, y: 0.55, z: 0 });
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#f87171", w: 0.3, h: 0.3, d: 0.3, x: 0.25, y: 0.8, z: 0.5 });
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#f87171", w: 0.3, h: 0.3, d: 0.3, x: -0.25, y: 0.8, z: 0.5 });
  SZGameKit3D.part({ shape: "cone", color: "#4c1d95", w: 0.5, h: 0.6, d: 0.5, x: 0, y: 1.25, z: 0 });
});
SZGameKit3D.showHealthBar("heroi", true);
SZGameKit3D.showHealthBar("monstro", true);
SZGameKit3D.defineEffect("golpe", { count: 14, colorFrom: "#fde68a", colorTo: "#b45309", spread: 4, sizeFrom: 0.4, sizeTo: 0, life: 0.3, gravity: 0 });
SZGameKit3D.defineEffect("pofe", { count: 20, colorFrom: "#a78bfa", colorTo: "#14532d", spread: 6, sizeFrom: 0.6, sizeTo: 0, life: 0.5, gravity: 2 });
let derrotados = 0;
let proximoMonstro = 1.5;
let recarga = 0;
SZGameKit3D.onEnterState("jogando", function () {
  derrotados = 0;
  proximoMonstro = 1.5;
  recarga = 0;
  SZGameKit3D.setSeed(9);
  SZGameKit3D.setAmbient(0.6);
  SZGameKit3D.setFog("#86efac", 45, 110);
  SZGameKit3D.addLight("#fef9c3", -8, 16, -6, 1.2);
  const heroi = SZGameKit3D.spawn("heroi", 0, 1, 0);
  SZGameKit3D.cameraFollow(heroi, 14, 12);
  SZGameKit3D.cameraSmooth(6);
  SZGameKit3D.spawn("monstro", -12, 0.6, -8);
  SZGameKit3D.spawn("monstro", 11, 0.6, -10);
  SZGameKit3D.spawn("monstro", -9, 0.6, 11);
  SZGameKit3D.say(heroi, "Pela floresta!", 2);
});
SZGameKit3D.onEntityStateUpdate("heroi", "parado", function (ela, dt) {
  SZGameKit3D.moveWithKeys(ela, 9);
  SZGameKit3D.faceVelocity(ela);
  recarga = recarga - dt;
  if ((SZGameKit3D.keyPressed("Space") || SZGameKit3D.mousePressed()) && recarga <= 0) {
    recarga = 0.5;
    SZGameKit3D.forEachNear(ela, "monstro", 3, function (alvo) {
      SZGameKit3D.hurt(alvo, 6);
      SZGameKit3D.burstOn("golpe", alvo);
      SZGameKit3D.playEffect("hit");
      SZGameKit3D.setVelocity(alvo, (SZGameKit3D.posOf(alvo, "x") - SZGameKit3D.posOf(ela, "x")) * 6, 0, (SZGameKit3D.posOf(alvo, "z") - SZGameKit3D.posOf(ela, "z")) * 6);
      SZGameKit3D.setEntityState(alvo, "empurrado");
    });
  }
});
SZGameKit3D.stateTimer("monstro", "parado", 0.3, "vagando");
SZGameKit3D.onEnterEntityState("monstro", "vagando", function (ela) {
  SZGameKit3D.setEntityValue(ela, "alvoX", SZGameKit3D.randomBetween(-18, 18));
  SZGameKit3D.setEntityValue(ela, "alvoZ", SZGameKit3D.randomBetween(-18, 18));
});
SZGameKit3D.onEntityStateUpdate("monstro", "vagando", function (ela, dt) {
  SZGameKit3D.seekPoint(ela, SZGameKit3D.entityValue(ela, "alvoX"), SZGameKit3D.entityValue(ela, "alvoZ"));
  SZGameKit3D.faceVelocity(ela);
  if (SZGameKit3D.randomChance(1)) {
    SZGameKit3D.setEntityValue(ela, "alvoX", SZGameKit3D.randomBetween(-18, 18));
    SZGameKit3D.setEntityValue(ela, "alvoZ", SZGameKit3D.randomBetween(-18, 18));
  }
  const heroi = SZGameKit3D.nearest("heroi", ela);
  if (SZGameKit3D.exists(heroi) && SZGameKit3D.touches(ela, heroi, 9)) {
    SZGameKit3D.setEntityState(ela, "perseguindo");
  }
});
SZGameKit3D.onEntityStateUpdate("monstro", "perseguindo", function (ela, dt) {
  const heroi = SZGameKit3D.nearest("heroi", ela);
  if (!SZGameKit3D.exists(heroi)) {
    SZGameKit3D.setEntityState(ela, "vagando");
  } else {
    SZGameKit3D.seekPoint(ela, SZGameKit3D.posOf(heroi, "x"), SZGameKit3D.posOf(heroi, "z"));
    SZGameKit3D.faceVelocity(ela);
    if (SZGameKit3D.touches(ela, heroi, 1.6)) {
      SZGameKit3D.hurt(heroi, 1);
      SZGameKit3D.burstOn("pofe", heroi);
    }
    if (!SZGameKit3D.touches(ela, heroi, 13)) {
      SZGameKit3D.setEntityState(ela, "vagando");
    }
  }
});
SZGameKit3D.onEnterEntityState("monstro", "empurrado", function (ela) {
  SZGameKit3D.setDrag(ela, 5);
});
SZGameKit3D.onExitEntityState("monstro", "empurrado", function (ela) {
  SZGameKit3D.setDrag(ela, 0);
});
SZGameKit3D.stateTimer("monstro", "empurrado", 0.5, "perseguindo");
SZGameKit3D.onEntityDeath("monstro", function (ela) {
  SZGameKit3D.burstOn("pofe", ela);
  SZGameKit3D.playEffect("coin");
  derrotados = derrotados + 1;
});
SZGameKit3D.onEntityDeath("heroi", function (ela) {
  SZGameKit3D.burstOn("pofe", ela);
  SZGameKit3D.playEffect("gameover");
  SZGameKit3D.setState("fim");
});
SZGameKit3D.onUpdate(function (dt) {
  proximoMonstro = proximoMonstro - dt;
  if (proximoMonstro <= 0 && SZGameKit3D.countAlive("monstro") < 5) {
    proximoMonstro = 2.5;
    SZGameKit3D.spawn("monstro", SZGameKit3D.randomBetween(-18, 18), 0.6, SZGameKit3D.randomBetween(-18, 18));
  }
  SZGameKit3D.hudText("top-left", "Monstros: " + derrotados + " de 10");
  SZGameKit3D.hudText("top-right", "Ataque com espaço ou clique");
  if (derrotados >= 10) {
    SZGameKit3D.playEffect("win");
    SZGameKit3D.setState("vitoria");
  }
});
SZGameKit3D.start();
`.trim()

// Só gera quando RODADO direto — o drift test importa o SOURCE daqui (uma cópia
// só do fonte; duas divergiriam em silêncio). Emite a IR JÁ normalizada (o mesmo
// pipeline do drift: normalizeSZIR bucketiza start/events/loops e some com o boot
// start()), pronta para colar como `.ir` do exemplo em examples.ts.
if (import.meta.main) {
  const js = parseJS(A_LENDA_DO_HEROI_PROFISSIONAL_SOURCE)
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
    name: 'A Lenda do Herói Profissional',
    experience: 'game',
    description:
      'RPG de ação no motor avançado: herói em 3ª pessoa com espada. Cada monstro tem cérebro próprio que vaga e persegue. Ataque de perto e derrote 10 antes dos corações acabarem.',
    ir: {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d-advanced' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const aLendaDoHeroiProfissionalExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
