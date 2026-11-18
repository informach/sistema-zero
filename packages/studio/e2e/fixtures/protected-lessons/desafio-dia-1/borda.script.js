// Gerado pelo Sistema Zero Studio

SZGame2D.onStart(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGame2D.restart());
  // Ao iniciar
  SZGame2D.setupStage(480, 360, "#94d5f5");
  const personagem = SZGame2D.createSprite({ x: 21, y: 141, w: 64, h: 64, image: "aventureiro" });
  const chave = SZGame2D.createSprite({ x: 211, y: 53, w: 32, h: 32, image: "chave-dourada" });
  const farol = SZGame2D.createSprite({ x: 328, y: 40, w: 152, h: 152, image: "farol-listrado-apagado" });
  const barco = SZGame2D.createSprite({ x: 492, y: 240, w: 88, h: 88, image: "veleiro" });
  barco.vx = -1.5; barco.vy = 0;
  const fundoAviso = SZGame2D.createSprite({ x: 8, y: 8, w: 464, h: 28, color: "#143d35" });
  let aviso = "Encontre a chave e vá ao farol.";
  let ganhou = false;
  SZGame2D.enableClassicControls("directions");
  // Quando acontecer
  // Enquanto estiver rodando
  // O jogo roda 60 passos por segundo: cada volta desenha um "quadro" do filme.
  SZGame2D.gameLoop(function update() {
    SZGame2D.clear();
    SZGame2D.drawBackdrop(ctx, "praia-tropical");
    SZGame2D.topDown(personagem, 3);
    SZGame2D.clampToScreen(personagem, ctx);
    if (ganhou) {
      if (SZGame2D.spriteX(barco) > 387) {
        SZGame2D.applyVelocity(barco);
      }
    }
    SZGame2D.drawSprite(ctx, chave);
    SZGame2D.drawSprite(ctx, farol);
    SZGame2D.drawSprite(ctx, barco);
    SZGame2D.drawSprite(ctx, personagem);
    SZGame2D.drawSprite(ctx, fundoAviso);
    SZGame2D.drawLabel(ctx, aviso, 20, 28, "#ffffff", 16, "left");
  }, "<chave>");
}, "<chave>");
