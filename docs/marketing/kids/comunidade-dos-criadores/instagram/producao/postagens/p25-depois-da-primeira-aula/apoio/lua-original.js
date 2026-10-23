SZWorld3D.runProject(function __szProjectRun() {
  // Ao iniciar
  SZWorld3D.setup({ style: "lua", world: 180 });
  SZWorld3D.person("#e8e8f0", "capacete");
  SZWorld3D.personAccessory("jetpack");
  SZWorld3D.rocket(8, -10);
  SZWorld3D.flag(0, -10, "#ef4444");
  SZWorld3D.crater(30, 30, 10);
  SZWorld3D.coinsRing(12, 30, 30, 8);
  SZWorld3D.quest("moedas", "Pegue 12 moedas na cratera");
  SZWorld3D.marker("estrela", 30, 30);
  SZWorld3D.guideArrow(30, 30, "ligada");
  SZWorld3D.totemText(0, 6, "Base da Lua", "Pulos flutuantes! Segure espaco com o jetpack para voar.");
  // Quando acontecer
  SZWorld3D.onCollect(() => {
    if (SZWorld3D.coinCount() >= 12) {
      SZWorld3D.questDone("moedas");
    }
  });
  SZWorld3D.onQuestDone("moedas", () => {
    SZWorld3D.fireworks();
    SZWorld3D.achievement("Astronauta");
  });
  // Enquanto estiver rodando
});
SZWorld3D.start();
