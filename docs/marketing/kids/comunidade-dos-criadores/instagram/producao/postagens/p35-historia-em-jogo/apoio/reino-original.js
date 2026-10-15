SZGameKit.runProject(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGameKit.restartGame());
  // Ao iniciar
  SZGameKit.setup({ width: 960, height: 640, background: "#1c2b1c", accent: "#ffd166" });
  SZGameKit.setScreenText("menu", "Reino Aberto", "Setas ou WASD andam - espaço conversa - explore os 4 cantos do reino!", "Explorar");
  const heroi = SZGameKit.createCharacter({ image: "", w: 48, h: 48, speed: 320, color: "#4a9eff" });
  SZGameKit.rpgSetStartMap("campo");
  SZGameKit.rpgCreateMap("campo", 15, 10, (ctx) => {
    SZGameKit.drawBackground("#2d5a2d", true);
  }, true);
  SZGameKit.rpgCreateMap("praia", 15, 10, (ctx) => {
    SZGameKit.drawBackground("#2b4a63", true);
  }, true);
  SZGameKit.rpgCreateMap("bosque", 15, 10, (ctx) => {
    SZGameKit.drawBackground("#173317", true);
  }, true);
  SZGameKit.rpgCreateMap("vila", 30, 20, (ctx) => {
    SZGameKit.drawBackground("#4a3c2b", true);
  }, true);
  SZGameKit.cameraFollow(heroi, 960, 640);
  // Quando acontecer
  SZGameKit.rpgOnEnterMap("campo", () => {
    SZGameKit.rpgConnectEdge("leste", "praia");
    SZGameKit.rpgConnectEdge("sul", "bosque");
    SZGameKit.rpgBlockCell(5, 4);
    SZGameKit.rpgBlockCell(6, 4);
    SZGameKit.rpgBlockCell(9, 6);
    SZGameKit.placeCharacter(heroi, SZGameKit.rpgCell(2), SZGameKit.rpgCell(2));
  });
  SZGameKit.rpgOnEnterMap("praia", () => {
    SZGameKit.rpgConnectEdge("oeste", "campo");
    SZGameKit.rpgConnectEdge("sul", "vila");
    SZGameKit.rpgCreateNpc("pescador", 7, 3, "", "");
  });
  SZGameKit.rpgOnEnterMap("bosque", () => {
    SZGameKit.rpgConnectEdge("norte", "campo");
    SZGameKit.rpgConnectEdge("leste", "vila");
    SZGameKit.rpgBlockCell(4, 4);
    SZGameKit.rpgBlockCell(4, 5);
    SZGameKit.rpgBlockCell(10, 3);
  });
  SZGameKit.rpgOnEnterMap("vila", () => {
    SZGameKit.rpgConnectEdge("norte", "praia");
    SZGameKit.rpgConnectEdge("oeste", "bosque");
    SZGameKit.rpgCreateNpc("prefeita", 20, 12, "", "");
  });
  SZGameKit.rpgOnTalk("pescador", () => {
    SZGameKit.rpgSay("O mar termina aqui, mas o reino continua pro sul!", "Pescador");
  });
  SZGameKit.rpgOnTalk("prefeita", () => {
    SZGameKit.rpgSay("Bem-vindo à vila GRANDE — repare a câmera te seguindo!", "Prefeita");
  });
  // Enquanto estiver rodando
  SZGameKit.onUpdate((dt) => {
    SZGameKit.rpgMoveGrid(heroi, 64, dt);
  });
  SZGameKit.onDraw((ctx) => {
    SZGameKit.rpgDrawNpcs();
    SZGameKit.drawCharacter(heroi);
  });
  SZGameKit.onDrawHud((ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.font = "22px sans-serif";
    ctx.fillText("Mapa: " + SZGameKit.rpgCurrentMap(), 20, 36);
  });
});
SZGameKit.start();
