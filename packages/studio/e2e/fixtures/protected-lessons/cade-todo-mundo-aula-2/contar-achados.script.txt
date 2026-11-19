// Gerado pelo Sistema Zero Studio

SZGame2D.onStart(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGame2D.restart());
  // Ao iniciar
  SZGame2D.setupStage(640, 360, "#c7effb");
  let achados = 0;
  const esconderijos = SZGame2D.createGroup();
  const bicho1 = SZGame2D.createSprite({ x: 101, y: 181, w: 72, h: 87, image: "coelho" });
  const esconderijo1 = SZGame2D.createSprite({ x: 56.5, y: 137, w: 161, h: 144, image: "arbusto" });
  SZGame2D.addToGroup(esconderijos, esconderijo1);
  const bicho2 = SZGame2D.createSprite({ x: 274, y: 181, w: 72, h: 87, image: "raposa" });
  const esconderijo2 = SZGame2D.createSprite({ x: 229.5, y: 137, w: 161, h: 144, image: "pedras" });
  SZGame2D.addToGroup(esconderijos, esconderijo2);
  const bicho3 = SZGame2D.createSprite({ x: 447, y: 181, w: 72, h: 87, image: "coruja" });
  const esconderijo3 = SZGame2D.createSprite({ x: 402.5, y: 137, w: 161, h: 144, image: "flores" });
  SZGame2D.addToGroup(esconderijos, esconderijo3);
  // Quando acontecer
  SZGame2D.onGroupClick(esconderijos, function (escolhido) {
    SZGame2D.setOpacity(escolhido, 0);
    achados = achados + 1;
  }, "<chave>");
  // Enquanto estiver rodando
  // O jogo roda 60 passos por segundo: cada volta desenha um "quadro" do filme.
  SZGame2D.gameLoop(function update() {
    SZGame2D.clear();
    SZGame2D.drawBackdrop(ctx, "jardim");
    SZGame2D.drawSprite(ctx, bicho1);
    SZGame2D.drawSprite(ctx, bicho2);
    SZGame2D.drawSprite(ctx, bicho3);
    SZGame2D.drawGroup(ctx, esconderijos);
    SZGame2D.drawScore(ctx, "Achados:", achados, 18, 34, "#173844", 24);
    if (achados >= 3) {
      SZGame2D.drawLabel(ctx, "Você achou todo mundo!", 174, 72, "#173844", 27, "left");
    }
  }, "<chave>");
}, "<chave>");
