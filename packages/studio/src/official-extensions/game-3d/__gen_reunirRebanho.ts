import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from '../game-3d-advanced/exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Reunir o Rebanho" (nível BÁSICO do Entity
 * Management do SimonDev, montado só com genéricos do Jogo 3D). Rode com
 * `bun src/official-extensions/game-3d/__gen_reunirRebanho.ts` e cole a saída em
 * examples.ts. O drift test guarda o resultado importando o SOURCE daqui.
 *
 * Fidelidade em ESPÍRITO ao Entity Management: gerenciar MUITAS entidades
 * autônomas com ESTADO POR-ENTIDADE. Os bichinhos nascem espalhados e VAGAM
 * (giram parados); ao chegar perto do herói (setas/WASD) um bichinho muda de
 * estado e passa a SEGUIR (vai do enxame "errantes" para "seguidores" e faz
 * moveTowards no herói). Leve o rebanho até o curral dourado para entregá-los;
 * reúna 8 antes do tempo acabar. A FSM/pool completa por entidade vive no degrau
 * Profissional (g3k). 100% procedural, sem kit próprio.
 */
export const REUNIR_REBANHO_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#0f172a");
SZGame3D.setSky(cena, "#1e293b", "#334155");
SZGame3D.topCamera(cena, null);
SZGame3D.setFog(cena, "#0f172a", 40, 110);
SZGame3D.addSunLight(cena, "#e2e8f0", 1);
const chao = SZGame3D.createBlock(cena, { width: 34, height: 1, depth: 34, color: "#14532d" });
SZGame3D.setPosition(chao, 0, -0.5, 0);
const curral = SZGame3D.createBlock(cena, { width: 6, height: 0.3, depth: 6, color: "#fbbf24" });
SZGame3D.setPosition(curral, 9, 0.15, 9);
SZGame3D.setMaterial(curral, "glow");
const heroi = SZGame3D.createBox(cena, { size: 1.3, color: "#38bdf8" });
SZGame3D.setPosition(heroi, 0, 0.65, 0);
const moldeErrante = SZGame3D.createBox(cena, { size: 1, color: "#f472b6" });
SZGame3D.setVisible(moldeErrante, "hide");
const moldeSeguidor = SZGame3D.createBox(cena, { size: 1, color: "#22d3ee" });
SZGame3D.setVisible(moldeSeguidor, "hide");
const errantes = SZGame3D.createSwarm(cena);
const seguidores = SZGame3D.createSwarm(cena);
let pontos = 0;
let tempo = 45;
let rodando = true;
document.getElementById("retry")?.addEventListener("click", (event) => {
  SZGame3D.forEachInSwarm(errantes, (item) => {
    SZGame3D.removeFromSwarm(errantes, item);
  });
  SZGame3D.forEachInSwarm(seguidores, (item) => {
    SZGame3D.removeFromSwarm(seguidores, item);
  });
  pontos = 0;
  tempo = 45;
  rodando = true;
  SZGame3D.setPosition(heroi, 0, 0.65, 0);
  document.getElementById("score").textContent = 0;
  document.getElementById("timer").textContent = 45;
  document.getElementById("results")?.classList.remove("visivel");
});
SZGame3D.animate(cena, () => {
  if (rodando) {
    SZGame3D.spin(curral, "y", 0.4);
    if (SZGame3D.keyDown("ArrowLeft") || SZGame3D.keyDown("KeyA")) {
      SZGame3D.moveBy(heroi, -0.16, 0, 0);
    }
    if (SZGame3D.keyDown("ArrowRight") || SZGame3D.keyDown("KeyD")) {
      SZGame3D.moveBy(heroi, 0.16, 0, 0);
    }
    if (SZGame3D.keyDown("ArrowUp") || SZGame3D.keyDown("KeyW")) {
      SZGame3D.moveBy(heroi, 0, 0, -0.16);
    }
    if (SZGame3D.keyDown("ArrowDown") || SZGame3D.keyDown("KeyS")) {
      SZGame3D.moveBy(heroi, 0, 0, 0.16);
    }
    if (SZGame3D.getPos(heroi, "x") < -13) {
      SZGame3D.setPosition(heroi, -13, 0.65, SZGame3D.getPos(heroi, "z"));
    }
    if (SZGame3D.getPos(heroi, "x") > 13) {
      SZGame3D.setPosition(heroi, 13, 0.65, SZGame3D.getPos(heroi, "z"));
    }
    if (SZGame3D.getPos(heroi, "z") < -13) {
      SZGame3D.setPosition(heroi, SZGame3D.getPos(heroi, "x"), 0.65, -13);
    }
    if (SZGame3D.getPos(heroi, "z") > 13) {
      SZGame3D.setPosition(heroi, SZGame3D.getPos(heroi, "x"), 0.65, 13);
    }
    SZGame3D.forEachInSwarm(errantes, (item) => {
      SZGame3D.spin(item, "y", 1.5);
      if (SZGame3D.isNear(heroi, item, 1.7)) {
        SZGame3D.spawnInSwarm(seguidores, moldeSeguidor, SZGame3D.getPos(item, "x"), 0.65, SZGame3D.getPos(item, "z"));
        SZGame3D.removeFromSwarm(errantes, item);
        SZGame3D.playEffect("coin");
      }
    });
    SZGame3D.forEachInSwarm(seguidores, (item) => {
      SZGame3D.moveTowards(item, SZGame3D.getPos(heroi, "x"), 0.65, SZGame3D.getPos(heroi, "z"), 0.08);
      if (SZGame3D.isNear(curral, item, 3)) {
        SZGame3D.removeFromSwarm(seguidores, item);
        pontos = pontos + 1;
        SZGame3D.playEffect("coin");
        document.getElementById("score").textContent = pontos;
      }
    });
    if (pontos >= 8) {
      rodando = false;
      SZGame3D.playEffect("coin");
      document.getElementById("final-score").textContent = pontos;
      document.getElementById("results")?.classList.add("visivel");
    }
  }
});
SZGame3D.everySecondsLoop(1.4, () => {
  if (rodando) {
    if (SZGame3D.countSwarm(errantes) < 6) {
      const angulo = Math.random() * 6.283;
      SZGame3D.spawnInSwarm(errantes, moldeErrante, Math.cos(angulo) * 10, 0.65, Math.sin(angulo) * 10);
    }
  }
});
SZGame3D.everySecondsLoop(1, () => {
  if (rodando) {
    tempo = tempo - 1;
    document.getElementById("timer").textContent = tempo;
    if (tempo <= 0) {
      rodando = false;
      document.getElementById("final-score").textContent = pontos;
      document.getElementById("results")?.classList.add("visivel");
    }
  }
});
`.trim()

// HUD (placar + relógio + tela de fim) montado com blocos de HTML/CSS/DOM, ligado
// ao jogo pelos getElementById do SOURCE. Casa os ids que o comportamento toca:
// score / timer / results / final-score / retry.
const HTML = [
  { type: 'element', tag: 'div', id: 'score', text: '0' },
  { type: 'element', tag: 'div', id: 'timer', text: '45' },
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
          { type: 'element', tag: 'h1', text: 'Fim do pastoreio' },
          {
            type: 'element',
            tag: 'p',
            children: [
              { type: 'text', text: 'Bichinhos reunidos: ' },
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
      'font-size': '1.5em',
      color: 'white',
    },
  },
  {
    selector: '#timer',
    declarations: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      'font-size': '1.5em',
      color: '#fbbf24',
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
    js: parseJS(REUNIR_REBANHO_SOURCE),
    extensions: [{ extensionId: 'game-3d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behavior)
  const bad = [...types].filter(
    (t) => t === 'rawJS' || t === 'memberCall' || t === 'memberCallExpr',
  )
  if (bad.length) console.error('DRIFT:', bad)
  const example = {
    name: 'Reunir o Rebanho',
    experience: 'game',
    description:
      'Os bichinhos vagam pelo campo. Chegue perto com as setas para eles seguirem você e leve o rebanho ao curral dourado. Reúna 8 antes do tempo acabar!',
    ir: {
      html: HTML,
      css: CSS,
      extensions: [{ extensionId: 'game-3d' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const reunirRebanhoBasicoExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
