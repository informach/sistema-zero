import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes } from './exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Corrida Infinita Profissional". Rode com
 * `bun src/official-extensions/game-3d-advanced/__gen_corridaProfissional.ts` e
 * cole a saída em examples.ts. O drift test
 * (`corridaProfissionalExample.test.ts`) guarda o resultado.
 *
 * O RUNNER infinito do motor avançado (nível 2 da família "Corrida Infinita"):
 * o herói fica preso na pista e só troca de faixa (A/D ou setas) e pula
 * (espaço, com a física do kit: personagem + jump/onGround). Barreiras, moedas
 * e árvores nascem LONGE à frente em cadência própria (relógios por dt no
 * onUpdate) e vêm até ele por setVelocity; cullFar recicla o que passou.
 * Moeda = zona (burst + som + ponto); barreira = zona (tremor + fim de jogo).
 * A dificuldade sobe com o tempo E com cada moeda. Sorteio 100% do kit
 * (randomBetween/randomChance) sob setSeed. Tudo procedural, sem .glb.
 */
export const CORRIDA_PROFISSIONAL_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 100, sky: "#0f172a", ground: "#1e293b" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.2, vignette: true });
SZGameKit3D.setScreenText("menu", "Corrida Infinita Profissional", "Troque de faixa com A e D (ou as setas) e pule com espaço. Desvie das barreiras, pegue moedas e aguente firme: a corrida acelera sem parar!", "Correr");
SZGameKit3D.setScreenText("fim", "Bateu!", "A pista venceu desta vez. Desvie das barreiras e pegue mais moedas na próxima!", "Correr de novo");
SZGameKit3D.defineMold("heroi", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#fb923c", w: 0.9, h: 1.1, d: 0.9, x: 0, y: 0.55, z: 0 });
  SZGameKit3D.part({ shape: "sphere", color: "#ffedd5", w: 0.7, h: 0.7, d: 0.7, x: 0, y: 1.3, z: 0 });
  SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#22d3ee", w: 0.3, h: 0.5, d: 0.3, x: 0, y: 0.9, z: 0.5 });
});
SZGameKit3D.defineMold("obstaculo", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#7f1d1d", w: 2.4, h: 1.2, d: 0.8, x: 0, y: 0.6, z: 0 });
  SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#f97316", w: 0.5, h: 0.6, d: 0.5, x: -0.8, y: 1.5, z: 0 });
  SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#f97316", w: 0.5, h: 0.6, d: 0.5, x: 0, y: 1.5, z: 0 });
  SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#f97316", w: 0.5, h: 0.6, d: 0.5, x: 0.8, y: 1.5, z: 0 });
});
SZGameKit3D.defineMold("moeda", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "torus", material: "brilho", color: "#fde047", w: 0.9, h: 0.9, d: 0.35, x: 0, y: 0, z: 0 });
});
SZGameKit3D.defineMold("arvore", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "cylinder", color: "#78350f", w: 0.5, h: 1.6, d: 0.5, x: 0, y: 0.8, z: 0 });
  SZGameKit3D.part({ shape: "cone", color: "#166534", w: 1.8, h: 2.6, d: 1.8, x: 0, y: 2.6, z: 0 });
});
SZGameKit3D.defineMold("pista", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#334155", w: 10, h: 0.1, d: 96, x: 0, y: 0.05, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#facc15", w: 0.2, h: 0.12, d: 96, x: -1.5, y: 0.06, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#facc15", w: 0.2, h: 0.12, d: 96, x: 1.5, y: 0.06, z: 0 });
});
SZGameKit3D.setPhysics("heroi", "personagem");
SZGameKit3D.makeTrigger("obstaculo");
SZGameKit3D.makeTrigger("moeda");
SZGameKit3D.defineEffect("brilho", { count: 20, colorFrom: "#fde047", colorTo: "#0f172a", spread: 5, sizeFrom: 0.4, sizeTo: 0, life: 0.5, gravity: 2 });
SZGameKit3D.defineEffect("poeira", { count: 28, colorFrom: "#f97316", colorTo: "#0f172a", spread: 7, sizeFrom: 0.6, sizeTo: 0, life: 0.7, gravity: 3 });
let pontos = 0;
let tempoDeJogo = 0;
let velocidade = 12;
let faixa = 0;
let proximaBarreira = 1.2;
let proximaMoeda = 2;
let proximaArvore = 0.5;
SZGameKit3D.onEnterState("jogando", function () {
  pontos = 0;
  tempoDeJogo = 0;
  velocidade = 12;
  faixa = 0;
  proximaBarreira = 1.2;
  proximaMoeda = 2;
  proximaArvore = 0.5;
  SZGameKit3D.setSeed(21);
  SZGameKit3D.setAmbient(0.55);
  SZGameKit3D.setFog("#0f172a", 30, 85);
  SZGameKit3D.addLight("#38bdf8", 0, 14, -6, 1.3);
  SZGameKit3D.spawn("pista", 0, 0, 0);
  const heroi = SZGameKit3D.spawn("heroi", 0, 1, 0);
  SZGameKit3D.cameraFollow(heroi, 11, 5);
  SZGameKit3D.cameraSmooth(6);
  SZGameKit3D.say(heroi, "Corre!", 2);
});
SZGameKit3D.onEntityStateUpdate("heroi", "parado", function (ela, dt) {
  if (SZGameKit3D.keyPressed("a") || SZGameKit3D.keyPressed("esquerda")) {
    faixa = faixa - 1;
  }
  if (SZGameKit3D.keyPressed("d") || SZGameKit3D.keyPressed("direita")) {
    faixa = faixa + 1;
  }
  if (faixa < -1) {
    faixa = -1;
  }
  if (faixa > 1) {
    faixa = 1;
  }
  SZGameKit3D.place(ela, faixa * 3, SZGameKit3D.posOf(ela, "y"), 0);
  if (SZGameKit3D.keyPressed("espaco") && SZGameKit3D.onGround(ela)) {
    SZGameKit3D.jump(ela, 10);
    SZGameKit3D.playEffect("jump");
  }
});
SZGameKit3D.onUpdate(function (dt) {
  velocidade = velocidade + dt * 0.35;
  if (velocidade > 34) {
    velocidade = 34;
  }
  tempoDeJogo = tempoDeJogo + dt;
  proximaBarreira = proximaBarreira - dt;
  if (proximaBarreira <= 0) {
    proximaBarreira = 30 / velocidade;
    let lugarBarreira = 0;
    const sorteioBarreira = SZGameKit3D.randomBetween(0, 3);
    if (sorteioBarreira < 1) {
      lugarBarreira = -3;
    }
    if (sorteioBarreira > 2) {
      lugarBarreira = 3;
    }
    const barreira = SZGameKit3D.spawn("obstaculo", lugarBarreira, 0, 45);
    SZGameKit3D.setVelocity(barreira, 0, 0, 0 - velocidade);
  }
  proximaMoeda = proximaMoeda - dt;
  if (proximaMoeda <= 0) {
    proximaMoeda = 20 / velocidade;
    let lugarMoeda = 0;
    const sorteioMoeda = SZGameKit3D.randomBetween(0, 3);
    if (sorteioMoeda < 1) {
      lugarMoeda = -3;
    }
    if (sorteioMoeda > 2) {
      lugarMoeda = 3;
    }
    const moeda = SZGameKit3D.spawn("moeda", lugarMoeda, 1.1, 45);
    SZGameKit3D.setVelocity(moeda, 0, 0, 0 - velocidade);
  }
  proximaArvore = proximaArvore - dt;
  if (proximaArvore <= 0) {
    proximaArvore = 16 / velocidade;
    let ladoArvore = 8;
    if (SZGameKit3D.randomChance(50)) {
      ladoArvore = -8;
    }
    const arvore = SZGameKit3D.spawn("arvore", ladoArvore, 0, 45);
    SZGameKit3D.setVelocity(arvore, 0, 0, 0 - velocidade);
  }
  SZGameKit3D.cullFar("obstaculo", 60);
  SZGameKit3D.cullFar("moeda", 60);
  SZGameKit3D.cullFar("arvore", 60);
  SZGameKit3D.setHud("top-left", "Moedas: " + pontos);
  SZGameKit3D.setHud("top-right", "Tempo: " + Math.floor(tempoDeJogo) + "s");
});
SZGameKit3D.onOverlap("moeda", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "heroi")) {
    SZGameKit3D.burstOn("brilho", zona);
    SZGameKit3D.playEffect("coin");
    SZGameKit3D.recycle(zona);
    pontos = pontos + 1;
    velocidade = velocidade + 0.2;
  }
});
SZGameKit3D.onOverlap("obstaculo", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "heroi")) {
    SZGameKit3D.burstOn("poeira", zona);
    SZGameKit3D.playEffect("gameover");
    SZGameKit3D.cameraShake(0.6, 0.5);
    SZGameKit3D.endGame();
  }
});
SZGameKit3D.start();
`.trim()

// Só gera quando RODADO direto — o drift test importa o SOURCE daqui (uma cópia
// só do fonte; duas divergiriam em silêncio). Emite a IR JÁ normalizada (o
// mesmo pipeline do drift: normalizeSZIR bucketiza start/events/loops e some
// com o boot start()), pronta para colar como `.ir` do exemplo em examples.ts.
if (import.meta.main) {
  const js = parseJS(CORRIDA_PROFISSIONAL_SOURCE)
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
    name: 'Corrida Infinita Profissional',
    experience: 'game',
    description:
      'Corra sem fim numa pista de três faixas: troque de faixa, pule as barreiras e pegue moedas. O jogo acelera com o tempo e cada batida treme a câmera. Tudo de peças, no motor avançado.',
    ir: {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d-advanced' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const corridaInfinitaProfissionalExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
