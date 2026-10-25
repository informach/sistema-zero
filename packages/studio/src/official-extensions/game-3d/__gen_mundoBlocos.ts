import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from '../game-3d-advanced/exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Mundo de Blocos" (nível 1 da família Mundo
 * de Blocos, um construtor estilo Minecraft): câmera ISOMÉTRICA (mouse livre),
 * cursor translúcido movido pela GRADE com as setas (gridPosition) e mantido no
 * TOPO da coluna da célula (a mesma conta do colocar — um cursor em y=0
 * envolveria o bloco térreo e roubaria o raycast do clique, deixando-o
 * inquebrável), chão e muralha gerados com forRange do núcleo, colocar bloco só
 * com ESPAÇO (Enter saiu: era atalho redundante e confundia o gesto de "start"
 * do QA), quebrar com pickAtMouse + clique e objetivo leve de torre de 5
 * blocos. Som/recorde só quando a colocação ACONTECEU (spawnCopy devolve
 * null no teto de cópias) e a festa da torre de 5 toca UMA vez (dentro do ramo
 * que atualiza o recorde). Aqui NÃO há FPS: o mouse funciona livre, então
 * pickAtMouse é permitido (diferente do Labirinto dos Robôs). Rode com
 * `bun src/official-extensions/game-3d/__gen_mundoBlocos.ts` e cole a saída em
 * examples.ts. O drift test (`mundoBlocosExample.test.ts`) guarda o resultado
 * importando o SOURCE daqui (uma cópia só do fonte).
 */
export const MUNDO_BLOCOS_SOURCE = `
const mundo = SZGame3D.createFullscreenScene("#0ea5e9");
SZGame3D.hudText("top-left", "Material: grama");
SZGame3D.hudText("top-right", "Torre: 0");
SZGame3D.hudText("bottom-center", "Setas: mover uma célula por toque. 1, 2, 3: material. Espaço: colocar. Clique: retirar.");
SZGame3D.setSky(mundo, "#38bdf8", "#bae6fd");
SZGame3D.cameraMode(mundo, "isometrica", null);
const moldeGrama = SZGame3D.createBox(mundo, { size: 1, color: "#22c55e" });
SZGame3D.setVisible(moldeGrama, "hide");
const moldePedra = SZGame3D.createBox(mundo, { size: 1, color: "#94a3b8" });
SZGame3D.setVisible(moldePedra, "hide");
const moldeMadeira = SZGame3D.createBox(mundo, { size: 1, color: "#b45309" });
SZGame3D.setVisible(moldeMadeira, "hide");
const chao = SZGame3D.createGroup();
const blocos = SZGame3D.createGroup();
for (let linhaChao = -4; linhaChao < 5; linhaChao++) {
  for (let colunaChao = -4; colunaChao < 5; colunaChao++) {
    SZGame3D.spawnCopy(chao, moldeGrama, colunaChao, -1, linhaChao);
  }
}
for (let passo = -4; passo < 5; passo++) {
  SZGame3D.spawnCopy(blocos, moldePedra, passo, 0, -4);
  SZGame3D.spawnCopy(blocos, moldePedra, passo, 1, -4);
}
const cursor = SZGame3D.createBox(mundo, { size: 1.05, color: "#fde047" });
SZGame3D.setOpacity(cursor, 0.45);
let linha = 0;
let coluna = 0;
let tipo = 1;
let recorde = 0;
let alturaAlvo = 0;
function medirAltura() {
  alturaAlvo = 0;
  SZGame3D.forEachInGroup(blocos, (item) => {
    if (SZGame3D.getPos(item, "x") === coluna) {
      if (SZGame3D.getPos(item, "z") === linha) {
        if (SZGame3D.getPos(item, "y") >= alturaAlvo) {
          alturaAlvo = SZGame3D.getPos(item, "y") + 1;
        }
      }
    }
  });
}
function moverCursor() {
  medirAltura();
  SZGame3D.gridPosition(cursor, linha, coluna);
  SZGame3D.setPosition(cursor, coluna, alturaAlvo, linha);
}
function colocarBloco() {
  medirAltura();
  let antes = SZGame3D.countGroup(blocos);
  if (tipo === 1) {
    SZGame3D.spawnCopy(blocos, moldeGrama, coluna, alturaAlvo, linha);
  }
  if (tipo === 2) {
    SZGame3D.spawnCopy(blocos, moldePedra, coluna, alturaAlvo, linha);
  }
  if (tipo === 3) {
    SZGame3D.spawnCopy(blocos, moldeMadeira, coluna, alturaAlvo, linha);
  }
  if (SZGame3D.countGroup(blocos) > antes) {
    SZGame3D.playEffect("jump");
    if (alturaAlvo + 1 > recorde) {
      recorde = alturaAlvo + 1;
      SZGame3D.hudText("top-right", "Torre: " + recorde);
      if (recorde === 5) {
        SZGame3D.playEffect("coin");
        SZGame3D.hudText("top-center", "Parabéns! Sua torre chegou a cinco blocos!");
        SZGame3D.afterSeconds(2.5, () => { SZGame3D.hudText("top-center", ""); });
      }
    }
  }
  moverCursor();
}
moverCursor();
SZGame3D.onKey("ArrowLeft", () => {
  if (coluna > -4) { coluna = coluna - 1; }
  moverCursor();
});
SZGame3D.onKey("ArrowRight", () => {
  if (coluna < 4) { coluna = coluna + 1; }
  moverCursor();
});
SZGame3D.onKey("ArrowUp", () => {
  if (linha > -4) { linha = linha - 1; }
  moverCursor();
});
SZGame3D.onKey("ArrowDown", () => {
  if (linha < 4) { linha = linha + 1; }
  moverCursor();
});
SZGame3D.onKey("Digit1", () => { tipo = 1; SZGame3D.hudText("top-left", "Material: grama"); });
SZGame3D.onKey("Digit2", () => { tipo = 2; SZGame3D.hudText("top-left", "Material: pedra"); });
SZGame3D.onKey("Digit3", () => { tipo = 3; SZGame3D.hudText("top-left", "Material: madeira"); });
SZGame3D.onKey("Space", () => { colocarBloco(); });
SZGame3D.onCanvasClick(() => {
  let alvo = SZGame3D.pickAtMouse(mundo);
  if (alvo) {
    let antes = SZGame3D.countGroup(blocos);
    SZGame3D.removeFromGroup(blocos, alvo);
    if (SZGame3D.countGroup(blocos) < antes) {
      SZGame3D.playEffect("hit");
      moverCursor();
    }
  }
});
SZGame3D.animate(mundo, () => {
  SZGame3D.spin(cursor, "y", 69);
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(MUNDO_BLOCOS_SOURCE),
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
