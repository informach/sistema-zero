SZGame3D.runProject(function __szProjectRun() {
  // Ao iniciar
  const cena = SZGame3D.createFullscreenScene("#050818");
  SZGame3D.setSky(cena, "#0b1030", "#1e1b4b");
  SZGame3D.topCamera(cena, null);
  SZGame3D.setFog(cena, "#050818", 44, 130);
  SZGame3D.addSunLight(cena, "#a5b4fc", 1);
  const chao = SZGame3D.createBlock(cena, { width: 36, height: 1, depth: 36, color: "#0f172a" });
  SZGame3D.setPosition(chao, 0, -0.5, 0);
  const nucleo = SZGame3D.createBox(cena, { size: 2, color: "#38bdf8" });
  SZGame3D.setMaterial(nucleo, "glow");
  SZGame3D.setPosition(nucleo, 0, -0.4, 0);
  const nave = SZGame3D.createBox(cena, { size: 1.2, color: "#22d3ee" });
  SZGame3D.setPosition(nave, 0, 0.6, 0);
  const moldeCaca = SZGame3D.createBox(cena, { size: 1, color: "#ef4444" });
  SZGame3D.setVisible(moldeCaca, "hide");
  const cacas = SZGame3D.createSwarm(cena);
  let pontos = 0;
  let escudo = 3;
  let naveX = 0;
  let naveZ = 0;
  let rodando = true;
  // Quando acontecer
  document.getElementById("retry")?.addEventListener("click", (event) => {
    SZGame3D.forEachInSwarm(cacas, (item) => {
      SZGame3D.removeFromSwarm(cacas, item);
    });
    pontos = 0;
    escudo = 3;
    naveX = 0;
    naveZ = 0;
    rodando = true;
    SZGame3D.setPosition(nave, 0, 0.6, 0);
    document.getElementById("score").textContent = "Naves: 0 de 10";
    document.getElementById("shields").textContent = "Escudos: 3";
    document.getElementById("results")?.classList.remove("visivel");
  });
  // Enquanto estiver rodando
  SZGame3D.animate(cena, () => {
    if (rodando) {
      SZGame3D.spin(nucleo, "y", 0.6);
      if (SZGame3D.keyDown("ArrowLeft") || SZGame3D.keyDown("KeyA")) {
        naveX = naveX - 0.18;
      }
      if (SZGame3D.keyDown("ArrowRight") || SZGame3D.keyDown("KeyD")) {
        naveX = naveX + 0.18;
      }
      if (SZGame3D.keyDown("ArrowUp") || SZGame3D.keyDown("KeyW")) {
        naveZ = naveZ - 0.18;
      }
      if (SZGame3D.keyDown("ArrowDown") || SZGame3D.keyDown("KeyS")) {
        naveZ = naveZ + 0.18;
      }
      if (naveX < -16) {
        naveX = -16;
      }
      if (naveX > 16) {
        naveX = 16;
      }
      if (naveZ < -16) {
        naveZ = -16;
      }
      if (naveZ > 16) {
        naveZ = 16;
      }
      SZGame3D.setPosition(nave, naveX, 0.6, naveZ);
      SZGame3D.forEachInSwarm(cacas, (item) => {
        if (SZGame3D.keyDown("Space") && SZGame3D.isNear(nave, item, 2.6)) {
          SZGame3D.removeFromSwarm(cacas, item);
          pontos = pontos + 1;
          SZGame3D.playEffect("coin");
          document.getElementById("score").textContent = "Naves: " + pontos + " de 10";
        } else {
          if (SZGame3D.isNear(nave, item, 1.4)) {
            SZGame3D.removeFromSwarm(cacas, item);
            escudo = escudo - 1;
            SZGame3D.playEffect("hit");
            document.getElementById("shields").textContent = "Escudos: " + escudo;
          } else {
            if (SZGame3D.isNear(nave, item, 13)) {
              SZGame3D.moveTowards(item, SZGame3D.getPos(nave, "x"), 0.6, SZGame3D.getPos(nave, "z"), 0.06);
            } else {
              SZGame3D.spin(item, "y", 1.6);
            }
          }
        }
      });
      if (pontos >= 10) {
        rodando = false;
        SZGame3D.playEffect("coin");
        document.getElementById("result-title").textContent = "Ás dos céus!";
        document.getElementById("final-score").textContent = pontos;
        document.getElementById("results")?.classList.add("visivel");
      }
      if (escudo <= 0) {
        rodando = false;
        SZGame3D.playEffect("explosion");
        document.getElementById("result-title").textContent = "Nave abatida...";
        document.getElementById("final-score").textContent = pontos;
        document.getElementById("results")?.classList.add("visivel");
      }
    }
  });
  SZGame3D.everySecondsLoop(1.6, () => {
    if (rodando) {
      if (SZGame3D.countSwarm(cacas) < 6) {
        const angulo = Math.random() * 6.283;
        SZGame3D.spawnInSwarm(cacas, moldeCaca, Math.cos(angulo) * 14, 0.6, Math.sin(angulo) * 14);
      }
    }
  });
});
