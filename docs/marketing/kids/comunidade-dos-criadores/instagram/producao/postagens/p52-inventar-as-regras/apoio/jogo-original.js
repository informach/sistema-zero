SZGameKit.runProject(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGameKit.restartGame());
  // Meus moldes
  SZGameKit.defineLook("fogoso", (ctx) => {
    ctx.fillStyle = "#e05a2b";
    ctx.beginPath();
    ctx.arc(20, 20, 18, 0, 6.28);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(12, 14, 5, 6);
    ctx.fillRect(23, 14, 5, 6);
  }, 40, 40);
  SZGameKit.defineLook("folhinha", (ctx) => {
    ctx.fillStyle = "#3f9d3f";
    ctx.beginPath();
    ctx.arc(20, 20, 18, 0, 6.28);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(12, 14, 5, 6);
    ctx.fillRect(23, 14, 5, 6);
  }, 40, 40);
  SZGameKit.defineLook("gotinha", (ctx) => {
    ctx.fillStyle = "#2b7de0";
    ctx.beginPath();
    ctx.arc(20, 20, 18, 0, 6.28);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(12, 14, 5, 6);
    ctx.fillRect(23, 14, 5, 6);
  }, 40, 40);
  SZGameKit.defineLook("fogozao", (ctx) => {
    ctx.fillStyle = "#b03010";
    ctx.beginPath();
    ctx.arc(24, 24, 23, 0, 6.28);
    ctx.fill();
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(20, 0, 8, 10);
  }, 48, 48);
  SZGameKit.defineLook("heroi", (ctx) => {
    ctx.fillStyle = "#2b6cb0";
    ctx.fillRect(6, 8, 28, 32);
    ctx.fillStyle = "#ffd9a0";
    ctx.fillRect(10, 12, 20, 12);
  }, 40, 48);
  SZGameKit.pkmCreature("Fogoso", "fogo", 30, 9, 4, 7, "", "fogoso");
  SZGameKit.pkmCreature("Folhinha", "planta", 34, 7, 6, 4, "", "folhinha");
  SZGameKit.pkmCreature("Gotinha", "agua", 32, 8, 5, 6, "", "gotinha");
  SZGameKit.pkmCreature("Fogozao", "fogo", 45, 13, 7, 8, "", "fogozao");
  SZGameKit.pkmMove("Brasa", "Fogoso", "fogo", 20, 90, "bola", "#ff8800");
  SZGameKit.pkmMove("Investida", "Fogoso", "normal", 12, 100, "investida", "#999999");
  SZGameKit.pkmMove("Chicote", "Folhinha", "planta", 18, 95, "onda", "#3f9d3f");
  SZGameKit.pkmMove("Jato", "Gotinha", "agua", 18, 95, "bola", "#2b7de0");
  SZGameKit.pkmMove("Labareda", "Fogozao", "fogo", 32, 75, "raio", "#ff4400");
  SZGameKit.pkmTypeChart("fogo", "planta", 2);
  SZGameKit.pkmTypeChart("planta", "agua", 2);
  SZGameKit.pkmTypeChart("agua", "fogo", 2);
  // Ao iniciar
  SZGameKit.setup({ width: 960, height: 540, background: "#2d5a2d", accent: "#e6398b" });
  SZGameKit.setScreenText("menu", "Bichinhos do Quintal", "Setas para andar - espaço para falar - pegue 3 bichinhos!", "Jogar");
  SZGameKit.setScreenText("vitoria", "Você conseguiu!", "Pegou 3 bichinhos do quintal!", "Jogar de novo");
  SZGameKit.pkmEvolve("Fogoso", "Fogozao", 8);
  SZGameKit.pkmCatchDifficulty("Gotinha", "difícil");
  SZGameKit.pkmEncounterRate(20);
  const heroi = SZGameKit.createCharacter({ image: "", w: 40, h: 48, speed: 200, color: "#2b6cb0" });
  SZGameKit.rpgSetStartMap("quintal");
  SZGameKit.rpgCreateMap("quintal", 15, 12, (ctx) => {
    SZGameKit.drawBackground("#2d5a2d", false);
  }, true);
  // Quando acontecer
  SZGameKit.rpgOnEnterMap("quintal", () => {
    SZGameKit.rpgCreateNpc("Cora", 3, 3, "", "heroi");
    SZGameKit.rpgCreateNpc("Enfermeira", 12, 3, "", "heroi");
    SZGameKit.pkmGrassCells(5, 6, 13, 10);
    SZGameKit.pkmWild("Folhinha", 3, 6);
    SZGameKit.pkmWild("Gotinha", 3, 6);
    SZGameKit.placeCharacter(heroi, 128, 128);
  });
  SZGameKit.rpgOnTalk("Cora", () => {
    if (SZGameKit.rpgHasFlag("ganhou-inicial")) {
      SZGameKit.rpgMenu("Quer mais bolas?", () => {
        SZGameKit.rpgOption("Sim", () => {
          SZGameKit.pkmGiveBall(3, 60);
        });
        SZGameKit.rpgOption("Não", () => {

        });
      });
    } else {
      SZGameKit.rpgSay("Leve o Fogoso e 5 bolas! Pegue 3 bichinhos no quintal!", "Cora");
      SZGameKit.pkmGive("Fogoso", 5);
      SZGameKit.pkmGiveBall(5, 60);
      SZGameKit.rpgAddFlag("ganhou-inicial");
    }
  });
  SZGameKit.rpgOnTalk("Enfermeira", () => {
    SZGameKit.rpgSay("Deixe comigo!", "Enfermeira");
    SZGameKit.pkmHealTeam();
  });
  SZGameKit.rpgOnBattleEnd(() => {
    if (SZGameKit.pkmCaught()) {
      if (SZGameKit.pkmTeamSize() >= 4) {
        SZGameKit.setState("vitoria");
      }
    }
  });
  // Enquanto estiver rodando
  SZGameKit.onUpdate((dt) => {
    SZGameKit.rpgMoveGrid(heroi, 64, dt);
  });
  SZGameKit.onDraw((ctx) => {
    ctx.fillStyle = "#4a8c4a";
    ctx.fillRect(320, 384, 576, 320);
    SZGameKit.drawByDepth(heroi);
  });
  SZGameKit.onDrawHud((ctx) => {
    SZGameKit.pkmDrawTeam(10, 10);
  });
});
SZGameKit.start();
