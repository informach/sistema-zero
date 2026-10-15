SZGameKit.runProject(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGameKit.restartGame());
  // Meus moldes
  SZGameKit.defineMold("invasor", { w: 34, h: 34, health: 30, speed: 0, damage: 0, color: "#e0526a", image: "", look: "" });
  SZGameKit.defineMold("torre", { w: 40, h: 40, health: 1, speed: 0, damage: 0, color: "#4a9eff", image: "", look: "" });
  SZGameKit.defineMold("tiro", { w: 10, h: 10, health: 1, speed: 0, damage: 0, color: "#ffe066", image: "", look: "" });
  SZGameKit.defineEffect("estouro", { count: 12, color: "#ffd166", size: 4, life: 0.4, speed: 160, gravity: 0 });
  SZGameKit.definePath("trilha", () => {
    SZGameKit.pathPoint(-40, 120);
    SZGameKit.pathPoint(300, 120);
    SZGameKit.pathPoint(300, 400);
    SZGameKit.pathPoint(660, 400);
    SZGameKit.pathPoint(660, 200);
    SZGameKit.pathPoint(1000, 200);
  });
  // Ao iniciar
  SZGameKit.setup({ width: 960, height: 540, background: "#26331f", accent: "#ffd166" });
  SZGameKit.setScreenText("menu", "Defesa do Reino", "Clique nos lugares para comprar torres - não deixe os invasores passarem!", "Defender");
  SZGameKit.setScreenText("fim", "O reino caiu!", "Os invasores passaram. Tente de novo!", "Jogar de novo");
  const castelo = SZGameKit.createCharacter({ image: "", w: 44, h: 64, speed: 0, color: "#f4a259" });
  let vidas = 5;
  let leva = 3;
  SZGameKit.tdSetCoins(100);
  SZGameKit.tdSlot(300, 220, 60);
  SZGameKit.tdSlot(420, 300, 60);
  SZGameKit.tdSlot(560, 320, 60);
  SZGameKit.tdSlot(660, 120, 60);
  vidas = 5;
  leva = 3;
  SZGameKit.placeCharacter(castelo, 936, 168);
  SZGameKit.tdWave("trilha", leva, "invasor", 150, 90);
  // Quando acontecer
  SZGameKit.tdOnBuy(50, (lugarX, lugarY) => {
    SZGameKit.spawnFromMold("torre", lugarX - 20, lugarY - 20);
    SZGameKit.playEffect("click");
  });
  SZGameKit.on("compra:negada", () => {
    SZGameKit.floatText("sem moedas!", SZGameKit.mouseX(), SZGameKit.mouseY(), "#ff6b6b", 20);
  });
  SZGameKit.on("invasor:passou", () => {
    vidas = vidas - 1;
    SZGameKit.cameraShake(6, 0.3);
    if (vidas <= 0) {
      SZGameKit.endGame();
    }
  });
  SZGameKit.on("onda:limpa", () => {
    leva = leva + 2;
    SZGameKit.tdAddCoins(25);
    SZGameKit.tdWave("trilha", leva, "invasor", 150, 90);
  });
  // Enquanto estiver rodando
  SZGameKit.onUpdate((dt) => {
    SZGameKit.forEachActive("torre", (torre) => {
      if (SZGameKit.cooldownReady(torre, 0.8)) {
        const alvo = SZGameKit.pickActive("invasor", "maior", "pathProgress");
        if (alvo) {
          if (SZGameKit.distanceBetween(torre, alvo) < 220) {
            const tiro = SZGameKit.spawnFromMold("tiro", SZGameKit.charX(torre), SZGameKit.charY(torre));
            SZGameKit.launchTowards(tiro, alvo, 420);
          }
        }
      }
    });
    SZGameKit.forEachActive("tiro", (item) => {
      SZGameKit.moveByVelocity(item, dt);
    });
    SZGameKit.cullOffscreen("tiro", 60);
    SZGameKit.overlapGroups("tiro", "invasor", (t, inv) => {
      SZGameKit.recycle(t);
      SZGameKit.hurt(inv, 15, 0);
      if (SZGameKit.isDead(inv)) {
        SZGameKit.burst("estouro", SZGameKit.charX(inv), SZGameKit.charY(inv));
        SZGameKit.tdAddCoins(10);
        SZGameKit.floatText("+10", SZGameKit.charX(inv), SZGameKit.charY(inv), "#ffd166", 20);
        SZGameKit.recycle(inv);
      }
    });
  });
  SZGameKit.onDraw((ctx) => {
    SZGameKit.drawBackground("#26331f", true);
    ctx.fillStyle = "#4a4028";
    ctx.fillRect(-40, 102, 340, 36);
    ctx.fillRect(282, 102, 36, 316);
    ctx.fillRect(282, 382, 396, 36);
    ctx.fillRect(642, 182, 36, 236);
    ctx.fillRect(642, 182, 358, 36);
    SZGameKit.tdDrawSlots();
    SZGameKit.forEachActive("torre", (torre) => {
      SZGameKit.tdDrawRange(torre, 220);
    });
    SZGameKit.drawActive("torre");
    SZGameKit.drawActive("invasor");
    SZGameKit.drawActive("tiro");
    SZGameKit.forEachActive("invasor", (inv) => {
      SZGameKit.drawHealthBar(inv, 0);
    });
    SZGameKit.drawCharacter(castelo);
  });
  SZGameKit.onDrawHud((ctx) => {
    SZGameKit.drawHearts(vidas, 5, 20, 20);
    ctx.fillStyle = "#ffd166";
    ctx.font = "24px sans-serif";
    ctx.fillText("Moedas: " + SZGameKit.tdCoins(), 20, 70);
  });
});
SZGameKit.start();
