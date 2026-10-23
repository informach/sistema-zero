SZGameKit.runProject(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGameKit.restartGame());
  // Ao iniciar
  SZGameKit.setup({ width: 800, height: 600, background: "#191426", accent: "#c084fc" });
  SZGameKit.setScreenText("menu", "Duelo de Cartas", "Clique numa carta da mao para joga-la (custa 1 energia): 🗡️ ataca, 🛡️ defende. Aperte espaco para passar o turno!", "Jogar");
  SZGameKit.setScreenText("vitoria", "Voce venceu o duelo!", "Que estrategista!", "Jogar de novo");
  SZGameKit.setScreenText("fim", "Voce perdeu...", "Tente outra estrategia!", "Jogar de novo");
  let baralho = [];
  let mao = [];
  let descarte = [];
  baralho = [SZGameKit.card("🗡️", "🗡️"), SZGameKit.card("🗡️", "🗡️"), SZGameKit.card("🗡️", "🗡️"), SZGameKit.card("🗡️", "🗡️"), SZGameKit.card("🛡️", "🛡️"), SZGameKit.card("🛡️", "🛡️"), SZGameKit.card("🛡️", "🛡️")];
  baralho = ((__szLista) => { for (let __szI = __szLista.length - 1; __szI > 0; __szI--) { const __szJ = Math.floor(Math.random() * (__szI + 1)); [__szLista[__szI], __szLista[__szJ]] = [__szLista[__szJ], __szLista[__szI]]; } return __szLista; })([...baralho]);
  mao = [];
  descarte = [];
  SZGameKit.cardsStart(30, 40);
  SZGameKit.cardsEnergyPerTurn(2);
  SZGameKit.cardsEnemyIntent("atacar", 7);
  // Quando acontecer
  SZGameKit.cardsOnTurn(() => {
    for (let i_2 = 0, limite = 3; i_2 < limite; i_2++) {
      if (SZGameKit.pileSize(baralho) === 0) {
        SZGameKit.pileShuffleFrom(baralho, descarte);
      }
      SZGameKit.pileMoveTop(baralho, mao);
    }
  });
  SZGameKit.cardsOnEnemyTurn(() => {
    if (SZGameKit.cardsIntentAction() === "atacar") {
      SZGameKit.cardsHurtMe(SZGameKit.cardsIntentValue());
    }
    SZGameKit.cardsEnemyIntent("atacar", 5 + SZGameKit.rollDice(4));
  });
  SZGameKit.onGameClick((px, py) => {
    const i = SZGameKit.cardAt(SZGameKit.mouseScreenX(), SZGameKit.mouseScreenY(), mao);
    if (i >= 0) {
      if (SZGameKit.cardsEnergy() >= 1) {
        SZGameKit.cardsSpend(1);
        if (SZGameKit.cardFace(mao[i]) === "🗡️") {
          SZGameKit.cardsHurtEnemy(6);
        } else {
          SZGameKit.cardsGainBlock(5);
        }
        descarte.push(mao[i]);
        mao.splice(i, 1);
        if (SZGameKit.cardsEnemyLife() <= 0) {
          SZGameKit.setState("vitoria");
        }
      }
    }
  });
  // Enquanto estiver rodando
  SZGameKit.onUpdate((dt) => {
    if (SZGameKit.keyPressed(" ")) {
      SZGameKit.cardsEndTurn();
      if (SZGameKit.cardsHeroLife() <= 0) {
        SZGameKit.endGame();
      }
    }
  });
  SZGameKit.onDraw((ctx) => {
    SZGameKit.drawBackground("#191426", true);
  });
  SZGameKit.onDrawHud((ctx) => {
    SZGameKit.cardsDrawHud();
    SZGameKit.handDraw(mao, 120, 440, false);
  });
});
SZGameKit.start();
