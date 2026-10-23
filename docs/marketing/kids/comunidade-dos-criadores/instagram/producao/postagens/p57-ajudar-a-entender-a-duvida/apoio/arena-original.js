SZGameKit.runProject(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGameKit.restartGame());
  // Meus moldes
  SZGameKit.defineLook("goblin", (ctx) => {
    ctx.fillStyle = "#e94f4f";
    ctx.fillRect(0, 0, 40, 40);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(26, 12, 6, 6);
  }, 40, 40);
  SZGameKit.defineMold("goblin", { w: 40, h: 40, health: 20, speed: 120, damage: 10, color: "#e94f4f", image: "", look: "goblin" });
  SZGameKit.defineEffect("poeira", { count: 14, color: "#caa977", size: 4, life: 0.5, speed: 180, gravity: 260 });
  // Ao iniciar
  SZGameKit.setup({ width: 960, height: 540, background: "#12203a", accent: "#4a9eff" });
  SZGameKit.setScreenText("menu", "Arena dos Goblins", "WASD anda - J golpeia - derrote 10!", "Entrar na arena");
  SZGameKit.setMission(60, 10);
  const heroi = SZGameKit.createCharacter({ image: "", w: 48, h: 48, speed: 300, color: "#4a9eff" });
  SZGameKit.resetCharacter(heroi);
  SZGameKit.startSpawner("goblin", 1.2);
  // Quando acontecer
  SZGameKit.on("inimigo:morreu", () => {
    SZGameKit.missionKill();
    SZGameKit.playEffect("explosion");
  });
  // Enquanto estiver rodando
  SZGameKit.onUpdate((dt) => {
    SZGameKit.moveWithKeys(heroi, dt);
    SZGameKit.keepOnScreen(heroi);
    SZGameKit.forEachActive("goblin", (item) => {
      SZGameKit.seek(item, heroi, dt);
      SZGameKit.face(item, heroi);
      if (SZGameKit.keyPressed("j") && SZGameKit.touchCircle(heroi, item)) {
        SZGameKit.hurt(item, 10, 0.2);
        SZGameKit.knockback(item, heroi, 300);
        SZGameKit.playEffect("hit");
      }
      if (SZGameKit.isDead(item)) {
        SZGameKit.burst("poeira", SZGameKit.charX(item), SZGameKit.charY(item));
        SZGameKit.recycle(item);
        SZGameKit.emit("inimigo:morreu");
      }
      if (SZGameKit.touchCircle(item, heroi) && !SZGameKit.isInvincible(heroi)) {
        SZGameKit.hurt(heroi, 10, 1);
        SZGameKit.knockback(heroi, item, 400);
        SZGameKit.playEffect("hurt");
      }
    });
    SZGameKit.cullOffscreen("goblin", 200);
    if (SZGameKit.isDead(heroi)) {
      SZGameKit.endGame();
    }
  });
  SZGameKit.onDraw((ctx) => {
    SZGameKit.drawBackground("#0f3460", true);
    SZGameKit.drawActive("goblin");
    SZGameKit.drawCharacter(heroi);
    SZGameKit.drawEffects();
    SZGameKit.drawHealthBar(heroi, 0);
    SZGameKit.drawTimer(20, 40);
  });
});
SZGameKit.start();
