SZGame2D.onStart(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGame2D.restart());
  // Meus moldes
  SZGame2D.defineShape("brasinha", (ctx) => {
    SZGame2D.paintTriangle(ctx, 16, 26, 34, 58, 6, 62, "#ff5d3d");
    SZGame2D.paintCircle(ctx, 62, 52, 30, "#ff8c42");
    SZGame2D.paintEllipse(ctx, 46, 56, 34, 24, "#ffd166");
    SZGame2D.paintCircle(ctx, 76, 40, 5, "#1c2030");
    SZGame2D.paintRect(ctx, 48, 80, 12, 10, "#e07030");
    SZGame2D.paintRect(ctx, 70, 80, 12, 10, "#e07030");
  });
  SZGame2D.defineShape("folhito", (ctx) => {
    SZGame2D.paintTriangle(ctx, 55, 4, 40, 30, 70, 30, "#2f8f46");
    SZGame2D.paintCircle(ctx, 55, 56, 28, "#58b368");
    SZGame2D.paintCircle(ctx, 42, 48, 5, "#1c2030");
    SZGame2D.paintRect(ctx, 40, 78, 12, 10, "#3e9d52");
    SZGame2D.paintRect(ctx, 60, 78, 12, 10, "#3e9d52");
  });
  // Ao iniciar
  SZGame2D.setupStage(480, 300, "#28325a");
  SZGame2D.setStageDescription("Escolha o golpe com as teclas 1, 2 e 3: a Faísca de fogo tira o dobro do monstrinho de planta e a Poção cura. Vença antes que a sua vida acabe!");
  SZGame2D.fitScreen(100);
  const meu = SZGame2D.createShapeSprite("brasinha", { x: 60, y: 140, w: 110, h: 90 });
  const rival = SZGame2D.createShapeSprite("folhito", { x: 310, y: 44, w: 110, h: 90 });
  SZGame2D.setHealth(meu, 20);
  SZGame2D.setHealth(rival, 20);
  let turno = "espera";
  let forca = 5;
  let dano = 0;
  let pocoes = 3;
  let aberturaPronta = 0;
  let mensagem = "Os monstrinhos se encaram!";
  SZGame2D.setScene("inicio");window.__battleState=()=>({hp:SZGame2D.getHealth(rival),ownHp:SZGame2D.getHealth(meu),turno,forca,dano,mensagem,victory:SZGame2D.sceneIs("vitoria")});
  // Quando acontecer
  SZGame2D.onKey("Enter", () => {
    if (SZGame2D.sceneIs("inicio")) {
      SZGame2D.setScene("jogando");
    }
    if (SZGame2D.sceneIs("vitoria")) {
      SZGame2D.restart();
    }
    if (SZGame2D.sceneIs("derrota")) {
      SZGame2D.restart();
    }
  }, "eventoDeTecla");
  document.addEventListener("keydown", (event) => __szProjectRunContext.run(() => {
    if (SZGame2D.sceneIs("jogando")) {
      if (turno == "jogador") {
        if (event.key == "1") {
          dano = forca * 2;
          SZGame2D.changeHealth(rival, 0 - dano);
          SZGame2D.blink(rival, 24);
          SZGame2D.shake(ctx, 6);
          SZGame2D.playFx("explosion");
          mensagem = "Faísca! Fogo contra planta tira o dobro: " + dano + " de dano";
          turno = "inimigo";
        }
        if (event.key == "2") {
          dano = forca * 1;
          SZGame2D.changeHealth(rival, 0 - dano);
          SZGame2D.blink(rival, 24);
          SZGame2D.playFx("hit");
          mensagem = "Jato de água! Dano normal: " + dano;
          turno = "inimigo";
        }
        if (event.key == "3") {
          if (pocoes > 0) {
            pocoes = pocoes - 1;
            SZGame2D.changeHealth(meu, 5);
            SZGame2D.playFx("heal");
            mensagem = "Poção! Brasinha curou até 5 de vida";
            turno = "inimigo";
          } else {
            mensagem = "As poções acabaram! Use a Faísca ou o Jato";
          }
        }
      }
    }
  }), { signal: __szProjectRunContext.signal });
  // Enquanto estiver rodando
  // O jogo roda 60 passos por segundo: cada volta desenha um "quadro" do filme.
  SZGame2D.gameLoop(function update() {
    SZGame2D.clear();
    if (SZGame2D.sceneIs("inicio")) {
      SZGame2D.showScreen(ctx, "Batalha de Monstrinhos", "Brasinha, o monstrinho de fogo, desafia Folhito, o monstrinho de planta!", "Aperte Enter para batalhar", "#233457");
    }
    if (SZGame2D.sceneIs("jogando")) {
      SZGame2D.drawSprite(ctx, meu);
      SZGame2D.drawSprite(ctx, rival);
      SZGame2D.drawLabel(ctx, "Brasinha (fogo)", 20, 122, "#ffd166", 14, "left");
      SZGame2D.drawBar(ctx, SZGame2D.getHealth(meu), SZGame2D.getMaxHealth(meu), 20, 130, 150, 12, "#3fbf6f");
      SZGame2D.drawLabel(ctx, "Folhito (planta)", 310, 22, "#9be48b", 14, "left");
      SZGame2D.drawBar(ctx, SZGame2D.getHealth(rival), SZGame2D.getMaxHealth(rival), 310, 30, 150, 12, "#3fbf6f");
      if (turno == "espera") {
        SZGame2D.drawLabel(ctx, "Os monstrinhos se preparam...", 20, 232, "#aab7d8", 13, "left");
      }
      if (turno == "jogador") {
        SZGame2D.drawLabel(ctx, "Sua vez! Escolha o golpe com as teclas:", 20, 232, "#ffe9a8", 13, "left");
      }
      if (turno == "inimigo") {
        SZGame2D.drawLabel(ctx, "Folhito prepara o golpe dele...", 20, 232, "#ffb4a8", 13, "left");
      }
      SZGame2D.drawScore(ctx, ">", mensagem, 20, 252, "#f3f6ff", 13);
      SZGame2D.drawLabel(ctx, "1 Faísca (fogo, dano x2 na planta)", 20, 272, "#ffd166", 13, "left");
      SZGame2D.drawLabel(ctx, "2 Jato (água, dano x1)", 20, 290, "#8fd0ff", 13, "left");
      SZGame2D.drawScore(ctx, "3 Poção (cura 5) x", pocoes, 200, 290, "#8fd0ff", 13);
      if (SZGame2D.healthDepleted(rival)) {
        SZGame2D.playFx("win");
        SZGame2D.setScene("vitoria");
      }
      if (SZGame2D.healthDepleted(meu)) {
        SZGame2D.playFx("gameover");
        SZGame2D.setScene("derrota");
      }
    }
    if (SZGame2D.sceneIs("vitoria")) {
      SZGame2D.showScreen(ctx, "Você venceu!", "Folhito não aguentou a Faísca em dobro. Fogo é forte contra planta!", "Aperte Enter para batalhar de novo", "#1d4d33");
    }
    if (SZGame2D.sceneIs("derrota")) {
      SZGame2D.showScreen(ctx, "Você perdeu!", "Brasinha ficou sem vida. Use a Poção na hora certa e tente de novo!", "Aperte Enter para batalhar de novo", "#5a2a2a");
    }
  }, "quadroDoJogo");
  SZGame2D.gameLoop(function __szPeriodicLoop() {
    if (SZGame2D.afterSeconds("abertura-da-batalha", 2)) {
      aberturaPronta = 1;
    }
  });
  SZGame2D.gameLoop(function __szPeriodicLoop() {
    if (SZGame2D.everySeconds("liberar-comandos", 0.5)) {
      if (SZGame2D.sceneIs("jogando")) {
        if (aberturaPronta == 1) {
          if (turno == "espera") {
            turno = "jogador";
            mensagem = "Sua vez! Aperte 1, 2 ou 3";
          }
        }
      }
    }
  });
  SZGame2D.gameLoop(function __szPeriodicLoop() {
    if (SZGame2D.everySeconds("vez-do-folhito", 1.5)) {
      if (SZGame2D.sceneIs("jogando")) {
        if (turno == "inimigo") {
          if (SZGame2D.randomChance(60)) {
            SZGame2D.changeHealth(meu, -3);
            mensagem = "Chicote de Cipó! Brasinha perdeu 3 de vida";
          } else {
            dano = SZGame2D.randomBetween(2, 5);
            SZGame2D.changeHealth(meu, 0 - dano);
            mensagem = "Folha Afiada! Brasinha perdeu " + dano + " de vida";
          }
          SZGame2D.blink(meu, 24);
          SZGame2D.shake(ctx, 5);
          SZGame2D.playFx("hurt");
          turno = "jogador";
        }
      }
    }
  });
}, "__sz-project");
