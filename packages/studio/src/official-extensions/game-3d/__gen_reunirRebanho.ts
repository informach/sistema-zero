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
 * estado e passa a SEGUIR (vai do grupo "errantes" para "seguidores" e faz
 * moveTowards no herói). Leve o rebanho até o curral dourado para entregá-los;
 * reúna 8 antes do tempo acabar. A FSM/pool completa por entidade vive no degrau
 * Profissional (g3k). 100% procedural, sem kit próprio.
 */
// Giros (review 3D, lote 7): estes fontes nasceram (07/2026) com spin 0.4-1.6, escrito como se
// fosse "voltas em radianos por SEGUNDO"; o spin de então era por QUADRO, e a conversão fiel do
// lote 4 (x 60 x 180/pi) deu 1375-5500 graus/s, um borrão. Os valores viraram graus por
// segundo legíveis: itens 180, enfeites 45-90.
export const REUNIR_REBANHO_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#0f172a");
SZGame3D.setScreenText("vitoria", "Rebanho reunido!", "Confira seus pontos no placar.", "Jogar de novo");
SZGame3D.setScreenText("fim", "Acabou o tempo", "Confira seus pontos no placar.", "Tentar novamente");
SZGame3D.addScore(0);
SZGame3D.hudText("bottom-center", "Setas ou WASD: andar. Leve oito bichinhos ao curral.");
SZGame3D.hudText("top-right", "Tempo: 45");
SZGame3D.setSky(cena, "#1e293b", "#334155");
SZGame3D.cameraMode(cena, "cima", null);
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
const errantes = SZGame3D.createGroup();
const seguidores = SZGame3D.createGroup();
let pontos = 0;
let tempo = 45;
let rodando = true;

SZGame3D.animate(cena, () => {
  if (rodando) {
    SZGame3D.spin(curral, "y", 45);
    if (SZGame3D.keyDown("ArrowLeft") || SZGame3D.keyDown("KeyA")) {
      SZGame3D.moveBy(heroi, -9.6 * SZGame3D.dt(cena), 0, 0);
    }
    if (SZGame3D.keyDown("ArrowRight") || SZGame3D.keyDown("KeyD")) {
      SZGame3D.moveBy(heroi, 9.6 * SZGame3D.dt(cena), 0, 0);
    }
    if (SZGame3D.keyDown("ArrowUp") || SZGame3D.keyDown("KeyW")) {
      SZGame3D.moveBy(heroi, 0, 0, -9.6 * SZGame3D.dt(cena));
    }
    if (SZGame3D.keyDown("ArrowDown") || SZGame3D.keyDown("KeyS")) {
      SZGame3D.moveBy(heroi, 0, 0, 9.6 * SZGame3D.dt(cena));
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
    SZGame3D.forEachInGroup(errantes, (item) => {
      SZGame3D.spin(item, "y", 180);
      if (SZGame3D.isNear(heroi, item, 1.7)) {
        SZGame3D.spawnCopy(seguidores, moldeSeguidor, SZGame3D.getPos(item, "x"), 0.65, SZGame3D.getPos(item, "z"));
        SZGame3D.removeFromGroup(errantes, item);
        SZGame3D.playEffect("coin");
      }
    });
    SZGame3D.forEachInGroup(seguidores, (item) => {
      SZGame3D.moveTowards(item, SZGame3D.getPos(heroi, "x"), 0.65, SZGame3D.getPos(heroi, "z"), 5);
      if (SZGame3D.isNear(curral, item, 3)) {
        SZGame3D.removeFromGroup(seguidores, item);
        pontos = pontos + 1;
        SZGame3D.playEffect("coin");
        SZGame3D.addScore(pontos - SZGame3D.score());
      }
    });
    if (pontos >= 8) {
      rodando = false;
      SZGame3D.playEffect("coin");
            SZGame3D.addScore(pontos - SZGame3D.score());
      SZGame3D.endGame("ganhou");
    }
  }
});
SZGame3D.everySecondsLoop(1.4, () => {
  if (rodando) {
    if (SZGame3D.countGroup(errantes) < 6) {
      const angulo = Math.random() * 6.283;
      SZGame3D.spawnCopy(errantes, moldeErrante, Math.cos(angulo) * 10, 0.65, Math.sin(angulo) * 10);
    }
  }
});
SZGame3D.everySecondsLoop(1, () => {
  if (rodando) {
    tempo = tempo - 1;
    SZGame3D.hudText("top-right", "Tempo: " + tempo);
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
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-3d' }],
      version: 2,
      behavior,
    },
  }
  console.log(
    `export const reunirRebanhoBasicoExample: ExtensionExample = ${JSON.stringify(example, null, 2)}`,
  )
}
