SZGame2D.onStart(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGame2D.restart());
  // Ao iniciar
  SZGame2D.setupStage(400, 300, "#11172a");
  SZGame2D.setStageDescription("Sprite com imagem + animação de spritesheet, movido pelas setas.");
  const andar = SZGame2D.loadSpriteSheet("heroi-andando", 32, 32);
  const heroi = SZGame2D.createSprite({ x: 180, y: 130, w: 48, h: 48, image: "heroi" });
  SZGame2D.setAnimation(heroi, andar, 0, 3, 8);
  // Quando acontecer
  // Enquanto estiver rodando
  // O jogo roda 60 passos por segundo: cada volta desenha um "quadro" do filme.
  SZGame2D.gameLoop(function update() {
    SZGame2D.clear();
    SZGame2D.topDown(heroi, 3);
    SZGame2D.drawSprite(ctx, heroi);
    SZGame2D.drawLabel(ctx, "Use as setas para andar e ver a animação.", 200, 286, "#e2e8f0", 14, "center");
  }, "quadroDoJogo");
}, "__sz-project");
