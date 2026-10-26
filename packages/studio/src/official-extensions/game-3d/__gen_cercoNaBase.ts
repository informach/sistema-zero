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
 * em PRIMEIRA PESSOA (câmera em 1ª pessoa + fpsControls) numa ARENA aberta. Os aliens
 * nascem na borda em ONDAS e avançam (moveTowards). Você mira com o mouse e
 * atira no que estiver na mira (aimAhead) segurando o espaço para CARREGAR: com
 * carga cheia o tiro vira um estouro que limpa os aliens por perto. A MUNIÇÃO é
 * limitada e recarrega sozinha. Abata 12 antes que as 3 vidas acabem. ⭐ DISTINTO
 * do "Labirinto dos Robôs" (também 1ª pessoa): lá é um LABIRINTO de paredes com
 * tiro à vontade e limpar tudo; aqui é ARENA com MUNIÇÃO + tiro CARREGADO e ondas.
 */
export const CERCO_NA_BASE_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#1a0f2e");
SZGame3D.setScreenText("vitoria", "Base salva!", "Confira seus pontos no placar.", "Jogar de novo");
SZGame3D.setScreenText("fim", "A base caiu...", "Confira seus pontos no placar.", "Tentar novamente");
SZGame3D.addScore(0);
SZGame3D.hudText("bottom-center", "WASD: andar. Mouse: mirar. Segure e solte espaço: disparar.");
SZGame3D.hudText("center", "+");
SZGame3D.setSky(cena, "#2d1b3d", "#4c1d95");
SZGame3D.setFog(cena, "#1a0f2e", 8, 44);
const chao = SZGame3D.createBlock(cena, { width: 34, height: 1, depth: 34, color: "#2d1b3d" });
SZGame3D.setPosition(chao, 0, -1, 0);
SZGame3D.setSolid(chao);
const jogador = SZGame3D.createBox(cena, { size: 1, color: "#22d3ee" });
SZGame3D.setPosition(jogador, 0, 0, 0);
SZGame3D.body(jogador, 72);
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
SZGame3D.cameraMode(cena, "primeira-pessoa", jogador);
const moldeAlien = SZGame3D.createBox(cena, { size: 1, color: "#4ade80" });
SZGame3D.setMaterial(moldeAlien, "glow");
SZGame3D.setVisible(moldeAlien, "hide");
const cacas = SZGame3D.createGroup();
let vida = 3;
let pontos = 0;
let municao = 6;
let carga = 0;
let recargaMunicao = 70;
let recargaDano = 0;
let rodando = true;
function recomecar() {
  SZGame3D.forEachInGroup(cacas, (item) => {
    SZGame3D.removeFromGroup(cacas, item);
  });
  SZGame3D.spawnCopy(cacas, moldeAlien, -8, 0, -8);
  SZGame3D.spawnCopy(cacas, moldeAlien, 9, 0, -7);
  SZGame3D.spawnCopy(cacas, moldeAlien, -6, 0, 9);
  SZGame3D.setPosition(jogador, 0, 0, 0);
  SZGame3D.setRotation(jogador, 0, 0, 0);
  vida = 3;
  pontos = 0;
  municao = 6;
  carga = 0;
  recargaMunicao = 70;
  recargaDano = 0;
  SZGame3D.hudText("top-left", "Vida: " + vida);
  SZGame3D.addScore(pontos - SZGame3D.score());
  SZGame3D.hudText("bottom-right", "Munição: " + municao);

  rodando = true;
}
recomecar();

SZGame3D.animate(cena, () => {
  if (rodando) {
    SZGame3D.fpsControls(jogador, cena, 4.8);
    if (recargaDano > 0) {
      recargaDano = recargaDano - 1;
    }
    if (recargaMunicao > 0) {
      recargaMunicao = recargaMunicao - 1;
    } else {
      if (municao < 6) {
        municao = municao + 1;
        SZGame3D.hudText("bottom-right", "Munição: " + municao);
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
          SZGame3D.forEachInGroup(cacas, (item) => {
            if (item === alvo) {
              SZGame3D.removeFromGroup(cacas, item);
              pontos = pontos + 1;
            }
          });
        }
        if (carga >= 0.7) {
          SZGame3D.forEachInGroup(cacas, (item) => {
            if (SZGame3D.isNear(jogador, item, 4)) {
              SZGame3D.removeFromGroup(cacas, item);
              pontos = pontos + 1;
            }
          });
        }
        municao = municao - 1;
        carga = 0;
        SZGame3D.playEffect("explosion");
        SZGame3D.addScore(pontos - SZGame3D.score());
        SZGame3D.hudText("bottom-right", "Munição: " + municao);
        if (pontos >= 12) {
          rodando = false;
                              SZGame3D.addScore(pontos - SZGame3D.score());
      SZGame3D.endGame("ganhou");
          SZGame3D.playEffect("coin");
        }
      } else {
        carga = 0;
      }
    }
    SZGame3D.forEachInGroup(cacas, (item) => {
      SZGame3D.moveTowards(item, SZGame3D.getPos(jogador, "x"), SZGame3D.getPos(item, "y"), SZGame3D.getPos(jogador, "z"), 1.09);
      if (SZGame3D.collides(jogador, item)) {
        if (recargaDano === 0) {
          vida = vida - 1;
          recargaDano = 90;
          SZGame3D.hudText("top-left", "Vida: " + vida);
          SZGame3D.playEffect("hit");
          if (vida <= 0) {
            rodando = false;
                                    SZGame3D.addScore(pontos - SZGame3D.score());
      SZGame3D.endGame("perdeu");
          }
        }
      }
    });
  }
});
SZGame3D.everySecondsLoop(1.6, () => {
  if (rodando) {
    if (SZGame3D.countGroup(cacas) < 6) {
      const angulo = Math.random() * 6.283;
      SZGame3D.spawnCopy(cacas, moldeAlien, Math.cos(angulo) * 13, 0, Math.sin(angulo) * 13);
    }
  }
});
`.trim()

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
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const cercoNaBaseBasicoExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
