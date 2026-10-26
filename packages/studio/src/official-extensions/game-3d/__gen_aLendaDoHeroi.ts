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
// Giros (review 3D, lote 7): estes fontes nasceram (07/2026) com spin 0.4-1.6, escrito como se
// fosse "voltas em radianos por SEGUNDO"; o spin de então era por QUADRO, e a conversão fiel do
// lote 4 (x 60 x 180/pi) deu 1375-5500 graus/s, um borrão. Os valores viraram graus por
// segundo legíveis: itens 180, enfeites 45-90.
export const A_LENDA_DO_HEROI_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#0f2417");
SZGame3D.setScreenText("vitoria", "Herói lendário!", "Confira seus pontos no placar.", "Jogar de novo");
SZGame3D.setScreenText("fim", "O herói caiu...", "Confira seus pontos no placar.", "Tentar novamente");
SZGame3D.addScore(0);
SZGame3D.hudText("bottom-center", "Setas ou WASD: andar. Espaço: atacar.");
SZGame3D.hudText("top-left", "Vida: 3");
SZGame3D.setSky(cena, "#1e3a2a", "#2f5541");
SZGame3D.cameraMode(cena, "cima", null);
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
const monstros = SZGame3D.createGroup();
let pontos = 0;
let vida = 3;
let heroiX = 0;
let heroiZ = 0;
let rodando = true;

SZGame3D.animate(cena, () => {
  if (rodando) {
    SZGame3D.spin(coroa, "y", 90);
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
    SZGame3D.forEachInGroup(monstros, (item) => {
      if (SZGame3D.keyDown("Space") && SZGame3D.isNear(heroi, item, 2.3)) {
        SZGame3D.removeFromGroup(monstros, item);
        pontos = pontos + 1;
        SZGame3D.playEffect("coin");
        SZGame3D.addScore(pontos - SZGame3D.score());
      } else {
        if (SZGame3D.isNear(heroi, item, 1.35)) {
          SZGame3D.removeFromGroup(monstros, item);
          vida = vida - 1;
          SZGame3D.playEffect("hit");
          SZGame3D.hudText("top-left", "Vida: " + vida);
        } else {
          if (SZGame3D.isNear(heroi, item, 13)) {
            SZGame3D.moveTowards(item, SZGame3D.getPos(heroi, "x"), 0.65, SZGame3D.getPos(heroi, "z"), 3.08);
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
    if (vida <= 0) {
      rodando = false;
      SZGame3D.playEffect("explosion");
                  SZGame3D.addScore(pontos - SZGame3D.score());
      SZGame3D.endGame("perdeu");
    }
  }
});
SZGame3D.everySecondsLoop(1.6, () => {
  if (rodando) {
    if (SZGame3D.countGroup(monstros) < 6) {
      const angulo = Math.random() * 6.283;
      SZGame3D.spawnCopy(monstros, moldeMonstro, Math.cos(angulo) * 13, 0.65, Math.sin(angulo) * 13);
    }
  }
});
`.trim()

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
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const aLendaDoHeroiBasicoExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
