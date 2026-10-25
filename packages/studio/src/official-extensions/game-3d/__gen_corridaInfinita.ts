import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from '../game-3d-advanced/exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Corrida Infinita 3D" (runner de 3 pistas:
 * herói parado no Z, o mundo vem até ele). Rode com
 * `bun src/official-extensions/game-3d/__gen_corridaInfinita.ts` e cole a saída
 * em examples.ts. O drift test (`corridaInfinitaExample.test.ts`) guarda o
 * resultado importando o SOURCE daqui (uma cópia só do fonte).
 */
export const CORRIDA_INFINITA_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#38bdf8");
SZGame3D.setSky(cena, "#0ea5e9", "#fde68a");
SZGame3D.setFog(cena, "#7dd3fc", 24, 70);
SZGame3D.setCameraPosition(cena, 0, 3.4, 7);
const chao = SZGame3D.createBlock(cena, { width: 9, height: 1, depth: 90, color: "#334155" });
SZGame3D.setPosition(chao, 0, -1, -30);
const faixaEsquerda = SZGame3D.createBlock(cena, { width: 0.12, height: 0.04, depth: 90, color: "#f8fafc" });
SZGame3D.setPosition(faixaEsquerda, -1.1, -0.47, -30);
const faixaDireita = SZGame3D.createBlock(cena, { width: 0.12, height: 0.04, depth: 90, color: "#f8fafc" });
SZGame3D.setPosition(faixaDireita, 1.1, -0.47, -30);
const heroi = SZGame3D.createBox(cena, { size: 1, color: "#34d399" });
SZGame3D.setPosition(heroi, 0, 2, 0);
const molde = SZGame3D.createBox(cena, { size: 1.1, color: "#f43f5e" });
SZGame3D.setVisible(molde, "hide");
const obstaculos = SZGame3D.createGroup();
let pista = 0;
let sorteio = 0;
let velocidade = 8.4;
SZGame3D.setScreenText("fim", "Bateu!", "Cada segundo correndo vale um ponto.", "Jogar de novo");
SZGame3D.hudText("bottom-center", "Setas: trocar de pista. Espaço ou seta para cima: pular.");
SZGame3D.onKey("ArrowLeft", () => {
  if (pista > -1) {
    pista = pista - 1;
  }
});
SZGame3D.onKey("ArrowRight", () => {
  if (pista < 1) {
    pista = pista + 1;
  }
});
SZGame3D.animate(cena, () => {
  if (SZGame3D.keyDown("Space") || SZGame3D.keyDown("ArrowUp")) {
    SZGame3D.jump(heroi, 5.4);
  }
  SZGame3D.applyGravity(heroi, chao);
  SZGame3D.moveTowards(heroi, pista * 2.2, SZGame3D.getPos(heroi, "y"), 0, 17.26);
  SZGame3D.forEachInGroup(obstaculos, (item) => {
    SZGame3D.moveBy(item, 0, 0, velocidade * SZGame3D.dt(cena));
    if (SZGame3D.collides(heroi, item)) {
      SZGame3D.playEffect("hit");
      SZGame3D.endGame("perdeu");
    }
  });
  SZGame3D.pruneArea(obstaculos, "z", -80, 6);
});
SZGame3D.everySecondsLoop(1, () => {
  SZGame3D.addScore(1);
  velocidade = velocidade + 0.3;
  if (velocidade > 33.6) {
    velocidade = 33.6;
  }
});
SZGame3D.everySecondsLoop(0.9, () => {
  sorteio = SZGame3D.randomBetween(-1, 1);
  SZGame3D.spawnCopy(obstaculos, molde, sorteio * 2.2, 0.05, -60);
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(CORRIDA_INFINITA_SOURCE),
    extensions: [{ extensionId: 'game-3d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behavior)
  const bad = [...types].filter(
    (t) => t === 'rawJS' || t === 'memberCall' || t === 'memberCallExpr',
  )
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
