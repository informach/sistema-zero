import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes } from './exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Reunir o Rebanho Profissional". Rode com
 * `bun src/official-extensions/game-3d-advanced/__gen_reunirRebanhoProfissional.ts`
 * e cole a saída em examples.ts. O drift test
 * (`reunirRebanhoProfissionalExample.test.ts`) guarda o resultado.
 *
 * O Entity Management do curso SimonDev no motor avançado (nível 2 da família
 * "Reunir o Rebanho"): muitas entidades autônomas com FSM POR-ENTIDADE. Cada
 * bichinho vive numa máquina de estados (vagando → seguindo) e o rebanho é
 * GERENCIADO pela vizinhança do motor: no estado "vagando" ele anda a pontos
 * sorteados (seekPoint) e checa `nearest("pastor")` — se o pastor (você, terceira
 * pessoa com cameraFollow, WASD/setas via place) chega perto (touches), ele muda
 * de estado e passa a SEGUIR (seekPoint na posição do pastor). O curral é a ÚNICA
 * zona (makeTrigger): um seguidor que a toca é entregue (recycle + ponto). Reúna
 * 8 antes do tempo acabar. ⭐ o filtro do onOverlap por isMold("bicho") E
 * entityStateIs("seguindo") impede o pastor e os que só vagam de contarem ponto.
 * Sorteio 100% do kit sob setSeed. Tudo procedural, sem .glb.
 */
export const REUNIR_REBANHO_PROFISSIONAL_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 60, sky: "#7dd3fc", ground: "#166534" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.1, vignette: true });
SZGameKit3D.setScreenText("menu", "Reunir o Rebanho Profissional", "Ande com WASD ou as setas. Chegue perto dos bichinhos que vagam para eles seguirem você e leve o rebanho ao curral dourado. Reúna 8 antes do tempo acabar!", "Pastorear");
SZGameKit3D.setScreenText("vitoria", "Rebanho reunido!", "Você guiou 8 bichinhos até o curral. Que pastor!", "Pastorear de novo");
SZGameKit3D.setScreenText("fim", "O tempo acabou...", "Faltaram bichinhos no curral. Chegue perto para eles seguirem e leve o grupo junto!", "Tentar de novo");
SZGameKit3D.defineMold("pastor", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#0ea5e9", w: 0.9, h: 1.2, d: 0.9, x: 0, y: 0.6, z: 0 });
  SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#fbbf24", w: 0.7, h: 0.5, d: 0.7, x: 0, y: 1.35, z: 0 });
});
SZGameKit3D.defineMold("bicho", { health: 1, speed: 4.5 }, function () {
  SZGameKit3D.part({ shape: "sphere", color: "#f8fafc", w: 1, h: 0.9, d: 1.1, x: 0, y: 0.5, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#1f2937", w: 0.35, h: 0.35, d: 0.35, x: 0, y: 0.6, z: 0.55 });
});
SZGameKit3D.defineMold("curral", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", material: "brilho", color: "#fbbf24", w: 6, h: 0.3, d: 6, x: 0, y: 0.15, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#b45309", w: 6, h: 1, d: 0.3, x: 0, y: 0.5, z: -3 });
  SZGameKit3D.part({ shape: "box", color: "#b45309", w: 0.3, h: 1, d: 6, x: -3, y: 0.5, z: 0 });
});
SZGameKit3D.makeTrigger("curral");
SZGameKit3D.defineEffect("laco", { count: 14, colorFrom: "#22d3ee", colorTo: "#0369a1", spread: 4, sizeFrom: 0.35, sizeTo: 0, life: 0.4, gravity: 0 });
SZGameKit3D.defineEffect("entrega", { count: 22, colorFrom: "#fde047", colorTo: "#166534", spread: 6, sizeFrom: 0.5, sizeTo: 0, life: 0.6, gravity: 2 });
let pontos = 0;
let tempoRestante = 75;
let pastorX = 0;
let pastorZ = 8;
let proximoBicho = 1.5;
SZGameKit3D.onEnterState("jogando", function () {
  pontos = 0;
  tempoRestante = 75;
  pastorX = 0;
  pastorZ = 8;
  proximoBicho = 1.5;
  SZGameKit3D.setSeed(5);
  SZGameKit3D.setAmbient(0.55);
  SZGameKit3D.setFog("#7dd3fc", 55, 120);
  SZGameKit3D.addLight("#fef9c3", -8, 14, -6, 1.2);
  SZGameKit3D.spawn("curral", 16, 0, 16);
  SZGameKit3D.spawn("bicho", -12, 0.5, -6);
  SZGameKit3D.spawn("bicho", -6, 0.5, 10);
  SZGameKit3D.spawn("bicho", 4, 0.5, -12);
  SZGameKit3D.spawn("bicho", 12, 0.5, -4);
  SZGameKit3D.spawn("bicho", -14, 0.5, 6);
  SZGameKit3D.spawn("bicho", 8, 0.5, 8);
  SZGameKit3D.spawn("bicho", -2, 0.5, -14);
  SZGameKit3D.spawn("bicho", 14, 0.5, 12);
  const guia = SZGameKit3D.spawn("pastor", 0, 1, 8);
  SZGameKit3D.cameraFollow(guia, 16, 13);
  SZGameKit3D.cameraSmooth(6);
  SZGameKit3D.say(guia, "Toca o rebanho!", 2);
});
SZGameKit3D.onEntityStateUpdate("pastor", "parado", function (ela, dt) {
  if (SZGameKit3D.keyDown("a") || SZGameKit3D.keyDown("esquerda")) {
    pastorX = pastorX - 13 * dt;
  }
  if (SZGameKit3D.keyDown("d") || SZGameKit3D.keyDown("direita")) {
    pastorX = pastorX + 13 * dt;
  }
  if (SZGameKit3D.keyDown("w") || SZGameKit3D.keyDown("cima")) {
    pastorZ = pastorZ - 13 * dt;
  }
  if (SZGameKit3D.keyDown("s") || SZGameKit3D.keyDown("baixo")) {
    pastorZ = pastorZ + 13 * dt;
  }
  if (pastorX < -24) {
    pastorX = -24;
  }
  if (pastorX > 24) {
    pastorX = 24;
  }
  if (pastorZ < -24) {
    pastorZ = -24;
  }
  if (pastorZ > 24) {
    pastorZ = 24;
  }
  SZGameKit3D.place(ela, pastorX, 1, pastorZ);
  SZGameKit3D.setHud("top-left", "Reunidos: " + pontos + " de 8");
});
SZGameKit3D.stateTimer("bicho", "parado", 0.2, "vagando");
SZGameKit3D.onEnterEntityState("bicho", "vagando", function (ela) {
  SZGameKit3D.setEntityValue(ela, "alvoX", SZGameKit3D.randomBetween(-16, 16));
  SZGameKit3D.setEntityValue(ela, "alvoZ", SZGameKit3D.randomBetween(-16, 16));
});
SZGameKit3D.onEntityStateUpdate("bicho", "vagando", function (ela, dt) {
  SZGameKit3D.seekPoint(ela, SZGameKit3D.entityValue(ela, "alvoX"), SZGameKit3D.entityValue(ela, "alvoZ"));
  SZGameKit3D.faceVelocity(ela);
  if (SZGameKit3D.randomChance(1)) {
    SZGameKit3D.setEntityValue(ela, "alvoX", SZGameKit3D.randomBetween(-16, 16));
    SZGameKit3D.setEntityValue(ela, "alvoZ", SZGameKit3D.randomBetween(-16, 16));
  }
  const guia = SZGameKit3D.nearest("pastor", ela);
  if (SZGameKit3D.exists(guia) && SZGameKit3D.touches(ela, guia, 3)) {
    SZGameKit3D.setEntityState(ela, "seguindo");
    SZGameKit3D.burstOn("laco", ela);
    SZGameKit3D.playEffect("coin");
  }
});
SZGameKit3D.onEntityStateUpdate("bicho", "seguindo", function (ela, dt) {
  const guia = SZGameKit3D.nearest("pastor", ela);
  if (!SZGameKit3D.exists(guia)) {
    SZGameKit3D.setEntityState(ela, "vagando");
  } else {
    SZGameKit3D.seekPoint(ela, SZGameKit3D.posOf(guia, "x"), SZGameKit3D.posOf(guia, "z"));
    SZGameKit3D.faceVelocity(ela);
  }
});
SZGameKit3D.onOverlap("curral", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "bicho") && SZGameKit3D.entityStateIs(quem, "seguindo")) {
    SZGameKit3D.burstOn("entrega", quem);
    SZGameKit3D.playEffect("coin");
    SZGameKit3D.recycle(quem);
    pontos = pontos + 1;
  }
});
SZGameKit3D.onUpdate(function (dt) {
  tempoRestante = tempoRestante - dt;
  proximoBicho = proximoBicho - dt;
  if (proximoBicho <= 0 && SZGameKit3D.countAlive("bicho") < 8) {
    proximoBicho = 3;
    SZGameKit3D.spawn("bicho", SZGameKit3D.randomBetween(-16, 16), 0.5, SZGameKit3D.randomBetween(-16, 16));
  }
  SZGameKit3D.setHud("top-right", "Tempo: " + Math.floor(tempoRestante) + "s");
  SZGameKit3D.setHud("bottom-right", "No campo: " + SZGameKit3D.countAlive("bicho"));
  if (pontos >= 8) {
    SZGameKit3D.playEffect("win");
    SZGameKit3D.setState("vitoria");
  }
  if (tempoRestante <= 0) {
    SZGameKit3D.playEffect("gameover");
    SZGameKit3D.setState("fim");
  }
});
SZGameKit3D.start();
`.trim()

// Só gera quando RODADO direto — o drift test importa o SOURCE daqui (uma cópia
// só do fonte; duas divergiriam em silêncio). Emite a IR JÁ normalizada (o mesmo
// pipeline do drift: normalizeSZIR bucketiza start/events/loops e some com o boot
// start()), pronta para colar como `.ir` do exemplo em examples.ts.
if (import.meta.main) {
  const js = parseJS(REUNIR_REBANHO_PROFISSIONAL_SOURCE)
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
    name: 'Reunir o Rebanho Profissional',
    experience: 'game',
    description:
      'Pastoreie no motor avançado: cada bichinho tem cérebro próprio (vagar e seguir). Chegue perto para o rebanho seguir você e leve o grupo ao curral. Reúna 8 antes do tempo. Tudo de peças, sem imagem.',
    ir: {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d-advanced' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const reunirRebanhoProfissionalExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
