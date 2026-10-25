import { DUELO_DE_HEROIS_PROFISSIONAL_SOURCE } from '../../__gen_dueloDeHeroisProfissional'
import { MURALHA_PROFISSIONAL_SOURCE } from '../../__gen_muralhaProfissional'
import type { AdvancedRecipeSource } from './sources'

export const GAMEPLAY_RECIPE_SOURCES: readonly AdvancedRecipeSource[] = [
  {
    name: 'Painel do lutador',
    description:
      'Use A/D/W ou setas no duelo e acompanhe round, vitórias, combinações, especial e defesa no painel. O soco do jogador 1 usa os quadros da folha do Pinta.',
    difficulty: 'advanced',
    concepts: ['luta', 'animação de golpe', 'rounds', 'combinações', 'painel'],
    genre: 'luta',
    assets: ['heroi-oficina'],
    source: `${DUELO_DE_HEROIS_PROFISSIONAL_SOURCE}
SZGameKit.setScreenText("menu", "Painel do lutador", "P1: A/D/W, F defende, G/H/J atacam. P2: setas, 0 defende, 1/2/3 atacam. Veja os dados da luta no painel.", "Lutar");
SZGameKit.setSheet(heroi1, "heroi-oficina", 32, 32);
SZGameKit.lutaMoveAnim("soco", heroi1, 4, 7);
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.drawText("Round " + SZGameKit.lutaRoundNow() + " Vitórias: " + SZGameKit.lutaWinsOf(heroi1), 20, 130, 18, "#ffffff");
  SZGameKit.drawText("Combinação: " + SZGameKit.lutaComboOf(heroi1) + " Especial: " + SZGameKit.lutaSpecialOf(heroi1), 20, 155, 18, "#ffffff");
  SZGameKit.drawText("Defendendo: " + SZGameKit.lutaIsGuarding(heroi1), 20, 180, 18, "#ffffff");
});
`,
  },
  {
    name: 'Troque a posição das torres',
    description:
      'Use o mouse para comprar torres nos lugares marcados. Segure Shift e clique numa torre para desmontá-la, liberar o lugar e receber 25 moedas. Reorganize a defesa durante as ondas.',
    difficulty: 'advanced',
    concepts: ['defesa de torre', 'reciclagem', 'economia', 'clique', 'lugares de construção'],
    genre: 'defesa de torre',
    assets: [],
    source: `${MURALHA_PROFISSIONAL_SOURCE}
SZGameKit.setScreenText("menu", "Reorganize a defesa", "Clique nos lugares para comprar. Shift + clique numa torre desmonta e devolve 25 moedas. Defenda a muralha!", "Defender");
SZGameKit.onGameClick(function (px, py) {
  if (SZGameKit.keyDown("Shift")) {
    const torre = SZGameKit.nearestActive("torre", px, py);
    if (torre && SZGameKit.pointIn(px, py, torre)) {
      SZGameKit.tdFreeSlot(torre.x + 24, torre.y + 24);
      SZGameKit.recycle(torre);
      SZGameKit.tdAddCoins(25);
    }
  }
});
`,
  },
  {
    name: 'Peças e cartas na mesa',
    description:
      'Clique na grade para marcar casas. O contador mostra quantas estão preenchidas. Espaço vira a carta de cima; Enter troca essa carta por outra da pilha.',
    difficulty: 'intermediate',
    concepts: ['grade', 'contagem', 'listas', 'pilha', 'cartas'],
    genre: 'tabuleiro',
    assets: [],
    source: `
SZGameKit.setup({ width: 640, height: 400, background: "#183653", accent: "#ffd166" });
SZGameKit.setScreenText("menu", "Peças e cartas", "Clique na grade. Espaço vira a carta do topo; Enter troca a carta.", "Experimentar");
SZGameKit.boardCreate("mesa", 8, 4, 0);
let baralho = [SZGameKit.card("Lua", "?"), SZGameKit.card("Sol", "?"), SZGameKit.card("Estrela", "?")];
let descarte = [];
SZGameKit.onGameClick(function (px, py) {
  const coluna = Math.floor((px - 20) / 36);
  const linha = Math.floor((py - 100) / 36);
  if (SZGameKit.boardIn("mesa", coluna, linha)) { SZGameKit.boardSet("mesa", coluna, linha, 1); }
});
SZGameKit.onUpdate(function (dt) {
  if (SZGameKit.keyPressed("Space")) { SZGameKit.cardFlip(SZGameKit.pileTop(baralho)); }
  if (SZGameKit.keyPressed("Enter")) {
    SZGameKit.pileMoveTop(baralho, descarte);
    if (SZGameKit.pileSize(baralho) === 0) { SZGameKit.pileShuffleFrom(baralho, descarte); }
  }
});
SZGameKit.onDraw(function (ctx) {
  SZGameKit.drawBackground("#183653", false);
  for (let linha = 0; linha < 4; linha++) {
    for (let coluna = 0; coluna < 8; coluna++) {
      if (SZGameKit.boardGet("mesa", coluna, linha) === 1) { SZGameKit.drawRectangle(20 + coluna * 36, 100 + linha * 36, 32, 32, "#ffd166"); }
      else { SZGameKit.drawRectangle(20 + coluna * 36, 100 + linha * 36, 32, 32, "#436f70"); }
    }
  }
  SZGameKit.handDraw(baralho, 380, 120, false);
});
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.drawText("Casas marcadas: " + SZGameKit.boardCount("mesa", 1), 20, 35, 20, "#ffffff");
  SZGameKit.drawText("Topo: " + SZGameKit.cardFace(SZGameKit.pileTop(baralho)), 20, 65, 20, "#ffffff");
});
`,
  },
  {
    name: 'O gramado das criaturas',
    description:
      'Explore com setas e encontre criaturas na grama. O painel mostra seu time e nível. Veja as cartas do seu time durante a exploração.',
    difficulty: 'advanced',
    concepts: ['mapa do Pinta', 'criaturas', 'encontros', 'nível'],
    genre: 'RPG',
    assets: ['mapa-oficina', 'heroi-oficina'],
    source: `
SZGameKit.setup({ width: 640, height: 384, background: "#b9e0d0", accent: "#2f83b4" });
SZGameKit.setScreenText("menu", "O gramado das criaturas", "Setas exploram. Ande na grama para encontrar um bichinho. O painel mostra seu time e o nível.", "Explorar");
SZGameKit.loadTilemap("gramado", "mapa-oficina");
SZGameKit.setTileSize(32);
const heroi = SZGameKit.createCharacter({ image: "heroi-oficina", w: 28, h: 30, speed: 120, color: "#2f83b4" });
SZGameKit.sceneAnimation(heroi, "heroi-oficina", "andando", false);
SZGameKit.placeCharacter(heroi, 64, 320);
SZGameKit.rpgSetStartMap("gramado");
SZGameKit.rpgCreateMap("gramado", 20, 12, function (ctx) { SZGameKit.drawBackground("#b9e0d0", false); SZGameKit.drawTilemap("gramado", "chão"); });
SZGameKit.pkmCreature("Folhinha", "planta", 32, 8, 4, 8, "", "");
SZGameKit.pkmCreature("Gotinha", "água", 30, 7, 4, 9, "", "");
SZGameKit.pkmMove("Investida", "Folhinha", "planta", 10, 100, "investida", "#65d5c2");
SZGameKit.pkmMove("Onda", "Gotinha", "água", 10, 100, "onda", "#2f83b4");
SZGameKit.pkmGive("Folhinha", 2);
SZGameKit.pkmGiveBall(5, 80);
SZGameKit.pkmGrassTiles(3, "gramado");
SZGameKit.pkmWild("Gotinha", 1, 2);
SZGameKit.pkmEncounterRate(35);
SZGameKit.onUpdate(function (dt) {
  SZGameKit.rpgMoveGrid(heroi, 32, dt);
});
SZGameKit.onDraw(function (ctx) { SZGameKit.drawCharacter(heroi); });
SZGameKit.onDrawHud(function (ctx) {
  SZGameKit.pkmDrawTeam(20, 25);
  SZGameKit.drawText("Folhinha está no time: " + SZGameKit.pkmHas("Folhinha"), 20, 60, 18, "#183653");
  SZGameKit.drawText("Nível: " + SZGameKit.pkmLevelOf("Folhinha"), 20, 85, 18, "#183653");
});
`,
  },
  {
    name: 'Uma pista de cópias em movimento',
    description:
      'Use setas ou arraste para coletar os objetos do molde. As cópias se movem lateralmente pela pista; o encontro identifica e retira somente a cópia coletada.',
    difficulty: 'advanced',
    concepts: ['perspectiva', 'moldes', 'cópias', 'encontros', 'movimento por segundo'],
    genre: 'corrida',
    assets: ['fundo-oficina', 'heroi-oficina'],
    source: `
SZGameKit.setup({ width: 640, height: 480, background: "#183653", accent: "#ffd166" });
SZGameKit.setScreenText("menu", "Pista de cópias", "Setas ou arraste para coletar. As cópias deslizam de lado e cada encontro identifica o objeto certo.", "Correr");
SZGameKit.addSceneBackdrop("ceu", "fundo-oficina", "far");
SZGameKit.sceneBackdropFit("ceu", "cover");
SZGameKit.createSpriteTrack("pista");
const heroi = SZGameKit.createCharacter({ image: "heroi-oficina", w: 28, h: 32, speed: 0, color: "#2f83b4" });
SZGameKit.defineMold("estrela", { w: 24, h: 24, health: 1, speed: 0, damage: 0, color: "#ffd166", image: "", look: "" });
const estrela = SZGameKit.spawnFromMold("estrela", 0, 0);
SZGameKit.sceneAnimation(heroi, "heroi-oficina", "andando", false);
SZGameKit.trackFollow("pista", heroi);
SZGameKit.trackInput("pista", "both", 120);
SZGameKit.trackLimit("pista", 120, 120);
SZGameKit.trackSpeed("pista", 150);
SZGameKit.trackFinishLine("pista", 3000);
SZGameKit.putTrackSprite("pista", estrela, -70, 400);
SZGameKit.repeatTrackSprite("pista", estrela, 8, 280, "alternate");
let pontos = 0;
SZGameKit.onTrackMoldEncounter("pista", "estrela", function (coletada) { pontos = pontos + 1; SZGameKit.recycle(coletada); });
SZGameKit.onUpdate(function (dt) {
  SZGameKit.forEachTrackSprite(estrela, function (copia) { SZGameKit.trackSpriteVelocity(copia, 7, 0); });
});
SZGameKit.onDrawHud(function (ctx) { SZGameKit.drawText("Coletadas: " + pontos, 20, 35, 24, "#183653"); });
`,
  },
]
