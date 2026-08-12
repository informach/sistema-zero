import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from '../game-3d-advanced/exampleSourceUtils'
import { FASES_REINO_COGUMELO } from './stagesReinoCogumelo'

/**
 * Gerador one-off da IR do exemplo "Reino Cogumelo" — o jogo de correr e pular
 * com as 32 fases (8 mundos × 4 áreas), montado sobre o 🍄 Kit Plataforma.
 *
 * ⭐ As fases NÃO são copiadas para cá: vêm de `stagesReinoCogumelo.ts` por
 * interpolação. Uma cópia só do mapa — duas divergiriam em silêncio, que é
 * exatamente o que o drift test destes exemplos existe para impedir.
 *
 * Rode com `bun src/official-extensions/game-3d/__gen_reinoCogumelo.ts` e cole a
 * saída em examples.ts. O drift test (`reinoCogumeloExample.test.ts`) guarda o
 * resultado importando o SOURCE daqui.
 */
const LISTA_DE_FASES = FASES_REINO_COGUMELO.map((mapa) => `  ${JSON.stringify(mapa)}`).join(',\n')

export const REINO_COGUMELO_SOURCE = `
const jogo = SZGame3D.createPlatformScene("tela");
const heroi = SZGame3D.createHero(jogo, "#e03010");
const fases = [
${LISTA_DE_FASES}
];
let numeroDaFase = 1;
let recorde = 0;
function mostrarPlacar() {
  document.getElementById("pontos").textContent = SZGame3D.stageValue(jogo, "pontos");
  document.getElementById("moedas").textContent = SZGame3D.stageValue(jogo, "moedas");
  document.getElementById("vidas").textContent = SZGame3D.stageValue(jogo, "vidas");
  document.getElementById("tempo").textContent = SZGame3D.stageValue(jogo, "tempo");
  document.getElementById("mundo").textContent = SZGame3D.stageValue(jogo, "mundo") + "-" + SZGame3D.stageValue(jogo, "fase");
}
function abrirFase() {
  const mundo = Math.ceil(numeroDaFase / 4);
  const area = numeroDaFase - (mundo - 1) * 4;
  SZGame3D.setStageNumber(jogo, mundo, area);
  SZGame3D.loadStage(jogo, fases[numeroDaFase - 1]);
  mostrarPlacar();
}
abrirFase();
SZGame3D.onStageEvent(jogo, "pegar-moeda", () => {
  mostrarPlacar();
});
SZGame3D.onStageEvent(jogo, "ganhar-vida", () => {
  SZGame3D.playEffect("coin");
  mostrarPlacar();
});
SZGame3D.onStageEvent(jogo, "pisar-inimigo", () => {
  mostrarPlacar();
});
SZGame3D.onStageEvent(jogo, "quebrar-tijolo", () => {
  mostrarPlacar();
});
SZGame3D.onStageEvent(jogo, "pegar-cogumelo", () => {
  document.getElementById("aviso").textContent = "Cresceu!";
});
SZGame3D.onStageEvent(jogo, "pegar-flor", () => {
  document.getElementById("aviso").textContent = "Agora joga fogo: aperte F";
});
SZGame3D.onStageEvent(jogo, "pegar-estrela", () => {
  document.getElementById("aviso").textContent = "Invencivel!";
});
SZGame3D.onStageEvent(jogo, "levar-dano", () => {
  document.getElementById("aviso").textContent = "Cuidado!";
  mostrarPlacar();
});
SZGame3D.onStageEvent(jogo, "tocar-a-bandeira", () => {
  document.getElementById("aviso").textContent = "Fase vencida!";
});
SZGame3D.onStageEvent(jogo, "derrotar-o-chefe", () => {
  document.getElementById("aviso").textContent = "O castelo caiu!";
});
SZGame3D.animate(jogo, () => {
  SZGame3D.classicPlatformer(heroi, jogo, 0.09, 0.22);
  SZGame3D.stageStep(jogo, heroi);
  SZGame3D.sideCamera(jogo, heroi);
  if (SZGame3D.keyPressed("KeyF")) {
    SZGame3D.shootFire(jogo, heroi);
  }
  mostrarPlacar();
  if (SZGame3D.stageValue(jogo, "pontos") > recorde) {
    recorde = SZGame3D.stageValue(jogo, "pontos");
  }
  if (SZGame3D.stageIs(jogo, "venceu")) {
    if (numeroDaFase < 32) {
      numeroDaFase = numeroDaFase + 1;
      abrirFase();
    } else {
      document.getElementById("aviso").textContent = "Voce salvou o Reino Cogumelo!";
    }
  }
  if (SZGame3D.stageIs(jogo, "perdeu")) {
    if (SZGame3D.stageValue(jogo, "vidas") > 0) {
      SZGame3D.stageReset(jogo);
    } else {
      document.getElementById("aviso").textContent = "Fim de jogo";
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
    js: parseJS(REINO_COGUMELO_SOURCE),
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
