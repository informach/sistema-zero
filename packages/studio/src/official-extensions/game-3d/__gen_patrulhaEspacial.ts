import { normalizeSZIR } from '#ir'
import { parseJS } from '../../parsers/js'
import { collectTypes, stripIds } from '../game-3d-advanced/exampleSourceUtils'

/**
 * Gerador one-off da IR do exemplo "Patrulha Espacial" (nível 1 da família
 * Patrulha Espacial, recriação do Space Shooter 3D do curso raylib): nave vista
 * de trás que anda SÓ no eixo X (clamp -6..6) com inclinação ao virar
 * (setRotation em Z, decaindo sozinha) e balanço senoidal (Math.sin sobre um
 * relógio somado por dt), tiro de laser com espaço (cooldown por quadros contra
 * a metralhadora do auto-repeat) e meteoros-esfera de DOIS tamanhos (dois
 * moldes/grupos, o pequeno mais rápido e valendo mais) nascendo longe no -Z e
 * vindo à câmera girando (spin). Laser×meteoro = collides (caixa×esfera do
 * original) remove os dois + ponto; nave×meteoro = isNear (a colisão de esferas
 * do original, no plano X-Z) = fim com tela de resultado. Placar por tempo E
 * pontos no placar do motor, tempo no HUD e fim/recomeço pela tela do Jogo 3D. Adaptações deliberadas: SEM sombras fake (os cilindros
 * achatados do original não são expressáveis barato no g3d), SEM chão (espaço
 * aberto ao invés do tablado do curso: o visual fica melhor e nada usa
 * gravidade) e velocidade por CLASSE de meteoro + crescente com o tempo (o
 * sorteio contínuo por item não tem onde morar num grupo). Rode com
 * `bun src/official-extensions/game-3d/__gen_patrulhaEspacial.ts` e cole a
 * saída em examples.ts. O drift test (`patrulhaEspacialExample.test.ts`) guarda
 * o resultado importando o SOURCE daqui (uma cópia só do fonte).
 */
export const PATRULHA_ESPACIAL_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#020617");
SZGame3D.setSky(cena, "#020617", "#312e81");
SZGame3D.setScreenText("fim", "Fim da patrulha", "Confira seus pontos e o tempo da viagem nos placares.", "Jogar de novo");
SZGame3D.addScore(0);
SZGame3D.hudText("top-center", "Tempo: 0 s");
SZGame3D.hudText("bottom-center", "Setas ou A e D: mover. Espaço: atirar.");
SZGame3D.setFog(cena, "#0b1030", 30, 75);
SZGame3D.setCameraPosition(cena, 0, 4.5, 9);
const nave = SZGame3D.createModel(cena);
const corpo = SZGame3D.createBlock(cena, { width: 0.8, height: 0.35, depth: 1.6, color: "#94a3b8" });
const asaEsquerda = SZGame3D.createBlock(cena, { width: 1.2, height: 0.12, depth: 0.7, color: "#38bdf8" });
SZGame3D.setPosition(asaEsquerda, -0.9, 0, 0.3);
const asaDireita = SZGame3D.createBlock(cena, { width: 1.2, height: 0.12, depth: 0.7, color: "#38bdf8" });
SZGame3D.setPosition(asaDireita, 0.9, 0, 0.3);
const bico = SZGame3D.createCone(cena, { radius: 0.22, height: 0.7, color: "#22d3ee" });
SZGame3D.setMaterial(bico, "glow");
SZGame3D.setPosition(bico, 0, 0, -1);
SZGame3D.setRotation(bico, -90, 0, 0);
SZGame3D.addToModel(nave, corpo);
SZGame3D.addToModel(nave, asaEsquerda);
SZGame3D.addToModel(nave, asaDireita);
SZGame3D.addToModel(nave, bico);
SZGame3D.setPosition(nave, 0, 1, 0);
const moldeMeteoro = SZGame3D.createSphere(cena, { radius: 0.9, color: "#78716c" });
SZGame3D.setVisible(moldeMeteoro, "hide");
const moldeRapido = SZGame3D.createSphere(cena, { radius: 0.55, color: "#f97316" });
SZGame3D.setVisible(moldeRapido, "hide");
const moldeTiro = SZGame3D.createBlock(cena, { width: 0.16, height: 0.16, depth: 0.9, color: "#4ade80" });
SZGame3D.setMaterial(moldeTiro, "glow");
SZGame3D.setVisible(moldeTiro, "hide");
const meteoros = SZGame3D.createGroup();
const meteorosRapidos = SZGame3D.createGroup();
const tiros = SZGame3D.createGroup();
let naveX = 0;
let inclinacao = 0;
let relogio = 0;
let velocidade = 8.4;
let recarga = 0;
let tempo = 0;
let pontos = 0;
let sorteio = 0;
let lugar = 0;
let encostou = false;
let rodando = true;
SZGame3D.animate(cena, () => {
  if (rodando) {
    relogio = relogio + SZGame3D.dt(cena);
    if (SZGame3D.keyDown("ArrowLeft") || SZGame3D.keyDown("KeyA")) {
      naveX = naveX - 8 * SZGame3D.dt(cena);
      inclinacao = inclinacao + 2.9;
    }
    if (SZGame3D.keyDown("ArrowRight") || SZGame3D.keyDown("KeyD")) {
      naveX = naveX + 8 * SZGame3D.dt(cena);
      inclinacao = inclinacao - 2.9;
    }
    if (naveX < -6) {
      naveX = -6;
    }
    if (naveX > 6) {
      naveX = 6;
    }
    inclinacao = inclinacao * 0.88;
    if (inclinacao > 15) {
      inclinacao = 15;
    }
    if (inclinacao < -15) {
      inclinacao = -15;
    }
    SZGame3D.setPosition(nave, naveX, 1 + Math.sin(relogio * 5) * 0.12, 0);
    SZGame3D.setRotation(nave, 0, 0, inclinacao);
    if (recarga > 0) {
      recarga = recarga - 1;
    }
    if (SZGame3D.keyDown("Space")) {
      if (recarga === 0) {
        SZGame3D.spawnCopy(tiros, moldeTiro, naveX, SZGame3D.getPos(nave, "y"), -1);
        SZGame3D.playNote(880, 70);
        recarga = 15;
      }
    }
    SZGame3D.forEachInGroup(tiros, (tiro) => {
      SZGame3D.moveBy(tiro, 0, 0, -54 * SZGame3D.dt(cena));
    });
    encostou = false;
    SZGame3D.forEachInGroup(meteoros, (meteoro) => {
      SZGame3D.moveBy(meteoro, 0, 0, velocidade * SZGame3D.dt(cena));
      SZGame3D.spin(meteoro, "x", 69);
      SZGame3D.spin(meteoro, "y", 45);
      if (SZGame3D.isNear(nave, meteoro, 1.5)) {
        encostou = true;
      }
      let ativo = true;
      SZGame3D.forEachInGroup(tiros, (tiro) => {
        if (ativo) {
          if (SZGame3D.collides(tiro, meteoro)) {
            SZGame3D.removeFromGroup(meteoros, meteoro);
            SZGame3D.removeFromGroup(tiros, tiro);
            pontos = pontos + 1;
            SZGame3D.playEffect("hit");
            SZGame3D.addScore(pontos - SZGame3D.score());
            ativo = false;
          }
        }
      });
    });
    SZGame3D.forEachInGroup(meteorosRapidos, (meteoro) => {
      SZGame3D.moveBy(meteoro, 0, 0, velocidade * 1.6 * SZGame3D.dt(cena));
      SZGame3D.spin(meteoro, "x", 103);
      SZGame3D.spin(meteoro, "y", 69);
      if (SZGame3D.isNear(nave, meteoro, 1.2)) {
        encostou = true;
      }
      let ativo = true;
      SZGame3D.forEachInGroup(tiros, (tiro) => {
        if (ativo) {
          if (SZGame3D.collides(tiro, meteoro)) {
            SZGame3D.removeFromGroup(meteorosRapidos, meteoro);
            SZGame3D.removeFromGroup(tiros, tiro);
            pontos = pontos + 2;
            SZGame3D.playEffect("hit");
            SZGame3D.addScore(pontos - SZGame3D.score());
            ativo = false;
          }
        }
      });
    });
    if (encostou) {
      rodando = false;
      SZGame3D.playEffect("explosion");
      SZGame3D.hudText("top-center", "Tempo: " + tempo + " s");
      SZGame3D.addScore(pontos - SZGame3D.score());
      SZGame3D.endGame("perdeu");
    }
    SZGame3D.pruneArea(tiros, "z", -60, 6);
    SZGame3D.pruneArea(meteoros, "z", -60, 12);
    SZGame3D.pruneArea(meteorosRapidos, "z", -60, 12);
  }
});
SZGame3D.everySecondsLoop(1, () => {
  if (rodando) {
    tempo = tempo + 1;
    velocidade = velocidade + 0.48;
    if (velocidade > 30) {
      velocidade = 30;
    }
    SZGame3D.hudText("top-center", "Tempo: " + tempo + " s");
  }
});
SZGame3D.everySecondsLoop(0.7, () => {
  if (rodando) {
    sorteio = Math.floor(Math.random() * 3);
    lugar = Math.random() * 12 - 6;
    if (sorteio === 0) {
      SZGame3D.spawnCopy(meteorosRapidos, moldeRapido, lugar, 1, -50);
    } else {
      SZGame3D.spawnCopy(meteoros, moldeMeteoro, lugar, 1, -50);
    }
  }
});
`.trim()

// Só gera quando RODADO direto. O drift test importa o SOURCE daqui (uma cópia
// só do fonte — duas divergiriam em silêncio), então o módulo não pode imprimir
// nada ao ser importado.
if (import.meta.main) {
  const normalized = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(PATRULHA_ESPACIAL_SOURCE),
    extensions: [{ extensionId: 'game-3d' }],
  })
  const behavior = stripIds(JSON.parse(JSON.stringify(normalized.behavior)))
  const types = collectTypes(behavior)
  const bad = [...types].filter(
    (t) => t === 'rawJS' || t === 'memberCall' || t === 'memberCallExpr',
  )
  if (bad.length) console.error('DRIFT:', bad)
  console.log(JSON.stringify(behavior, null, 2))
}
