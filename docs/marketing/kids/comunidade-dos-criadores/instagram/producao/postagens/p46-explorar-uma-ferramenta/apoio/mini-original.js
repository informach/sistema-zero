SZGame2D.onStart(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGame2D.restart());
  // Ao iniciar
  SZGame2D.setupStage(320, 200, "#11172a");
  SZGame2D.setStageDescription("Herói que anda, pula com gravidade e fica preso na tela (setas).");
  const heroi = SZGame2D.createSprite({ x: 20, y: 120, w: 36, h: 36, color: "#4ade80" });
  // Quando acontecer
  // Enquanto estiver rodando
  // O jogo roda 60 passos por segundo: cada volta desenha um "quadro" do filme.
  SZGame2D.gameLoop(function update() {
    SZGame2D.clear();
    SZGame2D.applyGravity(heroi);
    SZGame2D.platformer(heroi, ctx, 4, 11);
    SZGame2D.clampToScreen(heroi, ctx);
    SZGame2D.drawSprite(ctx, heroi);
    SZGame2D.drawLabel(ctx, "Use as setas ← → para andar · ↑ para pular", 160, 190, "#e2e8f0", 14, "center");
  }, "quadroDoJogo");
}, "__sz-project");
