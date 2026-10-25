/**
 * Fontes JavaScript dos exemplos curtos do Jogo 3D que nasceram escritos à mão em
 * `examples.ts` (Cubo girando, Boneco de formas, Noite enevoada, Enxame que gira e
 * Desvie dos blocos). Desde o review 3D (10/2026) eles também saem DAQUI pelo
 * `bun run gen:game-3d-examples`, como os outros: o `ir.behavior` de cada um é
 * regerado destes fontes (HTML e CSS continuam no `examples.ts`).
 *
 * Unidades da API nova: giro contínuo em GRAUS POR SEGUNDO (`spin`), giro fixo em
 * graus (`setRotation`), velocidades POR SEGUNDO e câmera escolhida por modo.
 */

/** Cubo girando: o giro contínuo de antes (0.01 por quadro ≈ 34 graus por segundo). */
export const ROTATING_CUBE_SOURCE = `
const cena = SZGame3D.createFullscreenScene("#0b1020");
const caixa = SZGame3D.createBox(cena, { size: 1.5, color: "#22d3ee" });
SZGame3D.animate(cena, () => {
  SZGame3D.spin(caixa, "x", 34);
  SZGame3D.spin(caixa, "y", 34);
});
`.trim()

/** Boneco de formas: o nariz deitado (90 graus) e o boneco girando devagar. */
export const SHAPES_SOURCE = `
const cena = SZGame3D.createScene("tela");
SZGame3D.setBackground(cena, "#1e293b");
SZGame3D.setCameraPosition(cena, 3, 2.5, 6);
const chao = SZGame3D.createPlane(cena, { width: 14, depth: 14, color: "#334155" });
SZGame3D.setPosition(chao, 0, -0.2, 0);
const boneco = SZGame3D.createModel(cena);
const corpo = SZGame3D.createSphere(cena, { radius: 0.8, color: "#e2e8f0" });
SZGame3D.setPosition(corpo, 0, 0.8, 0);
SZGame3D.addToModel(boneco, corpo);
const cabeca = SZGame3D.createSphere(cena, { radius: 0.5, color: "#e2e8f0" });
SZGame3D.setPosition(cabeca, 0, 1.9, 0);
SZGame3D.addToModel(boneco, cabeca);
const nariz = SZGame3D.createCone(cena, { radius: 0.12, height: 0.5, color: "#f59e0b" });
SZGame3D.setPosition(nariz, 0, 1.9, 0.5);
SZGame3D.setRotation(nariz, 90, 0, 0);
SZGame3D.addToModel(boneco, nariz);
const chapeu = SZGame3D.createCylinder(cena, { radius: 0.45, height: 0.5, color: "#0ea5e9" });
SZGame3D.setPosition(chapeu, 0, 2.55, 0);
SZGame3D.setMaterial(chapeu, "metal");
SZGame3D.addToModel(boneco, chapeu);
SZGame3D.animate(cena, () => {
  SZGame3D.spin(boneco, "y", 34);
});
`.trim()

/** Noite enevoada: céu, neblina, sombras e uma luz pontual sobre um cubo que gira. */
export const NIGHT_SOURCE = `
const cena = SZGame3D.createScene("tela");
SZGame3D.setSky(cena, "#0b1026", "#1e3a5f");
SZGame3D.setFog(cena, "#1e3a5f", 4, 22);
SZGame3D.setShadows(cena, "on");
SZGame3D.addSunLight(cena, "#94a3b8", 0.35);
SZGame3D.addPointLight(cena, "#ffd27f", 2.5, 0, 3, 0);
const chao = SZGame3D.createPlane(cena, { width: 30, depth: 30, color: "#1f2937" });
SZGame3D.setPosition(chao, 0, -0.5, 0);
const cubo = SZGame3D.createBox(cena, { size: 1, color: "#f59e0b" });
SZGame3D.setPosition(cubo, 0, 0.5, 0);
SZGame3D.animate(cena, () => {
  SZGame3D.spin(cubo, "y", 69);
});
`.trim()

/** Enxame que gira: cinco cópias de um molde escondido, num GRUPO comum. */
export const SWARM_SOURCE = `
const cena = SZGame3D.createScene("tela");
SZGame3D.setBackground(cena, "#0b1020");
const modelo = SZGame3D.createBox(cena, { size: 0.6, color: "#22d3ee" });
SZGame3D.setVisible(modelo, "hide");
const enxame = SZGame3D.createGroup();
SZGame3D.spawnCopy(enxame, modelo, -2, 0, 0);
SZGame3D.spawnCopy(enxame, modelo, 0, 0.6, 0);
SZGame3D.spawnCopy(enxame, modelo, 2, 0, 0);
SZGame3D.spawnCopy(enxame, modelo, -1, -1.4, 0);
SZGame3D.spawnCopy(enxame, modelo, 1, -1.4, 0);
SZGame3D.animate(cena, () => {
  SZGame3D.forEachInGroup(enxame, (item) => {
    SZGame3D.spin(item, "y", 138);
  });
});
`.trim()

/**
 * Desvie dos blocos (reescrito no lote 7 do review 3D): o primeiro jogo com VIDAS. Três
 * corações (cada bloco que encosta tira um; machucado, o cubo pisca e fica 1 s sem se
 * machucar), um ponto por segundo vivo, fim de jogo pela tela e "Jogar de novo". Cair do
 * chão também perde. Placar, corações e telas são blocos de regras de jogo, sem HTML.
 * Andar 3 por segundo, pulo 4.8 e um inimigo a cada 0.75 s, vindo a 6 por segundo.
 */
export const DODGE_SOURCE = `
const cena = SZGame3D.createScene("tela");
SZGame3D.setBackground(cena, "#0c4a6e");
SZGame3D.setCameraPosition(cena, 4.6, 2.7, 8);
SZGame3D.setScreenText("inicio", "Desvie dos blocos", "Ande com WASD ou as setas e pule com espaço. Cada bloco que encostar tira um coração.", "Jogar");
SZGame3D.setScreenText("fim", "Os blocos te pegaram!", "Cada segundo vivo vale um ponto.", "Jogar de novo");
const jogador = SZGame3D.createBox(cena, { size: 1, color: "#34d399" });
const chao = SZGame3D.createBlock(cena, { width: 10, height: 0.5, depth: 50, color: "#0369a1" });
SZGame3D.setPosition(chao, 0, -2, 0);
SZGame3D.cameraMode(cena, "longe", jogador);
SZGame3D.setLife(jogador, 3);
const inimigos = SZGame3D.createGroup();
SZGame3D.onTouchGroup(jogador, inimigos, (bloco) => {
  SZGame3D.hurt(jogador, 1);
  SZGame3D.playEffect("hit");
  SZGame3D.cameraShake(0.3, 0.3);
  SZGame3D.removeFromGroup(inimigos, bloco);
});
SZGame3D.onLifeOver(jogador, () => {
  SZGame3D.endGame("perdeu");
});
SZGame3D.animate(cena, () => {
  SZGame3D.controlWithKeys(jogador, 3);
  if (SZGame3D.keyDown("Space")) {
    SZGame3D.jump(jogador, 4.8);
  }
  SZGame3D.applyGravity(jogador, chao);
  if (SZGame3D.getPos(jogador, "y") < -12) {
    SZGame3D.endGame("perdeu");
  }
  SZGame3D.updateGroup(inimigos, chao);
  SZGame3D.pruneOffscreen(cena, inimigos, (inimigo) => {
  });
});
SZGame3D.everySecondsLoop(0.75, () => {
  SZGame3D.spawnEnemy(cena, inimigos, 6);
});
SZGame3D.everySecondsLoop(1, () => {
  SZGame3D.addScore(1);
});
`.trim()
