SZWorld3D.runProject(function __szProjectRun() {
  // Ao iniciar
  SZWorld3D.setup({ style: "deserto", world: 220 });
  SZWorld3D.terrain(5, 7);
  SZWorld3D.setTime("entardecer");
  SZWorld3D.grass("pouca");
  SZWorld3D.clearArea(0, 0, 30);
  SZWorld3D.path(0, 0, 60, 40, 8);
  SZWorld3D.path(60, 40, 20, -60, 8);
  SZWorld3D.path(20, -60, 0, 0, 8);
  SZWorld3D.scatter(120, "cactos");
  SZWorld3D.scatter(60, "pedras");
  SZWorld3D.car({ style: "corrida", color: "#f59e0b" });
  SZWorld3D.carBoost(2);
  SZWorld3D.engineSound("desligado");
  SZWorld3D.totemText(0, 8, "Corrida do Pôr do Sol", "Passe pelos checkpoints na ordem e feche a volta!");
  SZWorld3D.raceCreate(0, 0, 0, 2);
  SZWorld3D.raceCheckpoint(60, 40, 0);
  SZWorld3D.raceCheckpoint(40, 0, 90);
  SZWorld3D.raceCheckpoint(20, -60, 0);
  SZWorld3D.raceCheckpoint(-20, -20, 45);
  SZWorld3D.raceCheckpoint(-10, 30, 90);
  // Quando acontecer
  SZWorld3D.raceOnStart(() => {
    SZWorld3D.say("Valendo!", 2);
  });
  SZWorld3D.raceOnFinish(() => {
    SZWorld3D.say("Chegou! Tempo: " + Math.round(SZWorld3D.raceTime()) + "s", 4);
    SZWorld3D.cameraShake(0.7, 0.5);
  });
  // Enquanto estiver rodando
  SZWorld3D.onUpdate((dt) => {
    SZWorld3D.hud("Recorde: " + Math.round(SZWorld3D.raceBest()) + "s", "baixo-direita");
  });
});
SZWorld3D.start();
