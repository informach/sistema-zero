const cena = SZGame3D.createFullscreenScene("#050818");
SZGame3D.setSky(cena, "#0b1030", "#1e1b4b");
SZGame3D.topCamera(cena, null);
SZGame3D.setFog(cena, "#050818", 44, 130);
SZGame3D.addSunLight(cena, "#dbeafe", 2);
const chao = SZGame3D.createBlock(cena, { width: 36, height: 1, depth: 36, color: "#213659" });
SZGame3D.setPosition(chao, 0, -0.5, 0);
const linhaX0 = SZGame3D.createBlock(cena, { width: 36, height: 0.02, depth: 0.025, color: "#375575" });
SZGame3D.setPosition(linhaX0,0,0.015,-18);
const linhaZ0 = SZGame3D.createBlock(cena, { width: 0.025, height: 0.02, depth: 36, color: "#375575" });
SZGame3D.setPosition(linhaZ0,-18,0.015,0);
const linhaX1 = SZGame3D.createBlock(cena, { width: 36, height: 0.02, depth: 0.025, color: "#375575" });
SZGame3D.setPosition(linhaX1,0,0.015,-15);
const linhaZ1 = SZGame3D.createBlock(cena, { width: 0.025, height: 0.02, depth: 36, color: "#375575" });
SZGame3D.setPosition(linhaZ1,-15,0.015,0);
const linhaX2 = SZGame3D.createBlock(cena, { width: 36, height: 0.02, depth: 0.025, color: "#375575" });
SZGame3D.setPosition(linhaX2,0,0.015,-12);
const linhaZ2 = SZGame3D.createBlock(cena, { width: 0.025, height: 0.02, depth: 36, color: "#375575" });
SZGame3D.setPosition(linhaZ2,-12,0.015,0);
const linhaX3 = SZGame3D.createBlock(cena, { width: 36, height: 0.02, depth: 0.025, color: "#375575" });
SZGame3D.setPosition(linhaX3,0,0.015,-9);
const linhaZ3 = SZGame3D.createBlock(cena, { width: 0.025, height: 0.02, depth: 36, color: "#375575" });
SZGame3D.setPosition(linhaZ3,-9,0.015,0);
const linhaX4 = SZGame3D.createBlock(cena, { width: 36, height: 0.02, depth: 0.025, color: "#375575" });
SZGame3D.setPosition(linhaX4,0,0.015,-6);
const linhaZ4 = SZGame3D.createBlock(cena, { width: 0.025, height: 0.02, depth: 36, color: "#375575" });
SZGame3D.setPosition(linhaZ4,-6,0.015,0);
const linhaX5 = SZGame3D.createBlock(cena, { width: 36, height: 0.02, depth: 0.025, color: "#375575" });
SZGame3D.setPosition(linhaX5,0,0.015,-3);
const linhaZ5 = SZGame3D.createBlock(cena, { width: 0.025, height: 0.02, depth: 36, color: "#375575" });
SZGame3D.setPosition(linhaZ5,-3,0.015,0);
const linhaX6 = SZGame3D.createBlock(cena, { width: 36, height: 0.02, depth: 0.025, color: "#375575" });
SZGame3D.setPosition(linhaX6,0,0.015,0);
const linhaZ6 = SZGame3D.createBlock(cena, { width: 0.025, height: 0.02, depth: 36, color: "#375575" });
SZGame3D.setPosition(linhaZ6,0,0.015,0);
const linhaX7 = SZGame3D.createBlock(cena, { width: 36, height: 0.02, depth: 0.025, color: "#375575" });
SZGame3D.setPosition(linhaX7,0,0.015,3);
const linhaZ7 = SZGame3D.createBlock(cena, { width: 0.025, height: 0.02, depth: 36, color: "#375575" });
SZGame3D.setPosition(linhaZ7,3,0.015,0);
const linhaX8 = SZGame3D.createBlock(cena, { width: 36, height: 0.02, depth: 0.025, color: "#375575" });
SZGame3D.setPosition(linhaX8,0,0.015,6);
const linhaZ8 = SZGame3D.createBlock(cena, { width: 0.025, height: 0.02, depth: 36, color: "#375575" });
SZGame3D.setPosition(linhaZ8,6,0.015,0);
const linhaX9 = SZGame3D.createBlock(cena, { width: 36, height: 0.02, depth: 0.025, color: "#375575" });
SZGame3D.setPosition(linhaX9,0,0.015,9);
const linhaZ9 = SZGame3D.createBlock(cena, { width: 0.025, height: 0.02, depth: 36, color: "#375575" });
SZGame3D.setPosition(linhaZ9,9,0.015,0);
const linhaX10 = SZGame3D.createBlock(cena, { width: 36, height: 0.02, depth: 0.025, color: "#375575" });
SZGame3D.setPosition(linhaX10,0,0.015,12);
const linhaZ10 = SZGame3D.createBlock(cena, { width: 0.025, height: 0.02, depth: 36, color: "#375575" });
SZGame3D.setPosition(linhaZ10,12,0.015,0);
const linhaX11 = SZGame3D.createBlock(cena, { width: 36, height: 0.02, depth: 0.025, color: "#375575" });
SZGame3D.setPosition(linhaX11,0,0.015,15);
const linhaZ11 = SZGame3D.createBlock(cena, { width: 0.025, height: 0.02, depth: 36, color: "#375575" });
SZGame3D.setPosition(linhaZ11,15,0.015,0);
const linhaX12 = SZGame3D.createBlock(cena, { width: 36, height: 0.02, depth: 0.025, color: "#375575" });
SZGame3D.setPosition(linhaX12,0,0.015,18);
const linhaZ12 = SZGame3D.createBlock(cena, { width: 0.025, height: 0.02, depth: 36, color: "#375575" });
SZGame3D.setPosition(linhaZ12,18,0.015,0);
const nucleo = SZGame3D.createBox(cena, { size: 2, color: "#38bdf8" });
SZGame3D.setMaterial(nucleo, "glow");
SZGame3D.setPosition(nucleo, 0, -0.4, 0);
const nave = SZGame3D.createModel(cena);
const nave_corpo = SZGame3D.createBlock(cena, { width: 0.65, height: 0.35, depth: 2, color: "#22d3ee" });
SZGame3D.setPosition(nave_corpo, 0, 0, 0);
SZGame3D.addToModel(nave, nave_corpo);
const nave_asa = SZGame3D.createBlock(cena, { width: 2.8, height: 0.13, depth: 0.8, color: "#22d3ee" });
SZGame3D.setPosition(nave_asa, 0, -0.02, 0.3);
SZGame3D.addToModel(nave, nave_asa);
const nave_cabine = SZGame3D.createBlock(cena, { width: 0.4, height: 0.2, depth: 0.7, color: "#d9f8ff" });
SZGame3D.setPosition(nave_cabine, 0, 0.23, -0.15);
SZGame3D.addToModel(nave, nave_cabine);
const nave_motorE = SZGame3D.createBlock(cena, { width: 0.35, height: 0.3, depth: 0.8, color: "#334d75" });
SZGame3D.setPosition(nave_motorE, -0.9, 0, 0.65);
SZGame3D.addToModel(nave, nave_motorE);
const nave_motorD = SZGame3D.createBlock(cena, { width: 0.35, height: 0.3, depth: 0.8, color: "#334d75" });
SZGame3D.setPosition(nave_motorD, 0.9, 0, 0.65);
SZGame3D.addToModel(nave, nave_motorD);
const nave_fogoE = SZGame3D.createBlock(cena, { width: 0.23, height: 0.2, depth: 0.4, color: "#ffcb5e" });
SZGame3D.setPosition(nave_fogoE, -0.9, 0, 1.2);
SZGame3D.addToModel(nave, nave_fogoE);
const nave_fogoD = SZGame3D.createBlock(cena, { width: 0.23, height: 0.2, depth: 0.4, color: "#ffcb5e" });
SZGame3D.setPosition(nave_fogoD, 0.9, 0, 1.2);
SZGame3D.addToModel(nave, nave_fogoD);

SZGame3D.setPosition(nave, 0, 0.6, 0);
const moldeCaca = SZGame3D.createModel(cena);
const moldeCaca_corpo = SZGame3D.createBlock(cena, { width: 0.65, height: 0.35, depth: 2, color: "#ef4444" });
SZGame3D.setPosition(moldeCaca_corpo, 0, 0, 0);
SZGame3D.addToModel(moldeCaca, moldeCaca_corpo);
const moldeCaca_asa = SZGame3D.createBlock(cena, { width: 2.8, height: 0.13, depth: 0.8, color: "#ef4444" });
SZGame3D.setPosition(moldeCaca_asa, 0, -0.02, 0.3);
SZGame3D.addToModel(moldeCaca, moldeCaca_asa);
const moldeCaca_cabine = SZGame3D.createBlock(cena, { width: 0.4, height: 0.2, depth: 0.7, color: "#d9f8ff" });
SZGame3D.setPosition(moldeCaca_cabine, 0, 0.23, -0.15);
SZGame3D.addToModel(moldeCaca, moldeCaca_cabine);
const moldeCaca_motorE = SZGame3D.createBlock(cena, { width: 0.35, height: 0.3, depth: 0.8, color: "#334d75" });
SZGame3D.setPosition(moldeCaca_motorE, -0.9, 0, 0.65);
SZGame3D.addToModel(moldeCaca, moldeCaca_motorE);
const moldeCaca_motorD = SZGame3D.createBlock(cena, { width: 0.35, height: 0.3, depth: 0.8, color: "#334d75" });
SZGame3D.setPosition(moldeCaca_motorD, 0.9, 0, 0.65);
SZGame3D.addToModel(moldeCaca, moldeCaca_motorD);
const moldeCaca_fogoE = SZGame3D.createBlock(cena, { width: 0.23, height: 0.2, depth: 0.4, color: "#ffcb5e" });
SZGame3D.setPosition(moldeCaca_fogoE, -0.9, 0, 1.2);
SZGame3D.addToModel(moldeCaca, moldeCaca_fogoE);
const moldeCaca_fogoD = SZGame3D.createBlock(cena, { width: 0.23, height: 0.2, depth: 0.4, color: "#ffcb5e" });
SZGame3D.setPosition(moldeCaca_fogoD, 0.9, 0, 1.2);
SZGame3D.addToModel(moldeCaca, moldeCaca_fogoD);

SZGame3D.setVisible(moldeCaca, "hide");
const cacas = SZGame3D.createSwarm(cena);
let pontos = 0;
let escudo = 3;
let naveX = 0;
let naveZ = 0;
let rodando = true;
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