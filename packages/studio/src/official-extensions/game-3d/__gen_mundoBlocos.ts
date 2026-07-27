import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from '../game-3d-advanced/exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Mundo de Blocos" (nível 1 da família Mundo
 * de Blocos, um construtor estilo Minecraft): câmera ISOMÉTRICA (mouse livre),
 * cursor translúcido movido pela GRADE com as setas (gridPosition), chão e
 * muralha gerados com forRange do núcleo, colocar bloco com espaço/Enter
 * (empilha sozinho na célula ocupada), quebrar com pickAtMouse + clique e
 * objetivo leve
 * de torre de 5 blocos. Aqui NÃO há FPS: o mouse funciona livre, então
 * pickAtMouse é permitido (diferente do Labirinto dos Robôs). Rode com
 * `bun src/official-extensions/game-3d/__gen_mundoBlocos.ts` e cole a saída em
 * examples.ts. O drift test (`mundoBlocosExample.test.ts`) guarda o resultado
 * importando o SOURCE daqui (uma cópia só do fonte).
 */
export const MUNDO_BLOCOS_SOURCE = `
const mundo = SZGame3D.createFullscreenScene("#0ea5e9");
SZGame3D.setSky(mundo, "#38bdf8", "#bae6fd");
SZGame3D.isometricCamera(mundo, null);
const moldeGrama = SZGame3D.createBox(mundo, { size: 1, color: "#22c55e" });
SZGame3D.setVisible(moldeGrama, "hide");
const moldePedra = SZGame3D.createBox(mundo, { size: 1, color: "#94a3b8" });
SZGame3D.setVisible(moldePedra, "hide");
const moldeMadeira = SZGame3D.createBox(mundo, { size: 1, color: "#b45309" });
SZGame3D.setVisible(moldeMadeira, "hide");
const chao = SZGame3D.createSwarm(mundo);
const blocos = SZGame3D.createSwarm(mundo);
for (let linhaChao = -4; linhaChao < 5; linhaChao++) {
  for (let colunaChao = -4; colunaChao < 5; colunaChao++) {
    SZGame3D.spawnInSwarm(chao, moldeGrama, colunaChao, -1, linhaChao);
  }
}
for (let passo = -4; passo < 5; passo++) {
  SZGame3D.spawnInSwarm(blocos, moldePedra, passo, 0, -4);
  SZGame3D.spawnInSwarm(blocos, moldePedra, passo, 1, -4);
}
const cursor = SZGame3D.createBox(mundo, { size: 1.05, color: "#fde047" });
SZGame3D.setOpacity(cursor, 0.45);
let linha = 0;
let coluna = 0;
let tipo = 1;
let recorde = 0;
function colocarBloco() {
  let alturaAlvo = 0;
  SZGame3D.forEachInSwarm(blocos, (item) => {
    if (SZGame3D.getPos(item, "x") === coluna) {
      if (SZGame3D.getPos(item, "z") === linha) {
        if (SZGame3D.getPos(item, "y") >= alturaAlvo) {
          alturaAlvo = SZGame3D.getPos(item, "y") + 1;
        }
      }
    }
  });
  if (tipo === 1) {
    SZGame3D.spawnInSwarm(blocos, moldeGrama, coluna, alturaAlvo, linha);
  }
  if (tipo === 2) {
    SZGame3D.spawnInSwarm(blocos, moldePedra, coluna, alturaAlvo, linha);
  }
  if (tipo === 3) {
    SZGame3D.spawnInSwarm(blocos, moldeMadeira, coluna, alturaAlvo, linha);
  }
  SZGame3D.playEffect("jump");
  if (alturaAlvo + 1 > recorde) {
    recorde = alturaAlvo + 1;
    document.getElementById("torre").textContent = recorde;
  }
  if (recorde === 5) {
    SZGame3D.playEffect("coin");
    document.getElementById("festa")?.classList.add("visivel");
    setTimeout(() => {
      document.getElementById("festa")?.classList.remove("visivel");
    }, 2500);
  }
}
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    if (coluna > -4) {
      coluna = coluna - 1;
    }
  }
  if (event.key === "ArrowRight") {
    if (coluna < 4) {
      coluna = coluna + 1;
    }
  }
  if (event.key === "ArrowUp") {
    if (linha > -4) {
      linha = linha - 1;
    }
  }
  if (event.key === "ArrowDown") {
    if (linha < 4) {
      linha = linha + 1;
    }
  }
  SZGame3D.gridPosition(cursor, linha, coluna);
  if (event.key === "1") {
    tipo = 1;
    document.getElementById("tipo").textContent = "grama";
  }
  if (event.key === "2") {
    tipo = 2;
    document.getElementById("tipo").textContent = "pedra";
  }
  if (event.key === "3") {
    tipo = 3;
    document.getElementById("tipo").textContent = "madeira";
  }
  if (event.key === "Enter") {
    colocarBloco();
  }
  if (event.key === " ") {
    colocarBloco();
  }
});
document.addEventListener("click", (event) => {
  let alvo = SZGame3D.pickAtMouse(mundo);
  if (alvo) {
    let antes = SZGame3D.countSwarm(blocos);
    SZGame3D.removeFromSwarm(blocos, alvo);
    if (SZGame3D.countSwarm(blocos) < antes) {
      SZGame3D.playEffect("hit");
    }
  }
});
SZGame3D.animate(mundo, () => {
  SZGame3D.spin(cursor, "y", 0.02);
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
