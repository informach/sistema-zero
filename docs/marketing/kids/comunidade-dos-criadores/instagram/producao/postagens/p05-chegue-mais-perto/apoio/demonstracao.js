SZWorld3D.runProject(function __szProjectRun() {
  // Ao iniciar
  SZWorld3D.setup({ style: "primavera", world: 200 });
  SZWorld3D.city(0, 0, "media", "dia");
  SZWorld3D.traffic(6, "semaforos");
  SZWorld3D.car({ style: "passeio", color: "#3b82f6" });
  SZWorld3D.person("#f59e0b", "bone");
  SZWorld3D.door(31, -6, 270, "Padaria", "Cheiro de pão quentinho! A padeira acorda cedinho para assar o pão da vila inteira.", "");
  SZWorld3D.door(-31, 6, 90, "Oficina", "Aqui a mecânica conserta os carrinhos da vila. Chaves, parafusos e muita engenhoca!", "");
  SZWorld3D.npc("Guia", 4, 6, "#22c55e", "coroa");
  SZWorld3D.npcWander("Guia", 4);
  SZWorld3D.quest("conhecer", "Converse com a Guia da vila");
  SZWorld3D.coinsRing(10, 0, 0, 12);
  SZWorld3D.minimap("teleporte");
  SZWorld3D.hud("Aperte E nas portas e converse com a Guia!", "baixo-esquerda");
  // Quando acontecer
  SZWorld3D.npcTalk("Guia", () => {
    SZWorld3D.npcSay("Guia", "Bem-vindo à Vila das Vocações!");
    SZWorld3D.npcAsk("Guia", "O que você quer ser quando crescer?", "Padeiro", () => {
      SZWorld3D.npcSay("Guia", "A padaria fica na entrada leste. Vá conhecer!");
      SZWorld3D.questDone("conhecer");
    }, "Mecânico", () => {
      SZWorld3D.npcSay("Guia", "A oficina fica na entrada oeste. Boa visita!");
      SZWorld3D.questDone("conhecer");
    });
  });
  SZWorld3D.onQuestDone("conhecer", () => {
    SZWorld3D.confetti();
    SZWorld3D.achievement("Cidadão da Vila");
  });
  // Enquanto estiver rodando
});
SZWorld3D.start();
