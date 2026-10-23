SZGameKit.runProject(function __szProjectRun() {
  const __szProjectRunContext = window.__SZProjectLifecycle.begin(() => SZGameKit.restartGame());
  // Ao iniciar
  SZGameKit.setup({ width: 720, height: 560, background: "#2a1a3a", accent: "#ffd166" });
  SZGameKit.setScreenText("menu", "Jogo da Memoria", "Clique nas cartas para virar e ache todos os pares iguais!", "Jogar");
  SZGameKit.setScreenText("vitoria", "Voce achou todos os pares!", "Muito bem!", "Jogar de novo");
  let cartas = [];
  let primeira = 0 - 1;
  let segunda = 0 - 1;
  let pares = 0;
  cartas = [SZGameKit.card("🍎", "?"), SZGameKit.card("🍎", "?"), SZGameKit.card("🍌", "?"), SZGameKit.card("🍌", "?"), SZGameKit.card("🍇", "?"), SZGameKit.card("🍇", "?")];
  cartas = ((__szLista) => { for (let __szI = __szLista.length - 1; __szI > 0; __szI--) { const __szJ = Math.floor(Math.random() * (__szI + 1)); [__szLista[__szI], __szLista[__szJ]] = [__szLista[__szJ], __szLista[__szI]]; } return __szLista; })([...cartas]);
  primeira = 0 - 1;
  segunda = 0 - 1;
  pares = 0;
  // Quando acontecer
  SZGameKit.onGameClick((px, py) => {
    const i = SZGameKit.cardAt(px, py, cartas);
    if (i >= 0) {
      if (SZGameKit.cardIsUp(cartas[i]) === false) {
        SZGameKit.cardFlip(cartas[i]);
        if (primeira === 0 - 1) {
          primeira = i;
        } else {
          segunda = i;
          if (SZGameKit.cardFace(cartas[primeira]) === SZGameKit.cardFace(cartas[segunda])) {
            pares = pares + 1;
            primeira = 0 - 1;
            if (pares === 3) {
              SZGameKit.setState("vitoria");
            }
          } else {
            SZGameKit.waitThen(0.7, () => {
              SZGameKit.cardFlip(cartas[primeira]);
              SZGameKit.cardFlip(cartas[segunda]);
              primeira = 0 - 1;
            });
          }
        }
      }
    }
  });
  // Enquanto estiver rodando
  SZGameKit.onDraw((ctx) => {
    SZGameKit.drawBackground("#2a1a3a", true);
    SZGameKit.handDraw(cartas, 90, 220, false);
  });
});
SZGameKit.start();
