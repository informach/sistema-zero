SZGameKit.runProject(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGameKit.restartGame());
  // Meus moldes
  SZGameKit.definePath("trilha", () => {
    SZGameKit.pathPoint(120, 480);
    SZGameKit.pathPoint(260, 480);
    SZGameKit.pathPoint(400, 480);
    SZGameKit.pathPoint(540, 420);
    SZGameKit.pathPoint(680, 340);
    SZGameKit.pathPoint(680, 200);
    SZGameKit.pathPoint(520, 150);
    SZGameKit.pathPoint(380, 150);
  });
  // Ao iniciar
  SZGameKit.setup({ width: 900, height: 600, background: "#1b3a2a", accent: "#ffd166" });
  SZGameKit.setScreenText("menu", "Corrida de Tabuleiro", "Clique para rolar o dado e andar as casas. Dois peoes: chegue ao fim e pegue os pontos da casa premiada!", "Jogar");
  const azul = SZGameKit.createCharacter({ image: "", w: 36, h: 36, speed: 0, color: "#4a9eff" });
  const vermelho = SZGameKit.createCharacter({ image: "", w: 36, h: 36, speed: 0, color: "#ef4444" });
  let pontosAzul = 0;
  let pontosVermelho = 0;
  SZGameKit.playersSetup(2);
  pontosAzul = 0;
  pontosVermelho = 0;
  SZGameKit.placeCharacter(azul, 120, 480);
  SZGameKit.placeCharacter(vermelho, 120, 480);
  // Quando acontecer
  SZGameKit.onTurnChange(() => {
    SZGameKit.emit("vez:mudou");
  });
  SZGameKit.onLandSpace(() => {
    if (SZGameKit.currentPlayer() === 1) {
      if (SZGameKit.spaceOf(azul) === 7) {
        pontosAzul = pontosAzul + 10;
      }
    } else {
      if (SZGameKit.spaceOf(vermelho) === 7) {
        pontosVermelho = pontosVermelho + 10;
      }
    }
    SZGameKit.nextPlayer();
  });
  SZGameKit.onGameClick((px, py) => {
    const passos = SZGameKit.rollDice(6);
    if (SZGameKit.currentPlayer() === 1) {
      SZGameKit.moveAlongTrack(azul, passos, "trilha");
    } else {
      SZGameKit.moveAlongTrack(vermelho, passos, "trilha");
    }
  });
  // Enquanto estiver rodando
  SZGameKit.onDraw((ctx) => {
    SZGameKit.drawBackground("#1b3a2a", true);
    SZGameKit.drawCharacter(azul);
    SZGameKit.drawCharacter(vermelho);
  });
});
SZGameKit.start();
