SZGame3D.runProject(function __szProjectRun() {
  // Ao iniciar
  const cena = SZGame3D.createFullscreenScene("#0f172a");
  SZGame3D.setSky(cena, "#1e293b", "#334155");
  SZGame3D.topCamera(cena, null);
  SZGame3D.setFog(cena, "#0f172a", 40, 110);
  SZGame3D.addSunLight(cena, "#e2e8f0", 1);
  const chao = SZGame3D.createBlock(cena, { width: 34, height: 1, depth: 34, color: "#14532d" });
  SZGame3D.setPosition(chao, 0, -0.5, 0);
  const curral = SZGame3D.createBlock(cena, { width: 6, height: 0.3, depth: 6, color: "#fbbf24" });
  SZGame3D.setPosition(curral, 9, 0.15, 9);
  SZGame3D.setMaterial(curral, "glow");
  const heroi = SZGame3D.createBox(cena, { size: 1.3, color: "#38bdf8" });
  SZGame3D.setPosition(heroi, 0, 0.65, 0);
  const moldeErrante = SZGame3D.createBox(cena, { size: 1, color: "#f472b6" });
  SZGame3D.setVisible(moldeErrante, "hide");
  const moldeSeguidor = SZGame3D.createBox(cena, { size: 1, color: "#22d3ee" });
  SZGame3D.setVisible(moldeSeguidor, "hide");
  const errantes = SZGame3D.createSwarm(cena);
  const seguidores = SZGame3D.createSwarm(cena);
  let pontos = 0;
  let tempo = 45;
  let rodando = true;
  // Quando acontecer
  document.getElementById("retry")?.addEventListener("click", (event) => {
    SZGame3D.forEachInSwarm(errantes, (item) => {
      SZGame3D.removeFromSwarm(errantes, item);
    });
    SZGame3D.forEachInSwarm(seguidores, (item) => {
      SZGame3D.removeFromSwarm(seguidores, item);
    });
    pontos = 0;
    tempo = 45;
    rodando = true;
    SZGame3D.setPosition(heroi, 0, 0.65, 0);
    document.getElementById("score").textContent = 0;
    document.getElementById("timer").textContent = 45;
    document.getElementById("results")?.classList.remove("visivel");
  });
  // Enquanto estiver rodando
  SZGame3D.animate(cena, () => {
    if (rodando) {
      SZGame3D.spin(curral, "y", 0.4);
      if (SZGame3D.keyDown("ArrowLeft") || SZGame3D.keyDown("KeyA")) {
        SZGame3D.moveBy(heroi, -0.16, 0, 0);
      }
      if (SZGame3D.keyDown("ArrowRight") || SZGame3D.keyDown("KeyD")) {
        SZGame3D.moveBy(heroi, 0.16, 0, 0);
      }
      if (SZGame3D.keyDown("ArrowUp") || SZGame3D.keyDown("KeyW")) {
        SZGame3D.moveBy(heroi, 0, 0, -0.16);
      }
      if (SZGame3D.keyDown("ArrowDown") || SZGame3D.keyDown("KeyS")) {
        SZGame3D.moveBy(heroi, 0, 0, 0.16);
      }
      if (SZGame3D.getPos(heroi, "x") < -13) {
        SZGame3D.setPosition(heroi, -13, 0.65, SZGame3D.getPos(heroi, "z"));
      }
      if (SZGame3D.getPos(heroi, "x") > 13) {
        SZGame3D.setPosition(heroi, 13, 0.65, SZGame3D.getPos(heroi, "z"));
      }
      if (SZGame3D.getPos(heroi, "z") < -13) {
        SZGame3D.setPosition(heroi, SZGame3D.getPos(heroi, "x"), 0.65, -13);
      }
      if (SZGame3D.getPos(heroi, "z") > 13) {
        SZGame3D.setPosition(heroi, SZGame3D.getPos(heroi, "x"), 0.65, 13);
      }
      SZGame3D.forEachInSwarm(errantes, (item) => {
        SZGame3D.spin(item, "y", 1.5);
        if (SZGame3D.isNear(heroi, item, 1.7)) {
          SZGame3D.spawnInSwarm(seguidores, moldeSeguidor, SZGame3D.getPos(item, "x"), 0.65, SZGame3D.getPos(item, "z"));
          SZGame3D.removeFromSwarm(errantes, item);
          SZGame3D.playEffect("coin");
        }
      });
      SZGame3D.forEachInSwarm(seguidores, (item) => {
        SZGame3D.moveTowards(item, SZGame3D.getPos(heroi, "x"), 0.65, SZGame3D.getPos(heroi, "z"), 0.08);
        if (SZGame3D.isNear(curral, item, 3)) {
          SZGame3D.removeFromSwarm(seguidores, item);
          pontos = pontos + 1;
          SZGame3D.playEffect("coin");
          document.getElementById("score").textContent = pontos;
        }
      });
      if (pontos >= 8) {
        rodando = false;
        SZGame3D.playEffect("coin");
        document.getElementById("final-score").textContent = pontos;
        document.getElementById("results")?.classList.add("visivel");
      }
    }
  });
  SZGame3D.everySecondsLoop(1.4, () => {
    if (rodando) {
      if (SZGame3D.countSwarm(errantes) < 6) {
        const angulo = Math.random() * 6.283;
        SZGame3D.spawnInSwarm(errantes, moldeErrante, Math.cos(angulo) * 10, 0.65, Math.sin(angulo) * 10);
      }
    }
  });
  SZGame3D.everySecondsLoop(1, () => {
    if (rodando) {
      tempo = tempo - 1;
      document.getElementById("timer").textContent = tempo;
      if (tempo <= 0) {
        rodando = false;
        document.getElementById("final-score").textContent = pontos;
        document.getElementById("results")?.classList.add("visivel");
      }
    }
  });
});
