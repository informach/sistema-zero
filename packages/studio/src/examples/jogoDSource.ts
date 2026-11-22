/**
 * O programa do jogo D (lote 8 da conclusão do plano do Estúdio, 22/11/2026): um mundo do Pinta
 * de 96 × 72 peças em seis regiões, três cavernas e quatro casas ligadas por portas. Só blocos que
 * já existem no Jogo 2D: o cenário do Pinta, "Quando entrar em área" (região, porta, cama),
 * grupos, partículas, esmaecer, sons do material e o armazenamento do navegador.
 *
 * - A região onde o herói está e as vizinhas dela ligam as entidades (no máximo 300 de uma vez);
 *   cavernas e casas ligam tudo o que têm.
 * - A porta leva ao objeto de chegada que ela aponta (`chegada`), na boca da caverna ou na porta
 *   da casa, e não ao início do outro lugar. Se o outro lugar sumiu, o tocador avisa uma vez e o
 *   herói fica onde está (sem chegada, nada muda).
 * - O que foi pego (moedas, baús abertos, inimigos derrotados) fica numa lista com o lugar e o id
 *   do objeto: voltar a um lugar não traz nada de volta. Deitar na cama de uma casa guarda o jogo.
 *
 * Gerado para IR estruturada por `scripts/gen-jogo-d.ts` (sem nó opaco).
 */
export const JOGO_D_DESCRIPTION =
  'Explore o mundo: a vila, a floresta, a montanha, o lago, o campo e as ruínas. Setas ou WASD andam, Espaço afasta um inimigo perto. Entre nas cavernas e nas casas pelas portas. Pegue moedas, abra os baús e deite na cama de uma casa para guardar o jogo.'

export function jogoDSource(): string {
  return `SZGame2D.setupStage(640, 480, "#16301f");
SZGame2D.setStageDescription(${JSON.stringify(JOGO_D_DESCRIPTION)});
SZGame2D.loadSound("moeda", "jogo-d-som-moeda");
SZGame2D.loadSound("bau", "jogo-d-som-bau");
SZGame2D.loadSound("dano", "jogo-d-som-dano");
SZGame2D.loadSound("porta", "jogo-d-som-porta");
SZGame2D.loadSound("dormir", "jogo-d-som-dormir");
SZGame2D.loadSound("musicaMundo", "jogo-d-musica-mundo");
SZGame2D.loadSound("musicaCaverna", "jogo-d-musica-caverna");
SZGame2D.createMapScene("mapa", "jogo-d-mundo");
const mundo = SZGame2D.createWorld(SZGame2D.mapSize("mapa", "width"), SZGame2D.mapSize("mapa", "height"));
SZGame2D.configureWorldCamera(mundo, "free", "free", 0, 0);
const jogador = SZGame2D.createSprite({ x: SZGame2D.mapSpawn("mapa", "x") - 11, y: SZGame2D.mapSpawn("mapa", "y") - 12, w: 22, h: 24, image: "jogo-d-heroi" });
SZGame2D.setHealth(jogador, 5);
const moedas = SZGame2D.createGroup();
const inimigos = SZGame2D.createGroup();
const baus = SZGame2D.createGroup();
let lugar = "jogo-d-mundo";
let regiao = "";
let ativas = [];
let pegos = [];
let pontos = 0;
let recado = "";
let tempoDoRecado = 0;
let esmaecer = 0;
let salvo = localStorage.getItem("jogo-d-salvo") === "sim";
if (salvo) {
  pontos = Math.round(localStorage.getItem("jogo-d-pontos"));
  recado = "Jogo guardado de volta!";
  tempoDoRecado = 120;
}

function jaPegou(chave) {
  for (const item of pegos) {
    if (item === chave) {
      return true;
    }
  }
  if (salvo && localStorage.getItem("jogo-d:" + chave) === "sim") {
    return true;
  }
  return false;
}

function estaAtivo(objeto) {
  if (lugar !== "jogo-d-mundo") {
    return true;
  }
  return ativas.includes(SZGame2D.mapObjectProperty(objeto, "regiao"));
}

function ligarEntidades() {
  SZGame2D.clearGroup(moedas);
  SZGame2D.clearGroup(inimigos);
  SZGame2D.clearGroup(baus);
  const listaMoeda = SZGame2D.mapObjects("mapa", "moeda");
  for (const objeto of listaMoeda) {
    const chave = SZGame2D.mapObjectProperty(objeto, "chave");
    if (estaAtivo(objeto) && !jaPegou(chave)) {
      const moeda = SZGame2D.spawn(moedas, { x: SZGame2D.mapObjectField(objeto, "x") + 6, y: SZGame2D.mapObjectField(objeto, "y") + 6, w: 20, h: 20, image: "jogo-d-moeda", vx: 0, vy: 0 });
      SZGame2D.setSpriteData(moeda, "chave", chave);
    }
  }
  const listaInimigo = SZGame2D.mapObjects("mapa", "inimigo");
  for (const objeto of listaInimigo) {
    const chave = SZGame2D.mapObjectProperty(objeto, "chave");
    if (estaAtivo(objeto) && !jaPegou(chave)) {
      if (SZGame2D.mapObjectField(objeto, "name") === "Morcego") {
        const morcego = SZGame2D.spawn(inimigos, { x: SZGame2D.mapObjectField(objeto, "x") + 4, y: SZGame2D.mapObjectField(objeto, "y") + 4, w: 24, h: 24, image: "jogo-d-morcego", vx: 0, vy: 0 });
        SZGame2D.setSpriteData(morcego, "chave", chave);
      } else {
        const gosma = SZGame2D.spawn(inimigos, { x: SZGame2D.mapObjectField(objeto, "x") + 4, y: SZGame2D.mapObjectField(objeto, "y") + 4, w: 24, h: 24, image: "jogo-d-gosma", vx: 0, vy: 0 });
        SZGame2D.setSpriteData(gosma, "chave", chave);
      }
    }
  }
  const listaBau = SZGame2D.mapObjects("mapa", "bau");
  for (const objeto of listaBau) {
    const chave = SZGame2D.mapObjectProperty(objeto, "chave");
    if (estaAtivo(objeto)) {
      const bau = SZGame2D.spawn(baus, { x: SZGame2D.mapObjectField(objeto, "x"), y: SZGame2D.mapObjectField(objeto, "y"), w: 32, h: 32, image: "jogo-d-bau", vx: 0, vy: 0 });
      SZGame2D.setSpriteData(bau, "chave", chave);
      if (jaPegou(chave)) {
        SZGame2D.setImage(bau, "jogo-d-bau-aberto");
        SZGame2D.setSpriteData(bau, "aberto", 1);
      }
    }
  }
}

function guardarOJogo() {
  for (const item of pegos) {
    localStorage.setItem("jogo-d:" + item, "sim");
  }
  localStorage.setItem("jogo-d-pontos", pontos);
  localStorage.setItem("jogo-d-salvo", "sim");
}

SZGame2D.mapArea("mapa", jogador, "region", function (area) {
  regiao = SZGame2D.mapObjectField(area, "name");
  ativas = SZGame2D.mapObjectProperty(area, "vizinhas").split(",");
  ativas.push(regiao);
  ligarEntidades();
});

SZGame2D.mapArea("mapa", jogador, "door", function (porta) {
  const destino = SZGame2D.mapObjectProperty(porta, "destino");
  const chegada = SZGame2D.mapObjectProperty(porta, "chegada");
  SZGame2D.useMapDoor("mapa", jogador, porta);
  const ponto = SZGame2D.mapObjectById("mapa", chegada);
  if (ponto !== null) {
    lugar = destino;
    SZGame2D.setPosition(jogador, SZGame2D.mapObjectField(ponto, "x") - 11, SZGame2D.mapObjectField(ponto, "y") - 12);
    mundo.width = SZGame2D.mapSize("mapa", "width");
    mundo.height = SZGame2D.mapSize("mapa", "height");
    esmaecer = 100;
    SZGame2D.playClip("porta");
    SZGame2D.stopTrack("all");
    if (lugar === "jogo-d-mundo") {
      SZGame2D.playTrack("musicaMundo");
    } else {
      SZGame2D.playTrack("musicaCaverna");
    }
    ligarEntidades();
  }
});

SZGame2D.mapArea("mapa", jogador, "cama", function (cama) {
  guardarOJogo();
  SZGame2D.changeHealth(jogador, 5);
  SZGame2D.playClip("dormir");
  recado = "Você dormiu. O jogo está guardado.";
  tempoDoRecado = 150;
  esmaecer = 100;
});

SZGame2D.onTouchGroup(() => jogador, () => moedas, (moeda) => {
  pegos.push(SZGame2D.spriteData(moeda, "chave", ""));
  pontos = pontos + 1;
  SZGame2D.emitParticles(SZGame2D.centerX(moeda), SZGame2D.centerY(moeda), 8, "#f4d03f");
  SZGame2D.removeFromGroup(moedas, moeda);
  SZGame2D.playClip("moeda");
});

SZGame2D.onTouchGroup(() => jogador, () => baus, (bau) => {
  if (SZGame2D.spriteData(bau, "aberto", 0) === 0) {
    SZGame2D.setSpriteData(bau, "aberto", 1);
    SZGame2D.setImage(bau, "jogo-d-bau-aberto");
    pegos.push(SZGame2D.spriteData(bau, "chave", ""));
    pontos = pontos + 10;
    SZGame2D.emitParticles(SZGame2D.centerX(bau), SZGame2D.centerY(bau), 16, "#f9e79f");
    SZGame2D.playClip("bau");
  }
});

SZGame2D.onTouchGroup(() => jogador, () => inimigos, (inimigo) => {
  if (!SZGame2D.isInvincible(jogador)) {
    SZGame2D.damageSprite(jogador, 1, 60);
    SZGame2D.playClip("dano");
  }
});

SZGame2D.onKey("Space", function () {
  SZGame2D.forEachInGroup(inimigos, (inimigo) => {
    if (SZGame2D.distance(jogador, inimigo) < 48) {
      pegos.push(SZGame2D.spriteData(inimigo, "chave", ""));
      pontos = pontos + 5;
      SZGame2D.emitParticles(SZGame2D.centerX(inimigo), SZGame2D.centerY(inimigo), 12, "#82e0aa");
      SZGame2D.removeFromGroup(inimigos, inimigo);
    }
  });
});

SZGame2D.playTrack("musicaMundo");

SZGame2D.gameLoop(function () {
  SZGame2D.clear();
  SZGame2D.topDown(jogador, 3);
  SZGame2D.collideMapScene(jogador, "mapa");
  SZGame2D.followCameraInWorld(jogador, mundo);
  SZGame2D.forEachInGroup(inimigos, (inimigo) => {
    if (SZGame2D.distance(jogador, inimigo) < 140) {
      SZGame2D.moveToward(inimigo, jogador, 1);
    }
  });
  SZGame2D.drawMapScene("mapa", "back");
  SZGame2D.drawGroup(ctx, moedas);
  SZGame2D.drawGroup(ctx, baus);
  SZGame2D.drawGroup(ctx, inimigos);
  SZGame2D.drawSprite(ctx, jogador);
  SZGame2D.drawParticles(ctx);
  SZGame2D.drawMapScene("mapa", "front");
  SZGame2D.drawScore(ctx, "Pontos", pontos, 16, 28, "#ffffff", 20);
  SZGame2D.drawLabel(ctx, "Vidas: " + SZGame2D.getHealth(jogador) + "   " + regiao, 16, 54, "#ffe9a8", 16, "left");
  if (tempoDoRecado > 0) {
    SZGame2D.drawLabel(ctx, recado, 320, 450, "#ffffff", 18, "center");
    tempoDoRecado = tempoDoRecado - 1;
  }
  if (esmaecer > 0) {
    SZGame2D.drawFade(ctx, esmaecer, "#000000");
    esmaecer = esmaecer - 5;
  }
  if (SZGame2D.healthDepleted(jogador)) {
    SZGame2D.restart();
  }
});
`
}
