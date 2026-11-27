/**
 * Os projetos da missão do Construtor, A Estação de Reciclagem, em 2D e em 3D.
 *
 * Uma missão não ensina montando: o projeto de cada etapa é o ponto de partida da etapa seguinte, e
 * o gabarito de cada etapa só existe para o Verificar provar que a regra pode ser cumprida. A
 * preparação é a do limite de autoria do currículo (`authoringBoundary` do Construtor): telas de
 * início, vitória e derrota, Enter e reinício, estado inicial (placar, meta e três vidas), o coletor
 * que anda para os lados dentro da tela e os dois grupos vazios, já desenhados. No 3D também vem
 * pronto o transporte da esteira (cada grupo anda para a câmera e é retirado longe dela), como a
 * proposta dos cursos base separou.
 *
 * A criança programa, etapa por etapa:
 * - `esteira`: os dois relógios que criam as peças nas faixas fixas, só no estado jogando (no 2D,
 *   também o movimento dos grupos e a retirada de quem sai da tela);
 * - `coleta`: o encontro com a peça reciclável (soma um e a peça sai) e com a proibida (tira uma
 *   vida e a peça sai);
 * - `resultado`: vida zero termina em derrota; a meta termina em vitória;
 * - `meta-nova`: a equipe pede uma meta nova (15 no 2D, 12 no 3D) e a condição de vitória
 *   precisa acompanhar.
 *
 * O código segue o dos cursos base: a Nave Contra Asteroides (2D) e a Patrulha Espacial (3D).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { StudioAuthoringProject } from '../../../packages/core/src/studio/authoring-project'
import {
  COURSE_MODEL_LIB_PREFIX,
  courseModelStub,
} from '../../../packages/studio/src/core/courseModels'
import type { ProjectAsset } from '../../../packages/studio/src/core/project'
import { exportFromSource } from './construtor-base-projetos'
import {
  ESTACAO_CATEGORIAS,
  ESTACAO_PECAS,
  ESTACAO_TAMANHO,
  type EstacaoCategoria,
  type EstacaoModelo,
  type EstacaoPeca,
  MODELOS_ESTACAO_JSON,
} from './publicar-estacao-modelos'

export const ESTACAO_CURSO = 'jornada-construtor-missao'
export const ESTACAO_ETAPAS = ['inicio', 'esteira', 'coleta', 'resultado', 'meta-nova'] as const
export type EstacaoEtapa = (typeof ESTACAO_ETAPAS)[number]
export type EstacaoDimensao = '2d' | '3d'

/** O visual de partida (a versão do vídeo e do caderno). Trocar a variação não muda o jogo. */
export const ESTACAO_PADRAO = {
  coletor: 'coletor-carrinho-azul',
  reciclavel: 'reciclavel-garrafa-pet',
  proibido: 'proibido-pilha',
  galpao: 'galpao-menta',
} as const satisfies Record<EstacaoCategoria, EstacaoPeca>
export const ESTACAO_OPCOES = ESTACAO_CATEGORIAS

/** As regras de cada dimensão, que o enunciado diz e os objetivos conferem. */
export const ESTACAO_REGRAS = {
  '2d': {
    meta: 10,
    metaNova: 15,
    vidas: 3,
    /**
     * As três faixas: x de quem nasce (a peça tem 72 de largura e nasce acima da tela). As esteiras
     * do fundo ficam centradas em 112, 400 e 688: o coletor encostado numa borda da tela (segurar a
     * seta) fica embaixo da esteira daquele lado.
     */
    faixas: { esquerda: 76, meio: 364, direita: 652 },
    nasceY: -72,
    velocidade: 3,
    intervaloReciclavel: 1.6,
    intervaloProibido: 2.2,
    coletor: { x: 348, y: 392, w: 104, h: 76 },
    peca: 72,
  },
  '3d': {
    meta: 10,
    metaNova: 12,
    vidas: 3,
    faixas: { esquerda: -4, meio: 0, direita: 4 },
    nasceZ: -34,
    alturaPeca: 1.5,
    alturaColetor: 1.4,
    velocidade: 7,
    intervaloReciclavel: 1.6,
    intervaloProibido: 2.2,
  },
} as const

const ARTE_2D = resolve(import.meta.dirname, '../../design/construtor-estacao-blender/arte2d')
const modelos = JSON.parse(readFileSync(MODELOS_ESTACAO_JSON, 'utf8')) as Record<
  EstacaoPeca,
  EstacaoModelo
>

/** As 16 imagens do 2D, embutidas (os galpões em WebP, o resto em SVG). */
export function estacaoAssets2D(): ProjectAsset[] {
  return ESTACAO_PECAS.map((peca) => {
    const webp = peca.startsWith('galpao-')
    const bytes = readFileSync(resolve(ARTE_2D, `${peca}.${webp ? 'webp' : 'svg'}`))
    const svg = webp ? '' : bytes.toString('utf8')
    const medida = webp
      ? { width: 800, height: 480 }
      : {
          width: Number(/width="(\d+)"/.exec(svg)?.[1]),
          height: Number(/height="(\d+)"/.exec(svg)?.[1]),
        }
    return {
      id: `construtor-estacao-2d-${peca}`,
      name: peca,
      kind: 'image' as const,
      source: 'library' as const,
      dataUrl: `data:image/${webp ? 'webp' : 'svg+xml'};base64,${bytes.toString('base64')}`,
      ...medida,
    }
  })
}

/** A referência compacta de um modelo da Estação (o que vai nas aulas). */
export function referenciaEstacao(peca: EstacaoPeca): ProjectAsset {
  const m = modelos[peca]
  if (!m) throw new Error(`Modelo ausente em modelos.json: ${peca}`)
  return {
    id: `construtor-estacao-${peca}`,
    name: peca,
    kind: 'model3d',
    source: 'library',
    libId: `${COURSE_MODEL_LIB_PREFIX}${m.sha}`,
    originalFileName: `${peca}.glb`,
    dataUrl: courseModelStub(m.sha, []),
  }
}
export const estacaoAssets3D = (): ProjectAsset[] => ESTACAO_PECAS.map(referenciaEstacao)

/** As mesmas peças com o GLB inteiro (arquivo portátil de importação). */
export function estacaoAssets3DPortateis(): ProjectAsset[] {
  return ESTACAO_PECAS.map((peca) => {
    const m = modelos[peca]
    const modulo = readFileSync(
      resolve(
        import.meta.dirname,
        `../../../packages/studio/src/core/course-models/m-${m.sha}.generated.ts`,
      ),
      'utf8',
    )
    const dataUrl = /export default '([^']+)'/.exec(modulo)?.[1]
    if (!dataUrl) throw new Error(`Módulo da biblioteca ilegível: ${peca}`)
    return { ...referenciaEstacao(peca), dataUrl }
  })
}

const nivel = (etapa: EstacaoEtapa) => {
  const n = ESTACAO_ETAPAS.indexOf(etapa)
  if (n < 0) throw new Error(`Etapa desconhecida da Estação: ${etapa}`)
  return (ate: EstacaoEtapa) => n >= ESTACAO_ETAPAS.indexOf(ate)
}

// ---------------------------------------------------------------------------------------------
// 2D (o jeito da Nave Contra Asteroides)
// ---------------------------------------------------------------------------------------------
/**
 * `soDerrota`: a etapa do resultado só com a derrota (o caderno desenha os encaixes do resultado em
 * duas folhas: primeiro a derrota, depois a vitória no senão).
 */
export function fonteEstacao2D(etapa: EstacaoEtapa, soDerrota = false): string {
  const tem = nivel(etapa)
  const r = ESTACAO_REGRAS['2d']
  const p = ESTACAO_PADRAO
  const meta = tem('meta-nova') ? r.metaNova : r.meta
  const peca = (grupo: string, imagem: string, x: number) =>
    `SZGame2D.spawn(${grupo}, { x: ${x}, y: ${r.nasceY}, w: ${r.peca}, h: ${r.peca}, image: "${imagem}", vx: 0, vy: ${r.velocidade} });`
  const regras: string[] = []
  if (tem('esteira'))
    regras.push(`SZGame2D.updateGroup(reciclaveis);
    SZGame2D.updateGroup(proibidos);
    SZGame2D.pruneOffscreen(ctx, reciclaveis, 40, (foraDaTela) => {

    });
    SZGame2D.pruneOffscreen(ctx, proibidos, 40, (foraDaTela) => {

    });`)
  if (tem('coleta'))
    regras.push(`SZGame2D.overlapSpriteGroup(() => coletor, reciclaveis, (pecaReciclavel) => {
      SZGame2D.removeFromGroup(reciclaveis, pecaReciclavel);
      SZGame2D.playFx("coin");
      pontos = pontos + 1;
    });
    SZGame2D.overlapSpriteGroup(() => coletor, proibidos, (pecaProibida) => {
      SZGame2D.removeFromGroup(proibidos, pecaProibida);
      SZGame2D.damageSprite(coletor, 1, 60);
      SZGame2D.playFx("hit");
    });`)
  if (tem('resultado'))
    regras.push(
      soDerrota
        ? `if (SZGame2D.healthDepleted(coletor)) {
      SZGame2D.setScene("derrota");
    }`
        : `if (SZGame2D.healthDepleted(coletor)) {
      SZGame2D.setScene("derrota");
    } else {
      if (pontos >= meta) {
        SZGame2D.setScene("vitoria");
      }
    }`,
    )
  // Cada relógio é uma raiz "A cada N segundos" própria (o gerador põe cada uma no seu laço).
  const relogios = tem('esteira')
    ? `
SZGame2D.gameLoop(function __szPeriodicLoop() {
  if (SZGame2D.everySeconds("cada", ${r.intervaloReciclavel})) {
    if (SZGame2D.sceneIs("jogando")) {
      ${peca('reciclaveis', p.reciclavel, r.faixas.esquerda)}
      ${peca('reciclaveis', p.reciclavel, r.faixas.direita)}
    }
  }
});
SZGame2D.gameLoop(function __szPeriodicLoop() {
  if (SZGame2D.everySeconds("cada2", ${r.intervaloProibido})) {
    if (SZGame2D.sceneIs("jogando")) {
      ${peca('proibidos', p.proibido, r.faixas.meio)}
    }
  }
});`
    : ''
  const c = r.coletor
  return `SZGame2D.setupStage(800, 480, "#2b3140");
SZGame2D.fitScreen(100);
SZGame2D.setStageDescription("Estação de Reciclagem. Enter começa. Setas esquerda e direita movem o coletor. Recolha as peças recicláveis, as do aro verde, até completar a meta. Pilhas e lâmpadas, as do aro vermelho, tiram uma vida: são três vidas. Enter, depois do resultado, volta ao início.");
SZGame2D.setBackdrop("${p.galpao}");
const coletor = SZGame2D.createSprite({ x: ${c.x}, y: ${c.y}, w: ${c.w}, h: ${c.h}, image: "${p.coletor}" });
SZGame2D.setHitboxScale(coletor, 85);
const painelMensagem = SZGame2D.createSprite({ x: 48, y: 140, w: 704, h: 176, color: "#14203d" });
const reciclaveis = SZGame2D.createGroup();
const proibidos = SZGame2D.createGroup();
let pontos = 0;
let meta = ${meta};
SZGame2D.setHealth(coletor, ${r.vidas});
SZGame2D.setScene("inicio");
SZGame2D.onKey("Enter", () => {
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.setScene("jogando");
  } else {
    if (SZGame2D.sceneIs("vitoria")) {
      SZGame2D.restart();
    } else {
      if (SZGame2D.sceneIs("derrota")) {
        SZGame2D.restart();
      }
    }
  }
});
SZGame2D.gameLoop(function update() {
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.arrowsX(coletor, 6);
    SZGame2D.clampToScreen(coletor, ctx);${regras.map((x) => `\n    ${x}`).join('')}
  }
  SZGame2D.clear();
  SZGame2D.drawGroup(ctx, reciclaveis);
  SZGame2D.drawGroup(ctx, proibidos);
  SZGame2D.drawSprite(ctx, coletor);
  SZGame2D.drawScore(ctx, "Peças:", pontos, 22, 32, "#ffffff", 23);
  SZGame2D.drawScore(ctx, "Meta:", meta, 660, 32, "#fff3c4", 21);
  SZGame2D.drawSpriteHealth(ctx, coletor, "hearts", 22, 52, 21, "#ff9bae");
  SZGame2D.drawBar(ctx, pontos, meta, 280, 23, 240, 11, "#5fe39a");
  SZGame2D.drawLabel(ctx, "SETAS: mover o coletor", 400, 60, "#ffffff", 15, "center");
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.drawSprite(ctx, painelMensagem);
    SZGame2D.drawLabel(ctx, "ESTAÇÃO DE RECICLAGEM", 400, 182, "#e0f5ff", 29, "center");
    SZGame2D.drawLabel(ctx, "Recolha as peças do aro verde até a meta.", 400, 220, "#d1e5f3", 20, "center");
    SZGame2D.drawLabel(ctx, "Pilhas e lâmpadas, do aro vermelho, tiram vida.", 400, 252, "#c4d7eb", 18, "center");
    SZGame2D.drawLabel(ctx, "Aperte ENTER para começar", 400, 290, "#7ce9da", 21, "center");
  }
  if (SZGame2D.sceneIs("vitoria")) {
    SZGame2D.drawSprite(ctx, painelMensagem);
    SZGame2D.drawLabel(ctx, "META CUMPRIDA!", 400, 187, "#8cf1cb", 32, "center");
    SZGame2D.drawLabel(ctx, "As peças foram para a reciclagem.", 400, 232, "#f2f9ff", 22, "center");
    SZGame2D.drawLabel(ctx, "ENTER para voltar ao início", 400, 283, "#b5d4ef", 20, "center");
  }
  if (SZGame2D.sceneIs("derrota")) {
    SZGame2D.drawSprite(ctx, painelMensagem);
    SZGame2D.drawLabel(ctx, "VAMOS TENTAR OUTRA VEZ?", 400, 187, "#ffd19d", 27, "center");
    SZGame2D.drawLabel(ctx, "Desvie das pilhas e das lâmpadas.", 400, 232, "#f2f9ff", 20, "center");
    SZGame2D.drawLabel(ctx, "ENTER para voltar ao início", 400, 283, "#b5d4ef", 20, "center");
  }
});${relogios}
`
}

// ---------------------------------------------------------------------------------------------
// 3D (o jeito da Patrulha Espacial)
// ---------------------------------------------------------------------------------------------
export function fonteEstacao3D(etapa: EstacaoEtapa, soDerrota = false): string {
  const tem = nivel(etapa)
  const r = ESTACAO_REGRAS['3d']
  const p = ESTACAO_PADRAO
  const t = ESTACAO_TAMANHO
  const meta = tem('meta-nova') ? r.metaNova : r.meta
  const eventos: string[] = []
  if (tem('coleta'))
    eventos.push(`SZGame3D.onTouchGroup(coletor, reciclaveis, (pecaReciclavel) => {
  if (estado === "jogando") {
    SZGame3D.removeFromGroup(reciclaveis, pecaReciclavel);
    pontos = pontos + 1;
    SZGame3D.playEffect("coin");
    SZGame3D.hudText("top-right", "Peças: " + pontos + " / " + meta);
  }
});
SZGame3D.onTouchGroup(coletor, proibidos, (pecaProibida) => {
  if (estado === "jogando") {
    SZGame3D.removeFromGroup(proibidos, pecaProibida);
    SZGame3D.hurt(coletor, 1);
    SZGame3D.playEffect("hit");
  }
});`)
  const decisao = tem('resultado')
    ? `
  if (estado === "jogando") {
    if (SZGame3D.lifeOf(coletor) <= 0) {
      estado = "derrota";
      SZGame3D.hudText("bottom-center", "");
      SZGame3D.endGame("perdeu");
    }${
      soDerrota
        ? ''
        : ` else {
      if (pontos >= meta) {
        estado = "vitoria";
        SZGame3D.hudText("bottom-center", "");
        SZGame3D.playEffect("coin");
        SZGame3D.endGame("ganhou");
      }
    }`
    }
  }`
    : ''
  const nasce = (grupo: string, molde: string, x: number) =>
    `SZGame3D.spawnCopy(${grupo}, ${molde}, ${x}, ${r.alturaPeca}, ${r.nasceZ});`
  const relogios = tem('esteira')
    ? `
SZGame3D.everySecondsLoop(${r.intervaloReciclavel}, () => {
  if (estado === "jogando") {
    ${nasce('reciclaveis', 'moldeReciclavel', r.faixas.esquerda)}
    ${nasce('reciclaveis', 'moldeReciclavel', r.faixas.direita)}
  }
});
SZGame3D.everySecondsLoop(${r.intervaloProibido}, () => {
  if (estado === "jogando") {
    ${nasce('proibidos', 'moldeProibido', r.faixas.meio)}
  }
});`
    : ''
  return `const cena = SZGame3D.createFullscreenScene("#cfe3f5");
SZGame3D.setCameraPosition(cena, 0, 8, 12);
const galpao = SZGame3D.createModelFile(cena, "${p.galpao}", ${t.galpao});
const alvoCamera = SZGame3D.createModel(cena);
SZGame3D.setPosition(alvoCamera, 0, 1, -12);
SZGame3D.cameraLookAt(cena, alvoCamera);
const coletor = SZGame3D.createModelFile(cena, "${p.coletor}", ${t.coletor});
SZGame3D.setPosition(coletor, 0, ${r.alturaColetor}, 0);
const moldeReciclavel = SZGame3D.createModelFile(cena, "${p.reciclavel}", ${t.reciclavel});
SZGame3D.setVisible(moldeReciclavel, "hide");
const moldeProibido = SZGame3D.createModelFile(cena, "${p.proibido}", ${t.proibido});
SZGame3D.setVisible(moldeProibido, "hide");
const reciclaveis = SZGame3D.createGroup();
const proibidos = SZGame3D.createGroup();
let coletorX = 0;
let velocidadeEsteira = ${r.velocidade};
let pontos = 0;
let meta = ${meta};
let estado = "inicio";
SZGame3D.setLife(coletor, ${r.vidas});
SZGame3D.setScreenText("fim", "Vamos tentar outra vez?", "Desvie das pilhas e das lâmpadas, as peças do aro vermelho.", "Voltar ao início");
SZGame3D.setScreenText("vitoria", "Meta cumprida!", "As peças recicláveis foram para o depósito certo.", "Voltar ao início");
SZGame3D.hudText("top-center", "ESTAÇÃO DE RECICLAGEM | Recolha as peças do aro verde");
SZGame3D.hudText("top-right", "Peças: " + pontos + " / " + meta);
SZGame3D.hudText("bottom-center", "ENTER: começar | SETAS: mover o coletor");
SZGame3D.onKey("Enter", () => {
  if (estado === "inicio") {
    estado = "jogando";
    SZGame3D.hudText("top-center", "Recolha as peças do aro verde. Pilhas e lâmpadas tiram vida.");
    SZGame3D.hudText("bottom-center", "SETAS: mover o coletor");
  }
});${eventos.map((x) => `\n${x}`).join('')}
SZGame3D.animate(cena, () => {${decisao}
  if (estado === "jogando") {
    if (SZGame3D.keyDown("ArrowLeft")) {
      coletorX = coletorX - 7 * SZGame3D.dt(cena);
    }
    if (SZGame3D.keyDown("ArrowRight")) {
      coletorX = coletorX + 7 * SZGame3D.dt(cena);
    }
    if (coletorX < -5.2) {
      coletorX = -5.2;
    }
    if (coletorX > 5.2) {
      coletorX = 5.2;
    }
    SZGame3D.setPosition(coletor, coletorX, ${r.alturaColetor}, 0);
    SZGame3D.forEachInGroup(reciclaveis, (reciclavel) => {
      SZGame3D.setVelocity(reciclavel, 0, 0, velocidadeEsteira);
    });
    SZGame3D.updateGroupNoGravity(reciclaveis);
    SZGame3D.forEachInGroup(proibidos, (proibido) => {
      SZGame3D.setVelocity(proibido, 0, 0, velocidadeEsteira);
    });
    SZGame3D.updateGroupNoGravity(proibidos);
    SZGame3D.pruneArea(reciclaveis, "z", -40, 6);
    SZGame3D.pruneArea(proibidos, "z", -40, 6);
  }
});${relogios}
`
}

const cache = new Map<string, StudioAuthoringProject>()

export function montarProjetoEstacao(
  dimensao: EstacaoDimensao,
  etapa: EstacaoEtapa = 'inicio',
  soDerrota = false,
): StudioAuthoringProject {
  const chave = `${dimensao}:${etapa}:${soDerrota}`
  if (!cache.has(chave)) {
    cache.set(
      chave,
      exportFromSource({
        projectId: `construtor-estacao-${dimensao}-${etapa}`,
        name: `A Estação de Reciclagem — ${dimensao.toUpperCase()}`,
        extensionId: dimensao === '2d' ? 'game-2d' : 'game-3d',
        source:
          dimensao === '2d' ? fonteEstacao2D(etapa, soDerrota) : fonteEstacao3D(etapa, soDerrota),
        assets: dimensao === '2d' ? estacaoAssets2D() : estacaoAssets3D(),
      }),
    )
  }
  return structuredClone(cache.get(chave)!)
}
