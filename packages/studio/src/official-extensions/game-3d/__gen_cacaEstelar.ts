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
// Giros (review 3D, lote 7): estes fontes nasceram (07/2026) com spin 0.4-1.6, escrito como se
// fosse "voltas em radianos por SEGUNDO"; o spin de então era por QUADRO, e a conversão fiel do
// lote 4 (x 60 x 180/pi) deu 1375-5500 graus/s, um borrão. Os valores viraram graus por
// segundo legíveis: itens 180, enfeites 45-90.
export const CACA_ESTELAR_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#050818");
SZGame3D.setScreenText("vitoria", "Ás dos céus!", "Confira seus pontos no placar.", "Jogar de novo");
SZGame3D.setScreenText("fim", "Nave abatida...", "Confira seus pontos no placar.", "Tentar novamente");
SZGame3D.addScore(0);
SZGame3D.hudText("bottom-center", "Setas ou WASD: pilotar. Espaço: disparar.");
SZGame3D.hudText("top-left", "Escudos: 3");
SZGame3D.setSky(cena, "#0b1030", "#1e1b4b");
SZGame3D.cameraMode(cena, "cima", null);
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
const cacas = SZGame3D.createGroup();
let pontos = 0;
let escudo = 3;
let naveX = 0;
let naveZ = 0;
let rodando = true;

SZGame3D.animate(cena, () => {
  if (rodando) {
    SZGame3D.spin(nucleo, "y", 90);
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
    SZGame3D.forEachInGroup(cacas, (item) => {
      if (SZGame3D.keyDown("Space") && SZGame3D.isNear(nave, item, 2.6)) {
        SZGame3D.removeFromGroup(cacas, item);
        pontos = pontos + 1;
        SZGame3D.playEffect("coin");
        SZGame3D.addScore(pontos - SZGame3D.score());
      } else {
        if (SZGame3D.isNear(nave, item, 1.4)) {
          SZGame3D.removeFromGroup(cacas, item);
          escudo = escudo - 1;
          SZGame3D.playEffect("hit");
          SZGame3D.hudText("top-left", "Escudos: " + escudo);
        } else {
          if (SZGame3D.isNear(nave, item, 13)) {
            SZGame3D.moveTowards(item, SZGame3D.getPos(nave, "x"), 0.6, SZGame3D.getPos(nave, "z"), 3.71);
          } else {
            SZGame3D.spin(item, "y", 180);
          }
        }
      }
    });
    if (pontos >= 10) {
      rodando = false;
      SZGame3D.playEffect("coin");
                  SZGame3D.addScore(pontos - SZGame3D.score());
      SZGame3D.endGame("ganhou");
    }
    if (escudo <= 0) {
      rodando = false;
      SZGame3D.playEffect("explosion");
                  SZGame3D.addScore(pontos - SZGame3D.score());
      SZGame3D.endGame("perdeu");
    }
  }
});
SZGame3D.everySecondsLoop(1.6, () => {
  if (rodando) {
    if (SZGame3D.countGroup(cacas) < 6) {
      const angulo = Math.random() * 6.283;
      SZGame3D.spawnCopy(cacas, moldeCaca, Math.cos(angulo) * 14, 0.6, Math.sin(angulo) * 14);
    }
  }
});
`.trim()

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
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const cacaEstelarBasicoExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
