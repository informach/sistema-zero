import { createCampaignStage } from '../../campaignSchema'
import type { AdvancedRecipeSource } from './sources'

const firstStage = createCampaignStage('oficina-1')
const secondStage = { ...createCampaignStage('oficina-2'), order: 2 }
firstStage.nextStage = 'oficina-2'

export const MORE_ADVANCED_RECIPE_SOURCES: readonly AdvancedRecipeSource[] = [
  {
    name: 'Mapa do Pinta com escada e paredes',
    description:
      'Setas andam e sobem a escada; Espaço pula. Pule de novo no ar ou junto da parede. O mapa do Pinta define chão, parede e escada; a folha define o herói.',
    difficulty: 'advanced',
    concepts: ['Pinta', 'mapa de peças', 'escada', 'pulo duplo', 'parede', 'animação por estado'],
    genre: 'plataforma',
    assets: ['mapa-oficina', 'heroi-oficina'],
    source: `
SZGameKit.setup({ width: 640, height: 384, background: "#b9e0d0", accent: "#2f83b4" });
SZGameKit.setScreenText("menu", "Meu mapa do Pinta", "Setas movem e sobem a escada. Espaço pula; pule de novo no ar ou junto da parede.", "Explorar");
SZGameKit.loadTilemap("oficina", "mapa-oficina");
SZGameKit.setTileSize(32);
SZGameKit.tilemapSolid("oficina");
const heroi = SZGameKit.createCharacter({ image: "heroi-oficina", w: 28, h: 30, speed: 150, color: "#2f83b4" });
SZGameKit.placeCharacter(heroi, 50, 280);
SZGameKit.setSheet(heroi, "heroi-oficina", 32, 32);
SZGameKit.platStateFrames(heroi, "parado", 0, 0, 1);
SZGameKit.platStateFrames(heroi, "andando", 0, 3, 8);
SZGameKit.setTerminalVelocity(heroi, 650);
SZGameKit.onUpdate(function (dt) {
  SZGameKit.platformerHero(heroi, 160, 420, dt);
  SZGameKit.doubleJump(heroi, 420, 1);
  SZGameKit.wallSlide(heroi, 90);
  SZGameKit.wallJump(heroi, 200, 420);
  SZGameKit.climbLadder(heroi, "oficina", 2, 120);
  SZGameKit.collideTilemap(heroi, "oficina");
  SZGameKit.platformerAnim(heroi);
  SZGameKit.keepOnScreen(heroi);
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#b9e0d0", false);
  SZGameKit.drawTilemap("oficina", "chão");
  SZGameKit.drawCharacter(heroi);
  SZGameKit.drawTilemap("oficina", "frente");
});
`,
  },
  {
    name: 'Grave e repita a aventura',
    description:
      'Use setas para andar e X para pular pelas duas fases. 1 grava, 2 termina, 3 repete. 4 guarda, 5 continua e 6 apaga o progresso guardado; N vai à segunda fase.',
    difficulty: 'advanced',
    concepts: ['campanha', 'relógio fixo', 'ações', 'progresso salvo', 'repetição'],
    genre: 'plataforma',
    assets: [],
    source: `
SZGameKit.setup({ width: 768, height: 384, background: "#182b45", accent: "#ffd166" });
SZGameKit.setScreenText("menu", "Grave e repita", "Setas andam; X pula. 1 grava, 2 termina, 3 repete. 4 guarda, 5 continua, 6 apaga o progresso. N muda de fase.", "Experimentar");
SZGameKit.enableFixedSimulation({ hz: 60, seed: 42, maxCatchUpSteps: 5 });
SZGameKit.defineCampaign({ id: "oficina-replay", version: 1, firstStage: "oficina-1", players: 1, seed: 42, requiredGems: 0 });
SZGameKit.defineCampaignStage(${JSON.stringify(firstStage)});
SZGameKit.defineCampaignStage(${JSON.stringify(secondStage)});
SZGameKit.startCampaign("oficina-1");
let acao = "parado";
let gravacao = "Pronto para gravar";
SZGameKit.onFixedUpdate(function (dt, passo) {
  if (SZGameKit.actionDown("direita")) { acao = "andando à direita"; }
  if (SZGameKit.actionPressed("pular")) { acao = "pulo começou"; }
  if (SZGameKit.actionReleased("pular")) { acao = "pulo terminou"; }
  if (SZGameKit.keyPressed("1")) { SZGameKit.startReplayRecording(); gravacao = "Gravando"; }
  if (SZGameKit.keyPressed("2")) { SZGameKit.stopReplayRecording(); gravacao = "Gravação pronta"; }
  if (SZGameKit.keyPressed("3")) { SZGameKit.playLastReplay(); gravacao = "Repetição iniciada"; }
  if (SZGameKit.keyPressed("4")) { SZGameKit.saveCampaign(1); }
  if (SZGameKit.keyPressed("5")) { SZGameKit.loadCampaign(1); }
  if (SZGameKit.keyPressed("6")) { SZGameKit.deleteCampaignSave(1); }
  if (SZGameKit.keyPressed("n")) { SZGameKit.goToStage("oficina-2"); }
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.drawText("Fase: " + SZGameKit.currentStage(), 20, 55, 18, "#183653");
  SZGameKit.drawText(acao, 20, 80, 18, "#183653");
  SZGameKit.drawText(gravacao, 20, 105, 18, "#183653");
});
`,
  },
  {
    name: 'A vila que guarda sua aventura',
    description:
      'Explore com setas. 1 guarda, 2 continua. C recolhe uma chave; V usa uma chave. N visita a praia. B inicia um treino de batalha com veneno. O painel mostra mochila, nível e experiência.',
    difficulty: 'intermediate',
    concepts: ['RPG', 'mapas', 'mochila', 'progresso salvo', 'amigos'],
    genre: 'RPG',
    assets: ['heroi-oficina', 'fundo-oficina'],
    source: `
SZGameKit.setup({ width: 640, height: 384, background: "#b9e0d0", accent: "#2f83b4" });
SZGameKit.setScreenText("menu", "A vila que continua", "Setas andam. 1 guarda; 2 continua. C pega chave, V usa chave. N visita a praia; B inicia treino de batalha.", "Explorar");
const heroi = SZGameKit.createCharacter({ image: "heroi-oficina", w: 28, h: 30, speed: 160, color: "#2f83b4" });
SZGameKit.sceneAnimation(heroi, "heroi-oficina", "andando", false);
SZGameKit.rpgSetStartMap("vila");
SZGameKit.rpgCreateMap("vila", 20, 12, function (ctx) { SZGameKit.drawBackground("#b9e0d0", true); });
SZGameKit.rpgCreateMap("praia", 20, 12, function (ctx) { SZGameKit.drawBackground("#d5edf0", false); SZGameKit.drawRectangle(0, 240, 640, 144, "#e6d293"); SZGameKit.drawCircle(530, 60, 30, "#ffe7a3"); });
SZGameKit.rpgOnEnterMap("vila", function () {
  SZGameKit.rpgCreateNpc("vizinha", 7, 5, "heroi-oficina", "");
  SZGameKit.rpgNpcWander("vizinha");
});
SZGameKit.rpgGiveItem("chave", "", 1);
SZGameKit.rpgBattleStats(50, 10, 3);
SZGameKit.onUpdate(function (dt) {
  SZGameKit.rpgMoveGrid(heroi, 32, dt);
  SZGameKit.keepOnScreen(heroi);
  if (SZGameKit.keyPressed("1")) { SZGameKit.rpgSave(); }
  if (SZGameKit.keyPressed("2") && SZGameKit.rpgHasSave()) { SZGameKit.rpgLoad(); }
  if (SZGameKit.keyPressed("b")) { SZGameKit.rpgBattleStart("Treino de turnos", 30, 4, 1, ""); SZGameKit.rpgInflict("inimigo", "veneno", 3); }
  if (SZGameKit.keyPressed("c")) { SZGameKit.rpgGiveItem("chave", "", 1); }
  if (SZGameKit.keyPressed("v")) { SZGameKit.rpgRemoveItem("chave"); }
  if (SZGameKit.keyPressed("n")) { SZGameKit.rpgGoMap("praia"); SZGameKit.rpgCutscene(function () { SZGameKit.rpgSay("Chegamos à praia!", "Vizinha"); SZGameKit.rpgWait(0.5); }); }
});
SZGameKit.onDraw(function (ctx) { SZGameKit.drawByDepth(heroi); });
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.drawText("Chaves: " + SZGameKit.rpgCountItem("chave"), 20, 30, 18, "#183653");
  SZGameKit.drawText("Nível: " + SZGameKit.rpgLevel() + " XP: " + SZGameKit.rpgXp(), 20, 55, 18, "#183653");
});
`,
  },
]
