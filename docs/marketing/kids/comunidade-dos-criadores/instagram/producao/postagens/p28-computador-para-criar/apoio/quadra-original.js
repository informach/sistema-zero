SZGameKit3D.runProject(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin();
  // Meus moldes
  SZGameKit3D.defineMold("heroi", { health: 1, speed: 0 }, () => {
    SZGameKit3D.part({ shape: "box", material: "normal", color: "#22d3ee", texture: "", model: "", w: 0.9, h: 1.1, d: 0.9, x: 0, y: 0.55, z: 0 });
    SZGameKit3D.part({ shape: "sphere", material: "normal", color: "#cffafe", texture: "", model: "", w: 0.7, h: 0.7, d: 0.7, x: 0, y: 1.3, z: 0 });
    SZGameKit3D.part({ shape: "cone", material: "brilho", color: "#facc15", texture: "", model: "", w: 0.3, h: 0.5, d: 0.3, x: 0, y: 0.9, z: 0.5 });
  });
  SZGameKit3D.defineMold("bola", { health: 1, speed: 0 }, () => {
    SZGameKit3D.part({ shape: "sphere", material: "brilho", color: "#fb7185", texture: "", model: "", w: 1.1, h: 1.1, d: 1.1, x: 0, y: 0.55, z: 0 });
  });
  SZGameKit3D.defineMold("caixote", { health: 1, speed: 0 }, () => {
    SZGameKit3D.part({ shape: "box", material: "normal", color: "#a16207", texture: "", model: "", w: 2, h: 2, d: 2, x: 0, y: 1, z: 0 });
  });
  SZGameKit3D.defineMold("gelo", { health: 1, speed: 0 }, () => {
    SZGameKit3D.part({ shape: "box", material: "metal", color: "#e0f2fe", texture: "", model: "", w: 12, h: 0.5, d: 12, x: 0, y: 0.25, z: 0 });
  });
  SZGameKit3D.defineEffect("plim", { count: 24, colorFrom: "#fb7185", colorTo: "#4c1d95", spread: 6, sizeFrom: 0.5, sizeTo: 0, life: 0.6, gravity: 3 });
  // Ao iniciar
  SZGameKit3D.setup({ width: 1280, height: 720, world: 50, sky: "#1e1b4b", ground: "#4c1d95" });
  SZGameKit3D.setEffects({ shadows: true, bloom: true, strength: 1.2, vignette: true });
  SZGameKit3D.setScreenText("menu", "Quadra Maluca", "Arraste o mouse para girar a câmera: o WASD anda SEMPRE para onde você está olhando. Encoste nas 5 bolas quicantes, mas cuidado: o gelo escorrega!", "Jogar");
  SZGameKit3D.setScreenText("vitoria", "Pegou todas!", "Você domou as bolas malucas.", "Jogar de novo");
  SZGameKit3D.setPhysics("heroi", "personagem");
  SZGameKit3D.setPhysics("bola", "bola");
  SZGameKit3D.setPhysics("caixote", "caixa");
  SZGameKit3D.setPhysics("gelo", "gelo");
  SZGameKit3D.makeSolid("gelo");
  SZGameKit3D.makeSolid("caixote");
  SZGameKit3D.makeTrigger("bola");
  let pegou = 0;
  // Quando acontecer
  SZGameKit3D.onEnterState("jogando", () => {
    pegou = 0;
    SZGameKit3D.setSeed(11);
    SZGameKit3D.setAmbient(0.5);
    SZGameKit3D.setFog("#1e1b4b", 35, 95);
    SZGameKit3D.addLight("#a5b4fc", 0, 16, 0, 1.5);
    SZGameKit3D.spawn("gelo", 13, 0, 0);
    SZGameKit3D.spawn("caixote", -8, 0, 6);
    SZGameKit3D.spawn("caixote", 5, 0, -9);
    SZGameKit3D.spawn("caixote", -3, 0, -6);
    SZGameKit3D.spawn("bola", -6, 12, -2);
    SZGameKit3D.spawn("bola", 2, 15, 4);
    SZGameKit3D.spawn("bola", 8, 11, -5);
    SZGameKit3D.spawn("bola", 14, 13, 3);
    SZGameKit3D.spawn("bola", -10, 16, 8);
    const heroi = SZGameKit3D.spawn("heroi", 0, 1, 8);
    SZGameKit3D.cameraOrbit(26);
    SZGameKit3D.cameraLookAt(heroi);
    SZGameKit3D.cameraAngle(40, 26);
  });
  SZGameKit3D.onOverlap("bola", (zona, quem) => {
    if (SZGameKit3D.isMold(quem, "heroi")) {
      SZGameKit3D.burstOn("plim", zona);
      SZGameKit3D.playEffect("coin");
      SZGameKit3D.cameraShake(0.3, 0.25);
      SZGameKit3D.recycle(zona);
      pegou = pegou + 1;
      if (pegou >= 5) {
        SZGameKit3D.setState("vitoria");
      }
    }
  });
  // Enquanto estiver rodando
  SZGameKit3D.onUpdate((dt) => {
    SZGameKit3D.setHud("top-left", "Bolas: " + pegou + "/5");
    SZGameKit3D.setHud("top-right", "Arraste o mouse · ande com WASD");
  });
  SZGameKit3D.onEntityStateUpdate("heroi", "parado", (ela, dt) => {
    SZGameKit3D.platformerKeys(ela, 7, 10);
    SZGameKit3D.faceVelocity(ela);
  });
});
SZGameKit3D.start();
