import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from '../game-3d-advanced/exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "A Lenda do Herói" (nível BÁSICO do RPG de
 * ação do SimonDev, montado só com genéricos do Jogo 3D). Rode com
 * `bun src/official-extensions/game-3d/__gen_aLendaDoHeroi.ts` e cole a saída em
 * examples.ts. O drift test guarda o resultado importando o SOURCE daqui.
 *
 * O RPG de ação do SimonDev (Quick_3D_RPG) no seu degrau mais simples, 100%
 * genéricos: um herói (setas/WASD, câmera de cima) que ATACA de perto com a
 * espada (barra de espaço → derrota quem estiver a até 2,3). Os monstros nascem
 * na borda, vagam (giram parados) e, ao te enxergar, PERSEGUEM (moveTowards); se
 * encostarem em você tiram um coração. Derrote 10 antes que os 3 corações
 * acabem. A FSM por-entidade completa vive no degrau Profissional (g3k). Sem kit
 * próprio, sem imagem.
 */
export const A_LENDA_DO_HEROI_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#0f2417");
SZGame3D.setSky(cena, "#1e3a2a", "#2f5541");
SZGame3D.topCamera(cena, null);
SZGame3D.setFog(cena, "#0f2417", 42, 120);
SZGame3D.addSunLight(cena, "#fef9c3", 1);
const chao = SZGame3D.createBlock(cena, { width: 36, height: 1, depth: 36, color: "#14532d" });
SZGame3D.setPosition(chao, 0, -0.5, 0);
const castelo = SZGame3D.createBlock(cena, { width: 5, height: 4, depth: 5, color: "#6b7280" });
SZGame3D.setPosition(castelo, 0, 1.5, -15);
SZGame3D.setMaterial(castelo, "metal");
const heroi = SZGame3D.createBox(cena, { size: 1.3, color: "#2563eb" });
SZGame3D.setPosition(heroi, 0, 0.65, 0);
const coroa = SZGame3D.createBox(cena, { size: 0.6, color: "#fcd34d" });
SZGame3D.setMaterial(coroa, "glow");
SZGame3D.setPosition(coroa, 0, 1.6, 0);
const moldeMonstro = SZGame3D.createBox(cena, { size: 1, color: "#7c3aed" });
SZGame3D.setVisible(moldeMonstro, "hide");
const monstros = SZGame3D.createSwarm(cena);
let pontos = 0;
let vida = 3;
let heroiX = 0;
let heroiZ = 0;
let rodando = true;
document.getElementById("retry")?.addEventListener("click", (event) => {
  SZGame3D.forEachInSwarm(monstros, (item) => {
    SZGame3D.removeFromSwarm(monstros, item);
  });
  pontos = 0;
  vida = 3;
  heroiX = 0;
  heroiZ = 0;
  rodando = true;
  SZGame3D.setPosition(heroi, 0, 0.65, 0);
  document.getElementById("score").textContent = "Monstros: 0 de 10";
  document.getElementById("hearts").textContent = "Vida: 3";
  document.getElementById("results")?.classList.remove("visivel");
});
SZGame3D.animate(cena, () => {
  if (rodando) {
    SZGame3D.spin(coroa, "y", 1.2);
    if (SZGame3D.keyDown("ArrowLeft") || SZGame3D.keyDown("KeyA")) {
      heroiX = heroiX - 0.16;
    }
    if (SZGame3D.keyDown("ArrowRight") || SZGame3D.keyDown("KeyD")) {
      heroiX = heroiX + 0.16;
    }
    if (SZGame3D.keyDown("ArrowUp") || SZGame3D.keyDown("KeyW")) {
      heroiZ = heroiZ - 0.16;
    }
    if (SZGame3D.keyDown("ArrowDown") || SZGame3D.keyDown("KeyS")) {
      heroiZ = heroiZ + 0.16;
    }
    if (heroiX < -16) {
      heroiX = -16;
    }
    if (heroiX > 16) {
      heroiX = 16;
    }
    if (heroiZ < -16) {
      heroiZ = -16;
    }
    if (heroiZ > 16) {
      heroiZ = 16;
    }
    SZGame3D.setPosition(heroi, heroiX, 0.65, heroiZ);
    SZGame3D.setPosition(coroa, heroiX, 1.6, heroiZ);
    SZGame3D.forEachInSwarm(monstros, (item) => {
      if (SZGame3D.keyDown("Space") && SZGame3D.isNear(heroi, item, 2.3)) {
        SZGame3D.removeFromSwarm(monstros, item);
        pontos = pontos + 1;
        SZGame3D.playEffect("coin");
        document.getElementById("score").textContent = "Monstros: " + pontos + " de 10";
      } else {
        if (SZGame3D.isNear(heroi, item, 1.35)) {
          SZGame3D.removeFromSwarm(monstros, item);
          vida = vida - 1;
          SZGame3D.playEffect("hit");
          document.getElementById("hearts").textContent = "Vida: " + vida;
        } else {
          if (SZGame3D.isNear(heroi, item, 13)) {
            SZGame3D.moveTowards(item, SZGame3D.getPos(heroi, "x"), 0.65, SZGame3D.getPos(heroi, "z"), 0.05);
          } else {
            SZGame3D.spin(item, "y", 1.6);
          }
        }
      }
    });
    if (pontos >= 10) {
      rodando = false;
      SZGame3D.playEffect("coin");
      document.getElementById("result-title").textContent = "Herói lendário!";
      document.getElementById("final-score").textContent = pontos;
      document.getElementById("results")?.classList.add("visivel");
    }
    if (vida <= 0) {
      rodando = false;
      SZGame3D.playEffect("explosion");
      document.getElementById("result-title").textContent = "O herói caiu...";
      document.getElementById("final-score").textContent = pontos;
      document.getElementById("results")?.classList.add("visivel");
    }
  }
});
SZGame3D.everySecondsLoop(1.6, () => {
  if (rodando) {
    if (SZGame3D.countSwarm(monstros) < 6) {
      const angulo = Math.random() * 6.283;
      SZGame3D.spawnInSwarm(monstros, moldeMonstro, Math.cos(angulo) * 13, 0.65, Math.sin(angulo) * 13);
    }
  }
});
`.trim()

// HUD (placar de monstros + corações + tela de fim) montado com blocos de HTML/
// CSS/DOM, ligado ao jogo pelos getElementById do SOURCE. Casa os ids que o
// comportamento toca: score / hearts / results / result-title / final-score / retry.
const HTML = [
  { type: 'element', tag: 'div', id: 'score', text: 'Monstros: 0 de 10' },
  { type: 'element', tag: 'div', id: 'hearts', text: 'Vida: 3' },
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
          { type: 'element', tag: 'h1', id: 'result-title', text: 'Fim da aventura' },
          {
            type: 'element',
            tag: 'p',
            children: [
              { type: 'text', text: 'Monstros derrotados: ' },
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
    selector: '#hearts',
    declarations: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      'font-size': '1.1em',
      color: '#f87171',
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
      color: '#0f2417',
      padding: '20px',
      'text-align': 'center',
    },
  },
  {
    selector: '#results-box button',
    declarations: {
      'background-color': '#2563eb',
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
    js: parseJS(A_LENDA_DO_HEROI_SOURCE),
    extensions: [{ extensionId: 'game-3d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behavior)
  const bad = [...types].filter(
    (t) => t === 'rawJS' || t === 'memberCall' || t === 'memberCallExpr',
  )
  if (bad.length) console.error('DRIFT:', bad)
  const example = {
    name: 'A Lenda do Herói',
    experience: 'game',
    description:
      'Um herói numa clareira cheia de monstros. Ande com as setas e ataque de perto com a barra de espaço. Os monstros vagam e perseguem você. Derrote 10 antes que os 3 corações acabem!',
    ir: {
      html: HTML,
      css: CSS,
      extensions: [{ extensionId: 'game-3d' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const aLendaDoHeroiBasicoExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
