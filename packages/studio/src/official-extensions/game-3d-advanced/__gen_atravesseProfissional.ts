import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes } from './exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Atravesse a Rua Profissional". Rode com
 * `bun src/official-extensions/game-3d-advanced/__gen_atravesseProfissional.ts`
 * e cole a saída em examples/atravesseProfissional.ts. O drift test
 * (`atravesseProfissionalExample.test.ts`) guarda o resultado.
 *
 * O Crossy Road (hopper voxel do Hunor Borbely) recriado no motor avançado
 * (nível Profissional da família "Atravesse a Rua"): o boneco PULA em grade
 * (keyPressed muda a célula-alvo + seekPoint desliza suave até ela), atravessa
 * faixas onde CARROS cruzam a pista (spawnados no onUpdate em lanes à frente,
 * com setVelocity somando velocidade). ⭐ os carros são reciclados por X OFF-LANE
 * (forEachAlive + posOf(c,"x") > 16) e NÃO por cullFar: o herói se afasta da
 * origem (a câmera o segue), então cullFar esvaziaria o trânsito no terço final
 * (achado do full review). Cada carro é uma zona (makeTrigger): o onOverlap
 * filtra o visitante por isMold("heroi") e dá
 * o atropelamento (hurt -> onEntityDeath -> endGame). Vitória: chegar na faixa
 * 20; derrota: ser atropelado. Sorteio 100% do kit sob setSeed. Tudo de peças,
 * sem .glb.
 */
export const ATRAVESSE_PROFISSIONAL_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 80, sky: "#bfe3ff", ground: "#8ecb62" });
SZGameKit3D.setEffects({ shadows: true, bloom: false, strength: 1, vignette: true });
SZGameKit3D.setScreenText("menu", "Atravesse a Rua Profissional", "Pule com as setas (ou WASD) e atravesse 20 faixas sem ser atropelado. Espere a faixa abrir e pule na hora certa!", "Atravessar");
SZGameKit3D.setScreenText("vitoria", "Voce atravessou!", "Chegou do outro lado em seguranca depois de 20 faixas. Que reflexos!", "Jogar de novo");
SZGameKit3D.setScreenText("fim", "Foi atropelado!", "Um carro te pegou. Olhe as duas direcoes e pule na brecha!", "Tentar de novo");
SZGameKit3D.defineMold("heroi", { health: 1, speed: 16 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#f8fafc", w: 0.7, h: 0.7, d: 0.7, x: 0, y: 0.4, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#f0619a", w: 0.24, h: 0.24, d: 0.24, x: 0, y: 0.86, z: 0 });
});
SZGameKit3D.defineMold("carro", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#ef4444", w: 1.7, h: 0.5, d: 0.9, x: 0, y: 0.3, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#dbeafe", w: 0.8, h: 0.36, d: 0.86, x: -0.15, y: 0.66, z: 0 });
});
SZGameKit3D.setPhysics("heroi", "personagem");
SZGameKit3D.makeTrigger("carro");
SZGameKit3D.defineEffect("batida", { count: 24, colorFrom: "#f87171", colorTo: "#111827", spread: 5, sizeFrom: 0.5, sizeTo: 0, life: 0.5, gravity: -3 });
let linha = 0;
let coluna = 0;
let alvoX = 0;
let alvoZ = 0;
let proximoCarro = 0.8;
let velocidade = 7;
SZGameKit3D.onEnterState("jogando", function () {
  linha = 0;
  coluna = 0;
  alvoX = 0;
  alvoZ = 0;
  proximoCarro = 0.8;
  velocidade = 7;
  SZGameKit3D.setSeed(5);
  SZGameKit3D.setAmbient(0.7);
  SZGameKit3D.setFog("#bfe3ff", 44, 96);
  SZGameKit3D.addLight("#fff7d6", -8, 16, -6, 1);
  const boneco = SZGameKit3D.spawn("heroi", 0, 0, 0);
  SZGameKit3D.setYaw(boneco, 0);
  SZGameKit3D.cameraFollow(boneco, 11, 15);
  SZGameKit3D.cameraSmooth(5);
  SZGameKit3D.say(boneco, "Vai!", 1);
});
SZGameKit3D.onEntityStateUpdate("heroi", "parado", function (ela, dt) {
  if (SZGameKit3D.keyPressed("w") || SZGameKit3D.keyPressed("cima")) {
    linha = linha + 1;
    alvoZ = linha * 2;
  }
  if (SZGameKit3D.keyPressed("s") || SZGameKit3D.keyPressed("baixo")) {
    if (linha > 0) {
      linha = linha - 1;
      alvoZ = linha * 2;
    }
  }
  if (SZGameKit3D.keyPressed("a") || SZGameKit3D.keyPressed("esquerda")) {
    if (coluna > -4) {
      coluna = coluna - 1;
      alvoX = coluna * 2;
    }
  }
  if (SZGameKit3D.keyPressed("d") || SZGameKit3D.keyPressed("direita")) {
    if (coluna < 4) {
      coluna = coluna + 1;
      alvoX = coluna * 2;
    }
  }
  SZGameKit3D.seekPoint(ela, alvoX, alvoZ);
  SZGameKit3D.setHud("top-left", "Faixa: " + linha + " de 20");
});
SZGameKit3D.onOverlap("carro", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "heroi")) {
    SZGameKit3D.burstOn("batida", quem);
    SZGameKit3D.hurt(quem, 1);
  }
});
SZGameKit3D.onEntityDeath("heroi", function (ela) {
  SZGameKit3D.cameraShake(0.6, 0.4);
  SZGameKit3D.playEffect("gameover");
  SZGameKit3D.endGame();
});
SZGameKit3D.onUpdate(function (dt) {
  velocidade = velocidade + dt * 0.15;
  if (velocidade > 13) {
    velocidade = 13;
  }
  proximoCarro = proximoCarro - dt;
  if (proximoCarro <= 0) {
    proximoCarro = SZGameKit3D.randomBetween(0.5, 1.2);
    const faixa = linha + Math.floor(SZGameKit3D.randomBetween(2, 8));
    if (SZGameKit3D.randomChance(50)) {
      const carroD = SZGameKit3D.spawn("carro", -12, 0, faixa * 2);
      SZGameKit3D.setYaw(carroD, 90);
      SZGameKit3D.setVelocity(carroD, velocidade, 0, 0);
    } else {
      const carroE = SZGameKit3D.spawn("carro", 12, 0, faixa * 2);
      SZGameKit3D.setYaw(carroE, 270);
      SZGameKit3D.setVelocity(carroE, 0 - velocidade, 0, 0);
    }
  }
  SZGameKit3D.forEachAlive("carro", function (c) {
    if (SZGameKit3D.posOf(c, "x") > 16 || SZGameKit3D.posOf(c, "x") < -16) {
      SZGameKit3D.recycle(c);
    }
  });
  SZGameKit3D.setHud("top-right", "Chegue na faixa 20!");
  if (linha >= 20) {
    SZGameKit3D.playEffect("win");
    SZGameKit3D.setState("vitoria");
  }
});
SZGameKit3D.start();
`.trim()

// Só gera quando RODADO direto — o drift test importa o SOURCE daqui (uma cópia
// só do fonte). Emite a IR JÁ normalizada (o mesmo pipeline do drift), pronta
// para colar como o exemplo em examples/atravesseProfissional.ts.
if (import.meta.main) {
  const js = parseJS(ATRAVESSE_PROFISSIONAL_SOURCE)
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
    name: 'Atravesse a Rua Profissional',
    experience: 'game',
    description:
      'O Crossy Road no motor avancado: pule em grade com as setas, atravesse as faixas e desvie dos carros que cruzam a pista. Chegue na faixa 20 sem ser atropelado. Tudo de pecas, sem imagem.',
    ir: {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d-advanced' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const atravesseProfissionalExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
