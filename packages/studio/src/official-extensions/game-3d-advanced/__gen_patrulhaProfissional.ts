import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes } from './exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Patrulha Espacial Profissional". Rode com
 * `bun src/official-extensions/game-3d-advanced/__gen_patrulhaProfissional.ts`
 * e cole a saída em examples.ts. O drift test
 * (`patrulhaProfissionalExample.test.ts`) guarda o resultado.
 *
 * O Space Shooter do curso raylib no motor avançado (nível 2 da família
 * "Patrulha Espacial"): nave de peças vista de trás (cameraFollow) que anda SÓ
 * no eixo X (keyDown + clamp numa gaveta + place) com balanço senoidal, e
 * atira com espaço via keyPressed + spawnFrom + moveForward (a frente +Z do
 * kit). ⭐ COOLDOWN de 0,4 s DESDE O INÍCIO (a lição do review do Lote C: sem
 * ele, cliques afobados gastam tiros que os i-frames tornam inúteis).
 * ⭐ MORTE DRAMÁTICA (a lição do manifest do g3k): o meteoro atingido NÃO some
 * na hora — vira zona congelada no estado "morrendo" (setVelocity 0 + clarão),
 * o stateTimer de 0,25 s leva a "acabou" e SÓ ali explode e recicla. O gancho
 * de zona filtra por isMold E por entityStateIs("parado"): um meteoro morrendo
 * não machuca a nave nem conta ponto duplo (o playthrough prova). O meteoro é
 * a ÚNICA zona (makeTrigger): laser e nave são visitantes do mesmo onOverlap,
 * o que evita zona×zona. Meteoros nascem longe (+Z 58) com velocidade sorteada
 * somada à base crescente, giram por gaveta "giro" + setYaw e são reciclados
 * por cullFar. Vitória leve: 20 meteoros destruídos; derrota: 3 vidas com
 * i-frames do motor, tremor de câmera e vinheta. Sorteio 100% do kit sob
 * setSeed. Tudo procedural, sem .glb.
 */
export const PATRULHA_PROFISSIONAL_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 130, sky: "#020617", ground: "#0b1120" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.3, vignette: true });
SZGameKit3D.setScreenText("menu", "Patrulha Espacial Profissional", "Ande com A e D (ou as setas) e atire com espaço. O meteoro atingido brilha antes de explodir: destrua 20 para cumprir a patrulha!", "Patrulhar");
SZGameKit3D.setScreenText("vitoria", "Patrulha cumprida!", "Você destruiu 20 meteoros e o setor está seguro. Que pontaria!", "Patrulhar de novo");
SZGameKit3D.setScreenText("fim", "A nave caiu...", "Os meteoros venceram desta vez. Atire de longe e não pare de se mexer!", "Tentar de novo");
SZGameKit3D.defineMold("nave", { health: 3, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#94a3b8", w: 0.9, h: 0.4, d: 1.8, x: 0, y: 0.5, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#38bdf8", w: 2.4, h: 0.14, d: 0.8, x: 0, y: 0.45, z: -0.3 });
  SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#22d3ee", w: 0.4, h: 0.7, d: 0.4, x: 0, y: 0.55, z: 1 });
  SZGameKit3D.part({ shape: "cylinder", material: "brilho", color: "#f97316", w: 0.3, h: 0.3, d: 0.3, x: 0, y: 0.5, z: -1.05 });
});
SZGameKit3D.defineMold("laser", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", material: "brilho", color: "#4ade80", w: 0.18, h: 0.18, d: 1.1, x: 0, y: 0.5, z: 0.8 });
});
SZGameKit3D.defineMold("meteoro", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "sphere", color: "#78716c", w: 1.7, h: 1.7, d: 1.7, x: 0, y: 0, z: 0 });
  SZGameKit3D.part({ shape: "sphere", color: "#57534e", w: 0.6, h: 0.6, d: 0.6, x: 0.6, y: 0.45, z: 0.35 });
  SZGameKit3D.part({ shape: "sphere", color: "#44403c", w: 0.5, h: 0.5, d: 0.5, x: -0.55, y: -0.25, z: 0.5 });
});
SZGameKit3D.setPhysics("nave", "flutuante");
SZGameKit3D.makeTrigger("meteoro");
SZGameKit3D.defineEffect("clarao", { count: 26, colorFrom: "#f8fafc", colorTo: "#fde047", spread: 6, sizeFrom: 0.5, sizeTo: 0, life: 0.3, gravity: 0 });
SZGameKit3D.defineEffect("explosao", { count: 34, colorFrom: "#fb923c", colorTo: "#111827", spread: 9, sizeFrom: 0.7, sizeTo: 0, life: 0.7, gravity: -4 });
SZGameKit3D.defineEffect("choque", { count: 16, colorFrom: "#f43f5e", colorTo: "#111827", spread: 5, sizeFrom: 0.45, sizeTo: 0, life: 0.5, gravity: 0 });
SZGameKit3D.defineEmitter("turbina", { colorFrom: "#38bdf8", colorTo: "#0f172a", sizeFrom: 0.3, sizeTo: 0, rate: 40, speed: 5, cone: 14, gravity: 0, glow: true });
let pontos = 0;
let tempoDeJogo = 0;
let velocidade = 12;
let naveX = 0;
let balanco = 0;
let proximoTiro = 0;
let proximoMeteoro = 1.2;
SZGameKit3D.onEnterState("jogando", function () {
  pontos = 0;
  tempoDeJogo = 0;
  velocidade = 12;
  naveX = 0;
  balanco = 0;
  proximoTiro = 0;
  proximoMeteoro = 1.2;
  SZGameKit3D.setSeed(9);
  SZGameKit3D.setAmbient(0.35);
  SZGameKit3D.setFog("#020617", 45, 120);
  SZGameKit3D.addLight("#38bdf8", 0, 12, -10, 1.3);
  const patrulheira = SZGameKit3D.spawn("nave", 0, 1, 0);
  SZGameKit3D.cameraFollow(patrulheira, 10, 4);
  SZGameKit3D.cameraSmooth(6);
  SZGameKit3D.emitterOn("turbina", patrulheira);
  SZGameKit3D.say(patrulheira, "Patrulha iniciada!", 2);
});
SZGameKit3D.onEntityStateUpdate("nave", "parado", function (ela, dt) {
  if (SZGameKit3D.keyDown("a") || SZGameKit3D.keyDown("esquerda")) {
    naveX = naveX - 16 * dt;
  }
  if (SZGameKit3D.keyDown("d") || SZGameKit3D.keyDown("direita")) {
    naveX = naveX + 16 * dt;
  }
  if (naveX < -9) {
    naveX = -9;
  }
  if (naveX > 9) {
    naveX = 9;
  }
  balanco = balanco + dt;
  SZGameKit3D.place(ela, naveX, 1 + Math.sin(balanco * 5) * 0.2, 0);
  proximoTiro = proximoTiro - dt;
  if (SZGameKit3D.keyPressed("espaco") && proximoTiro <= 0) {
    SZGameKit3D.spawnFrom("laser", ela);
    SZGameKit3D.playEffect("laser");
    proximoTiro = 0.4;
  }
  SZGameKit3D.setHud("top-left", "Vida: " + SZGameKit3D.healthOf(ela));
});
SZGameKit3D.onEntityStateUpdate("laser", "parado", function (ela, dt) {
  SZGameKit3D.moveForward(ela, 42);
});
SZGameKit3D.stateTimer("laser", "parado", 1.6, "sumir");
SZGameKit3D.onEnterEntityState("laser", "sumir", function (ela) {
  SZGameKit3D.recycle(ela);
});
SZGameKit3D.onEntityStateUpdate("meteoro", "parado", function (ela, dt) {
  SZGameKit3D.setEntityValue(ela, "giro", SZGameKit3D.entityValue(ela, "giro") + 90 * dt);
  SZGameKit3D.setYaw(ela, SZGameKit3D.entityValue(ela, "giro"));
});
SZGameKit3D.stateTimer("meteoro", "morrendo", 0.25, "acabou");
SZGameKit3D.onEnterEntityState("meteoro", "acabou", function (ela) {
  SZGameKit3D.burstOn("explosao", ela);
  SZGameKit3D.playEffect("explosion");
  SZGameKit3D.recycle(ela);
});
SZGameKit3D.onOverlap("meteoro", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "laser") && SZGameKit3D.entityStateIs(zona, "parado")) {
    SZGameKit3D.recycle(quem);
    SZGameKit3D.setVelocity(zona, 0, 0, 0);
    SZGameKit3D.setEntityState(zona, "morrendo");
    SZGameKit3D.burstOn("clarao", zona);
    SZGameKit3D.playEffect("hit");
    pontos = pontos + 1;
    velocidade = velocidade + 0.3;
  }
  if (SZGameKit3D.isMold(quem, "nave") && SZGameKit3D.entityStateIs(zona, "parado")) {
    SZGameKit3D.burstOn("choque", zona);
    SZGameKit3D.recycle(zona);
    SZGameKit3D.hurt(quem, 1);
  }
});
SZGameKit3D.onHurt("nave", function (ela) {
  SZGameKit3D.cameraShake(0.6, 0.45);
  SZGameKit3D.playEffect("hurt");
});
SZGameKit3D.onEntityDeath("nave", function (ela) {
  SZGameKit3D.burstOn("explosao", ela);
  SZGameKit3D.playEffect("gameover");
  SZGameKit3D.endGame();
});
SZGameKit3D.onUpdate(function (dt) {
  tempoDeJogo = tempoDeJogo + dt;
  velocidade = velocidade + dt * 0.3;
  if (velocidade > 30) {
    velocidade = 30;
  }
  proximoMeteoro = proximoMeteoro - dt;
  if (proximoMeteoro <= 0) {
    proximoMeteoro = 22 / velocidade;
    const pedra = SZGameKit3D.spawn("meteoro", SZGameKit3D.randomBetween(-9, 9), 1, 58);
    SZGameKit3D.setVelocity(pedra, 0, 0, 0 - (velocidade + SZGameKit3D.randomBetween(0, 6)));
    SZGameKit3D.setEntityValue(pedra, "giro", SZGameKit3D.randomBetween(0, 360));
  }
  SZGameKit3D.cullFar("meteoro", 90);
  SZGameKit3D.cullFar("laser", 80);
  SZGameKit3D.setHud("top-right", "Meteoros: " + pontos + " de 20");
  SZGameKit3D.setHud("bottom-right", "Tempo: " + Math.floor(tempoDeJogo) + "s");
  if (pontos >= 20) {
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
  const js = parseJS(PATRULHA_PROFISSIONAL_SOURCE)
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
    name: 'Patrulha Espacial Profissional',
    experience: 'game',
    description:
      'Pilote a nave vista de trás: ande para os lados, atire lasers e destrua 20 meteoros. O atingido brilha antes de explodir, a chuva acelera e cada batida treme a câmera. Tudo de peças, sem imagem.',
    ir: {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d-advanced' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const patrulhaEspacialProfissionalExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
