/**
 * Fonte do exemplo "Noite das Fogueiras" (review 3D, cobertura total dos exemplos): o jogo
 * COMPLETO com os arquivos do projeto que os outros exemplos não trazem. Um céu 360° de foto
 * (.hdr), uma música em laço e o som do fogo (.wav), todos montados por código em
 * `exampleAssets.ts`. A criança junta gravetos na mochila, acende as quatro fogueiras (cada
 * uma liga um jorro de fogo num ponto fixo) e corre para o portal que se abre no meio, com o
 * redemoinho de magia puxado por um ímã. Os fantasmas atravessam as pedras e roubam a lenha.
 *
 * Também mostra a pausa com a tela própria: a dica da coruja (E perto dela) PAUSA o jogo e é a
 * mesma tela da pausa, então o "Continuar" só volta a jogar (ler a dica com os fantasmas
 * andando fazia a criança perder a lenha). A coruja vira para o herói, as fogueiras só apagam
 * quando o dia nasce (na vitória elas seguem acesas atrás da tela) e o fim da noite fica
 * guardado neste computador pelo NOME do estado em que o jogo acabou.
 *
 * `bun run gen:game-3d-examples` regrava a IR em examples.ts a partir daqui; o drift e o
 * playthrough (`noiteFogueirasExample.test.ts`) guardam o resultado.
 */
export const NOITE_FOGUEIRAS_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 40, sky: "#0b1026", ground: "#1c2a1f" });
SZGameKit3D.setSkyPhoto("ceu-estrelado");
SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.3, vignette: true });
SZGameKit3D.loadSound("musica", "musica-da-noite");
SZGameKit3D.loadSound("fogo", "som-da-fogueira");
SZGameKit3D.setScreenText("inicio", "Noite das Fogueiras", "Junte gravetos e acenda as 4 fogueiras antes de o dia nascer: cada uma pede 2 gravetos. Cuidado, os fantasmas atravessam as pedras e roubam a lenha da mochila!", "Acampar");
SZGameKit3D.setScreenText("vitoria", "O portal se abriu!", "As fogueiras espantaram a noite.", "Acampar de novo");
SZGameKit3D.setScreenText("fim", "O dia nasceu...", "Faltou fogueira. Acenda logo, antes que um fantasma leve a lenha!", "Tentar de novo");
SZGameKit3D.createScreen("dica", "Dica da coruja", "Pegue 2 gravetos e encoste numa fogueira apagada. Fantasma que encosta em você leva TODA a lenha da mochila.");
SZGameKit3D.addButton("dica", "Continuar", function () {
  SZGameKit3D.setState("jogando");
});
SZGameKit3D.addButton("dica", "Voltar ao menu", function () {
  SZGameKit3D.returnToMenu();
});
SZGameKit3D.defineMold("heroi", { health: 3, speed: 7 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#f97316", w: 0.9, h: 1.1, d: 0.9, x: 0, y: 0.55, z: 0 });
  SZGameKit3D.part({ shape: "sphere", color: "#fed7aa", w: 0.7, h: 0.7, d: 0.7, x: 0, y: 1.35, z: 0 });
  SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#facc15", w: 0.3, h: 0.4, d: 0.3, x: 0, y: 1, z: 0.5 });
});
SZGameKit3D.defineMold("graveto", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "cylinder", color: "#a16207", w: 0.25, h: 1.2, d: 0.25, x: 0, y: 0.3, z: 0 });
  SZGameKit3D.part({ shape: "cylinder", color: "#854d0e", w: 0.2, h: 0.9, d: 0.2, x: 0.25, y: 0.3, z: 0.15 });
});
SZGameKit3D.defineMold("fogueira", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "torus", color: "#78716c", w: 2, h: 2, d: 0.5, x: 0, y: 0.2, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#713f12", w: 1.4, h: 0.3, d: 0.3, x: 0, y: 0.3, z: 0 });
  SZGameKit3D.part({ shape: "box", color: "#713f12", w: 0.3, h: 0.3, d: 1.4, x: 0, y: 0.45, z: 0 });
});
SZGameKit3D.defineMold("fantasma", { health: 1, speed: 2.5 }, function () {
  SZGameKit3D.part({ shape: "sphere", material: "vidro", color: "#e0e7ff", w: 1.2, h: 1.2, d: 1.2, x: 0, y: 0, z: 0 });
  SZGameKit3D.part({ shape: "cone", material: "vidro", color: "#c7d2fe", w: 1.1, h: 1, d: 1.1, x: 0, y: -0.8, z: 0 });
  SZGameKit3D.part({ shape: "sphere", color: "#1e1b4b", w: 0.25, h: 0.25, d: 0.25, x: 0.25, y: 0.15, z: 0.55 });
  SZGameKit3D.part({ shape: "sphere", color: "#1e1b4b", w: 0.25, h: 0.25, d: 0.25, x: -0.25, y: 0.15, z: 0.55 });
});
SZGameKit3D.defineMold("coruja", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "cylinder", color: "#57534e", w: 0.5, h: 1.6, d: 0.5, x: 0, y: 0.8, z: 0 });
  SZGameKit3D.part({ shape: "sphere", color: "#a8a29e", w: 0.9, h: 1, d: 0.8, x: 0, y: 2, z: 0 });
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#fde047", w: 0.25, h: 0.25, d: 0.25, x: 0.2, y: 2.2, z: 0.35 });
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#fde047", w: 0.25, h: 0.25, d: 0.25, x: -0.2, y: 2.2, z: 0.35 });
});
SZGameKit3D.defineMold("pedra", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "sphere", color: "#44403c", w: 2.4, h: 1.6, d: 2.4, x: 0, y: 0.6, z: 0 });
});
SZGameKit3D.defineMold("portal", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "torus", material: "brilho", color: "#a78bfa", w: 3, h: 3, d: 0.5, x: 0, y: 1.8, z: 0 });
});
SZGameKit3D.setPhysics("heroi", "personagem");
SZGameKit3D.makeSolid("pedra");
SZGameKit3D.makeTrigger("graveto");
SZGameKit3D.makeTrigger("fogueira");
SZGameKit3D.makeTrigger("portal");
SZGameKit3D.defineEmitter("fogo", { colorFrom: "#fde047", colorTo: "#7f1d1d", sizeFrom: 0.7, sizeTo: 0.1, rate: 30, speed: 2.5, cone: 25, gravity: -1, glow: true, curve: "fogo" });
SZGameKit3D.defineEmitter("magia", { colorFrom: "#c4b5fd", colorTo: "#1e1b4b", sizeFrom: 0.45, sizeTo: 0, rate: 50, speed: 4, cone: 180, gravity: 0, glow: true, curve: "suave" });
SZGameKit3D.addAttractor("magia", 0, 1.8, 0, 30, 4);
SZGameKit3D.defineEffect("susto", { count: 20, colorFrom: "#e0e7ff", colorTo: "#1e1b4b", spread: 5, sizeFrom: 0.5, sizeTo: 0, life: 0.5, gravity: 1 });
let acesas = 0;
SZGameKit3D.onEnterState("jogando", function () {
  acesas = 0;
  SZGameKit3D.setSeed(12);
  SZGameKit3D.setAmbient(0.35);
  SZGameKit3D.setFog("#0b1026", 25, 70);
  SZGameKit3D.playMusic("musica");
  SZGameKit3D.startTimer(120);
  SZGameKit3D.spawn("fogueira", -12, 0, -12);
  SZGameKit3D.spawn("fogueira", 12, 0, -12);
  SZGameKit3D.spawn("fogueira", -12, 0, 12);
  SZGameKit3D.spawn("fogueira", 12, 0, 12);
  SZGameKit3D.spawn("pedra", -6, 0, 2);
  SZGameKit3D.spawn("pedra", 6, 0, -2);
  SZGameKit3D.spawn("pedra", 2, 0, 10);
  SZGameKit3D.spawn("pedra", -2, 0, -10);
  SZGameKit3D.spawn("graveto", -8, 0, 4);
  SZGameKit3D.spawn("graveto", 8, 0, 4);
  SZGameKit3D.spawn("graveto", -4, 0, -8);
  SZGameKit3D.spawn("graveto", 4, 0, -8);
  SZGameKit3D.spawn("fantasma", -16, 1, 0);
  SZGameKit3D.spawn("fantasma", 16, 1, 0);
  const coruja = SZGameKit3D.spawn("coruja", 0, 0, -4);
  const heroi = SZGameKit3D.spawn("heroi", 0, 1, 6);
  SZGameKit3D.cameraOrbit(24);
  SZGameKit3D.cameraAngle(0, 55);
  SZGameKit3D.cameraLookAt(heroi);
  if (SZGameKit3D.savedValue("comoAcabou", "nada") === "vitoria") {
    SZGameKit3D.say(coruja, "Você voltou! Da última vez o portal abriu.", 4);
  } else {
    SZGameKit3D.say(coruja, "Junte 2 gravetos para cada fogueira!", 30);
  }
});
SZGameKit3D.onEnterState("pausado", function () {
  SZGameKit3D.showScreen("dica");
});
SZGameKit3D.onEnterState("menu", function () {
  SZGameKit3D.stopMusic();
});
SZGameKit3D.onEnterState("vitoria", function () {
  SZGameKit3D.emit("noite:acabou");
});
SZGameKit3D.onEnterState("fim", function () {
  SZGameKit3D.emit("noite:acabou");
});
SZGameKit3D.on("noite:acabou", function () {
  SZGameKit3D.stopMusic();
  if (SZGameKit3D.stateIs("fim")) {
    SZGameKit3D.stopEmitter("fogo");
  }
  SZGameKit3D.saveValue("comoAcabou", SZGameKit3D.state());
});
SZGameKit3D.onEntityStateUpdate("heroi", "parado", function (ela, dt) {
  SZGameKit3D.moveWithKeys(ela, 7);
  SZGameKit3D.faceVelocity(ela);
});
SZGameKit3D.onEntityStateUpdate("coruja", "parado", function (ela, dt) {
  const heroi = SZGameKit3D.nearest("heroi", ela);
  if (SZGameKit3D.exists(heroi) && SZGameKit3D.touches(ela, heroi, 6)) {
    SZGameKit3D.lookAt(ela, heroi);
    if (SZGameKit3D.keyPressed("KeyE")) {
      SZGameKit3D.setState("pausado");
    }
  }
});
SZGameKit3D.onEnterEntityState("fantasma", "parado", function (ela) {
  SZGameKit3D.passThrough(ela, true);
});
SZGameKit3D.onEntityStateUpdate("fantasma", "parado", function (ela, dt) {
  const heroi = SZGameKit3D.nearest("heroi", ela);
  if (SZGameKit3D.exists(heroi)) {
    SZGameKit3D.seek(ela, heroi);
    SZGameKit3D.faceVelocity(ela);
    if (SZGameKit3D.touches(ela, heroi, 1.3)) {
      if (SZGameKit3D.bagCount("graveto") > 0) {
        SZGameKit3D.clearBag();
        SZGameKit3D.say(heroi, "O fantasma levou a lenha!", 2);
      }
      SZGameKit3D.burstOn("susto", ela);
      SZGameKit3D.playEffect("hurt");
      SZGameKit3D.cameraShake(0.3, 0.2);
      SZGameKit3D.place(ela, SZGameKit3D.randomBetween(-15, 15), 1, 0 - SZGameKit3D.worldSize() / 2);
    }
  }
});
SZGameKit3D.onOverlap("graveto", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "heroi")) {
    SZGameKit3D.putInBag("graveto", 1);
    SZGameKit3D.playEffect("coin");
    SZGameKit3D.recycle(zona);
  }
});
SZGameKit3D.onOverlap("fogueira", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "heroi") && SZGameKit3D.entityStateIs(zona, "parado")) {
    if (SZGameKit3D.bagCount("graveto") >= 2) {
      SZGameKit3D.takeFromBag("graveto", 2);
      SZGameKit3D.setEntityState(zona, "acesa");
    } else {
      SZGameKit3D.say(quem, "Preciso de 2 gravetos!", 1.5);
    }
  }
});
SZGameKit3D.onEnterEntityState("fogueira", "acesa", function (ela) {
  SZGameKit3D.startEmitter("fogo", SZGameKit3D.posOf(ela, "x"), 0.5, SZGameKit3D.posOf(ela, "z"));
  SZGameKit3D.addLight("#fb923c", SZGameKit3D.posOf(ela, "x"), 2, SZGameKit3D.posOf(ela, "z"), 1.5);
  SZGameKit3D.playSound("fogo");
  acesas = acesas + 1;
  const coruja = SZGameKit3D.nearest("coruja", ela);
  if (SZGameKit3D.exists(coruja)) {
    SZGameKit3D.hideSay(coruja);
  }
  if (acesas >= 4) {
    SZGameKit3D.emit("portal:abrir");
  }
});
SZGameKit3D.on("portal:abrir", function () {
  SZGameKit3D.spawn("portal", 0, 0, 0);
  SZGameKit3D.startEmitter("magia", 0, 0.5, 0);
  SZGameKit3D.cameraLookAtPoint(0, 1, 0);
  SZGameKit3D.cameraDistance(34);
  SZGameKit3D.stopTimer();
  SZGameKit3D.playEffect("powerup");
});
SZGameKit3D.onOverlap("portal", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "heroi")) {
    SZGameKit3D.playEffect("win");
    SZGameKit3D.endGame("ganhou");
  }
});
SZGameKit3D.onTimerEnd(function () {
  SZGameKit3D.endGame("perdeu");
});
SZGameKit3D.onUpdate(function (dt) {
  if (SZGameKit3D.countAlive("graveto") < 3) {
    SZGameKit3D.spawn("graveto", SZGameKit3D.randomBetween(-4, 4) * 4, 0, SZGameKit3D.randomBetween(-4, 4) * 4);
  }
  if (acesas >= 4) {
    SZGameKit3D.hudText("top-left", "O portal abriu: corra até o meio!");
  } else {
    SZGameKit3D.hudText("top-left", "Fogueiras: " + acesas + " de 4");
  }
  SZGameKit3D.hudText("top-right", "Perto da coruja, E mostra a dica");
});
`.trim()
