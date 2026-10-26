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
SZGame3D.setScreenText("vitoria", "Filão lendário!", "Confira seus pontos no placar.", "Jogar de novo");
SZGame3D.setScreenText("fim", "A mina fechou...", "Confira seus pontos no placar.", "Tentar novamente");
SZGame3D.addScore(0);
SZGame3D.hudText("bottom-center", "Clique nos blocos para cavar. Colete dez cristais.");
SZGame3D.setSky(cena, "#241a33", "#4c1d95");
SZGame3D.setFog(cena, "#0f0a1e", 10, 46);
const chao = SZGame3D.createBlock(cena, { width: 20, height: 1, depth: 20, color: "#1a1226" });
SZGame3D.setPosition(chao, 0, -0.6, 0);
const moldePedra = SZGame3D.createBox(cena, { size: 1, color: "#57534e" });
SZGame3D.setVisible(moldePedra, "hide");
const moldeCristal = SZGame3D.createBox(cena, { size: 1, color: "#22d3ee" });
SZGame3D.setMaterial(moldeCristal, "glow");
SZGame3D.setVisible(moldeCristal, "hide");
const pedras = SZGame3D.createGroup();
const cristais = SZGame3D.createGroup();
SZGame3D.cameraMode(cena, "isometrica", null);
let pontos = 0;
let tempo = 50;
let rodando = true;
function cavarChance() {
  return Math.random() < 0.3;
}
function encherAMina() {
  SZGame3D.forEachInGroup(pedras, (item) => {
    SZGame3D.removeFromGroup(pedras, item);
  });
  SZGame3D.forEachInGroup(cristais, (item) => {
    SZGame3D.removeFromGroup(cristais, item);
  });
  for (let linha = -3; linha < 4; linha++) {
    for (let coluna = -3; coluna < 4; coluna++) {
      if (cavarChance()) {
        SZGame3D.spawnCopy(cristais, moldeCristal, coluna, 0, linha);
      } else {
        SZGame3D.spawnCopy(pedras, moldePedra, coluna, 0, linha);
      }
    }
  }
}
function atualizarHud() {
  SZGame3D.addScore(pontos - SZGame3D.score());
  SZGame3D.hudText("top-right", "Tempo: " + tempo);
}
function recomecar() {
  encherAMina();
  pontos = 0;
  tempo = 50;
  atualizarHud();

  rodando = true;
}
recomecar();

SZGame3D.onCanvasClick(() => {
  if (rodando) {
    const alvo = SZGame3D.pickAtMouse(cena);
    if (alvo) {
      let antesC = SZGame3D.countGroup(cristais);
      SZGame3D.removeFromGroup(cristais, alvo);
      if (SZGame3D.countGroup(cristais) < antesC) {
        pontos = pontos + 1;
        SZGame3D.playEffect("coin");
        atualizarHud();
        if (pontos >= 10) {
          rodando = false;
                              SZGame3D.addScore(pontos - SZGame3D.score());
      SZGame3D.endGame("ganhou");
        }
      } else {
        let antesP = SZGame3D.countGroup(pedras);
        SZGame3D.removeFromGroup(pedras, alvo);
        if (SZGame3D.countGroup(pedras) < antesP) {
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
    if (SZGame3D.countGroup(pedras) + SZGame3D.countGroup(cristais) < 60) {
      const coluna = Math.floor(Math.random() * 9) - 4;
      const linha = Math.floor(Math.random() * 9) - 4;
      if (cavarChance()) {
        SZGame3D.spawnCopy(cristais, moldeCristal, coluna, 0, linha);
      } else {
        SZGame3D.spawnCopy(pedras, moldePedra, coluna, 0, linha);
      }
    }
    if (tempo <= 0) {
      rodando = false;
                  SZGame3D.addScore(pontos - SZGame3D.score());
      SZGame3D.endGame("perdeu");
    }
  }
});
`.trim()

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
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const minaDeCristaisBasicoExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
