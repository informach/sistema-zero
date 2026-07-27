import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from '../game-3d-advanced/exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Labirinto dos Robôs" (nível 1 da família
 * Labirinto, um FPS estilo Doom básico): câmera em primeira pessoa com pointer
 * lock, labirinto de paredes SÓLIDAS (física de corpo), robôs em enxame que
 * perseguem o jogador e tiro por MIRA (aimAhead) no clique. ⚠️ Sob pointer lock
 * o mouse interno congela, então pickAtMouse/pointerOver são BANIDOS aqui; o
 * hitscan é aimAhead (o yaw do FPS gira o OBJETO, o aim segue a mira
 * horizontal; os robôs ficam na altura do corpo). O recomeçar zera o yaw do
 * corpo (setRotation) e arma travaTiro = 30 quadros: o clique no botão
 * "Recomeçar" borbulha até o listener de tiro do document e, sem a trava,
 * disparava na mesma hora (podendo matar um robô recém-nascido). Rode com
 * `bun src/official-extensions/game-3d/__gen_labirintoRobos.ts` e cole a saída
 * em examples.ts. O drift test (`labirintoRobosExample.test.ts`) guarda o
 * resultado importando o SOURCE daqui (uma cópia só do fonte).
 */
export const LABIRINTO_ROBOS_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#0f172a");
SZGame3D.setSky(cena, "#1e293b", "#475569");
SZGame3D.setFog(cena, "#0f172a", 6, 26);
const chao = SZGame3D.createBlock(cena, { width: 18, height: 1, depth: 18, color: "#1f2937" });
SZGame3D.setPosition(chao, 0, -1, 0);
SZGame3D.setSolid(chao);
const jogador = SZGame3D.createBox(cena, { size: 1, color: "#38bdf8" });
SZGame3D.setPosition(jogador, 0, 0, 6);
SZGame3D.body(jogador, -0.02);
const paredeNorte = SZGame3D.createBlock(cena, { width: 18, height: 3, depth: 1, color: "#7c3aed" });
SZGame3D.setPosition(paredeNorte, 0, 1, -8.5);
SZGame3D.setSolid(paredeNorte);
const paredeSul = SZGame3D.createBlock(cena, { width: 18, height: 3, depth: 1, color: "#7c3aed" });
SZGame3D.setPosition(paredeSul, 0, 1, 8.5);
SZGame3D.setSolid(paredeSul);
const paredeOeste = SZGame3D.createBlock(cena, { width: 1, height: 3, depth: 18, color: "#7c3aed" });
SZGame3D.setPosition(paredeOeste, -8.5, 1, 0);
SZGame3D.setSolid(paredeOeste);
const paredeLeste = SZGame3D.createBlock(cena, { width: 1, height: 3, depth: 18, color: "#7c3aed" });
SZGame3D.setPosition(paredeLeste, 8.5, 1, 0);
SZGame3D.setSolid(paredeLeste);
const muroNorte = SZGame3D.createBlock(cena, { width: 12, height: 3, depth: 1, color: "#6d28d9" });
SZGame3D.setPosition(muroNorte, -2, 1, -3);
SZGame3D.setSolid(muroNorte);
const muroSul = SZGame3D.createBlock(cena, { width: 12, height: 3, depth: 1, color: "#6d28d9" });
SZGame3D.setPosition(muroSul, 2, 1, 2);
SZGame3D.setSolid(muroSul);
SZGame3D.fpsCamera(cena, jogador);
const moldeLento = SZGame3D.createBox(cena, { size: 1, color: "#f43f5e" });
SZGame3D.setMaterial(moldeLento, "glow");
SZGame3D.setVisible(moldeLento, "hide");
const moldeRapido = SZGame3D.createBox(cena, { size: 0.7, color: "#f59e0b" });
SZGame3D.setMaterial(moldeRapido, "glow");
SZGame3D.setVisible(moldeRapido, "hide");
const robosLentos = SZGame3D.createSwarm(cena);
const robosRapidos = SZGame3D.createSwarm(cena);
let vida = 3;
let pontos = 0;
let recarga = 0;
let travaTiro = 0;
let encostou = false;
let rodando = true;
function recomecar() {
  SZGame3D.forEachInSwarm(robosLentos, (item) => {
    SZGame3D.removeFromSwarm(robosLentos, item);
  });
  SZGame3D.forEachInSwarm(robosRapidos, (item) => {
    SZGame3D.removeFromSwarm(robosRapidos, item);
  });
  SZGame3D.spawnInSwarm(robosLentos, moldeLento, -5, 0, 0);
  SZGame3D.spawnInSwarm(robosLentos, moldeLento, 5, 0, -6);
  SZGame3D.spawnInSwarm(robosLentos, moldeLento, -5, 0, -6);
  SZGame3D.spawnInSwarm(robosRapidos, moldeRapido, -6, 0, 6);
  SZGame3D.spawnInSwarm(robosRapidos, moldeRapido, 5, 0, 0);
  SZGame3D.setPosition(jogador, 0, 0, 6);
  SZGame3D.setRotation(jogador, 0, 0, 0);
  vida = 3;
  pontos = 0;
  recarga = 0;
  travaTiro = 30;
  document.getElementById("vida").textContent = vida;
  document.getElementById("placar").textContent = pontos;
  document.getElementById("dano").style.opacity = "0";
  document.getElementById("fim")?.classList.remove("visivel");
  rodando = true;
}
recomecar();
document.addEventListener("click", (event) => {
  if (rodando) {
    if (travaTiro <= 0) {
      let alvo = SZGame3D.aimAhead(cena, jogador, 30);
      if (alvo) {
        SZGame3D.forEachInSwarm(robosLentos, (item) => {
          if (item === alvo) {
            SZGame3D.removeFromSwarm(robosLentos, item);
            pontos = pontos + 1;
            SZGame3D.playEffect("explosion");
          }
        });
        SZGame3D.forEachInSwarm(robosRapidos, (item) => {
          if (item === alvo) {
            SZGame3D.removeFromSwarm(robosRapidos, item);
            pontos = pontos + 2;
            SZGame3D.playEffect("explosion");
          }
        });
        document.getElementById("placar").textContent = pontos;
        if (SZGame3D.countSwarm(robosLentos) + SZGame3D.countSwarm(robosRapidos) === 0) {
          rodando = false;
          document.getElementById("fim-titulo").textContent = "Você venceu!";
          document.getElementById("final-pontos").textContent = pontos;
          document.getElementById("fim")?.classList.add("visivel");
          SZGame3D.playEffect("coin");
        }
      }
    }
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "r") {
    recomecar();
  }
  if (event.key === "R") {
    recomecar();
  }
});
document.getElementById("retry")?.addEventListener("click", (event) => {
  recomecar();
});
SZGame3D.animate(cena, () => {
  if (rodando) {
    SZGame3D.fpsControls(jogador, cena, 0.09);
    if (travaTiro > 0) {
      travaTiro = travaTiro - 1;
    }
    if (recarga > 0) {
      recarga = recarga - 1;
      if (recarga === 30) {
        document.getElementById("dano").style.opacity = "0";
      }
    }
    encostou = false;
    SZGame3D.forEachInSwarm(robosLentos, (item) => {
      SZGame3D.moveTowards(item, SZGame3D.getPos(jogador, "x"), SZGame3D.getPos(item, "y"), SZGame3D.getPos(jogador, "z"), 0.006);
      if (SZGame3D.collides(jogador, item)) {
        encostou = true;
      }
    });
    SZGame3D.forEachInSwarm(robosRapidos, (item) => {
      SZGame3D.moveTowards(item, SZGame3D.getPos(jogador, "x"), SZGame3D.getPos(item, "y"), SZGame3D.getPos(jogador, "z"), 0.015);
      if (SZGame3D.collides(jogador, item)) {
        encostou = true;
      }
    });
    if (encostou) {
      if (recarga === 0) {
        vida = vida - 1;
        recarga = 90;
        document.getElementById("vida").textContent = vida;
        document.getElementById("dano").style.opacity = "0.5";
        SZGame3D.playEffect("hit");
        if (vida === 0) {
          rodando = false;
          document.getElementById("fim-titulo").textContent = "Os robôs te pegaram!";
          document.getElementById("final-pontos").textContent = pontos;
          document.getElementById("fim")?.classList.add("visivel");
        }
      }
    }
  }
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(LABIRINTO_ROBOS_SOURCE),
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
