import type { ProjectAsset } from '../../core/project'
import {
  EXAMPLE_BACKDROP_IMAGE,
  EXAMPLE_HERO_IMAGE,
  EXAMPLE_HERO_WALK_SHEET,
  EXAMPLE_TILESET_IMAGE,
} from './examples/shared'

/** Fontes autorais das receitas. O gerador grava IR estática; o editor não carrega o parser. */
interface GameTwoDRecipeSource {
  name: string
  description: string
  concepts: string[]
  source: string
  assets?: ProjectAsset[]
  interactions: ('arrows' | 'space' | 'click' | 'digit-1' | 'choice-2' | 'auto')[]
}

const images: ProjectAsset[] = [
  {
    id: 'receita-fundo',
    name: 'cenario-receita',
    kind: 'image',
    source: 'library',
    dataUrl: EXAMPLE_BACKDROP_IMAGE,
    width: 32,
    height: 24,
  },
  {
    id: 'receita-heroi',
    name: 'heroi-receita',
    kind: 'image',
    source: 'library',
    dataUrl: EXAMPLE_HERO_IMAGE,
    width: 32,
    height: 32,
  },
  {
    id: 'receita-folha',
    name: 'folha-receita',
    kind: 'image',
    source: 'library',
    dataUrl: EXAMPLE_HERO_WALK_SHEET,
    width: 128,
    height: 32,
    sprite: {
      frameW: 32,
      frameH: 32,
      animations: [{ name: 'andando', from: 0, to: 3, fps: 8, loop: true }],
    },
  },
]

function toneAsset(): ProjectAsset {
  const samples = 1600
  const bytes = new Uint8Array(44 + samples * 2)
  const view = new DataView(bytes.buffer)
  const text = (offset: number, value: string) =>
    [...value].forEach((char, index) => {
      bytes[offset + index] = char.charCodeAt(0)
    })
  text(0, 'RIFF')
  view.setUint32(4, bytes.length - 8, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 8000, true)
  view.setUint32(28, 16000, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, samples * 2, true)
  for (let i = 0; i < samples; i++)
    view.setInt16(
      44 + i * 2,
      Math.round(Math.sin((i * Math.PI * 880) / 8000) * 4000 * (1 - i / samples)),
      true,
    )
  return {
    id: 'receita-som',
    name: 'sinal-receita',
    kind: 'audio',
    source: 'upload',
    dataUrl: `data:audio/wav;base64,${btoa(String.fromCharCode(...bytes))}`,
  }
}

const mapAsset: ProjectAsset = {
  id: 'receita-mapa',
  name: 'mapa-do-pinta',
  kind: 'image',
  source: 'upload',
  dataUrl: EXAMPLE_TILESET_IMAGE,
  width: 64,
  height: 32,
  tilemap: {
    tileSize: 32,
    cols: 12,
    rows: 8,
    grid: '. . . . . . . . . . . .;. . . . . . . . . . . .;. . . . . . . . . . . .;. . . . . . . . . . . .;. . . . . . . . . . . .;. . . . 1 1 . . . . . .;. . . . . . . . . . . .;1 1 1 1 1 1 1 1 1 1 1 1',
    solid: [1],
    tileset: { dataUrl: EXAMPLE_TILESET_IMAGE, width: 64, height: 32 },
  },
}

export const GAME_TWO_D_RECIPE_SOURCES: readonly GameTwoDRecipeSource[] = [
  {
    name: 'Meu personagem do Pinta',
    description:
      'Setas movem o personagem. Espaço toca uma animação uma vez; ao terminar ele volta a andar. A tecla I troca a imagem e R recomeça.',
    concepts: ['Pinta', 'animação de uma vez', 'animação por estado', 'folha de quadros'],
    assets: images,
    interactions: ['arrows', 'space'],
    source: `
SZGame2D.setupStage(640, 360, '#102238');
SZGame2D.setStageDescription('Use setas para andar, Espaço para animar uma vez, I para trocar a imagem e R para recomeçar.');
SZGame2D.useFont('nunito');
const heroi = SZGame2D.createSprite({image:'heroi-receita',x:260,y:180,w:64,h:64});
const folha = SZGame2D.loadSpriteSheet('folha-receita', 32, 32);
let modoVisual = 'automatico';
SZGame2D.setStateAnimation(heroi, 'parado', folha, 0, 0, 1);
SZGame2D.setStateAnimation(heroi, 'andando', folha, 0, 3, 8);
SZGame2D.onKey('Space', function () {
  SZGame2D.playAnimationOnce(heroi, folha, 0, 3, 5);
  modoVisual = 'uma-vez';
});
SZGame2D.onKey('i', function () { SZGame2D.setImage(heroi, 'heroi-receita'); modoVisual = 'imagem'; });
SZGame2D.onKey('r', function () { SZGame2D.restart(); });
SZGame2D.gameLoop(function () {
  SZGame2D.clear();
  SZGame2D.drawBackdrop(ctx, 'cenario-receita');
  SZGame2D.topDown(heroi, 3);
  SZGame2D.clampToScreen(heroi, ctx);
  if (modoVisual === 'uma-vez') {
    if (SZGame2D.animationEnded(heroi)) { modoVisual = 'automatico'; }
  } else if (modoVisual === 'automatico') { SZGame2D.autoAnimate(heroi); }
  SZGame2D.drawSprite(ctx, heroi);
  SZGame2D.drawFrame(ctx, folha, 0, 20, 80, 32, 32);
  SZGame2D.drawFrame(ctx, folha, 3, 58, 80, 32, 32);
  SZGame2D.drawLabel(ctx, 'Meu desenho em movimento', 20, 28, '#ffffff', 24, 'left');
  SZGame2D.drawLabel(ctx, 'Setas: andar | Espaço: uma vez | I: imagem | R: recomeçar', 20, 54, '#ffffff', 16, 'left');
});`,
  },
  {
    name: 'Placas e camadas',
    description:
      'Clique nas placas para trazê-las à frente. As teclas 1 e 2 mudam a letra e o tamanho; 3 manda a placa para trás e 4 muda sua visibilidade.',
    concepts: ['sprites de texto', 'tamanho', 'camadas', 'visibilidade', 'clique'],
    assets: images,
    interactions: ['click', 'digit-1', 'choice-2'],
    source: `
SZGame2D.setupStage(640, 360, '#102238');
SZGame2D.setStageDescription('Clique nas placas. Teclas 1 e 2 ampliam letra e caixa, 3 manda para trás, 4 muda visibilidade e R recomeça.');
const placas = SZGame2D.createGroup();
const primeira = SZGame2D.createTextSprite('Olá, criador!', 100, 120);
SZGame2D.setTextImage(primeira, 'cenario-receita', 'middle');
SZGame2D.setSize(primeira, 280, 150);
SZGame2D.setTextStyle(primeira, 22, '#142d39');
SZGame2D.addToGroup(placas, primeira);
const segunda = SZGame2D.createTextSprite('Toque para escolher', 240, 170);
SZGame2D.setTextBox(segunda, 250, 'center', 12, '#fbd270');
SZGame2D.setTextStyle(segunda, 20, '#142d39');
SZGame2D.addToGroup(placas, segunda);
let selecionada = primeira;
SZGame2D.onGroupClick(placas, function (placa) { selecionada = placa; SZGame2D.bringToFront(placas, placa); });
SZGame2D.onKey('1', function () { SZGame2D.scaleTextSize(selecionada, 1.1); });
SZGame2D.onKey('2', function () { SZGame2D.scaleSprite(selecionada, 1.1); });
SZGame2D.onKey('3', function () { SZGame2D.sendToBack(placas, selecionada); });
SZGame2D.onKey('4', function () { SZGame2D.setOpacity(selecionada, 50); });
SZGame2D.onKey('r', function () { SZGame2D.restart(); });
SZGame2D.gameLoop(function () {
  SZGame2D.clear(); SZGame2D.drawGroup(ctx, placas);
  SZGame2D.drawLabel(ctx, 'Escolhida: ' + SZGame2D.spriteText(selecionada), 20, 28, '#ffffff', 20, 'left');
  SZGame2D.drawLabel(ctx, 'Caixa: ' + SZGame2D.spriteW(selecionada) + ' × ' + SZGame2D.spriteH(selecionada), 20, 54, '#a7ddff', 16, 'left');
  SZGame2D.drawLabel(ctx, 'Clique | 1 letra | 2 caixa | 3 atrás | 4 transparência | R reinicia', 20, 335, '#ffffff', 15, 'left');
});`,
  },
  {
    name: 'Quatro jeitos de mover',
    description:
      'Escolha 1 para voo com inércia, 2 para bater asas, 3 para seguir o ponteiro ou 4 para pilotar com impulso. Um companheiro acompanha você.',
    concepts: ['movimento', 'inércia', 'impulso', 'ponteiro', 'direção'],
    interactions: ['digit-1', 'arrows', 'choice-2', 'space'],
    source: `
SZGame2D.setupStage(640, 360, '#132336');
SZGame2D.setStageDescription('Escolha um modo com 1 a 4. Setas ou toque movem, e Espaço impulsiona no modo 4. R recomeça.');
const heroi = SZGame2D.createSprite({x:280,y:140,w:30,h:30,color:'#66e8c0'});
const amigo = SZGame2D.createSprite({x:80,y:220,w:18,h:18,color:'#ffce63'});
let modo = 1;
SZGame2D.setGravity(0.25);
SZGame2D.onKey('1', function () { modo = 1; });
SZGame2D.onKey('2', function () { modo = 2; });
SZGame2D.onKey('3', function () { modo = 3; });
SZGame2D.onKey('4', function () { modo = 4; SZGame2D.pointSprite(heroi, -90); });
SZGame2D.onKey('r', function () { SZGame2D.restart(); });
SZGame2D.gameLoop(function () {
  SZGame2D.clear();
  if (modo === 1) { SZGame2D.flyFree(heroi, 4); SZGame2D.clampToScreen(heroi, ctx); }
  if (modo === 2) { SZGame2D.applyGravity(heroi); SZGame2D.flap(heroi, ctx, 6); SZGame2D.bounceOnEdges(heroi, ctx); }
  if (modo === 3) { SZGame2D.followPointer(heroi, 4); SZGame2D.clampToScreen(heroi, ctx); }
  if (modo === 4) {
    if (SZGame2D.keyDown('ArrowLeft')) { SZGame2D.rotateSprite(heroi, -4); }
    if (SZGame2D.keyDown('ArrowRight')) { SZGame2D.rotateSprite(heroi, 4); }
    if (SZGame2D.keyDown('Space')) { SZGame2D.thrust(heroi, 0.2); }
    SZGame2D.applyFriction(heroi, 0.99); SZGame2D.applyVelocity(heroi); SZGame2D.wrapEdges(heroi, ctx);
  }
  if (SZGame2D.distance(amigo, heroi) > 50) { SZGame2D.moveToward(amigo, heroi, 1.5); }
  SZGame2D.pointSprite(amigo, SZGame2D.angleTo(amigo, heroi));
  SZGame2D.drawSprite(ctx, heroi); SZGame2D.drawSprite(ctx, amigo);
  SZGame2D.drawLabel(ctx, 'Modo ' + modo + ' | 1 voo | 2 asas | 3 ponteiro | 4 impulso', 18, 25, '#ffffff', 18, 'left');
  SZGame2D.drawLabel(ctx, 'Velocidade: ' + SZGame2D.spriteSpeed(heroi) + ' | direção: ' + SZGame2D.spriteAngleDeg(heroi), 18, 52, '#a7ddff', 16, 'left');
  if (SZGame2D.isMoving(heroi)) { SZGame2D.drawLabel(ctx, 'Em movimento', 18, 78, '#66e8c0', 16, 'left'); }
  if (SZGame2D.isMovingV(heroi)) { SZGame2D.drawLabel(ctx, 'Subindo ou descendo', 18, 102, '#ffce63', 16, 'left'); }
});`,
  },
  {
    name: 'Caixas, círculos e plataformas',
    description:
      'Ande e pule nas plataformas. A caixa de contato mostra por que o círculo amarelo é coletado. O bloco vermelho tira vida com recarga; R recomeça.',
    concepts: ['colisão sólida', 'plataformas', 'colisão circular', 'vida', 'recarga'],
    interactions: ['arrows', 'space'],
    source: `
SZGame2D.setupStage(640, 360, '#142436');
SZGame2D.setStageDescription('Setas movem e Espaço pula. Alcance a moeda amarela; o bloco vermelho tira vida com recarga. R recomeça.');
const heroi = SZGame2D.createSprite({x:40,y:240,w:28,h:36,color:'#66e8c0'});
const chao = SZGame2D.createSprite({x:0,y:330,w:640,h:30,color:'#35556a'});
const degrau = SZGame2D.createSprite({x:130,y:265,w:140,h:14,color:'#79a7c2'});
const plataformas = SZGame2D.createGroup();
SZGame2D.spawn(plataformas, {x:330,y:205,w:150,h:14,color:'#79a7c2'});
const perigo = SZGame2D.createSprite({x:270,y:300,w:40,h:30,color:'#f96d78'});
const moeda = SZGame2D.createSprite({x:390,y:166,w:24,h:24,color:'#ffce63'});
let coletou = false;
SZGame2D.setGravity(0.4); SZGame2D.setHealth(heroi, 3);
SZGame2D.onOverlap(() => heroi, () => moeda, function () {
  if (SZGame2D.circleCollides(heroi, moeda)) { coletou = true; SZGame2D.destroySprite(moeda); }
});
SZGame2D.onKey('r', function () { SZGame2D.restart(); });
SZGame2D.gameLoop(function () {
  SZGame2D.clear();
  if (SZGame2D.hasHealth(heroi)) {
    SZGame2D.applyGravity(heroi); SZGame2D.platformer(heroi, ctx, 3, 10);
    SZGame2D.collideSprite(heroi, chao); SZGame2D.collidePlatform(heroi, degrau); SZGame2D.collidePlatformGroup(heroi, plataformas);
    if (SZGame2D.touches(heroi, perigo)) { SZGame2D.withCooldown(heroi, 60, function () { SZGame2D.damageSprite(heroi, 1, 60); }, 'perigo'); }
    SZGame2D.drawSprite(ctx, heroi); SZGame2D.drawHitbox(heroi);
  } else { SZGame2D.showGameOver(ctx, 'Sem vidas. Aperte R para recomeçar.'); }
  SZGame2D.drawSprite(ctx, chao); SZGame2D.drawSprite(ctx, degrau); SZGame2D.drawSprite(ctx, perigo); SZGame2D.drawGroup(ctx, plataformas);
  if (!coletou) { SZGame2D.drawSprite(ctx, moeda); SZGame2D.drawHitbox(moeda); }
  SZGame2D.drawSpriteHealth(ctx, heroi, 'hearts', 18, 16, 20, '#66e8c0');
  if (coletou) { SZGame2D.drawLabel(ctx, 'Você alcançou a moeda! R recomeça.', 150, 40, '#ffce63', 20, 'left'); }
});`,
  },
  {
    name: 'Mesa de som',
    description:
      '1 toca um arquivo, 2 para o efeito, 3 repete como música e 4 para a música. As teclas 5 e 6 tocam uma nota e um tom. O arquivo está no projeto.',
    concepts: ['som de arquivo', 'música', 'nota', 'tom', 'volume'],
    assets: [toneAsset()],
    interactions: ['digit-1', 'choice-2'],
    source: `
SZGame2D.setupStage(640, 360, '#17243b');
SZGame2D.setStageDescription('Use 1 a 6 para experimentar sons. 1 toca, 2 para, 3 repete, 4 para músicas, 5 nota e 6 tom.');
SZGame2D.loadSound('sinal', 'sinal-receita'); SZGame2D.setSoundVolume(5);
let ultima = 'Escolha um som';
SZGame2D.onKey('1', function () { SZGame2D.playClip('sinal'); ultima = 'Efeito de arquivo'; });
SZGame2D.onKey('2', function () { SZGame2D.stopClip('sinal'); ultima = 'Efeito parado'; });
SZGame2D.onKey('3', function () { SZGame2D.playTrack('sinal'); ultima = 'Arquivo repetindo como música'; });
SZGame2D.onKey('4', function () { SZGame2D.stopTrack('all'); ultima = 'Música parada'; });
SZGame2D.onKey('5', function () { SZGame2D.playNote('C', 300); ultima = 'Nota dó'; });
SZGame2D.onKey('6', function () { SZGame2D.playSound(660, 300); ultima = 'Tom de 660 Hz'; });
SZGame2D.gameLoop(function () {
  SZGame2D.clear();
  SZGame2D.drawLabel(ctx, 'Mesa de som', 35, 55, '#ffce63', 32, 'left');
  SZGame2D.drawLabel(ctx, '1 tocar | 2 parar efeito | 3 música | 4 parar músicas', 35, 110, '#ffffff', 19, 'left');
  SZGame2D.drawLabel(ctx, '5 nota | 6 tom | volume inicial: 5 de 10', 35, 148, '#ffffff', 19, 'left');
  SZGame2D.drawLabel(ctx, ultima, 35, 230, '#66e8c0', 24, 'left');
});`,
  },
  {
    name: 'Mapa do Pinta e duas fases',
    description:
      'Setas movem e Espaço pula pelo mapa do Pinta. N troca para uma fase vetorial, onde encostar na moeda a recolhe; R restaura a fase e a moeda. A câmera acompanha e as plataformas são atravessáveis por baixo.',
    concepts: [
      'mapa do Pinta',
      'mapa vetorial',
      'Mundo',
      'Fase',
      'câmera',
      'reinício',
      'encontro com grupo',
    ],
    assets: [mapAsset],
    interactions: ['arrows', 'space'],
    source: `
SZGame2D.defineShape('grama', function (ctx) { SZGame2D.paintRect(ctx, 0, 0, SZGame2D.shapeW(), SZGame2D.shapeH(), '#456c39'); SZGame2D.paintLine(ctx, 0, 2, SZGame2D.shapeW(), 2, '#83cf67', 4); });
SZGame2D.setupStage(480, 320, '#19394b');
const pecas = SZGame2D.createVectorTileset(32);
SZGame2D.defineVectorTile(pecas, 1, 'grama', 'solid');
SZGame2D.setStageDescription('Setas movem, Espaço pula, N troca a fase e R restaura a fase atual.');
const heroi = SZGame2D.createSprite({x:40,y:190,w:24,h:30,color:'#ffce63'});
const mapa = SZGame2D.createTileMapFromAsset('mapa-do-pinta');
SZGame2D.placeTileMap(mapa, 0, 0, 40);
const mundo = SZGame2D.createWorld(480, 320);
SZGame2D.addTileMapToWorld(mundo, mapa);
const apoios = SZGame2D.createGroup(); SZGame2D.spawn(apoios, {x:40,y:240,w:80,h:12,color:'#76b4cf'});
SZGame2D.addPlatformGroupToWorld(mundo, apoios);
const fase = SZGame2D.createLevel(mundo, 40, 190);
const mapa2 = SZGame2D.createVectorTileMap(pecas, '. . . . . . . . . . . . . . . . . .;. . . . . . . . . . . . . . . . . .;. . . . . . . . . . . . . . . . . .;. . . . . . . . . . . . . . . . . .;. . . . . . . . . . . . . . . . . .;. . . . . . . . . . . . . . . . . .;. . . . 1 1 . . . . . . 1 1 . . . .;1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1');
const mundo2 = SZGame2D.createWorldFromTileMap(mapa2, 40);
const fase2 = SZGame2D.createLevel(mundo2, 40, 190);
const moedas = SZGame2D.createGroup();
SZGame2D.resetGroupWithLevel(fase2, moedas); SZGame2D.setGravity(0.4);
SZGame2D.onLevelEnter(() => fase2, function () { SZGame2D.spawn(moedas, {x:400,y:220,w:20,h:20,color:'#ffce63'}); });
SZGame2D.onTouchGroup(() => heroi, () => moedas, function (moeda) { SZGame2D.removeFromGroup(moedas, moeda); });
SZGame2D.enterLevel(fase, heroi);
SZGame2D.onKey('n', function () { if (SZGame2D.levelIsActive(fase)) { SZGame2D.enterLevel(fase2, heroi); } else { SZGame2D.enterLevel(fase, heroi); } });
SZGame2D.onKey('r', function () { if (SZGame2D.levelIsActive(fase)) { SZGame2D.restartLevel(fase, heroi); } else { SZGame2D.restartLevel(fase2, heroi); } });
SZGame2D.onKey('e', function () { if (SZGame2D.levelIsActive(fase)) { SZGame2D.setTileAtSprite(mapa, 1, heroi); } });
SZGame2D.gameLoop(function () {
  SZGame2D.clear(); SZGame2D.applyGravity(heroi);
  SZGame2D.arrowsX(heroi, 3); SZGame2D.jumpWithTerrain(heroi, 9);
  SZGame2D.collideCurrentLevel(heroi); SZGame2D.followCurrentLevelCamera(heroi); SZGame2D.drawCurrentLevel(ctx);
  SZGame2D.drawGroup(ctx, moedas); SZGame2D.drawSprite(ctx, heroi);
  SZGame2D.drawLabel(ctx, 'N troca fase | R restaura | E põe peça no mapa do Pinta', 12, 24, '#ffffff', 15, 'left');
  SZGame2D.drawLabel(ctx, 'Câmera: ' + SZGame2D.cameraX() + ', ' + SZGame2D.cameraY(), 12, 47, '#ffce63', 15, 'left');
});`,
  },
  {
    name: 'Pista do meu desenho',
    description:
      'Desça a pista com as setas, escolha a vista com 1, 2 ou 3 e alcance a chegada. As bandeiras se movem; o placar mostra a distância percorrida.',
    concepts: ['pista', 'perspectiva', 'distância', 'câmera', 'chegada'],
    assets: images,
    interactions: ['arrows', 'digit-1', 'choice-2'],
    source: `
SZGame2D.setupStage(480, 540, '#d8edf5');
SZGame2D.setStageDescription('Setas viram, 1, 2 e 3 escolhem a vista. Chegue ao fim da pista. Enter começa e R recomeça.');
SZGame2D.addSceneBackdrop('ceu', 'cenario-receita', 'far'); SZGame2D.sceneBackdropFit('ceu', 'cover');
SZGame2D.createSpriteTrack('pista');
const heroi = SZGame2D.createSprite({image:'heroi-receita',x:0,y:0,w:42,h:42});
const bandeira = SZGame2D.createSprite({x:0,y:0,w:24,h:60,color:'#fa6868'});
SZGame2D.trackPlayer('pista', heroi, 3); SZGame2D.trackControls('pista', 140, 120);
SZGame2D.trackTravel('pista', 160, 600); SZGame2D.putTrackSpriteAt('pista', bandeira, 'left', 180);
SZGame2D.trackSpriteVelocity(bandeira, 30, 0); SZGame2D.trackCameraView('pista', 'wide');
SZGame2D.sceneGameScreens('Pista do meu desenho', 'Use setas e chegue ao fim. 1, 2 e 3 mudam a vista.');
SZGame2D.onTrackFinish('pista', function () { SZGame2D.sceneResult('won'); });
SZGame2D.onKey('1', function () { SZGame2D.trackCameraView('pista', 'near'); });
SZGame2D.onKey('2', function () { SZGame2D.trackCameraView('pista', 'wide'); });
SZGame2D.onKey('3', function () { SZGame2D.trackCameraView('pista', 'high'); });
SZGame2D.gameLoop(function () { SZGame2D.drawLabel(ctx, 'Distância: ' + SZGame2D.spriteTrackValue('pista', 'distance'), 12, 115, '#173d52', 18, 'left'); });`,
  },
  {
    name: 'Inimigo que muda ao levar dano',
    description:
      'Desvie com as setas e atire com Espaço. Ao levar dano, o inimigo passa a perseguir o jogador. Seus raios tiram vida com invencibilidade; R recomeça.',
    concepts: ['tipo de inimigo', 'comportamentos', 'animação', 'dano', 'raio'],
    assets: images,
    interactions: ['arrows', 'space'],
    source: `
const guardas = SZGame2D.createSmartEnemyType({smart:'basica',color:'#f96d78',image:'heroi-receita',hp:4,speed:1,dmg:1,w:48,h:48});
SZGame2D.setupStage(640, 360, '#142436');
SZGame2D.addEnemyTypeBehavior(guardas, 'raio');
SZGame2D.setStageDescription('Setas movem, Espaço atira. O inimigo passa a perseguir ao levar dano. Desvie do raio. R recomeça.');
const heroi = SZGame2D.createSprite({x:300,y:280,w:26,h:26,color:'#66e8c0'});
const tiros = SZGame2D.createGroup(); const folha = SZGame2D.loadSpriteSheet('folha-receita', 32, 32);
SZGame2D.setEnemyStateAnimation(guardas, 'parado', folha, 0, 3, 6);
const mundo = SZGame2D.createWorld(640, 360); SZGame2D.addEnemyTypeToWorld(mundo, guardas);
SZGame2D.spawnEnemy(guardas, 300, 100); SZGame2D.setHealth(heroi, 3);
let dano = 1; let venceu = false;
SZGame2D.onEnemyHurt(guardas, function (inimigo) { SZGame2D.addEnemyTypeBehavior(guardas, 'perseguidor-lado'); dano = SZGame2D.enemyDamage(inimigo); });
SZGame2D.onEnemyDefeated(guardas, function (inimigo) { venceu = true; });
SZGame2D.onKey('Space', function () { SZGame2D.spawn(tiros, {x:SZGame2D.centerX(heroi),y:SZGame2D.spriteY(heroi),w:6,h:12,color:'#ffce63',vx:0,vy:-7}); });
SZGame2D.onKey('r', function () { SZGame2D.restart(); });
SZGame2D.gameLoop(function () {
  SZGame2D.clear(); SZGame2D.topDown(heroi, 3); SZGame2D.clampToScreen(heroi, ctx);
  SZGame2D.updateEnemyType(guardas, ctx, heroi); SZGame2D.drawEnemyType(ctx, guardas);
  SZGame2D.updateGroup(tiros); SZGame2D.drawGroup(ctx, tiros);
  SZGame2D.overlapGroups(tiros, guardas, function (tiro, inimigo) { SZGame2D.changeHealth(inimigo, -1); SZGame2D.removeFromGroup(tiros, tiro); });
  SZGame2D.overlapEnemyBeams(() => heroi, guardas, function (dono) { SZGame2D.hurtByEnemy(heroi, dono); });
  SZGame2D.drawSprite(ctx, heroi); SZGame2D.drawSpriteHealth(ctx, heroi, 'hearts', 18, 18, 20, '#66e8c0');
  SZGame2D.drawLabel(ctx, 'Dano do inimigo: ' + dano, 170, 32, '#ffffff', 17, 'left');
  if (venceu) { SZGame2D.drawLabel(ctx, 'Você venceu! R recomeça.', 160, 200, '#ffce63', 24, 'left'); }
  if (SZGame2D.healthDepleted(heroi)) { SZGame2D.showGameOver(ctx, 'Tente de novo com R.'); }
  SZGame2D.pruneOffscreen(ctx, tiros, 40, function (tiro) {});
});`,
  },
  {
    name: 'Tela que acompanha a janela',
    description:
      'Toque ou aperte uma tecla para começar. O personagem pula na borda da tela, que acompanha a janela. Veja o tamanho do jogo e os quadros por segundo.',
    concepts: ['tela responsiva', 'entrada', 'pulo', 'inspeção'],
    assets: images,
    interactions: ['space', 'click'],
    source: `
SZGame2D.setupStageFull('#17354b');
SZGame2D.setStageDescription('Toque ou aperte qualquer tecla para começar. Espaço ou toque pula. R recomeça. A tela acompanha a janela.');
const heroi = SZGame2D.createSprite({image:'heroi-receita',x:40,y:80,w:48,h:48});
SZGame2D.setGravity(0.4); SZGame2D.setScene('inicio');
SZGame2D.onAnyInput(function () { if (SZGame2D.sceneIs('inicio')) { SZGame2D.setScene('jogando'); } });
SZGame2D.onKey('r', function () { SZGame2D.restart(); });
SZGame2D.gameLoop(function () {
  SZGame2D.clear();
  if (SZGame2D.sceneIs('inicio')) {
    SZGame2D.showImageScreen(ctx, 'cenario-receita');
    SZGame2D.drawLabel(ctx, 'Toque ou aperte uma tecla', 20, 45, '#17354b', 24, 'left');
  } else {
    SZGame2D.applyGravity(heroi); SZGame2D.jumpOnGround(heroi, ctx, 10); SZGame2D.drawSprite(ctx, heroi);
    SZGame2D.drawLabel(ctx, 'Tela: ' + SZGame2D.stageWidth() + ' × ' + SZGame2D.stageHeight(), 20, 65, '#ffffff', 20, 'left');
    SZGame2D.showFps(20, 30);
  }
});`,
  },
]
