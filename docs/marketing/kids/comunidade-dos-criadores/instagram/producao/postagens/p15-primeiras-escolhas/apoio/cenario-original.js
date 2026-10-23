SZGame2D.onStart(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGame2D.restart());
  // Ao iniciar
  SZGame2D.setupStage(320, 240, "#11172a");
  SZGame2D.setStageDescription("O seu desenho vira o fundo do jogo. Use as setas para andar na frente dele.");
  SZGame2D.setBackdrop("cenario");
  const heroi = SZGame2D.createSprite({ x: 148, y: 150, w: 24, h: 24, color: "#f97316" });
  // Quando acontecer
  // Enquanto estiver rodando
  // O jogo roda 60 passos por segundo: cada volta desenha um "quadro" do filme.
  SZGame2D.gameLoop(function update() {
    SZGame2D.clear();
    SZGame2D.topDown(heroi, 3);
    SZGame2D.clampToScreen(heroi, ctx);
    SZGame2D.drawSprite(ctx, heroi);
  }, "quadroDoJogo");
}, "__sz-project");
