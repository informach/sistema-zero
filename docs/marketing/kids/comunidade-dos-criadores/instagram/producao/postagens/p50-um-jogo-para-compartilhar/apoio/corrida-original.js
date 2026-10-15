SZGame3D.runProject(function __szProjectRun() {
  // Ao iniciar
  const cena = SZGame3D.createFullscreenScene("#38bdf8");
  SZGame3D.setSky(cena, "#0ea5e9", "#fde68a");
  SZGame3D.setFog(cena, "#7dd3fc", 24, 70);
  SZGame3D.setCameraPosition(cena, 0, 3.4, 7);
  const chao = SZGame3D.createBlock(cena, { width: 9, height: 1, depth: 90, color: "#334155" });
  SZGame3D.setPosition(chao, 0, -1, -30);
  const faixaEsquerda = SZGame3D.createBlock(cena, { width: 0.12, height: 0.04, depth: 90, color: "#f8fafc" });
  SZGame3D.setPosition(faixaEsquerda, -1.1, -0.47, -30);
  const faixaDireita = SZGame3D.createBlock(cena, { width: 0.12, height: 0.04, depth: 90, color: "#f8fafc" });
  SZGame3D.setPosition(faixaDireita, 1.1, -0.47, -30);
  const heroi = SZGame3D.createBox(cena, { size: 1, color: "#34d399" });
  SZGame3D.setPosition(heroi, 0, 2, 0);
  const molde = SZGame3D.createBox(cena, { size: 1.1, color: "#f43f5e" });
  SZGame3D.setVisible(molde, "hide");
  const obstaculos = SZGame3D.createSwarm(cena);
  let pista = 0;
  let sorteio = 0;
  let velocidade = 0.14;
  let tempo = 0;
  let rodando = true;
  // Quando acontecer
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      if (pista > -1) {
        pista = pista - 1;
      }
    }
    if (event.key === "ArrowRight") {
      if (pista < 1) {
        pista = pista + 1;
      }
    }
  });
  document.getElementById("retry")?.addEventListener("click", (event) => {
    SZGame3D.forEachInSwarm(obstaculos, (item) => {
      SZGame3D.removeFromSwarm(obstaculos, item);
    });
    pista = 0;
    velocidade = 0.14;
    tempo = 0;
    document.getElementById("score").textContent = 0;
    document.getElementById("results")?.classList.remove("visivel");
    rodando = true;
  });
  // Enquanto estiver rodando
  SZGame3D.animate(cena, () => {
    if (rodando) {
      if (SZGame3D.keyDown("Space") || SZGame3D.keyDown("ArrowUp")) {
        SZGame3D.jump(heroi, 0.09);
      }
      SZGame3D.applyGravity(heroi, chao);
      SZGame3D.moveTowards(heroi, pista * 2.2, SZGame3D.getPos(heroi, "y"), 0, 0.25);
      SZGame3D.forEachInSwarm(obstaculos, (item) => {
        SZGame3D.moveBy(item, 0, 0, velocidade);
        if (SZGame3D.collides(heroi, item)) {
          rodando = false;
          SZGame3D.playEffect("hit");
          document.getElementById("final-score").textContent = tempo;
          document.getElementById("results")?.classList.add("visivel");
        }
      });
      SZGame3D.pruneSwarm(obstaculos, "z", -80, 6);
      document.getElementById("score").textContent = tempo;
    }
  });
  SZGame3D.everySecondsLoop(1, () => {
    if (rodando) {
      tempo = tempo + 1;
      velocidade = velocidade + 0.005;
      if (velocidade > 0.56) {
        velocidade = 0.56;
      }
    }
  });
  SZGame3D.everySecondsLoop(0.9, () => {
    if (rodando) {
      sorteio = Math.floor(Math.random() * 3) - 1;
      SZGame3D.spawnInSwarm(obstaculos, molde, sorteio * 2.2, 0.05, -60);
    }
  });
});
