import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from '../game-3d-advanced/exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Mina de Cristais" (nível BÁSICO do Minecraft
 * do SimonDev, montado só com genéricos do Jogo 3D). Rode com
 * `bun src/official-extensions/game-3d/__gen_minaDeCristais.ts` e cole a saída em
 * examples.ts. O drift test guarda o resultado importando o SOURCE daqui.
 *
 * O Minecraft do SimonDev (Quick_MinecraftClone2) no degrau mais simples, 100%
 * genéricos, como uma MINA de cristais: câmera ISOMÉTRICA (mouse LIVRE, então
 * pickAtMouse é permitido, ao contrário do FPS do Cerco na Base) sobre um campo
 * de blocos gerado com forRange. Clique num bloco para CAVAR: a pedra vira poeira
 * (só entulho) e os cristais brilhantes valem ponto. Veias novas de minério
 * surgem sozinhas (everySecondsLoop). Colete 10 cristais antes que o tempo acabe.
 * ⭐ DISTINTO da trilogia "Mundo de Blocos" (também blocos estilo Minecraft): lá
 * você CONSTRÓI uma torre (cursor na grade + espaço planta bloco + 1/2/3 troca o
 * tipo + vitória por ALTURA). Aqui NÃO há cursor, nem plantar, nem torre: o
 * clique só REMOVE, a meta é uma QUANTIDADE de cristais e há um TEMPO correndo.
 */
export const MINA_DE_CRISTAIS_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#0f0a1e");
SZGame3D.setSky(cena, "#241a33", "#4c1d95");
SZGame3D.setFog(cena, "#0f0a1e", 10, 46);
const chao = SZGame3D.createBlock(cena, { width: 20, height: 1, depth: 20, color: "#1a1226" });
SZGame3D.setPosition(chao, 0, -0.6, 0);
const moldePedra = SZGame3D.createBox(cena, { size: 1, color: "#57534e" });
SZGame3D.setVisible(moldePedra, "hide");
const moldeCristal = SZGame3D.createBox(cena, { size: 1, color: "#22d3ee" });
SZGame3D.setMaterial(moldeCristal, "glow");
SZGame3D.setVisible(moldeCristal, "hide");
const pedras = SZGame3D.createSwarm(cena);
const cristais = SZGame3D.createSwarm(cena);
SZGame3D.isometricCamera(cena, null);
let pontos = 0;
let tempo = 50;
let rodando = true;
function cavarChance() {
  return Math.random() < 0.3;
}
function encherAMina() {
  SZGame3D.forEachInSwarm(pedras, (item) => {
    SZGame3D.removeFromSwarm(pedras, item);
  });
  SZGame3D.forEachInSwarm(cristais, (item) => {
    SZGame3D.removeFromSwarm(cristais, item);
  });
  for (let linha = -3; linha < 4; linha++) {
    for (let coluna = -3; coluna < 4; coluna++) {
      if (cavarChance()) {
        SZGame3D.spawnInSwarm(cristais, moldeCristal, coluna, 0, linha);
      } else {
        SZGame3D.spawnInSwarm(pedras, moldePedra, coluna, 0, linha);
      }
    }
  }
}
function atualizarHud() {
  document.getElementById("placar").textContent = pontos;
  document.getElementById("tempo").textContent = tempo;
}
function recomecar() {
  encherAMina();
  pontos = 0;
  tempo = 50;
  atualizarHud();
  document.getElementById("fim")?.classList.remove("visivel");
  rodando = true;
}
recomecar();
document.getElementById("retry")?.addEventListener("click", (event) => {
  recomecar();
});
document.addEventListener("click", (event) => {
  if (rodando) {
    const alvo = SZGame3D.pickAtMouse(cena);
    if (alvo) {
      let antesC = SZGame3D.countSwarm(cristais);
      SZGame3D.removeFromSwarm(cristais, alvo);
      if (SZGame3D.countSwarm(cristais) < antesC) {
        pontos = pontos + 1;
        SZGame3D.playEffect("coin");
        atualizarHud();
        if (pontos >= 10) {
          rodando = false;
          document.getElementById("fim-titulo").textContent = "Filão lendário!";
          document.getElementById("final-pontos").textContent = pontos;
          document.getElementById("fim")?.classList.add("visivel");
        }
      } else {
        let antesP = SZGame3D.countSwarm(pedras);
        SZGame3D.removeFromSwarm(pedras, alvo);
        if (SZGame3D.countSwarm(pedras) < antesP) {
          SZGame3D.playEffect("hit");
        }
      }
    }
  }
});
SZGame3D.everySecondsLoop(1, () => {
  if (rodando) {
    tempo = tempo - 1;
    atualizarHud();
    if (SZGame3D.countSwarm(pedras) + SZGame3D.countSwarm(cristais) < 60) {
      const coluna = Math.floor(Math.random() * 9) - 4;
      const linha = Math.floor(Math.random() * 9) - 4;
      if (cavarChance()) {
        SZGame3D.spawnInSwarm(cristais, moldeCristal, coluna, 0, linha);
      } else {
        SZGame3D.spawnInSwarm(pedras, moldePedra, coluna, 0, linha);
      }
    }
    if (tempo <= 0) {
      rodando = false;
      document.getElementById("fim-titulo").textContent = "A mina fechou...";
      document.getElementById("final-pontos").textContent = pontos;
      document.getElementById("fim")?.classList.add("visivel");
    }
  }
});
`.trim()

// HUD (placar + tempo + tela de fim) montado com blocos de HTML/CSS/DOM, ligado
// ao jogo pelos getElementById do SOURCE. Casa os ids que o comportamento toca:
// placar / tempo / fim / fim-titulo / final-pontos / retry.
const HTML = [
  {
    type: 'element',
    tag: 'div',
    id: 'status',
    children: [
      { type: 'text', text: 'Cristais: ' },
      { type: 'element', tag: 'span', id: 'placar', text: '0' },
      { type: 'text', text: ' de 10    Tempo: ' },
      { type: 'element', tag: 'span', id: 'tempo', text: '50' },
      { type: 'text', text: 's' },
    ],
  },
  { type: 'element', tag: 'div', id: 'dica', text: 'Clique nos blocos para cavar!' },
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
          { type: 'element', tag: 'h1', id: 'fim-titulo', text: 'Fim da mina' },
          {
            type: 'element',
            tag: 'p',
            children: [
              { type: 'text', text: 'Cristais coletados: ' },
              { type: 'element', tag: 'span', id: 'final-pontos' },
            ],
          },
          { type: 'element', tag: 'button', id: 'retry', text: 'Minerar de novo' },
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
    selector: '#dica',
    declarations: {
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: '#67e8f9',
      'font-size': '0.7em',
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
      color: '#0f0a1e',
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
    js: parseJS(MINA_DE_CRISTAIS_SOURCE),
    extensions: [{ extensionId: 'game-3d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behavior)
  const bad = [...types].filter(
    (t) => t === 'rawJS' || t === 'memberCall' || t === 'memberCallExpr',
  )
  if (bad.length) console.error('DRIFT:', bad)
  const example = {
    name: 'Mina de Cristais',
    experience: 'game',
    description:
      'Uma mina isométrica de cristais. Clique nos blocos para cavar: a pedra é entulho, mas os cristais brilhantes valem ponto. Veias novas surgem sozinhas. Colete 10 cristais antes que o tempo acabe!',
    ir: {
      html: HTML,
      css: CSS,
      extensions: [{ extensionId: 'game-3d' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const minaDeCristaisBasicoExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
