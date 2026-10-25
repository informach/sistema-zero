import type { ExtensionExampleDifficulty } from '../../../../extensions/types'
import { GAMEPLAY_RECIPE_SOURCES } from './gameplaySources'
import { MORE_ADVANCED_RECIPE_SOURCES } from './moreSources'

export interface AdvancedRecipeSource {
  name: string
  description: string
  difficulty: ExtensionExampleDifficulty
  concepts: string[]
  genre: string
  assets: string[]
  source: string
}

/** Authoring sources; the generator persists their structured IR for the gallery. */
export const ADVANCED_RECIPE_SOURCES: readonly AdvancedRecipeSource[] = [
  {
    name: 'Oficina de animações e som',
    description:
      'Ande com I/J/K/L. Espaço toca um aceno e um sino; 1 muda a direção, 2 liga a música, 3 para. H abre a ajuda. Troque as artes pelas suas no Pinta.',
    difficulty: 'intermediate',
    concepts: ['Pinta', 'animação', 'som de arquivo', 'telas', 'direção'],
    genre: 'oficina',
    assets: ['heroi-oficina', 'fundo-oficina', 'sino-oficina'],
    source: `
SZGameKit.setupFull({ background: "#d5edf0", accent: "#2f83b4" });
SZGameKit.showStageBorder("#183653", 3);
SZGameKit.useFont("nunito");
SZGameKit.setStageDescription("Oficina de animações e som. I J K L movem. Espaço toca o aceno. H abre a ajuda.");
SZGameKit.setScreenText("menu", "Meu herói do Pinta", "I/J/K/L andam. Espaço acena e toca sino. 1 vira, 2 toca música, 3 para; H ajuda.", "Experimentar");
SZGameKit.loadImage("heroi", "heroi-oficina");
SZGameKit.setBackdrop("fundo-oficina");
SZGameKit.loadSound("sino", "sino-oficina");
SZGameKit.setVolume("sino", 0.3);
const heroi = SZGameKit.createCharacter({ image: "heroi-oficina", w: 48, h: 48, speed: 200, color: "#2f83b4" });
SZGameKit.setSheet(heroi, "heroi-oficina", 32, 32);
SZGameKit.setWalkSheet(heroi, "heroi-oficina", 32, 32);
SZGameKit.stateAnim(heroi, "parado", 0, 0, 1, false);
SZGameKit.stateAnim(heroi, "andando", 0, 3, 8, false);
SZGameKit.createScreen("ajuda", "Sua arte no jogo", "Escolha uma imagem e uma animação do Pinta. Ande, acene e ouça o sino.");
SZGameKit.addButton("ajuda", "Continuar", function () { SZGameKit.hideScreens(); SZGameKit.resume(); });
SZGameKit.addButton("ajuda", "Voltar ao menu", function () { SZGameKit.returnToMenu(); });
SZGameKit.onUpdate(function (dt) {
  SZGameKit.moveWithCustomKeys(heroi, "i", "k", "j", "l", dt);
  SZGameKit.keepOnScreen(heroi);
  if (SZGameKit.keyPressed("Space")) {
    SZGameKit.playAnimOnce(heroi, 4, 7, 10);
    SZGameKit.playSound("sino");
    SZGameKit.flashScreen("#fff4c6", 1);
  }
  if (SZGameKit.keyPressed("1")) { SZGameKit.setFacingDir(heroi, "up"); SZGameKit.fadeScreen("#183653", 0.3, false); SZGameKit.playAnim(heroi, 8, 11, 8); }
  if (SZGameKit.keyPressed("2")) { SZGameKit.playMusic("sino"); }
  if (SZGameKit.keyPressed("3")) { SZGameKit.stopSound("sino"); SZGameKit.playTone(330, 120); }
  if (SZGameKit.keyPressed("h")) { SZGameKit.pause(); SZGameKit.showScreen("ajuda"); }
});
SZGameKit.onDraw(function (ctx) { SZGameKit.drawBackdrop("fundo-oficina"); SZGameKit.drawCharacter(heroi); });
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.drawText("Direção: " + SZGameKit.facingOf(heroi), 20, 30, 20, "#183653");
  SZGameKit.drawText("Aceno terminou: " + SZGameKit.animEnded(heroi), 20, 60, 20, "#183653");
});
`,
  },
  {
    name: 'Laboratório de movimento e efeitos',
    description:
      'Setas movem a nave com inércia. Segure o mouse para dar impulso. H abre os botões para mudar rumo, deslizar, apagar, reaparecer, ligar rastro e soltar onda. 8 sorteia um alvo; 9 escolhe o mais perto. Clique no alvo para acertar.',
    difficulty: 'advanced',
    concepts: ['inércia', 'atrito', 'interpolação', 'opacidade', 'caminhos', 'grupos'],
    genre: 'laboratório',
    assets: ['fundo-oficina', 'heroi-oficina'],
    source: `
SZGameKit.setup({ width: 800, height: 480, background: "#142b3c", accent: "#ffd166" });
SZGameKit.setScreenText("menu", "Movimento e efeitos", "Setas: inércia. Mouse: impulso. H abre as ferramentas de movimento e efeitos. 8 escolhe alvo ao acaso; 9 escolhe o mais perto.", "Experimentar");
SZGameKit.defineMold("vagalume", { w: 18, h: 18, health: 1, speed: 45, damage: 0, color: "#ffe7a3", image: "", look: "" });
const nave = SZGameKit.createCharacter({ w: 36, h: 24, speed: 180, color: "#65d5c2" });
const guia = SZGameKit.createCharacter({ w: 16, h: 16, speed: 100, color: "#ffd166" });
SZGameKit.setHitboxShape(nave, "circulo", 12);
SZGameKit.showHitboxes();
SZGameKit.setVelocityAngle(nave, 0, 120);
SZGameKit.setTerminalVelocity(nave, 500);
SZGameKit.definePath("volta", function () { SZGameKit.pathPoint(90, 140); SZGameKit.pathPoint(700, 140); SZGameKit.pathPoint(700, 380); SZGameKit.pathPoint(90, 380); });
SZGameKit.spawnFromMold("vagalume", 180, 260);
SZGameKit.spawnFromMold("vagalume", 650, 220);
SZGameKit.startSpawner("vagalume", 2);
SZGameKit.cameraFollow(nave, 800, 480);
let alvo = SZGameKit.nearestActive("vagalume", 400, 240);

SZGameKit.createScreen("ferramentas", "Movimento e efeitos", "Escolha uma experiência. O jogo continua para mostrar o resultado.");
SZGameKit.addButton("ferramentas", "Mudar o rumo", function () { SZGameKit.setVelocityAngle(nave, 45, 220); SZGameKit.cameraStop(); SZGameKit.hideScreens(); SZGameKit.resume(); });
SZGameKit.addButton("ferramentas", "Deslizar ao centro", function () { SZGameKit.tweenTo(nave, 400, 260, 1); SZGameKit.hideScreens(); SZGameKit.resume(); });
SZGameKit.addButton("ferramentas", "Ficar transparente", function () { SZGameKit.fadeTo(nave, 15, 1); SZGameKit.hideScreens(); SZGameKit.resume(); });
SZGameKit.addButton("ferramentas", "Reaparecer e deslizar", function () { SZGameKit.setOpacity(nave, 100); SZGameKit.tweenProperty(nave, "y", 200, 1); SZGameKit.hideScreens(); SZGameKit.resume(); });
SZGameKit.addButton("ferramentas", "Ligar o rastro", function () { SZGameKit.trailOn(nave, "#65d5c2", 8, 20, 0.5); SZGameKit.hideScreens(); SZGameKit.resume(); });
SZGameKit.addButton("ferramentas", "Desligar rastro e fábrica", function () { SZGameKit.trailOff(nave); SZGameKit.stopSpawner("vagalume"); SZGameKit.hideScreens(); SZGameKit.resume(); });
SZGameKit.addButton("ferramentas", "Soltar uma onda", function () { SZGameKit.shockwave(nave.x, nave.y, 120, 0.6, "#ffd166"); SZGameKit.sheetBurst("heroi-oficina", 4, 12, nave.x, nave.y, 64); SZGameKit.hideScreens(); SZGameKit.resume(); });

SZGameKit.onUpdate(function (dt) {
  if (SZGameKit.keyDown("ArrowLeft")) { SZGameKit.thrust(nave, 180, 30); }
  if (SZGameKit.keyDown("ArrowRight")) { SZGameKit.thrust(nave, 0, 30); }
  if (SZGameKit.keyDown("ArrowUp")) { SZGameKit.thrust(nave, 270, 30); }
  if (SZGameKit.keyDown("ArrowDown")) { SZGameKit.thrust(nave, 90, 30); }
  if (SZGameKit.mouseDown()) { SZGameKit.thrust(nave, SZGameKit.angleTo(nave, guia), 20); }
  SZGameKit.applyFriction(nave, 0.97, dt);
  SZGameKit.moveByVelocity(nave, dt);
  SZGameKit.wrapEdges(nave);
  SZGameKit.followPath(guia, "volta", 90, dt);
  if (SZGameKit.keyPressed("8")) { alvo = SZGameKit.randomActive("vagalume"); }
  if (SZGameKit.keyPressed("9")) { alvo = SZGameKit.nearestActive("vagalume", nave.x, nave.y); }
  if (alvo && SZGameKit.mouseDown() && SZGameKit.pointIn(SZGameKit.mouseX(), SZGameKit.mouseY(), alvo)) { SZGameKit.hurt(alvo, 1, 0.3); }
  SZGameKit.forEachActive("vagalume", function (item) { SZGameKit.drift(item, dt); });
  SZGameKit.cullOffscreen("vagalume", 60);
  if (SZGameKit.keyPressed("h")) { SZGameKit.pause(); SZGameKit.showScreen("ferramentas"); }
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#142b3c", false);
  SZGameKit.scrollImage("fundo-oficina", 8, 0);
  SZGameKit.parallaxLayer("fundo-oficina", 0.15, 0.1);
  SZGameKit.drawActive("vagalume"); SZGameKit.drawCharacter(guia); SZGameKit.drawCharacter(nave);
  if (alvo) { SZGameKit.drawCircle(alvo.x + 9, alvo.y + 9, 20, "#ffd166"); }
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.drawText("Visibilidade: " + SZGameKit.opacityOf(nave), 20, 30, 18, "#183653");
  SZGameKit.drawText("Caminho: " + SZGameKit.pathProgress(guia), 20, 55, 18, "#183653");
  SZGameKit.drawText("Tempo: " + SZGameKit.timeSurvived() + " Acertos: " + SZGameKit.kills(), 20, 105, 18, "#183653");
  SZGameKit.drawText("Câmera: " + SZGameKit.cameraX() + ", " + SZGameKit.cameraY(), 20, 80, 18, "#183653");
});
`,
  },
  ...MORE_ADVANCED_RECIPE_SOURCES,
  ...GAMEPLAY_RECIPE_SOURCES,
]
