SZGameKit.runProject(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGameKit.restartGame());
  // Meus moldes
  SZGameKit.defineMold("bloco", { w: 72, h: 24, health: 1, speed: 0, damage: 0, color: "#f472b6", image: "", look: "" });
  // Ao iniciar
  SZGameKit.setup({ width: 800, height: 600, background: "#0b1020", accent: "#22d3ee" });
  SZGameKit.setScreenText("menu", "Quebra-blocos", "Mova a raquete com as SETAS. Nao deixe a bola cair!", "Jogar");
  SZGameKit.setScreenText("fim", "A bola caiu!", "Tente de novo!", "Jogar de novo");
  const raquete = SZGameKit.createCharacter({ image: "", w: 120, h: 18, speed: 520, color: "#22d3ee" });
  const bola = SZGameKit.createCharacter({ image: "", w: 16, h: 16, speed: 0, color: "#fde047" });
  SZGameKit.placeCharacter(raquete, 340, 540);
  SZGameKit.placeCharacter(bola, 392, 300);
  SZGameKit.setVelocity(bola, 220, 260);
  for (let linha = 0, fim_2 = 3, passo_2 = 1; passo_2 > 0 ? linha < fim_2 : passo_2 < 0 ? linha > fim_2 : false; linha += passo_2) {
    for (let coluna = 0, fim = 9, passo = 1; passo > 0 ? coluna < fim : passo < 0 ? coluna > fim : false; coluna += passo) {
      SZGameKit.spawnFromMold("bloco", 40 + coluna * 84, 80 + linha * 36);
    }
  }
  // Quando acontecer
  // Enquanto estiver rodando
  SZGameKit.onUpdate((dt) => {
    if (SZGameKit.keyDown("arrowleft")) {
      SZGameKit.setProperty(raquete, "x", SZGameKit.propertyOf(raquete, "x") - 520 * dt);
    }
    if (SZGameKit.keyDown("arrowright")) {
      SZGameKit.setProperty(raquete, "x", SZGameKit.propertyOf(raquete, "x") + 520 * dt);
    }
    SZGameKit.keepOnScreen(raquete);
    SZGameKit.moveByVelocity(bola, dt);
    SZGameKit.bounceOnEdges(bola);
    SZGameKit.paddleBounce(bola, raquete);
    SZGameKit.forEachActive("bloco", (item) => {
      if (SZGameKit.touching(bola, item)) {
        SZGameKit.recycle(item);
        SZGameKit.setVelocity(bola, SZGameKit.velocityOf(bola, "x"), 0 - SZGameKit.velocityOf(bola, "y"));
      }
    });
    if (SZGameKit.propertyOf(bola, "y") > SZGameKit.height()) {
      SZGameKit.endGame();
    }
    if (SZGameKit.countActive("bloco") <= 0) {
      SZGameKit.setState("vitoria");
    }
  });
  SZGameKit.onDraw((ctx) => {
    SZGameKit.drawBackground("#0b1020", false);
    SZGameKit.drawActive("bloco");
    SZGameKit.drawCharacter(raquete);
    SZGameKit.drawCharacter(bola);
  });
});
SZGameKit.start();
