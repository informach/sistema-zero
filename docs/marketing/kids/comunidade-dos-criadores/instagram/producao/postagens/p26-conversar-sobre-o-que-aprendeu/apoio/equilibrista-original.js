SZGame2D.onStart(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGame2D.restart());
  // Ao iniciar
  SZGame2D.setupStage(360, 480, "#11172a");
  SZGame2D.setStageDescription("Estica o bastão segurando o mouse/dedo e atravessa as plataformas (estilo Stick Hero). A regra do mouse é um se/senão: segurado cresce o bastão, solto derruba. Enter começa e recomeça.");
  SZGame2D.fitScreen(100);
  const equilibrista = SZGame2D.createStickHero({ w: 18, h: 36, color: "#d6455d" });
  const caminho = SZGame2D.createStickPath(ctx, { platform: "#0ea5a0", stick: "#1b2330" });
  let pontos = 0;
  SZGame2D.setScene("inicio");
  // Quando acontecer
  SZGame2D.onKey("Enter", () => {
    if (SZGame2D.sceneIs("inicio")) {
      SZGame2D.setScene("jogando");
    }
    if (SZGame2D.sceneIs("perdeu")) {
      SZGame2D.restart();
    }
  }, "eventoDeTecla");
  SZGame2D.stickPathOnCross(caminho, () => {
    SZGame2D.playFx("jump");
    pontos = pontos + 1;
  }, "eventoDeAtravessar");
  SZGame2D.stickPathOnPerfect(caminho, () => {
    SZGame2D.playFx("collect");
    SZGame2D.flash(ctx, "#ffe066");
    pontos = pontos + 2;
  }, "eventoDeAcertoPerfeito");
  // Enquanto estiver rodando
  // O jogo roda 60 passos por segundo: cada volta desenha um "quadro" do filme.
  SZGame2D.gameLoop(function update() {
    SZGame2D.clear();
    SZGame2D.stickPathScenery(caminho);
    if (SZGame2D.sceneIs("inicio")) {
      SZGame2D.showScreen(ctx, "Equilibrista", "Segure para esticar o bastão e solte para atravessar!", "Aperte Enter para começar", "#1b2330");
    }
    if (SZGame2D.sceneIs("jogando")) {
      if (SZGame2D.pointerDown()) {
        SZGame2D.stickPathGrow(caminho, 1);
      } else {
        SZGame2D.stickPathDrop(caminho);
      }
      SZGame2D.stickPathWalk(caminho, equilibrista, 1);
      SZGame2D.stickPathDraw(caminho);
      SZGame2D.drawSprite(ctx, equilibrista);
      SZGame2D.drawScore(ctx, "Pontos:", pontos, 12, 26, "#1b2330", 22);
      if (SZGame2D.stickPathFell(caminho)) {
        SZGame2D.setScene("perdeu");
      }
    }
    if (SZGame2D.sceneIs("perdeu")) {
      SZGame2D.showScreen(ctx, "Caiu!", "O bastão não alcançou a plataforma.", "Aperte Enter para jogar de novo", "#1b2330");
    }
  }, "quadroDoJogo");
}, "__sz-project");
