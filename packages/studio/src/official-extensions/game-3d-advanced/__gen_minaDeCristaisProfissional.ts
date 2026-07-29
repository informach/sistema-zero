import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes } from './exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Mina de Cristais Profissional". Rode com
 * `bun src/official-extensions/game-3d-advanced/__gen_minaDeCristaisProfissional.ts`
 * e cole a saída em examples.ts. O drift test
 * (`minaDeCristaisProfissionalExample.test.ts`) guarda o resultado.
 *
 * O Minecraft do SimonDev (Quick_MinecraftClone2) recriado no motor avançado
 * como uma MINA: em vez de CONSTRUIR, você CAVA. Ande com WASD em 3ª pessoa
 * (moveWithKeys + cameraFollow) e clique nos blocos para minerar: a pedra some
 * (só entulho), mas os cristais brilhantes valem ponto. Colete 10 cristais
 * antes que o tempo da mina acabe; veias novas de minério surgem sozinhas.
 * ⭐ DISTINTO da trilogia "Mundo de Blocos" (também blocos estilo Minecraft): lá
 * você CONSTRÓI — groundPoint fixa a célula sob o mouse, makeSolid deixa tudo
 * sólido, platformerKeys pula e a vitória é chegar ao TOPO da muralha. Aqui NÃO
 * há groundPoint/makeSolid/platformerKeys/onGround: o clique só REMOVE (pick +
 * recycle), a meta é uma QUANTIDADE de cristais e há um TEMPO correndo. Sem .glb.
 */
export const MINA_DE_CRISTAIS_PROFISSIONAL_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 44, sky: "#0f0a1e", ground: "#241a33" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.5, vignette: true });
SZGameKit3D.setScreenText("menu", "Mina de Cristais Profissional", "Ande com WASD e clique nos blocos para CAVAR. A pedra é só entulho, mas os cristais brilhantes valem ponto! Veias novas de minério vão surgindo. Colete 10 cristais antes que o tempo acabe.", "Minerar");
SZGameKit3D.setScreenText("vitoria", "Filão lendário!", "Você garimpou os 10 cristais da mina.", "Minerar de novo");
SZGameKit3D.setScreenText("fim", "A mina fechou...", "O tempo acabou. Cave a pedra rápido para achar os cristais escondidos entre ela!", "Tentar de novo");
SZGameKit3D.defineMold("mineiro", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#f59e0b", w: 0.8, h: 1, d: 0.6, x: 0, y: 0.5, z: 0 });
  SZGameKit3D.part({ shape: "sphere", color: "#fde68a", w: 0.6, h: 0.6, d: 0.6, x: 0, y: 1.25, z: 0 });
  SZGameKit3D.part({ shape: "box", material: "brilho", color: "#fef08a", w: 0.3, h: 0.2, d: 0.2, x: 0, y: 1.45, z: 0.28 });
});
SZGameKit3D.defineMold("pedra", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#57534e", w: 1.6, h: 1.6, d: 1.6, x: 0, y: 0, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#44403c", w: 1.62, h: 0.4, d: 1.62, x: 0, y: 0.4, z: 0 });
});
SZGameKit3D.defineMold("cristal", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#3b3556", w: 1.6, h: 1.6, d: 1.6, x: 0, y: 0, z: 0 });
  SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#22d3ee", w: 0.8, h: 1.2, d: 0.8, x: 0, y: 0.5, z: 0 });
});
SZGameKit3D.defineEffect("poeira", { count: 16, colorFrom: "#a8a29e", colorTo: "#241a33", spread: 4, sizeFrom: 0.5, sizeTo: 0, life: 0.4, gravity: 2 });
SZGameKit3D.defineEffect("faisca", { count: 22, colorFrom: "#67e8f9", colorTo: "#0e7490", spread: 5, sizeFrom: 0.5, sizeTo: 0, life: 0.5, gravity: 0 });
let cristais = 0;
let tempo = 55;
let proximaVeia = 1.5;
SZGameKit3D.onEnterState("jogando", function () {
  cristais = 0;
  tempo = 55;
  proximaVeia = 1.5;
  SZGameKit3D.setSeed(7);
  SZGameKit3D.setAmbient(0.4);
  SZGameKit3D.setFog("#0f0a1e", 26, 80);
  SZGameKit3D.addLight("#67e8f9", 0, 15, 0, 1.1);
  const cavador = SZGameKit3D.spawn("mineiro", 0, 1, -3);
  SZGameKit3D.cameraFollow(cavador, 13, 8);
  SZGameKit3D.cameraSmooth(5);
  SZGameKit3D.say(cavador, "Clique nos blocos para cavar!", 3);
  SZGameKit3D.spawn("pedra", -4, 0.8, -6);
  SZGameKit3D.spawn("cristal", -2, 0.8, -6);
  SZGameKit3D.spawn("pedra", 0, 0.8, -6);
  SZGameKit3D.spawn("cristal", 2, 0.8, -6);
  SZGameKit3D.spawn("pedra", 4, 0.8, -6);
  SZGameKit3D.spawn("cristal", -4, 0.8, -4);
  SZGameKit3D.spawn("pedra", -2, 0.8, -4);
  SZGameKit3D.spawn("pedra", 0, 0.8, -4);
  SZGameKit3D.spawn("pedra", 2, 0.8, -4);
  SZGameKit3D.spawn("cristal", 4, 0.8, -4);
  SZGameKit3D.spawn("pedra", -4, 0.8, -2);
  SZGameKit3D.spawn("pedra", -2, 0.8, -2);
  SZGameKit3D.spawn("cristal", 0, 0.8, -2);
  SZGameKit3D.spawn("pedra", 2, 0.8, -2);
  SZGameKit3D.spawn("pedra", 4, 0.8, -2);
  SZGameKit3D.spawn("pedra", -2, 0.8, 0);
  SZGameKit3D.spawn("cristal", 0, 0.8, 0);
  SZGameKit3D.spawn("pedra", 2, 0.8, 0);
});
SZGameKit3D.onEntityStateUpdate("mineiro", "parado", function (ela, dt) {
  SZGameKit3D.moveWithKeys(ela, 8);
  SZGameKit3D.faceVelocity(ela);
  if (SZGameKit3D.mousePressed()) {
    const alvo = SZGameKit3D.pick("");
    if (SZGameKit3D.exists(alvo)) {
      if (SZGameKit3D.isMold(alvo, "cristal")) {
        SZGameKit3D.burstOn("faisca", alvo);
        SZGameKit3D.playEffect("coin");
        SZGameKit3D.recycle(alvo);
        cristais = cristais + 1;
      }
      if (SZGameKit3D.isMold(alvo, "pedra")) {
        SZGameKit3D.burstOn("poeira", alvo);
        SZGameKit3D.playEffect("hit");
        SZGameKit3D.recycle(alvo);
      }
    }
  }
});
SZGameKit3D.onUpdate(function (dt) {
  tempo = tempo - dt;
  proximaVeia = proximaVeia - dt;
  if (proximaVeia <= 0 && SZGameKit3D.countAlive("pedra") + SZGameKit3D.countAlive("cristal") < 40) {
    proximaVeia = 1;
    if (SZGameKit3D.randomChance(40)) {
      SZGameKit3D.spawn("cristal", SZGameKit3D.randomBetween(-9, 9), 0.8, SZGameKit3D.randomBetween(-9, 6));
    } else {
      SZGameKit3D.spawn("pedra", SZGameKit3D.randomBetween(-9, 9), 0.8, SZGameKit3D.randomBetween(-9, 6));
    }
  }
  SZGameKit3D.setHud("top-left", "Cristais: " + cristais + " de 10");
  SZGameKit3D.setHud("top-right", "Tempo: " + Math.floor(tempo) + "s");
  if (cristais >= 10) {
    SZGameKit3D.playEffect("win");
    SZGameKit3D.setState("vitoria");
  }
  if (tempo <= 0) {
    SZGameKit3D.playEffect("gameover");
    SZGameKit3D.setState("fim");
  }
});
SZGameKit3D.start();
`.trim()

// Só gera quando RODADO direto — o drift test importa o SOURCE daqui.
if (import.meta.main) {
  const js = parseJS(MINA_DE_CRISTAIS_PROFISSIONAL_SOURCE)
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
    name: 'Mina de Cristais Profissional',
    experience: 'game',
    description:
      'Minerador 3D em 3ª pessoa no motor avançado: ande com WASD e clique nos blocos para cavar. A pedra é entulho, mas os cristais valem ponto. Colete 10 cristais antes que o tempo da mina acabe.',
    ir: {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d-advanced' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const minaDeCristaisProfissionalExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
