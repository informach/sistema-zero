import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes } from './exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "O Chefão das Sombras" (v0.9.0). Rode com
 * `bun src/official-extensions/game-3d-advanced/__gen_chefao.ts` e cole a saída
 * em examples.ts. O drift test (`chefaoExample.test.ts`) guarda o resultado.
 *
 * A vitrine do gênero CHEFÃO: a FSM do kit em 3 FASES trocadas por "quando levar
 * dano" (onHurt) lendo a própria vida, o ataque em ANEL (spawnRing / bullet-hell)
 * e a cura entre fases (heal) — os três blocos novos. Câmera de cima, ponto-e-
 * clique no chefão (mousePressed + pick), o herói desvia dos tiros com WASD.
 */
export const CHEFAO_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 50, sky: "#1e1b4b", ground: "#312e81" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.4, vignette: true });
SZGameKit3D.setScreenText("menu", "O Chefão das Sombras", "Clique no chefão para atacar e desvie do anel de tiros com WASD. Ele fica mais bravo (e se cura) a cada fase!", "Enfrentar");
SZGameKit3D.setScreenText("vitoria", "Sombra derrotada!", "Você venceu as três fases do chefão.", "Enfrentar de novo");
SZGameKit3D.setScreenText("fim", "O herói caiu...", "O anel de tiros te pegou. Desvie mais na próxima!", "Tentar de novo");
SZGameKit3D.defineMold("chefao", { health: 100, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "sphere", material: "metal", color: "#4c1d95", w: 3, h: 3, d: 3, x: 0, y: 0, z: 0 });
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#f472b6", w: 1.2, h: 1.2, d: 1.2, x: 0, y: 0, z: 0 });
  SZGameKit3D.part({ shape: "cone", color: "#a21caf", w: 0.6, h: 1.4, d: 0.6, x: 0, y: 2, z: 0 });
  SZGameKit3D.part({ shape: "cone", color: "#a21caf", w: 0.6, h: 1.4, d: 0.6, x: 1.6, y: 0, z: 0 });
  SZGameKit3D.part({ shape: "cone", color: "#a21caf", w: 0.6, h: 1.4, d: 0.6, x: -1.6, y: 0, z: 0 });
});
SZGameKit3D.defineMold("heroi", { health: 60, speed: 8 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#22d3ee", w: 0.9, h: 1, d: 0.9, x: 0, y: 0.5, z: 0 });
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#a5f3fc", w: 0.7, h: 0.7, d: 0.7, x: 0, y: 1.3, z: 0 });
});
SZGameKit3D.defineMold("tiro", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#f472b6", w: 0.5, h: 0.5, d: 0.5, x: 0, y: 0, z: 0 });
});
SZGameKit3D.showHealthBar("chefao", true);
SZGameKit3D.showHealthBar("heroi", true);
SZGameKit3D.defineEffect("explosao", { count: 30, colorFrom: "#f472b6", colorTo: "#1e1b4b", spread: 8, sizeFrom: 0.7, sizeTo: 0, life: 0.7, gravity: -2 });
SZGameKit3D.defineEffect("faisca", { count: 10, colorFrom: "#a5f3fc", colorTo: "#4c1d95", spread: 3, sizeFrom: 0.3, sizeTo: 0, life: 0.3, gravity: 0 });
let fase = 1;
SZGameKit3D.onEnterState("jogando", function () {
  fase = 1;
  SZGameKit3D.setSeed(7);
  SZGameKit3D.setAmbient(0.5);
  SZGameKit3D.setFog("#1e1b4b", 30, 80);
  const chefe = SZGameKit3D.spawn("chefao", 0, 1.5, 0);
  const heroi = SZGameKit3D.spawn("heroi", 0, 1, 12);
  SZGameKit3D.cameraTop(40);
  SZGameKit3D.say(chefe, "Ninguém vence a Sombra!", 3);
});
SZGameKit3D.stateTimer("chefao", "parado", 1.5, "atirando");
SZGameKit3D.onEnterEntityState("chefao", "atirando", function (ela) {
  SZGameKit3D.spawnRing("tiro", 4 + fase * 2, ela, 7);
  SZGameKit3D.playEffect("laser");
  SZGameKit3D.cameraShake(0.3, 0.2);
  SZGameKit3D.setEntityState(ela, "parado");
});
SZGameKit3D.onHurt("chefao", function (ela) {
  const vida = SZGameKit3D.healthOf(ela);
  const teto = SZGameKit3D.maxHealthOf(ela);
  if (vida <= teto * 0.33 && fase < 3) {
    fase = 3;
    SZGameKit3D.say(ela, "Você vai se arrepender!", 2);
    SZGameKit3D.heal(ela, 8);
    SZGameKit3D.cameraShake(0.6, 0.4);
  } else if (vida <= teto * 0.66 && fase < 2) {
    fase = 2;
    SZGameKit3D.say(ela, "Impossível!", 2);
    SZGameKit3D.heal(ela, 8);
    SZGameKit3D.cameraShake(0.4, 0.3);
  }
});
SZGameKit3D.onEntityStateUpdate("heroi", "parado", function (ela, dt) {
  SZGameKit3D.moveWithKeys(ela, 8);
  SZGameKit3D.faceVelocity(ela);
});
SZGameKit3D.onEntityStateUpdate("tiro", "parado", function (ela, dt) {
  SZGameKit3D.forEachNear(ela, "heroi", 1.4, function (vitima) {
    SZGameKit3D.hurt(vitima, 6);
    SZGameKit3D.burstOn("faisca", ela);
    SZGameKit3D.recycle(ela);
  });
});
SZGameKit3D.onEntityDeath("chefao", function (ela) {
  SZGameKit3D.burstOn("explosao", ela);
  SZGameKit3D.playEffect("win");
  SZGameKit3D.setState("vitoria");
});
SZGameKit3D.onEntityDeath("heroi", function (ela) {
  SZGameKit3D.burstOn("explosao", ela);
  SZGameKit3D.playEffect("gameover");
  SZGameKit3D.endGame();
});
SZGameKit3D.onUpdate(function (dt) {
  if (SZGameKit3D.mousePressed()) {
    const alvo = SZGameKit3D.pick("chefao");
    if (SZGameKit3D.exists(alvo)) {
      SZGameKit3D.hurt(alvo, 15);
      SZGameKit3D.burstOn("explosao", alvo);
      SZGameKit3D.playEffect("hit");
    }
  }
  SZGameKit3D.cullFar("tiro", 28);
  SZGameKit3D.setHud("top-left", "Fase " + fase + " de 3");
  SZGameKit3D.setHud("top-right", "Clique no chefão!");
});
SZGameKit3D.start();
`.trim()

// Só gera quando RODADO direto — o drift test importa o SOURCE daqui (uma cópia
// só do fonte; duas divergiriam em silêncio). Emite a IR JÁ normalizada (o
// mesmo pipeline do drift: normalizeSZIR bucketiza start/events/loops e some
// com o boot start()), pronta para colar como `.ir` do exemplo em examples.ts.
if (import.meta.main) {
  const js = parseJS(CHEFAO_SOURCE)
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
    name: 'O Chefão das Sombras',
    experience: 'game',
    description:
      'Enfrente um chefão em três fases: clique nele para atacar e desvie do anel de tiros. A cada fase ele fica mais bravo e se cura um pouco.',
    ir: {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d-advanced' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const chefaoDasSombrasExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
