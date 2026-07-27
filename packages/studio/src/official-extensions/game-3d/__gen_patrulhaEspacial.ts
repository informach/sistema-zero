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
 * moldes/enxames, o pequeno mais rápido e valendo mais) nascendo longe no -Z e
 * vindo à câmera girando (spin). Laser×meteoro = collides (caixa×esfera do
 * original) remove os dois + ponto; nave×meteoro = isNear (a colisão de esferas
 * do original, no plano X-Z) = fim com tela de resultado. Placar por tempo E
 * pontos em HUD DOM. Adaptações deliberadas: SEM sombras fake (os cilindros
 * achatados do original não são expressáveis barato no g3d), SEM chão (espaço
 * aberto ao invés do tablado do curso: o visual fica melhor e nada usa
 * gravidade) e velocidade por CLASSE de meteoro + crescente com o tempo (o
 * sorteio contínuo por item não tem onde morar num enxame). Rode com
 * `bun src/official-extensions/game-3d/__gen_patrulhaEspacial.ts` e cole a
 * saída em examples.ts. O drift test (`patrulhaEspacialExample.test.ts`) guarda
 * o resultado importando o SOURCE daqui (uma cópia só do fonte).
 */
export const PATRULHA_ESPACIAL_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#020617");
SZGame3D.setSky(cena, "#020617", "#312e81");
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
SZGame3D.setRotation(bico, -1.57, 0, 0);
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
const meteoros = SZGame3D.createSwarm(cena);
const meteorosRapidos = SZGame3D.createSwarm(cena);
const tiros = SZGame3D.createSwarm(cena);
let naveX = 0;
let inclinacao = 0;
let relogio = 0;
let velocidade = 0.14;
let recarga = 0;
let tempo = 0;
let pontos = 0;
let sorteio = 0;
let lugar = 0;
let encostou = false;
let rodando = true;
document.getElementById("retry")?.addEventListener("click", (event) => {
  SZGame3D.forEachInSwarm(meteoros, (meteoro) => {
    SZGame3D.removeFromSwarm(meteoros, meteoro);
  });
  SZGame3D.forEachInSwarm(meteorosRapidos, (meteoro) => {
    SZGame3D.removeFromSwarm(meteorosRapidos, meteoro);
  });
  SZGame3D.forEachInSwarm(tiros, (tiro) => {
    SZGame3D.removeFromSwarm(tiros, tiro);
  });
  naveX = 0;
  inclinacao = 0;
  velocidade = 0.14;
  recarga = 0;
  tempo = 0;
  pontos = 0;
  SZGame3D.setPosition(nave, 0, 1, 0);
  SZGame3D.setRotation(nave, 0, 0, 0);
  document.getElementById("tempo").textContent = 0;
  document.getElementById("pontos").textContent = 0;
  document.getElementById("results")?.classList.remove("visivel");
  rodando = true;
});
SZGame3D.animate(cena, () => {
  if (rodando) {
    relogio = relogio + SZGame3D.dt(cena);
    if (SZGame3D.keyDown("ArrowLeft") || SZGame3D.keyDown("KeyA")) {
      naveX = naveX - 8 * SZGame3D.dt(cena);
      inclinacao = inclinacao + 0.05;
    }
    if (SZGame3D.keyDown("ArrowRight") || SZGame3D.keyDown("KeyD")) {
      naveX = naveX + 8 * SZGame3D.dt(cena);
      inclinacao = inclinacao - 0.05;
    }
    if (naveX < -6) {
      naveX = -6;
    }
    if (naveX > 6) {
      naveX = 6;
    }
    inclinacao = inclinacao * 0.88;
    if (inclinacao > 0.26) {
      inclinacao = 0.26;
    }
    if (inclinacao < -0.26) {
      inclinacao = -0.26;
    }
    SZGame3D.setPosition(nave, naveX, 1 + Math.sin(relogio * 5) * 0.12, 0);
    SZGame3D.setRotation(nave, 0, 0, inclinacao);
    if (recarga > 0) {
      recarga = recarga - 1;
    }
    if (SZGame3D.keyDown("Space")) {
      if (recarga === 0) {
        SZGame3D.spawnInSwarm(tiros, moldeTiro, naveX, SZGame3D.getPos(nave, "y"), -1);
        SZGame3D.playNote(880, 70);
        recarga = 15;
      }
    }
    SZGame3D.forEachInSwarm(tiros, (tiro) => {
      SZGame3D.moveBy(tiro, 0, 0, -0.9);
    });
    encostou = false;
    SZGame3D.forEachInSwarm(meteoros, (meteoro) => {
      SZGame3D.moveBy(meteoro, 0, 0, velocidade);
      SZGame3D.spin(meteoro, "x", 0.02);
      SZGame3D.spin(meteoro, "y", 0.013);
      if (SZGame3D.isNear(nave, meteoro, 1.5)) {
        encostou = true;
      }
      SZGame3D.forEachInSwarm(tiros, (tiro) => {
        if (SZGame3D.collides(tiro, meteoro)) {
          SZGame3D.removeFromSwarm(meteoros, meteoro);
          SZGame3D.removeFromSwarm(tiros, tiro);
          pontos = pontos + 1;
          SZGame3D.playEffect("hit");
          document.getElementById("pontos").textContent = pontos;
        }
      });
    });
    SZGame3D.forEachInSwarm(meteorosRapidos, (meteoro) => {
      SZGame3D.moveBy(meteoro, 0, 0, velocidade * 1.6);
      SZGame3D.spin(meteoro, "x", 0.03);
      SZGame3D.spin(meteoro, "y", 0.02);
      if (SZGame3D.isNear(nave, meteoro, 1.2)) {
        encostou = true;
      }
      SZGame3D.forEachInSwarm(tiros, (tiro) => {
        if (SZGame3D.collides(tiro, meteoro)) {
          SZGame3D.removeFromSwarm(meteorosRapidos, meteoro);
          SZGame3D.removeFromSwarm(tiros, tiro);
          pontos = pontos + 2;
          SZGame3D.playEffect("hit");
          document.getElementById("pontos").textContent = pontos;
        }
      });
    });
    if (encostou) {
      rodando = false;
      SZGame3D.playEffect("explosion");
      document.getElementById("final-tempo").textContent = tempo;
      document.getElementById("final-pontos").textContent = pontos;
      document.getElementById("results")?.classList.add("visivel");
    }
    SZGame3D.pruneSwarm(tiros, "z", -60, 6);
    SZGame3D.pruneSwarm(meteoros, "z", -60, 12);
    SZGame3D.pruneSwarm(meteorosRapidos, "z", -60, 12);
  }
});
SZGame3D.everySecondsLoop(1, () => {
  if (rodando) {
    tempo = tempo + 1;
    velocidade = velocidade + 0.008;
    if (velocidade > 0.5) {
      velocidade = 0.5;
    }
    document.getElementById("tempo").textContent = tempo;
  }
});
SZGame3D.everySecondsLoop(0.7, () => {
  if (rodando) {
    sorteio = Math.floor(Math.random() * 3);
    lugar = Math.random() * 12 - 6;
    if (sorteio === 0) {
      SZGame3D.spawnInSwarm(meteorosRapidos, moldeRapido, lugar, 1, -50);
    } else {
      SZGame3D.spawnInSwarm(meteoros, moldeMeteoro, lugar, 1, -50);
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
