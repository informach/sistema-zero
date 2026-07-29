import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from '../game-3d-advanced/exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Cerco na Base" (nível BÁSICO do FPS do
 * SimonDev, montado só com genéricos do Jogo 3D). Rode com
 * `bun src/official-extensions/game-3d/__gen_cercoNaBase.ts` e cole a saída em
 * examples.ts. O drift test guarda o resultado importando o SOURCE daqui.
 *
 * O FPS do SimonDev (Quick_FPS1) no degrau mais simples, 100% genéricos: câmera
 * em PRIMEIRA PESSOA (fpsCamera + fpsControls) numa ARENA aberta. Os aliens
 * nascem na borda em ONDAS e avançam (moveTowards). Você mira com o mouse e
 * atira no que estiver na mira (aimAhead) segurando o espaço para CARREGAR: com
 * carga cheia o tiro vira um estouro que limpa os aliens por perto. A MUNIÇÃO é
 * limitada e recarrega sozinha. Abata 12 antes que as 3 vidas acabem. ⭐ DISTINTO
 * do "Labirinto dos Robôs" (também 1ª pessoa): lá é um LABIRINTO de paredes com
 * tiro à vontade e limpar tudo; aqui é ARENA com MUNIÇÃO + tiro CARREGADO e ondas.
 */
export const CERCO_NA_BASE_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#1a0f2e");
SZGame3D.setSky(cena, "#2d1b3d", "#4c1d95");
SZGame3D.setFog(cena, "#1a0f2e", 8, 44);
const chao = SZGame3D.createBlock(cena, { width: 34, height: 1, depth: 34, color: "#2d1b3d" });
SZGame3D.setPosition(chao, 0, -1, 0);
SZGame3D.setSolid(chao);
const jogador = SZGame3D.createBox(cena, { size: 1, color: "#22d3ee" });
SZGame3D.setPosition(jogador, 0, 0, 0);
SZGame3D.body(jogador, -0.02);
const muroNorte = SZGame3D.createBlock(cena, { width: 34, height: 3, depth: 1, color: "#6d28d9" });
SZGame3D.setPosition(muroNorte, 0, 1, -16.5);
SZGame3D.setSolid(muroNorte);
const muroSul = SZGame3D.createBlock(cena, { width: 34, height: 3, depth: 1, color: "#6d28d9" });
SZGame3D.setPosition(muroSul, 0, 1, 16.5);
SZGame3D.setSolid(muroSul);
const muroOeste = SZGame3D.createBlock(cena, { width: 1, height: 3, depth: 34, color: "#6d28d9" });
SZGame3D.setPosition(muroOeste, -16.5, 1, 0);
SZGame3D.setSolid(muroOeste);
const muroLeste = SZGame3D.createBlock(cena, { width: 1, height: 3, depth: 34, color: "#6d28d9" });
SZGame3D.setPosition(muroLeste, 16.5, 1, 0);
SZGame3D.setSolid(muroLeste);
SZGame3D.fpsCamera(cena, jogador);
const moldeAlien = SZGame3D.createBox(cena, { size: 1, color: "#4ade80" });
SZGame3D.setMaterial(moldeAlien, "glow");
SZGame3D.setVisible(moldeAlien, "hide");
const cacas = SZGame3D.createSwarm(cena);
let vida = 3;
let pontos = 0;
let municao = 6;
let carga = 0;
let recargaMunicao = 70;
let recargaDano = 0;
let rodando = true;
function recomecar() {
  SZGame3D.forEachInSwarm(cacas, (item) => {
    SZGame3D.removeFromSwarm(cacas, item);
  });
  SZGame3D.spawnInSwarm(cacas, moldeAlien, -8, 0, -8);
  SZGame3D.spawnInSwarm(cacas, moldeAlien, 9, 0, -7);
  SZGame3D.spawnInSwarm(cacas, moldeAlien, -6, 0, 9);
  SZGame3D.setPosition(jogador, 0, 0, 0);
  SZGame3D.setRotation(jogador, 0, 0, 0);
  vida = 3;
  pontos = 0;
  municao = 6;
  carga = 0;
  recargaMunicao = 70;
  recargaDano = 0;
  document.getElementById("vida").textContent = vida;
  document.getElementById("placar").textContent = pontos;
  document.getElementById("municao").textContent = municao;
  document.getElementById("fim")?.classList.remove("visivel");
  rodando = true;
}
recomecar();
document.getElementById("retry")?.addEventListener("click", (event) => {
  recomecar();
});
SZGame3D.animate(cena, () => {
  if (rodando) {
    SZGame3D.fpsControls(jogador, cena, 0.08);
    if (recargaDano > 0) {
      recargaDano = recargaDano - 1;
    }
    if (recargaMunicao > 0) {
      recargaMunicao = recargaMunicao - 1;
    } else {
      if (municao < 6) {
        municao = municao + 1;
        document.getElementById("municao").textContent = municao;
      }
      recargaMunicao = 70;
    }
    if (SZGame3D.keyDown("Space")) {
      carga = carga + 0.03;
      if (carga > 1) {
        carga = 1;
      }
    } else {
      if (carga > 0 && municao >= 1) {
        const alvo = SZGame3D.aimAhead(cena, jogador, 45);
        if (alvo) {
          SZGame3D.forEachInSwarm(cacas, (item) => {
            if (item === alvo) {
              SZGame3D.removeFromSwarm(cacas, item);
              pontos = pontos + 1;
            }
          });
        }
        if (carga >= 0.7) {
          SZGame3D.forEachInSwarm(cacas, (item) => {
            if (SZGame3D.isNear(jogador, item, 4)) {
              SZGame3D.removeFromSwarm(cacas, item);
              pontos = pontos + 1;
            }
          });
        }
        municao = municao - 1;
        carga = 0;
        SZGame3D.playEffect("explosion");
        document.getElementById("placar").textContent = pontos;
        document.getElementById("municao").textContent = municao;
        if (pontos >= 12) {
          rodando = false;
          document.getElementById("fim-titulo").textContent = "Base salva!";
          document.getElementById("final-pontos").textContent = pontos;
          document.getElementById("fim")?.classList.add("visivel");
          SZGame3D.playEffect("coin");
        }
      } else {
        carga = 0;
      }
    }
    SZGame3D.forEachInSwarm(cacas, (item) => {
      SZGame3D.moveTowards(item, SZGame3D.getPos(jogador, "x"), SZGame3D.getPos(item, "y"), SZGame3D.getPos(jogador, "z"), 0.018);
      if (SZGame3D.collides(jogador, item)) {
        if (recargaDano === 0) {
          vida = vida - 1;
          recargaDano = 90;
          document.getElementById("vida").textContent = vida;
          SZGame3D.playEffect("hit");
          if (vida <= 0) {
            rodando = false;
            document.getElementById("fim-titulo").textContent = "A base caiu...";
            document.getElementById("final-pontos").textContent = pontos;
            document.getElementById("fim")?.classList.add("visivel");
          }
        }
      }
    });
  }
});
SZGame3D.everySecondsLoop(1.6, () => {
  if (rodando) {
    if (SZGame3D.countSwarm(cacas) < 6) {
      const angulo = Math.random() * 6.283;
      SZGame3D.spawnInSwarm(cacas, moldeAlien, Math.cos(angulo) * 13, 0, Math.sin(angulo) * 13);
    }
  }
});
`.trim()

// HUD (mira central + placar/vida/munição + tela de fim) montado com blocos de
// HTML/CSS/DOM, ligado ao jogo pelos getElementById do SOURCE. Casa os ids que o
// comportamento toca: placar / vida / municao / fim / fim-titulo / final-pontos / retry.
const HTML = [
  {
    type: 'element',
    tag: 'div',
    id: 'status',
    children: [
      { type: 'text', text: 'Aliens: ' },
      { type: 'element', tag: 'span', id: 'placar', text: '0' },
      { type: 'text', text: ' de 12    Vida: ' },
      { type: 'element', tag: 'span', id: 'vida', text: '3' },
      { type: 'text', text: '    Munição: ' },
      { type: 'element', tag: 'span', id: 'municao', text: '6' },
    ],
  },
  { type: 'element', tag: 'div', id: 'mira', text: '+' },
  {
    type: 'element',
    tag: 'div',
    id: 'fim',
    children: [
      {
        type: 'element',
        tag: 'div',
        id: 'fim-caixa',
        children: [
          { type: 'element', tag: 'h1', id: 'fim-titulo', text: 'Fim do cerco' },
          {
            type: 'element',
            tag: 'p',
            children: [
              { type: 'text', text: 'Aliens abatidos: ' },
              { type: 'element', tag: 'span', id: 'final-pontos' },
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
    selector: '#status',
    declarations: {
      position: 'absolute',
      top: '20px',
      left: '20px',
      'font-size': '0.9em',
      color: 'white',
    },
  },
  {
    selector: '#mira',
    declarations: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: '#fde047',
      'font-size': '1.6em',
    },
  },
  {
    selector: '#fim',
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
  { selector: '#fim.visivel', declarations: { visibility: 'visible' } },
  {
    selector: '#fim-caixa',
    declarations: {
      display: 'flex',
      'flex-direction': 'column',
      'align-items': 'center',
      'background-color': 'white',
      color: '#1a0f2e',
      padding: '20px',
      'text-align': 'center',
    },
  },
  {
    selector: '#fim-caixa button',
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
    js: parseJS(CERCO_NA_BASE_SOURCE),
    extensions: [{ extensionId: 'game-3d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behavior)
  const bad = [...types].filter(
    (t) => t === 'rawJS' || t === 'memberCall' || t === 'memberCallExpr',
  )
  if (bad.length) console.error('DRIFT:', bad)
  const example = {
    name: 'Cerco na Base',
    experience: 'game',
    description:
      'Um FPS em 1ª pessoa numa arena. Mire com o mouse e segure o espaço para carregar o tiro. Os aliens vêm em ondas e a munição recarrega sozinha. Abata 12 antes que as 3 vidas acabem!',
    ir: {
      html: HTML,
      css: CSS,
      extensions: [{ extensionId: 'game-3d' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const cercoNaBaseBasicoExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
