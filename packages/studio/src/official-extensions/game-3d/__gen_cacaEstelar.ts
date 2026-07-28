import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from '../game-3d-advanced/exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Caça Estelar" (nível BÁSICO da batalha
 * espacial do SimonDev, montado só com genéricos do Jogo 3D). Rode com
 * `bun src/official-extensions/game-3d/__gen_cacaEstelar.ts` e cole a saída em
 * examples.ts. O drift test guarda o resultado importando o SOURCE daqui.
 *
 * A batalha espacial do SimonDev (Quick_Game2_StarWarsThing) no degrau mais
 * simples, 100% genéricos: uma nave que VOA LIVRE pela arena (setas/WASD, câmera
 * de cima) e DISPARA no inimigo mais perto (barra de espaço). As naves inimigas
 * nascem na borda, vagam e, ao te avistar, PERSEGUEM; se encostam, tiram um
 * escudo. Abata 10 antes que os 3 escudos acabem. ⭐ DISTINTO da "Patrulha
 * Espacial" (nave presa no eixo X + meteoros que caem em faixa): aqui o voo é
 * LIVRE e o inimigo é uma NAVE que vaga e caça. Sem kit próprio, sem imagem.
 */
export const CACA_ESTELAR_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#050818");
SZGame3D.setSky(cena, "#0b1030", "#1e1b4b");
SZGame3D.topCamera(cena, null);
SZGame3D.setFog(cena, "#050818", 44, 130);
SZGame3D.addSunLight(cena, "#a5b4fc", 1);
const chao = SZGame3D.createBlock(cena, { width: 36, height: 1, depth: 36, color: "#0f172a" });
SZGame3D.setPosition(chao, 0, -0.5, 0);
const nucleo = SZGame3D.createBox(cena, { size: 2, color: "#38bdf8" });
SZGame3D.setMaterial(nucleo, "glow");
SZGame3D.setPosition(nucleo, 0, -0.4, 0);
const nave = SZGame3D.createBox(cena, { size: 1.2, color: "#22d3ee" });
SZGame3D.setPosition(nave, 0, 0.6, 0);
const moldeCaca = SZGame3D.createBox(cena, { size: 1, color: "#ef4444" });
SZGame3D.setVisible(moldeCaca, "hide");
const cacas = SZGame3D.createSwarm(cena);
let pontos = 0;
let escudo = 3;
let naveX = 0;
let naveZ = 0;
let rodando = true;
document.getElementById("retry")?.addEventListener("click", (event) => {
  SZGame3D.forEachInSwarm(cacas, (item) => {
    SZGame3D.removeFromSwarm(cacas, item);
  });
  pontos = 0;
  escudo = 3;
  naveX = 0;
  naveZ = 0;
  rodando = true;
  SZGame3D.setPosition(nave, 0, 0.6, 0);
  document.getElementById("score").textContent = "Naves: 0 de 10";
  document.getElementById("shields").textContent = "Escudos: 3";
  document.getElementById("results")?.classList.remove("visivel");
});
SZGame3D.animate(cena, () => {
  if (rodando) {
    SZGame3D.spin(nucleo, "y", 0.6);
    if (SZGame3D.keyDown("ArrowLeft") || SZGame3D.keyDown("KeyA")) {
      naveX = naveX - 0.18;
    }
    if (SZGame3D.keyDown("ArrowRight") || SZGame3D.keyDown("KeyD")) {
      naveX = naveX + 0.18;
    }
    if (SZGame3D.keyDown("ArrowUp") || SZGame3D.keyDown("KeyW")) {
      naveZ = naveZ - 0.18;
    }
    if (SZGame3D.keyDown("ArrowDown") || SZGame3D.keyDown("KeyS")) {
      naveZ = naveZ + 0.18;
    }
    if (naveX < -16) {
      naveX = -16;
    }
    if (naveX > 16) {
      naveX = 16;
    }
    if (naveZ < -16) {
      naveZ = -16;
    }
    if (naveZ > 16) {
      naveZ = 16;
    }
    SZGame3D.setPosition(nave, naveX, 0.6, naveZ);
    SZGame3D.forEachInSwarm(cacas, (item) => {
      if (SZGame3D.keyDown("Space") && SZGame3D.isNear(nave, item, 2.6)) {
        SZGame3D.removeFromSwarm(cacas, item);
        pontos = pontos + 1;
        SZGame3D.playEffect("coin");
        document.getElementById("score").textContent = "Naves: " + pontos + " de 10";
      } else {
        if (SZGame3D.isNear(nave, item, 1.4)) {
          SZGame3D.removeFromSwarm(cacas, item);
          escudo = escudo - 1;
          SZGame3D.playEffect("hit");
          document.getElementById("shields").textContent = "Escudos: " + escudo;
        } else {
          if (SZGame3D.isNear(nave, item, 13)) {
            SZGame3D.moveTowards(item, SZGame3D.getPos(nave, "x"), 0.6, SZGame3D.getPos(nave, "z"), 0.06);
          } else {
            SZGame3D.spin(item, "y", 1.6);
          }
        }
      }
    });
    if (pontos >= 10) {
      rodando = false;
      SZGame3D.playEffect("coin");
      document.getElementById("result-title").textContent = "Ás dos céus!";
      document.getElementById("final-score").textContent = pontos;
      document.getElementById("results")?.classList.add("visivel");
    }
    if (escudo <= 0) {
      rodando = false;
      SZGame3D.playEffect("explosion");
      document.getElementById("result-title").textContent = "Nave abatida...";
      document.getElementById("final-score").textContent = pontos;
      document.getElementById("results")?.classList.add("visivel");
    }
  }
});
SZGame3D.everySecondsLoop(1.6, () => {
  if (rodando) {
    if (SZGame3D.countSwarm(cacas) < 6) {
      const angulo = Math.random() * 6.283;
      SZGame3D.spawnInSwarm(cacas, moldeCaca, Math.cos(angulo) * 14, 0.6, Math.sin(angulo) * 14);
    }
  }
});
`.trim()

// HUD (placar de naves + escudos + tela de fim) montado com blocos de HTML/CSS/
// DOM, ligado ao jogo pelos getElementById do SOURCE. Casa os ids que o
// comportamento toca: score / shields / results / result-title / final-score / retry.
const HTML = [
  { type: 'element', tag: 'div', id: 'score', text: 'Naves: 0 de 10' },
  { type: 'element', tag: 'div', id: 'shields', text: 'Escudos: 3' },
  {
    type: 'element',
    tag: 'div',
    id: 'results',
    children: [
      {
        type: 'element',
        tag: 'div',
        id: 'results-box',
        children: [
          { type: 'element', tag: 'h1', id: 'result-title', text: 'Fim da patrulha' },
          {
            type: 'element',
            tag: 'p',
            children: [
              { type: 'text', text: 'Naves abatidas: ' },
              { type: 'element', tag: 'span', id: 'final-score' },
            ],
          },
          { type: 'element', tag: 'button', id: 'retry', text: 'Jogar de novo' },
        ],
      },
    ],
  },
]

const CSS = [
  { type: 'googleFont', family: 'Press Start 2P' },
  {
    selector: 'body',
    declarations: { margin: '0', overflow: 'hidden', 'font-family': '"Press Start 2P", cursive' },
  },
  { selector: 'canvas', declarations: { display: 'block', width: '100vw', height: '100vh' } },
  {
    selector: '#score',
    declarations: {
      position: 'absolute',
      top: '20px',
      left: '20px',
      'font-size': '1.1em',
      color: 'white',
    },
  },
  {
    selector: '#shields',
    declarations: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      'font-size': '1.1em',
      color: '#22d3ee',
    },
  },
  {
    selector: '#results',
    declarations: {
      position: 'absolute',
      top: '0',
      left: '0',
      'min-width': '100%',
      'min-height': '100%',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      visibility: 'hidden',
    },
  },
  { selector: '#results.visivel', declarations: { visibility: 'visible' } },
  {
    selector: '#results-box',
    declarations: {
      display: 'flex',
      'flex-direction': 'column',
      'align-items': 'center',
      'background-color': 'white',
      color: '#050818',
      padding: '20px',
      'text-align': 'center',
    },
  },
  {
    selector: '#results-box button',
    declarations: {
      'background-color': '#22d3ee',
      color: 'white',
      padding: '16px 32px',
      'font-family': 'inherit',
      cursor: 'pointer',
    },
  },
]

if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(CACA_ESTELAR_SOURCE),
    extensions: [{ extensionId: 'game-3d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behavior)
  const bad = [...types].filter(
    (t) => t === 'rawJS' || t === 'memberCall' || t === 'memberCallExpr',
  )
  if (bad.length) console.error('DRIFT:', bad)
  const example = {
    name: 'Caça Estelar',
    experience: 'game',
    description:
      'Uma nave numa arena espacial cheia de inimigos. Voe livre com as setas e dispare no inimigo mais perto com a barra de espaço. As naves vagam e perseguem você. Abata 10 antes que os 3 escudos acabem!',
    ir: {
      html: HTML,
      css: CSS,
      extensions: [{ extensionId: 'game-3d' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const cacaEstelarBasicoExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
