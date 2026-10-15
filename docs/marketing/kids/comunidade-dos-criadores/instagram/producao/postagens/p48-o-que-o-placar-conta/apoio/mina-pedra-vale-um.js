SZGame3D.runProject(function __szProjectRun() {
  // Ao iniciar
  const cena = SZGame3D.createFullscreenScene("#0f0a1e");
  SZGame3D.setSky(cena, "#241a33", "#4c1d95");
  SZGame3D.setFog(cena, "#0f0a1e", 10, 46);
  const chao = SZGame3D.createBlock(cena, { width: 20, height: 1, depth: 20, color: "#1a1226" });
  SZGame3D.setPosition(chao, 0, -0.6, 0);
  const moldePedra = SZGame3D.createBox(cena, { size: 1, color: "#57534e" });
  SZGame3D.setVisible(moldePedra, "hide");
  const moldeCristal = SZGame3D.createBox(cena, { size: 1, color: "#22d3ee" });
  SZGame3D.setMaterial(moldeCristal, "glow");
  SZGame3D.setVisible(moldeCristal, "hide");
  const pedras = SZGame3D.createSwarm(cena);
  const cristais = SZGame3D.createSwarm(cena);
  SZGame3D.isometricCamera(cena, null);
  let pontos = 0;
  let tempo = 50;
  let rodando = true;
  function cavarChance() {
    return Math.random() < 0.3;
  }
  function encherAMina() {
    SZGame3D.forEachInSwarm(pedras, (item) => {
      SZGame3D.removeFromSwarm(pedras, item);
    });
    SZGame3D.forEachInSwarm(cristais, (item) => {
      SZGame3D.removeFromSwarm(cristais, item);
    });
    for (let linha = -3, fim_2 = 4, passo_2 = 1; passo_2 > 0 ? linha < fim_2 : passo_2 < 0 ? linha > fim_2 : false; linha += passo_2) {
      for (let coluna = -3, fim = 4, passo = 1; passo > 0 ? coluna < fim : passo < 0 ? coluna > fim : false; coluna += passo) {
        if (cavarChance()) {
          SZGame3D.spawnInSwarm(cristais, moldeCristal, coluna, 0, linha);
        } else {
          SZGame3D.spawnInSwarm(pedras, moldePedra, coluna, 0, linha);
        }
      }
    }
  }
  function atualizarHud() {
    document.getElementById("placar").textContent = pontos;
    document.getElementById("tempo").textContent = tempo;
  }
  function recomecar() {
    encherAMina();
    pontos = 0;
    tempo = 50;
    atualizarHud();
    document.getElementById("fim")?.classList.remove("visivel");
    rodando = true;
  }
  recomecar();
  // Quando acontecer
  document.getElementById("retry")?.addEventListener("click", (event) => {
    recomecar();
  });
  document.addEventListener("click", (event) => {
    if (rodando) {
      const alvo = SZGame3D.pickAtMouse(cena);
      if (alvo) {
        let antesC = SZGame3D.countSwarm(cristais);
        SZGame3D.removeFromSwarm(cristais, alvo);
        if (SZGame3D.countSwarm(cristais) < antesC) {
          pontos = pontos + 1;
          SZGame3D.playEffect("coin");
          atualizarHud();
          if (pontos >= 10) {
            rodando = false;
            document.getElementById("fim-titulo").textContent = "Filão lendário!";
            document.getElementById("final-pontos").textContent = pontos;
            document.getElementById("fim")?.classList.add("visivel");
          }
        } else {
          let antesP = SZGame3D.countSwarm(pedras);
          SZGame3D.removeFromSwarm(pedras, alvo);
          if (SZGame3D.countSwarm(pedras) < antesP) {
            pontos = pontos + 1;
            atualizarHud();
            SZGame3D.playEffect("hit");
          }
        }
      }
    }
  });
  // Enquanto estiver rodando
  SZGame3D.everySecondsLoop(1, () => {
    if (rodando) {
      tempo = tempo - 1;
      atualizarHud();
      if (SZGame3D.countSwarm(pedras) + SZGame3D.countSwarm(cristais) < 60) {
        const coluna = Math.floor(Math.random() * 9) - 4;
        const linha = Math.floor(Math.random() * 9) - 4;
        if (cavarChance()) {
          SZGame3D.spawnInSwarm(cristais, moldeCristal, coluna, 0, linha);
        } else {
          SZGame3D.spawnInSwarm(pedras, moldePedra, coluna, 0, linha);
        }
      }
      if (tempo <= 0) {
        rodando = false;
        document.getElementById("fim-titulo").textContent = "A mina fechou...";
        document.getElementById("final-pontos").textContent = pontos;
        document.getElementById("fim")?.classList.add("visivel");
      }
    }
  });
});
