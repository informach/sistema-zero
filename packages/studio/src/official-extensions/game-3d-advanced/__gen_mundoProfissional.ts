import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes } from './exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Mundo de Blocos Profissional". Rode com
 * `bun src/official-extensions/game-3d-advanced/__gen_mundoProfissional.ts`
 * e cole a saída em examples.ts. O drift test
 * (`mundoProfissionalExample.test.ts`) guarda o resultado.
 *
 * O construtor estilo Minecraft do motor avançado (nível 2 da família "Mundo
 * de Blocos") — ADAPTAÇÃO do veredito do spike: NADA de camera_fps (o pointer
 * lock congela o mouse interno e mataria groundPoint/pick). Aqui é 3ª PESSOA
 * (cameraFollow, mouse LIVRE): platformerKeys anda e pula, o clique planta um
 * bloco SÓLIDO na célula do chão sob o mouse (groundPoint + Math.round do
 * núcleo = grade de 2 em 2), teclas 1/2/3 trocam o molde (grama/pedra/madeira),
 * X liga o modo reciclar e o teto de 30 blocos avisa no HUD.
 * ⭐ GUARDA DE ALCANCE (full review Lote C): groundPoint devolve 0 nos dois
 * eixos quando o raio NÃO corta o plano do chão (clique no céu), então só se
 * planta com a célula a até 3 do herói (|celula − posOf| <= 3 em x E z — as
 * células andam de 2 em 2, ou seja, só a célula do herói e as vizinhas; um
 * clique no céu cai na origem, longe, e NADA acontece, sem som). O reciclar é
 * UM pick() sem molde + cascata isMold (grama/pedra/madeira): um clique tira
 * só o bloco DA FRENTE, sem atravessar oclusão; herói/muralha/árvore caem no
 * vazio. Geração procedural com setSeed (muralha + 3 árvores compostas).
 * Objetivo verificável: colocar um bloco, subir nele e pular para o topo da
 * muralha (posOf y > 2.2 + onGround = vitória). Sem .glb.
 */
export const MUNDO_PROFISSIONAL_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 44, sky: "#7dd3fc", ground: "#86efac" });
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1, vignette: false });
SZGameKit3D.setScreenText("menu", "Mundo de Blocos", "Ande com WASD e pule com espaço. Escolha o bloco com 1, 2 e 3 e clique no chão perto de você para construir. Aperte X para reciclar. Coloque um bloco junto da muralha, suba nele e pule até o topo!", "Construir");
SZGameKit3D.setScreenText("vitoria", "Chegou ao topo!", "Você colocou um bloco, subiu nele e pulou até o topo da muralha. Jogue de novo e invente outro caminho!", "Construir de novo");
SZGameKit3D.defineMold("heroi", { health: 100, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#f59e0b", w: 0.8, h: 0.9, d: 0.5, x: 0, y: 0.45, z: 0 });
  SZGameKit3D.part({ shape: "sphere", color: "#fde68a", w: 0.6, h: 0.6, d: 0.6, x: 0, y: 1.2, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#78350f", w: 0.3, h: 0.2, d: 0.3, x: 0, y: 1.5, z: 0.1 });
});
SZGameKit3D.defineMold("grama", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#92400e", w: 1.9, h: 1, d: 1.9, x: 0, y: 0.5, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#4ade80", w: 1.9, h: 0.2, d: 1.9, x: 0, y: 1.1, z: 0 });
});
SZGameKit3D.defineMold("pedra", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#94a3b8", w: 1.9, h: 1.2, d: 1.9, x: 0, y: 0.6, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#64748b", w: 1.2, h: 0.4, d: 1.2, x: 0, y: 0.9, z: 0 });
});
SZGameKit3D.defineMold("madeira", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#b45309", w: 1.9, h: 1.2, d: 1.9, x: 0, y: 0.6, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#78350f", w: 1.92, h: 0.25, d: 1.92, x: 0, y: 0.6, z: 0 });
});
SZGameKit3D.defineMold("muralha", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#a8a29e", w: 12, h: 2.4, d: 1.2, x: 0, y: 1.2, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#78716c", w: 12, h: 0.3, d: 1.4, x: 0, y: 2.25, z: 0 });
});
SZGameKit3D.defineMold("arvore", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "cylinder", color: "#78350f", w: 0.6, h: 1.6, d: 0.6, x: 0, y: 0.8, z: 0 });
  SZGameKit3D.part({ shape: "cone", color: "#16a34a", w: 2.4, h: 2.2, d: 2.4, x: 0, y: 2.6, z: 0 });
});
SZGameKit3D.setPhysics("heroi", "personagem");
SZGameKit3D.makeSolid("grama");
SZGameKit3D.makeSolid("pedra");
SZGameKit3D.makeSolid("madeira");
SZGameKit3D.makeSolid("muralha");
SZGameKit3D.makeSolid("arvore");
SZGameKit3D.defineEffect("poeira", { count: 16, colorFrom: "#fef3c7", colorTo: "#86efac", spread: 4, sizeFrom: 0.4, sizeTo: 0, life: 0.5, gravity: -4 });
let modo = "construir";
let tipoDeBloco = "grama";
let blocos = 0;
SZGameKit3D.onEnterState("jogando", function () {
  modo = "construir";
  tipoDeBloco = "grama";
  blocos = 0;
  SZGameKit3D.setSeed(12);
  SZGameKit3D.setAmbient(0.85);
  SZGameKit3D.setFog("#bae6fd", 30, 70);
  SZGameKit3D.spawn("muralha", -12, 0, 10);
  SZGameKit3D.spawn("muralha", 0, 0, 10);
  SZGameKit3D.spawn("muralha", 12, 0, 10);
  SZGameKit3D.spawn("arvore", SZGameKit3D.randomBetween(-15, -8), 0, SZGameKit3D.randomBetween(-12, -2));
  SZGameKit3D.spawn("arvore", SZGameKit3D.randomBetween(-15, -8), 0, SZGameKit3D.randomBetween(0, 6));
  SZGameKit3D.spawn("arvore", SZGameKit3D.randomBetween(-7, -2), 0, SZGameKit3D.randomBetween(-14, -8));
  const jogador = SZGameKit3D.spawn("heroi", 0, 1, -4);
  SZGameKit3D.cameraFollow(jogador, 13, 7);
  SZGameKit3D.cameraSmooth(4);
  SZGameKit3D.say(jogador, "Clique no chão para construir!", 3);
});
SZGameKit3D.onEntityStateUpdate("heroi", "parado", function (ela, dt) {
  SZGameKit3D.platformerKeys(ela, 6, 9);
  blocos = SZGameKit3D.countAlive("grama") + SZGameKit3D.countAlive("pedra") + SZGameKit3D.countAlive("madeira");
  if (SZGameKit3D.keyPressed("1")) {
    tipoDeBloco = "grama";
  }
  if (SZGameKit3D.keyPressed("2")) {
    tipoDeBloco = "pedra";
  }
  if (SZGameKit3D.keyPressed("3")) {
    tipoDeBloco = "madeira";
  }
  if (SZGameKit3D.keyPressed("x")) {
    if (modo === "construir") {
      modo = "reciclar";
    } else {
      modo = "construir";
    }
  }
  if (SZGameKit3D.mousePressed()) {
    if (modo === "reciclar") {
      const alvo = SZGameKit3D.pick("");
      if (SZGameKit3D.isMold(alvo, "grama") || SZGameKit3D.isMold(alvo, "pedra") || SZGameKit3D.isMold(alvo, "madeira")) {
        SZGameKit3D.burstOn("poeira", alvo);
        SZGameKit3D.recycle(alvo);
        SZGameKit3D.playEffect("click");
      }
    } else {
      if (blocos >= 30) {
        SZGameKit3D.say(ela, "O mundo lotou! Aperte X e recicle uns blocos.", 2);
      } else {
        const celulaX = Math.round(SZGameKit3D.groundPoint("x") / 2) * 2;
        const celulaZ = Math.round(SZGameKit3D.groundPoint("z") / 2) * 2;
        if (Math.abs(celulaX - SZGameKit3D.posOf(ela, "x")) <= 3 && Math.abs(celulaZ - SZGameKit3D.posOf(ela, "z")) <= 3) {
          if (tipoDeBloco === "grama") {
            SZGameKit3D.spawn("grama", celulaX, 0, celulaZ);
          }
          if (tipoDeBloco === "pedra") {
            SZGameKit3D.spawn("pedra", celulaX, 0, celulaZ);
          }
          if (tipoDeBloco === "madeira") {
            SZGameKit3D.spawn("madeira", celulaX, 0, celulaZ);
          }
          SZGameKit3D.burstAt("poeira", celulaX, 1, celulaZ);
          SZGameKit3D.playEffect("coin");
        }
      }
    }
  }
  if (SZGameKit3D.posOf(ela, "y") > 2.2 && SZGameKit3D.onGround(ela)) {
    SZGameKit3D.playEffect("win");
    SZGameKit3D.setState("vitoria");
  }
});
SZGameKit3D.onUpdate(function (dt) {
  SZGameKit3D.setHud("top-left", "Blocos: " + blocos + " de 30");
  SZGameKit3D.setHud("bottom-left", "Bloco: " + tipoDeBloco + " (1 2 3)");
  SZGameKit3D.setHud("top-right", "Modo: " + modo + " (X troca)");
});
SZGameKit3D.start();
`.trim()

// Só gera quando RODADO direto — o drift test importa o SOURCE daqui (uma cópia
// só do fonte; duas divergiriam em silêncio). Emite a IR JÁ normalizada (o
// mesmo pipeline do drift: normalizeSZIR bucketiza start/events/loops e some
// com o boot start()), pronta para colar como `.ir` do exemplo em examples.ts.
if (import.meta.main) {
  const js = parseJS(MUNDO_PROFISSIONAL_SOURCE)
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
    name: 'Mundo de Blocos Profissional',
    experience: 'game',
    description:
      'Construtor 3D em 3ª pessoa: ande, pule e clique no chão perto de você para plantar blocos sólidos (1, 2 e 3 trocam o tipo). Coloque um bloco, suba nele e pule até o topo da muralha. X recicla.',
    ir: {
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d-advanced' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const mundoDeBlocosProfissionalExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
