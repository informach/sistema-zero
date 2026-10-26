/**
 * Fonte do exemplo "Herói do Molda" (review 3D, lote 12): um personagem com OSSOS feito no
 * Molda (o mesmo .glb do "Meu herói do Molda" do Jogo 3D, `game-3d/exampleAssets.ts`, que o
 * `exampleProgression.test.ts` confere contra a fixture portátil) vira a peça "modelo
 * importado" de um molde. Cada ESTADO toca uma animação ("parado" acena, "andando" se estica
 * repetindo), o pulo toca "Esticar" UMA VEZ na mão ("Tocar a animação … uma vez") e o "Quando …
 * terminar a animação" o devolve ao "parado". O floco de gelo CONGELA o herói: "Parar a
 * animação" o deixa duro no lugar até o "depois de 1.5 s" devolvê-lo ao "parado" (e à animação
 * do estado). O objetivo é curto: pôr as cinco estrelas na mochila.
 *
 * `bun run gen:game-3d-examples` regrava a IR em examples.ts a partir daqui.
 */
export const HEROI_MOLDA_SOURCE = `
SZGameKit3D.setup({ width: 1280, height: 720, world: 30, sky: "#7dd3fc", ground: "#4ade80" });
SZGameKit3D.setScreenText("inicio", "Herói do Molda", "Um herói feito no Molda! Ande com WASD, pule com espaço e pegue as cinco estrelas. Cuidado com os flocos de gelo: eles congelam o herói. Troque pelo seu herói e use os nomes das animações dele.", "Jogar");
SZGameKit3D.setScreenText("vitoria", "Todas as estrelas!", "O seu herói pegou as cinco.", "Jogar de novo");
SZGameKit3D.defineMold("heroi", { health: 3, speed: 5 }, function () {
  SZGameKit3D.part({ shape: "modelo", model: "heroi-do-molda", w: 1.4, h: 2, d: 1.4, x: 0, y: 1, z: 0 });
});
SZGameKit3D.defineMold("estrela", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#facc15", w: 0.8, h: 0.8, d: 0.8, x: 0, y: 0.8, z: 0 });
});
SZGameKit3D.defineMold("floco", { health: 1, speed: 0 }, function () {
  SZGameKit3D.part({ shape: "box", material: "vidro", color: "#bae6fd", w: 1, h: 0.15, d: 0.15, x: 0, y: 0.8, z: 0 });
  SZGameKit3D.part({ shape: "box", material: "vidro", color: "#bae6fd", w: 0.15, h: 1, d: 0.15, x: 0, y: 0.8, z: 0 });
  SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#e0f2fe", w: 0.35, h: 0.35, d: 0.35, x: 0, y: 0.8, z: 0 });
});
SZGameKit3D.setPhysics("heroi", "personagem");
SZGameKit3D.makeTrigger("estrela");
SZGameKit3D.makeTrigger("floco");
SZGameKit3D.setStateAnim("heroi", "parado", "Acenar");
SZGameKit3D.setStateAnim("heroi", "andando", "Esticar");
SZGameKit3D.onEnterState("jogando", function () {
  const heroi = SZGameKit3D.spawn("heroi", 0, 0, 0);
  SZGameKit3D.cameraFollow(heroi, 8, 4);
  SZGameKit3D.spawn("estrela", 6, 0, 6);
  SZGameKit3D.spawn("estrela", -6, 0, 6);
  SZGameKit3D.spawn("estrela", 6, 0, -6);
  SZGameKit3D.spawn("estrela", -6, 0, -6);
  SZGameKit3D.spawn("estrela", 0, 0, -10);
  SZGameKit3D.spawn("floco", 4, 0, -3);
  SZGameKit3D.spawn("floco", -3, 0, 8);
});
SZGameKit3D.onEntityStateUpdate("heroi", "parado", function (ela, dt) {
  SZGameKit3D.moveWithKeys(ela, 5);
  if (SZGameKit3D.keyDown("KeyW") || SZGameKit3D.keyDown("KeyA") || SZGameKit3D.keyDown("KeyS") || SZGameKit3D.keyDown("KeyD")) {
    SZGameKit3D.setEntityState(ela, "andando");
  }
  if (SZGameKit3D.keyPressed("Space")) {
    SZGameKit3D.setEntityState(ela, "pulando");
  }
});
SZGameKit3D.onEnterEntityState("heroi", "andando", function (ela) {
  SZGameKit3D.animSpeed(ela, 1.5);
});
SZGameKit3D.onEntityStateUpdate("heroi", "andando", function (ela, dt) {
  SZGameKit3D.moveWithKeys(ela, 5);
  SZGameKit3D.faceVelocity(ela);
  if (SZGameKit3D.keyPressed("Space")) {
    SZGameKit3D.setEntityState(ela, "pulando");
  } else if (!(SZGameKit3D.keyDown("KeyW") || SZGameKit3D.keyDown("KeyA") || SZGameKit3D.keyDown("KeyS") || SZGameKit3D.keyDown("KeyD"))) {
    SZGameKit3D.setEntityState(ela, "parado");
  }
});
SZGameKit3D.onEnterEntityState("heroi", "pulando", function (ela) {
  SZGameKit3D.animSpeed(ela, 1);
  SZGameKit3D.playAnim(ela, "Esticar", false);
  SZGameKit3D.jump(ela, 7);
  SZGameKit3D.playEffect("jump");
});
SZGameKit3D.onEntityStateUpdate("heroi", "pulando", function (ela, dt) {
  SZGameKit3D.moveWithKeys(ela, 5);
});
SZGameKit3D.onAnimEnd("heroi", "Esticar", function (ela) {
  SZGameKit3D.setEntityState(ela, "parado");
});
SZGameKit3D.onEnterEntityState("heroi", "congelado", function (ela) {
  SZGameKit3D.setVelocity(ela, 0, 0, 0);
  SZGameKit3D.stopAnim(ela);
  SZGameKit3D.say(ela, "Brrr! Congelei!", 1.5);
  SZGameKit3D.playEffect("hurt");
});
SZGameKit3D.stateTimer("heroi", "congelado", 1.5, "parado");
SZGameKit3D.onOverlap("floco", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "heroi")) {
    SZGameKit3D.setEntityState(quem, "congelado");
    SZGameKit3D.recycle(zona);
  }
});
SZGameKit3D.onOverlap("estrela", function (zona, quem) {
  if (SZGameKit3D.isMold(quem, "heroi")) {
    SZGameKit3D.putInBag("estrela", 1);
    SZGameKit3D.playEffect("coin");
    SZGameKit3D.recycle(zona);
    if (SZGameKit3D.bagCount("estrela") >= 5) {
      SZGameKit3D.endGame("ganhou");
    }
  }
});
SZGameKit3D.onUpdate(function (dt) {
  SZGameKit3D.hudText("top-left", "Estrelas: " + SZGameKit3D.bagCount("estrela") + " de 5");
});
`.trim()
