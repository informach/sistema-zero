/**
 * Fonte do exemplo "Arena dos Cristais" (review 3D, lote 12): o jogo COMPLETO mais curto do
 * Avançado, logo depois do Chefão. Moldes de herói e de guarda, o guarda com cérebro próprio
 * (patrulha → persegue quem chega perto → volta a patrulhar), vida com barra, pontos,
 * contagem, a chave na MOCHILA que abre a saída, duas FASES (a 2ª com mais guardas e a chave
 * do outro lado), o RECORDE guardado neste computador e o fim com "Sair para o menu".
 * Toda fase começa com o herói longe dos guardas (o mais perto patrulha a 9 m, e eles só
 * correm atrás a menos de 6 m) e com o aviso "Fase N!" no balão. A tela "fim" serve aos
 * dois jeitos de perder: os guardas pegaram ou a contagem acabou.
 *
 * `bun run gen:game-3d-examples` regrava a IR em examples.ts a partir daqui; o drift
 * (`arenaCristaisExample.test.ts`) e o playthrough com three de verdade guardam o resultado.
 */
export const ARENA_CRISTAIS_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 40, sky: "#0c4a6e", ground: "#1e3a5f" });
SZGameKit3D.setPauseKey("KeyP");
SZGameKit3D.setScreenText("inicio", "Arena dos Cristais", "Pegue os cristais, ache a chave e saia pela porta. Fuja dos guardas: eles patrulham e correm atrás de você! São duas fases.", "Jogar");
SZGameKit3D.setScreenText("vitoria", "Você saiu da arena!", "Venceu as duas fases.", "Jogar de novo");
SZGameKit3D.setScreenText("fim", "Não foi desta vez...", "Os guardas te pegaram ou o tempo acabou. Tente de novo por outro caminho!", "Tentar de novo");
SZGameKit3D.defineMold("heroi", { health: 3, speed: 7 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#facc15", w: 0.9, h: 1.2, d: 0.9, x: 0, y: 0.6, z: 0 });
  SZGameKit3D.part({ shape: "sphere", color: "#fef9c3", w: 0.7, h: 0.7, d: 0.7, x: 0, y: 1.5, z: 0 });
});
SZGameKit3D.defineMold("guarda", { health: 10, speed: 4 }, function () {
  SZGameKit3D.part({ shape: "box", color: "#dc2626", w: 1, h: 1.4, d: 1, x: 0, y: 0.7, z: 0 });
  SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#fca5a5", w: 0.4, h: 0.5, d: 0.4, x: 0, y: 1.1, z: 0.6 });
});
SZGameKit3D.defineMold("cristal", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#22d3ee", w: 0.8, h: 1.2, d: 0.8, x: 0, y: 0.8, z: 0 });
});
SZGameKit3D.defineMold("chave", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "torus", material: "brilho", color: "#f59e0b", w: 0.8, h: 0.8, d: 0.2, x: 0, y: 1, z: 0 });
});
SZGameKit3D.defineMold("porta", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", material: "brilho", color: "#a855f7", w: 3, h: 3, d: 0.5, x: 0, y: 1.5, z: 0 });
});
SZGameKit3D.setPhysics("heroi", "personagem");
SZGameKit3D.setPhysics("guarda", "personagem");
SZGameKit3D.makeTrigger("cristal");
SZGameKit3D.makeTrigger("chave");
SZGameKit3D.makeTrigger("porta");
SZGameKit3D.showHealthBar("heroi", true);
let recorde = 0;
SZGameKit3D.onEnterState("jogando", function () {
  recorde = SZGameKit3D.savedValue("recorde", 0);
  SZGameKit3D.setAmbient(0.6);
});
SZGameKit3D.onLevelStart(function () {
  const heroi = SZGameKit3D.spawn("heroi", 0, 1, 14);
  SZGameKit3D.cameraFollow(heroi, 12, 9);
  SZGameKit3D.say(heroi, "Fase " + SZGameKit3D.level() + "!", 2);
  SZGameKit3D.spawn("porta", 0, 0, -17);
  SZGameKit3D.spawn("cristal", -8, 0, 8);
  SZGameKit3D.spawn("cristal", 8, 0, 8);
  SZGameKit3D.spawn("cristal", -8, 0, -8);
  SZGameKit3D.spawn("cristal", 8, 0, -8);
  SZGameKit3D.spawn("guarda", 0, 1, 0);
  if (SZGameKit3D.level() === 1) {
    SZGameKit3D.spawn("chave", -15, 0, 0);
  } else {
    SZGameKit3D.spawn("chave", 15, 0, 0);
    SZGameKit3D.spawn("guarda", 0, 1, -10);
    SZGameKit3D.spawn("guarda", 0, 1, 5);
  }
  SZGameKit3D.startTimer(60);
});
SZGameKit3D.onEntityStateUpdate("heroi", "parado", function (ela, dt) {
  SZGameKit3D.moveWithKeys(ela, 7);
  SZGameKit3D.faceVelocity(ela);
});
SZGameKit3D.onEntityStateUpdate("guarda", "parado", function (ela, dt) {
  SZGameKit3D.patrol(ela, -12, SZGameKit3D.posOf(ela, "z"), 12, SZGameKit3D.posOf(ela, "z"), 3);
  const heroi = SZGameKit3D.nearest("heroi", ela);
  if (SZGameKit3D.exists(heroi) && SZGameKit3D.distanceBetween(ela, heroi) < 6) {
    SZGameKit3D.setEntityState(ela, "perseguir");
  }
});
SZGameKit3D.onEntityStateUpdate("guarda", "perseguir", function (ela, dt) {
  const heroi = SZGameKit3D.nearest("heroi", ela);
  if (SZGameKit3D.exists(heroi) && SZGameKit3D.distanceBetween(ela, heroi) < 10) {
    SZGameKit3D.seek(ela, heroi);
    SZGameKit3D.faceVelocity(ela);
    if (SZGameKit3D.touches(ela, heroi, 1.4)) {
      SZGameKit3D.hurt(heroi, 1);
      SZGameKit3D.cameraShake(0.3, 0.2);
    }
  } else {
    SZGameKit3D.setEntityState(ela, "parado");
  }
});
SZGameKit3D.onExitEntityState("guarda", "perseguir", function (ela) {
  SZGameKit3D.say(ela, "Escapou...", 1);
});
SZGameKit3D.onOverlap("cristal", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "heroi")) {
    SZGameKit3D.addScore(1);
    SZGameKit3D.playTone(880, 120);
    SZGameKit3D.recycle(zona);
  }
});
SZGameKit3D.onOverlap("chave", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "heroi")) {
    SZGameKit3D.putInBag("chave", 1);
    SZGameKit3D.say(quem, "Peguei a chave!", 2);
    SZGameKit3D.playEffect("powerup");
    SZGameKit3D.recycle(zona);
  }
});
SZGameKit3D.onOverlap("porta", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "heroi")) {
    if (SZGameKit3D.bagHas("chave")) {
      SZGameKit3D.takeFromBag("chave", 1);
      SZGameKit3D.playEffect("win");
      if (SZGameKit3D.level() < 2) {
        SZGameKit3D.nextLevel();
      } else {
        if (SZGameKit3D.score() > recorde) {
          SZGameKit3D.saveValue("recorde", SZGameKit3D.score());
        }
        SZGameKit3D.stopTimer();
        SZGameKit3D.endGame("ganhou");
      }
    } else {
      SZGameKit3D.say(quem, "Falta a chave!", 1.5);
    }
  }
});
SZGameKit3D.onEntityDeath("heroi", function (ela) {
  SZGameKit3D.playEffect("gameover");
  SZGameKit3D.endGame("perdeu");
});
SZGameKit3D.onTimerEnd(function () {
  SZGameKit3D.endGame("perdeu");
});
SZGameKit3D.onUpdate(function (dt) {
  SZGameKit3D.hudText("top-left", "Fase " + SZGameKit3D.level() + " de 2");
  SZGameKit3D.hudText("bottom-right", "Recorde: " + recorde);
});
`.trim()
