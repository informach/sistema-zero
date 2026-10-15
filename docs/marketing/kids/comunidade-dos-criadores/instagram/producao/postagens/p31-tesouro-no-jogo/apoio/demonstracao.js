SZWorld3D.runProject(function __szProjectRun() {
  // Ao iniciar
  SZWorld3D.setup({ style: "floresta", world: 180 });
  SZWorld3D.terrain(4, 6);
  SZWorld3D.water(-8, "#2b6cb0");
  SZWorld3D.grass("media");
  SZWorld3D.dayNight(4);
  SZWorld3D.clearArea(0, 0, 40);
  SZWorld3D.scatter(280, "arvores");
  SZWorld3D.scatter(90, "pedras");
  SZWorld3D.scatter(160, "flores");
  SZWorld3D.scatter(40, "cogumelos");
  SZWorld3D.car({ style: "passeio", color: "#ef4444" });
  SZWorld3D.carBoost(1.5);
  SZWorld3D.engineSound("desligado");
  SZWorld3D.totemText(0, 14, "Meu Mundo", "Dirija com WASD, turbo no Shift. Ache o ponto secreto!");
  SZWorld3D.point("segredo", 35, -35);
  SZWorld3D.zone("laguinho", -40, 30, 12);
  // Quando acontecer
  SZWorld3D.onPoint("segredo", () => {
    SZWorld3D.say("Você achou o tesouro escondido!", 3);
    SZWorld3D.cameraShake(0.6, 0.4);
  });
  SZWorld3D.onZone("laguinho", () => {
    SZWorld3D.hud("Cuidado com a agua!", "baixo-esquerda");
  });
  SZWorld3D.onCrash(() => {
    SZWorld3D.cameraShake(0.5, 0.3);
  });
  // Enquanto estiver rodando
  SZWorld3D.onUpdate((dt) => {
    SZWorld3D.hud("Velocidade: " + Math.round(SZWorld3D.carSpeed()), "topo-direita");
  });
});
SZWorld3D.start();
