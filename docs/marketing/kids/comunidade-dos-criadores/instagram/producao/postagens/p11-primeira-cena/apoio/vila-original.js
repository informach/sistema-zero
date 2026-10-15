SZGameKit.runProject(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGameKit.restartGame());
  // Meus moldes
  SZGameKit.defineLook("ferreiro", (ctx) => {
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(12, 24, 40, 40);
    ctx.fillStyle = "#f3c78a";
    ctx.fillRect(20, 8, 24, 20);
  }, 64, 64);
  SZGameKit.defineLook("dragao", (ctx) => {
    ctx.fillStyle = "#2f9e44";
    ctx.fillRect(8, 16, 48, 40);
    ctx.fillStyle = "#b2f2bb";
    ctx.fillRect(16, 24, 10, 10);
    ctx.fillStyle = "#e03131";
    ctx.fillRect(40, 24, 8, 8);
  }, 64, 64);
  // Ao iniciar
  SZGameKit.setup({ width: 960, height: 640, background: "#1c1330", accent: "#fbbf24" });
  SZGameKit.setScreenText("menu", "Vila do Dragão", "Setas andam - espaço conversa - derrote o dragão!", "Começar a aventura");
  SZGameKit.setScreenText("vitoria", "Vila salva!", "O dragão foi derrotado. Você é uma lenda!", "");
  SZGameKit.rpgBattleStats(30, 8, 2);
  SZGameKit.rpgSetSpecial("Espada flamejante", 18, 4);
  const heroi = SZGameKit.createCharacter({ image: "", w: 64, h: 64, speed: 260, color: "#4a9eff" });
  SZGameKit.rpgSetStartMap("vila");
  SZGameKit.rpgCreateMap("vila", 15, 10, (ctx) => {
    SZGameKit.drawBackground("#5c7f45", false);
    ctx.fillStyle = "#d8c28f";
    ctx.fillRect(0, 128, 960, 128);
    ctx.fillRect(512, 128, 128, 320);
    ctx.fillStyle = "#7f3f2b";
    ctx.fillRect(64, 32, 160, 96);
    ctx.fillStyle = "#30343b";
    ctx.fillRect(320, 64, 64, 128);
    ctx.fillStyle = "#3c2f2f";
    ctx.fillRect(560, 384, 96, 64);
    if (SZGameKit.rpgHasItem("chave")) {
      ctx.fillStyle = "#f3c969";
      ctx.fillRect(584, 396, 48, 52);
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "24px sans-serif";
    ctx.fillText("VILA DO DRAGÃO", 24, 34);
    ctx.font = "18px sans-serif";
    ctx.fillText("FERRARIA", 304, 56);
    ctx.fillText("Ferreiro", 430, 190);
    ctx.fillText("PORTA DA CAVERNA", 564, 478);
  }, true);
  SZGameKit.rpgCreateMap("caverna", 12, 8, (ctx) => {
    SZGameKit.drawBackground("#17131f", false);
    ctx.fillStyle = "#31283d";
    ctx.fillRect(0, 0, 768, 64);
    ctx.fillRect(0, 448, 768, 64);
    ctx.fillStyle = "#8f3b24";
    ctx.fillRect(256, 384, 256, 32);
    ctx.fillStyle = "#7a263a";
    ctx.fillRect(480, 96, 112, 112);
    ctx.fillStyle = "#ffffff";
    ctx.font = "24px sans-serif";
    ctx.fillText("CAVERNA DO DRAGÃO", 24, 34);
    ctx.font = "18px sans-serif";
    ctx.fillText("SAÍDA", 8, 310);
    ctx.fillText("Dragão", 496, 88);
  }, true);
  // Quando acontecer
  SZGameKit.rpgOnEnterMap("vila", () => {
    SZGameKit.placeCharacter(heroi, SZGameKit.rpgCell(2), SZGameKit.rpgCell(2));
    SZGameKit.rpgBlockCell(5, 1);
    SZGameKit.rpgBlockCell(5, 2);
    SZGameKit.rpgCreateNpc("ferreiro", 7, 3, "", "ferreiro");
    if (!SZGameKit.rpgHasFlag("intro")) {
      SZGameKit.rpgCutscene(() => {
        SZGameKit.rpgNpcWalkTo("ferreiro", 3, 2);
        SZGameKit.rpgFace("ferreiro", "left");
        SZGameKit.rpgSay("Ei, viajante! A vila do dragao precisa de voce.", "Ferreiro");
        SZGameKit.rpgSay("O dragão roubou o ouro. Tome a chave e entre na caverna ao sul!", "Ferreiro");
        SZGameKit.rpgAddFlag("missao-pronta");
        SZGameKit.rpgGivePotion("Poção", 20);
      });
      SZGameKit.rpgAddFlag("intro");
    }
    if (SZGameKit.rpgHasItem("chave")) {
      SZGameKit.rpgCreateDoor(9, 6, "caverna");
    }
  });
  SZGameKit.rpgOnEnterMap("caverna", () => {
    SZGameKit.placeCharacter(heroi, SZGameKit.rpgCell(1), SZGameKit.rpgCell(5));
    SZGameKit.rpgCreateNpc("dragao", 8, 2, "", "dragao");
    SZGameKit.rpgCreateDoor(0, 5, "vila");
    SZGameKit.rpgOnStep(4, 5, () => {
      SZGameKit.rpgSay("Cheiro de enxofre... o dragao esta perto!", "");
    });
  });
  SZGameKit.rpgOnTalk("ferreiro", () => {
    if (SZGameKit.rpgHasFlag("aceitou-missao")) {
      SZGameKit.rpgSay("A caverna fica no canto de baixo. Boa sorte!", "Ferreiro");
    } else {
      SZGameKit.rpgSay("O dragão roubou o ouro da vila!", "Ferreiro");
      SZGameKit.rpgSay("Tome a chave da caverna e esta poção. Só você pode nos salvar!", "Ferreiro");
      SZGameKit.rpgGiveItem("chave", "");
      SZGameKit.rpgGivePotion("Poção", 20);
      SZGameKit.rpgAddFlag("aceitou-missao");
      SZGameKit.rpgCreateDoor(9, 6, "caverna");
    }
  });
  SZGameKit.rpgOnTalk("dragao", () => {
    SZGameKit.rpgBattleStart("Dragão", 40, 6, 3);
  });
  SZGameKit.rpgOnBattleEnd(() => {
    if (SZGameKit.rpgBattleWon()) {
      SZGameKit.rpgBattleReward(25);
      SZGameKit.setState("vitoria");
    } else {
      SZGameKit.endGame();
    }
  });
  // Enquanto estiver rodando
  SZGameKit.onUpdate((dt) => {
    if (SZGameKit.rpgHasFlag("missao-pronta") && !SZGameKit.rpgHasItem("chave")) {
      SZGameKit.rpgGiveItem("chave", "");
      SZGameKit.rpgAddFlag("aceitou-missao");
      SZGameKit.rpgCreateDoor(9, 6, "caverna");
    }
    SZGameKit.rpgMoveGrid(heroi, 64, dt);
  });
  SZGameKit.onDraw((ctx) => {
    SZGameKit.rpgDrawNpcs();
    SZGameKit.drawCharacter(heroi);
  });
  SZGameKit.onDrawHud((ctx) => {
    ctx.fillStyle = "#161923";
    ctx.fillRect(14, 500, 610, 124);
    ctx.fillStyle = "#ffffff";
    ctx.font = "19px sans-serif";
    if (SZGameKit.rpgCurrentMap() === "vila") {
      if (SZGameKit.rpgHasFlag("aceitou-missao")) {
        ctx.fillText("Objetivo: entre na caverna", 32, 536);
        ctx.fillText("Siga o caminho até a porta no canto inferior direito.", 32, 566);
      } else {
        ctx.fillText("Objetivo: ouça o Ferreiro", 32, 536);
        ctx.fillText("Ele está vindo falar com você.", 32, 566);
      }
    } else {
      ctx.fillText("Objetivo: enfrente o Dragão", 32, 536);
      ctx.fillText("ESPAÇO: enfrentar o Dragão", 32, 566);
    }
    ctx.fillText("Mover: setas/WASD  •  Interagir: ESPAÇO", 32, 602);
    SZGameKit.rpgDrawInventory(650, 540);
  });
});
SZGameKit.start();
