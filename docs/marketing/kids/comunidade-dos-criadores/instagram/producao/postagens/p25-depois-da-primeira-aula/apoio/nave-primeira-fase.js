SZGame2D.onStart(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGame2D.restart());
  // Ao iniciar
  SZGame2D.setupStage(800, 480, "#07162e");
  const nave = SZGame2D.createShip({ x: 400, y: 410, w: 54, h: 62, body: "#35e8ff", wings: "#2568ff" });
  // Quando acontecer
  // Enquanto estiver rodando
  // O jogo roda 60 passos por segundo: cada volta desenha um "quadro" do filme.
  SZGame2D.gameLoop(function update() {
    SZGame2D.drawSprite(ctx, nave);
  }, "nave-ref-10");
}, "__sz-project");
