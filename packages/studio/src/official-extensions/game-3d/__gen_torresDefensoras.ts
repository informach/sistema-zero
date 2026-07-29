import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from '../game-3d-advanced/exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Torres Defensoras" (nível BÁSICO do Tower
 * Defense do SimonDev, montado só com genéricos do Jogo 3D — não há kit TD).
 * Rode com `bun src/official-extensions/game-3d/__gen_torresDefensoras.ts` e cole
 * a saída em examples.ts. O drift test guarda o resultado.
 *
 * Fidelidade em ESPÍRITO ao Tower Defense: uma torre no centro DEFENDE um cristal.
 * Os inimigos (enxame) nascem nas bordas e caminham até o centro (moveTowards).
 * A torre gira (spin) e ZAPEIA um inimigo por vez dentro do alcance, com recarga
 * (o cooldown do curso) — se os inimigos vierem rápido demais, um escapa e
 * encosta no cristal = derrota. Destruir 20 = vitória. A mira/tiro/FSM completa
 * vive no degrau Profissional (Defesa da Torre / g3k). 100% procedural.
 */
export const TORRES_DEFENSORAS_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#0f172a");
SZGame3D.setSky(cena, "#1e293b", "#334155");
SZGame3D.topCamera(cena, null);
SZGame3D.setFog(cena, "#0f172a", 34, 90);
SZGame3D.addSunLight(cena, "#e2e8f0", 1);
const chao = SZGame3D.createBlock(cena, { width: 44, height: 1, depth: 44, color: "#1e293b" });
SZGame3D.setPosition(chao, 0, -0.5, 0);
const cristal = SZGame3D.createBox(cena, { size: 2, color: "#38bdf8" });
SZGame3D.setPosition(cristal, 0, 1, 0);
SZGame3D.setMaterial(cristal, "glow");
const torre = SZGame3D.createBox(cena, { size: 1.5, color: "#f8fafc" });
SZGame3D.setPosition(torre, 0, 1.4, 0);
const cano = SZGame3D.createBlock(cena, { width: 0.4, height: 0.4, depth: 1.8, color: "#94a3b8" });
SZGame3D.setPosition(cano, 0, 1.4, 1);
const molde = SZGame3D.createBox(cena, { size: 1, color: "#f43f5e" });
SZGame3D.setVisible(molde, "hide");
const inimigos = SZGame3D.createSwarm(cena);
let pontos = 0;
let recarga = 0;
let rodando = true;
document.getElementById("retry")?.addEventListener("click", (event) => {
  SZGame3D.forEachInSwarm(inimigos, (item) => {
    SZGame3D.removeFromSwarm(inimigos, item);
  });
  pontos = 0;
  recarga = 0;
  rodando = true;
  document.getElementById("score").textContent = 0;
  document.getElementById("results")?.classList.remove("visivel");
});
SZGame3D.animate(cena, () => {
  if (rodando) {
    SZGame3D.spin(torre, "y", 1.4);
    SZGame3D.spin(cristal, "y", 0.6);
    recarga = recarga - SZGame3D.dt(cena);
    SZGame3D.forEachInSwarm(inimigos, (item) => {
      SZGame3D.moveTowards(item, 0, SZGame3D.getPos(item, "y"), 0, 0.02);
      if (SZGame3D.isNear(cristal, item, 1.8)) {
        rodando = false;
        SZGame3D.playEffect("explosion");
        document.getElementById("final-score").textContent = pontos;
        document.getElementById("results")?.classList.add("visivel");
      }
      if (recarga <= 0 && SZGame3D.isNear(torre, item, 6)) {
        SZGame3D.removeFromSwarm(inimigos, item);
        SZGame3D.playEffect("hit");
        pontos = pontos + 1;
        recarga = 0.35;
        document.getElementById("score").textContent = pontos;
      }
    });
    if (pontos >= 20) {
      rodando = false;
      SZGame3D.playEffect("coin");
      document.getElementById("final-score").textContent = pontos;
      document.getElementById("results")?.classList.add("visivel");
    }
  }
});
SZGame3D.everySecondsLoop(1.1, () => {
  if (rodando) {
    const angulo = Math.random() * 6.283;
    const ex = Math.cos(angulo) * 14;
    const ez = Math.sin(angulo) * 14;
    SZGame3D.spawnInSwarm(inimigos, molde, ex, 1, ez);
  }
});
`.trim()

// HUD (placar + tela de fim) montado com blocos de HTML/CSS/DOM, ligado ao jogo
// pelos getElementById do SOURCE. É livre (não vem do parser) — só precisa casar
// os ids que o comportamento toca: score / results / final-score / retry.
const HTML = [
  { type: 'element', tag: 'div', id: 'score', text: '0' },
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
          { type: 'element', tag: 'h1', text: 'Fim da rodada' },
          {
            type: 'element',
            tag: 'p',
            children: [
              { type: 'text', text: 'Invasores parados: ' },
              { type: 'element', tag: 'span', id: 'final-score' },
            ],
          },
          { type: 'element', tag: 'button', id: 'retry', text: 'Recomeçar' },
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
      'font-size': '1.5em',
      color: 'white',
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
      padding: '20px',
    },
  },
  {
    selector: '#results-box button',
    declarations: {
      'background-color': '#38bdf8',
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
    js: parseJS(TORRES_DEFENSORAS_SOURCE),
    extensions: [{ extensionId: 'game-3d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behavior)
  const bad = [...types].filter(
    (t) => t === 'rawJS' || t === 'memberCall' || t === 'memberCallExpr',
  )
  if (bad.length) console.error('DRIFT:', bad)
  const example = {
    name: 'Defesa da Torre',
    experience: 'game',
    description:
      'Uma torre no centro defende o cristal sozinha: os invasores nascem na beirada e vêm ao meio, e a torre zapeia um por vez. Pare 20 invasores para vencer!',
    ir: {
      html: HTML,
      css: CSS,
      extensions: [{ extensionId: 'game-3d' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const defesaDaTorreBasicoExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
