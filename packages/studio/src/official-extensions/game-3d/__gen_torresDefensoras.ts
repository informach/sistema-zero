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
 * Os inimigos (um grupo) nascem nas bordas e caminham até o centro (moveTowards).
 * A torre gira (spin) e ZAPEIA um inimigo por vez dentro do alcance, com recarga
 * (o cooldown do curso) — se os inimigos vierem rápido demais, um escapa e
 * encosta no cristal = derrota. Destruir 20 = vitória. A mira/tiro/FSM completa
 * vive no degrau Profissional (Defesa da Torre / g3k). 100% procedural.
 */
// Giros (review 3D, lote 7): estes fontes nasceram (07/2026) com spin 0.4-1.6, escrito como se
// fosse "voltas em radianos por SEGUNDO"; o spin de então era por QUADRO, e a conversão fiel do
// lote 4 (x 60 x 180/pi) deu 1375-5500 graus/s, um borrão. Os valores viraram graus por
// segundo legíveis: itens 180, enfeites 45-90.
export const TORRES_DEFENSORAS_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#0f172a");
SZGame3D.setScreenText("vitoria", "Cristal protegido!", "Confira seus pontos no placar.", "Jogar de novo");
SZGame3D.setScreenText("fim", "O cristal foi alcançado", "Confira seus pontos no placar.", "Tentar novamente");
SZGame3D.addScore(0);
SZGame3D.hudText("bottom-center", "A torre age sozinha. Pare 20 invasores.");
SZGame3D.setSky(cena, "#1e293b", "#334155");
SZGame3D.cameraMode(cena, "cima", null);
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
const inimigos = SZGame3D.createGroup();
let pontos = 0;
let recarga = 0;
let rodando = true;

SZGame3D.animate(cena, () => {
  if (rodando) {
    SZGame3D.spin(torre, "y", 90);
    SZGame3D.spin(cristal, "y", 90);
    recarga = recarga - SZGame3D.dt(cena);
    SZGame3D.forEachInGroup(inimigos, (item) => {
      SZGame3D.moveTowards(item, 0, SZGame3D.getPos(item, "y"), 0, 1.21);
      if (SZGame3D.isNear(cristal, item, 1.8)) {
        rodando = false;
        SZGame3D.playEffect("explosion");
                SZGame3D.addScore(pontos - SZGame3D.score());
      SZGame3D.endGame("perdeu");
      }
      if (recarga <= 0 && SZGame3D.isNear(torre, item, 6)) {
        SZGame3D.removeFromGroup(inimigos, item);
        SZGame3D.playEffect("hit");
        pontos = pontos + 1;
        recarga = 0.35;
        SZGame3D.addScore(pontos - SZGame3D.score());
      }
    });
    if (pontos >= 20) {
      rodando = false;
      SZGame3D.playEffect("coin");
            SZGame3D.addScore(pontos - SZGame3D.score());
      SZGame3D.endGame("ganhou");
    }
  }
});
SZGame3D.everySecondsLoop(1.1, () => {
  if (rodando) {
    const angulo = Math.random() * 6.283;
    const ex = Math.cos(angulo) * 14;
    const ez = Math.sin(angulo) * 14;
    SZGame3D.spawnCopy(inimigos, molde, ex, 1, ez);
  }
});
`.trim()

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
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const defesaDaTorreBasicoExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
