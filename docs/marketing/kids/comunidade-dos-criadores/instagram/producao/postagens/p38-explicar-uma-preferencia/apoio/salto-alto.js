SZGame2D.onStart(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGame2D.restart());
  // Ao iniciar
  SZGame2D.setupStage(320, 200, "#d4ecf8");
  SZGame2D.setStageDescription("Herói que anda, pula com gravidade e fica preso na tela (setas).");
  const heroi = SZGame2D.createSprite({ x: 64, y: 140, w: 24, h: 24, image: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI3IiBmaWxsPSIjMjU2M2ViIi8+PGNpcmNsZSBjeD0iMTYiIGN5PSIxMCIgcj0iNiIgZmlsbD0iI2ZkZTY4YSIvPjxyZWN0IHg9IjEwIiB5PSIxNiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiByeD0iNCIgZmlsbD0iIzYwYTVmYSIvPjxjaXJjbGUgY3g9IjE0IiBjeT0iOSIgcj0iMSIvPjxjaXJjbGUgY3g9IjE4IiBjeT0iOSIgcj0iMSIvPjwvc3ZnPg==" });
  const inicio = SZGame2D.createSprite({ x: 0, y: 164, w: 110, h: 36, color: "#5c9d43" });
  const destino = SZGame2D.createSprite({ x: 156, y: 120, w: 164, h: 80, color: "#5c9d43" });
  const teto = SZGame2D.createSprite({ x: 70, y: 34, w: 206, h: 22, color: "#a56b40" });
  // Quando acontecer
  // Enquanto estiver rodando
  // O jogo roda 60 passos por segundo: cada volta desenha um "quadro" do filme.
  SZGame2D.gameLoop(function update() {
    SZGame2D.clear();
    SZGame2D.applyGravity(heroi);
    SZGame2D.platformer(heroi, ctx, 4, 15);
    SZGame2D.collidePlatform(heroi, inicio);
    SZGame2D.collidePlatform(heroi, destino);
    SZGame2D.collideSprite(heroi, teto);
    SZGame2D.clampToScreen(heroi, ctx);
    SZGame2D.drawSprite(ctx, inicio);
    SZGame2D.drawSprite(ctx, destino);
    SZGame2D.drawSprite(ctx, teto);
    SZGame2D.drawSprite(ctx, heroi);
  }, "quadroDoJogo");
}, "__sz-project");
