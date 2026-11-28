/**
 * A base comum dos cinco Poderes do Construtor (Escudo temporário, Tiro triplo, Inimigo que atira,
 * Chefão com resistência e Troca de arma).
 *
 * Um Poder acrescenta uma mecânica ao jogo FINAL do curso da trilha: a Nave Contra Asteroides no 2D
 * (o `nave-2d-completo` aprovado, reescrito aqui em código com o mesmo comportamento) e a Patrulha
 * Espacial no 3D (`fontePatrulha('completo')`). Cada Poder descreve só o que muda, pelos ganchos
 * de `ExtensaoNave` e `ExtensaoPatrulha`; o resto (telas, Enter e reinício, tiro, asteroides,
 * placar, vidas e os dois finais) é o jogo que a criança já montou.
 *
 * A arte nova (itens, inimigas, tiros inimigos, chefões e plasma) vem de
 * `docs/design/construtor-poderes-blender`: no 2D, os sprites de `arte2d/` embutidos; no 3D, as
 * referências da biblioteca de modelos dos cursos (`modelos.json`).
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
import { fontePatrulha, montarProjetoPatrulha } from './patrulha-espacial-projeto'
import {
  ARTE2D_PODERES_DIR,
  MODELOS_PODERES_JSON,
  type PoderesModelo,
  type PoderesPeca,
} from './publicar-poderes-modelos'

export type PoderDimensaoConstrutor = '2d' | '3d'

const prototipos2D = resolve(
  import.meta.dirname,
  '../../aulas-interativas/construtor/prototipos-base/2d',
)
const naveInicial = JSON.parse(
  readFileSync(resolve(prototipos2D, 'nave-2d-inicial.szproject.json'), 'utf8'),
) as StudioAuthoringProject

/** As regras do jogo base que os Poderes não mudam (as do contrato aprovado da Nave e da Patrulha). */
export const BASE_PODERES = {
  '2d': { meta: 20, vidas: 3, nave: { x: 372, y: 396, w: 56, h: 64 }, asteroideVy: 2 },
  '3d': { meta: 20, vidas: 3, velocidadeAsteroides: 7, nasceZ: -28 },
} as const

// ---------------------------------------------------------------------------------------------
// 2D: a Nave Contra Asteroides
// ---------------------------------------------------------------------------------------------
export interface ExtensaoNave {
  /** A descrição do palco para leitores de tela (o jogo com o Poder). */
  descricao?: string
  /** Variáveis e grupos novos, depois de `let meta = 20;`. */
  declaracoes?: string[]
  /** O que o Espaço faz na partida, no lugar do laser simples. */
  espaco?: string[]
  /** Eventos de tecla novos, depois do Espaço. */
  eventos?: string[]
  /** Regras novas no quadro, na partida, antes dos encontros (movimento e limpeza de grupos). */
  movimentos?: string[]
  /** O corpo do encontro da nave com um asteroide, no lugar do de fábrica. */
  batidaNaNave?: string[]
  /** Encontros e regras novas no quadro, na partida, depois dos encontros de fábrica. */
  regras?: string[]
  /** O resultado, no lugar do de fábrica (derrota pelas vidas, vitória pela meta). */
  resultado?: string[]
  /** Grupos e sprites desenhados entre os asteroides e a nave. */
  desenhos?: string[]
  /** Placar novo, depois do de fábrica. */
  hud?: string[]
  /** As duas frases do meio da tela de início. */
  inicio?: [string, string]
  /** Relógios novos (cada um uma raiz própria), no fim. */
  relogios?: string[]
}

const recuar = (linhas: string[] | undefined, espacos: number) =>
  (linhas ?? []).map((l) => l.replace(/^/gm, ' '.repeat(espacos))).join('\n')
const bloco = (linhas: string[] | undefined, espacos: number) =>
  linhas?.length ? `\n${recuar(linhas, espacos)}` : ''

/** Um relógio "A cada N segundos" do 2D, com o nome do contador que o gerador de blocos usa. */
export function relogio2D(nome: string, segundos: number, corpo: string[]): string {
  return `SZGame2D.gameLoop(function __szPeriodicLoop() {
  if (SZGame2D.everySeconds("${nome}", ${segundos})) {
${recuar(corpo, 4)}
  }
});`
}

export function fonteNavePoder(ext: ExtensaoNave = {}): string {
  const b = BASE_PODERES['2d']
  const espaco = ext.espaco ?? [
    'SZGame2D.spawn(tiros, { x: SZGame2D.centerX(nave) - 5, y: SZGame2D.spriteY(nave) - 24, w: 10, h: 28, image: "laser-ciano", vx: 0, vy: -7 });',
    'SZGame2D.playFx("shoot");',
  ]
  const batida = ext.batidaNaNave ?? [
    'SZGame2D.removeFromGroup(asteroides, atingiuNave);',
    'SZGame2D.explodeSprite(atingiuNave, "#ff956c");',
    'SZGame2D.damageSprite(nave, 1, 60);',
    'SZGame2D.playFx("hit");',
  ]
  const resultado = ext.resultado ?? [
    `if (SZGame2D.healthDepleted(nave)) {
  SZGame2D.setScene("derrota");
} else {
  if (pontos >= meta) {
    SZGame2D.setScene("vitoria");
  }
}`,
  ]
  const [frase1, frase2] = ext.inicio ?? [
    '"Abra a rota: acerte " + meta + " asteroides."',
    '"Desvie para proteger suas três vidas."',
  ]
  const n = b.nave
  return `SZGame2D.setupStage(800, 480, "#07152b");
SZGame2D.fitScreen(100);
SZGame2D.setStageDescription(${JSON.stringify(
    ext.descricao ??
      'Nave Contra Asteroides. Enter começa. Setas esquerda e direita movem a nave. Cada aperto de Espaço dispara um laser. Acerte 20 asteroides antes de perder as três vidas. Asteroides que passam sem bater não tiram vida. Enter, depois do resultado, volta ao início.',
  )});
SZGame2D.setBackdrop("cenario-aurora");
const nave = SZGame2D.createSprite({ x: ${n.x}, y: ${n.y}, w: ${n.w}, h: ${n.h}, image: "nave-falcao-azul" });
SZGame2D.setHitboxScale(nave, 75);
const painelMensagem = SZGame2D.createSprite({ x: 48, y: 140, w: 704, h: 176, color: "#0c1a34" });
const tiros = SZGame2D.createGroup();
const asteroides = SZGame2D.createGroup();
let pontos = 0;
let meta = ${b.meta};${bloco(ext.declaracoes, 0)}
SZGame2D.setHealth(nave, ${b.vidas});
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
SZGame2D.onKey("Space", () => {
  if (SZGame2D.sceneIs("jogando")) {
${recuar(espaco, 4)}
  }
});${bloco(ext.eventos, 0)}
SZGame2D.gameLoop(function update() {
  if (SZGame2D.sceneIs("jogando")) {
    SZGame2D.arrowsX(nave, 5);
    SZGame2D.clampToScreen(nave, ctx);
    SZGame2D.updateGroup(tiros);
    SZGame2D.updateGroup(asteroides);
    SZGame2D.pruneOffscreen(ctx, tiros, 40, (foraDaTela) => {

    });
    SZGame2D.pruneOffscreen(ctx, asteroides, 40, (foraDaTela) => {

    });${bloco(ext.movimentos, 4)}
    SZGame2D.overlapGroups(tiros, asteroides, (tiro, asteroide) => {
      SZGame2D.removeFromGroup(tiros, tiro);
      SZGame2D.removeFromGroup(asteroides, asteroide);
      SZGame2D.explodeSprite(asteroide, "#ffce69");
      SZGame2D.playFx("explosion");
      pontos = pontos + 1;
    });
    SZGame2D.overlapSpriteGroup(() => nave, asteroides, (atingiuNave) => {
${recuar(batida, 6)}
    });${bloco(ext.regras, 4)}
${recuar(resultado, 4)}
  }
  SZGame2D.clear();
  SZGame2D.drawGroup(ctx, asteroides);
  SZGame2D.drawGroup(ctx, tiros);${bloco(ext.desenhos, 2)}
  SZGame2D.drawSprite(ctx, nave);
  SZGame2D.drawScore(ctx, "Acertos:", pontos, 22, 32, "#f3f8ff", 23);
  SZGame2D.drawScore(ctx, "Meta:", meta, 650, 32, "#c9eaff", 21);
  SZGame2D.drawSpriteHealth(ctx, nave, "hearts", 22, 52, 21, "#ff9bae");
  SZGame2D.drawBar(ctx, pontos, meta, 280, 23, 240, 11, "#65dfcf");
  SZGame2D.drawLabel(ctx, "SETAS: mover   ESPAÇO: disparar", 400, 60, "#ffffff", 15, "center");${bloco(ext.hud, 2)}
  if (SZGame2D.sceneIs("inicio")) {
    SZGame2D.drawSprite(ctx, painelMensagem);
    SZGame2D.drawLabel(ctx, "NAVE CONTRA ASTEROIDES", 400, 182, "#e0f5ff", 29, "center");
    SZGame2D.drawLabel(ctx, ${frase1}, 400, 220, "#d1e5f3", 21, "center");
    SZGame2D.drawLabel(ctx, ${frase2}, 400, 252, "#c4d7eb", 19, "center");
    SZGame2D.drawLabel(ctx, "Aperte ENTER para começar", 400, 290, "#7ce9da", 21, "center");
  }
  if (SZGame2D.sceneIs("vitoria")) {
    SZGame2D.drawSprite(ctx, painelMensagem);
    SZGame2D.drawLabel(ctx, "ROTA LIBERADA!", 400, 187, "#8cf1cb", 32, "center");
    SZGame2D.drawLabel(ctx, "Boa viagem, comandante!", 400, 232, "#f2f9ff", 24, "center");
    SZGame2D.drawLabel(ctx, "ENTER para voltar ao início", 400, 283, "#b5d4ef", 20, "center");
  }
  if (SZGame2D.sceneIs("derrota")) {
    SZGame2D.drawSprite(ctx, painelMensagem);
    SZGame2D.drawLabel(ctx, "VAMOS TENTAR OUTRA VEZ?", 400, 187, "#ffd19d", 27, "center");
    SZGame2D.drawLabel(ctx, "Desvie dos asteroides e encontre sua rota.", 400, 232, "#f2f9ff", 20, "center");
    SZGame2D.drawLabel(ctx, "ENTER para voltar ao início", 400, 283, "#b5d4ef", 20, "center");
  }
});
${relogio2D('cada', 1.5, [
  `if (SZGame2D.sceneIs("jogando")) {
  SZGame2D.spawn(asteroides, { x: SZGame2D.randomBetween(24, 728), y: -52, w: 48, h: 48, image: "asteroide-rocha-lunar", vx: 0, vy: ${b.asteroideVy} });
}`,
])}${(ext.relogios ?? []).map((r) => `\n${r}`).join('')}
`
}

/** As 16 imagens da Nave (cenários, naves, asteroides e lasers) e os sprites do Poder. */
export function assetsNavePoder(pecas: readonly PoderesPeca[]): ProjectAsset[] {
  const novas = pecas.map((peca) => {
    const svg = readFileSync(resolve(ARTE2D_PODERES_DIR, `${peca}.svg`), 'utf8')
    return {
      id: `construtor-poderes-2d-${peca}`,
      name: peca,
      kind: 'image' as const,
      source: 'library' as const,
      dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
      width: Number(/width="(\d+)"/.exec(svg)?.[1]),
      height: Number(/height="(\d+)"/.exec(svg)?.[1]),
    }
  })
  return [...structuredClone(naveInicial.assets as ProjectAsset[]), ...novas]
}

// ---------------------------------------------------------------------------------------------
// 3D: a Patrulha Espacial
// ---------------------------------------------------------------------------------------------
export interface ExtensaoPatrulha {
  /** Moldes, grupos e variáveis novos, depois de `SZGame3D.setLife(nave, 3);`. */
  declaracoes?: string[]
  /** Textos de placar novos, depois do placar de fábrica. */
  hud?: string[]
  /** O que o Espaço faz na partida, no lugar do laser simples. */
  espaco?: string[]
  /** Eventos novos, depois do Espaço. */
  eventos?: string[]
  /** O corpo do encontro da nave com um asteroide, dentro da guarda da partida. */
  batidaNaNave?: string[]
  /** Encontros novos, depois do encontro da nave com os asteroides. */
  encontros?: string[]
  /** Regras novas no quadro, na partida, depois do movimento de fábrica (antes das limpezas). */
  noQuadro?: string[]
  /** Limpezas novas, depois das de fábrica. */
  limpezas?: string[]
  /** Relógios novos, no fim. */
  relogios?: string[]
}

const trocar = (fonte: string, de: string, para: string) => {
  if (!fonte.includes(de)) throw new Error(`Trecho da Patrulha não encontrado: ${de.slice(0, 60)}`)
  return fonte.replace(de, para)
}

/** Um relógio "A cada N segundos" do 3D. */
export function relogio3D(segundos: number, corpo: string[]): string {
  return `SZGame3D.everySecondsLoop(${segundos}, () => {
${recuar(corpo, 2)}
});`
}

export function fontePatrulhaPoder(ext: ExtensaoPatrulha = {}): string {
  let f = fontePatrulha('completo')
  if (ext.declaracoes?.length)
    f = trocar(
      f,
      'SZGame3D.setLife(nave, 3);\n',
      `SZGame3D.setLife(nave, 3);\n${ext.declaracoes.join('\n')}\n`,
    )
  if (ext.hud?.length)
    f = trocar(
      f,
      'SZGame3D.hudText("top-right", "Acertos: 0 / 20");\n',
      `SZGame3D.hudText("top-right", "Acertos: 0 / 20");\n${ext.hud.join('\n')}\n`,
    )
  if (ext.espaco)
    f = trocar(
      f,
      `    SZGame3D.spawnCopy(tiros, moldeTiro, SZGame3D.getPos(nave, "x"), 1, -1.6);
    SZGame3D.playNote(880, 60);
`,
      `${recuar(ext.espaco, 4)}\n`,
    )
  if (ext.batidaNaNave)
    f = trocar(
      f,
      `    SZGame3D.removeFromGroup(asteroides, asteroideQueBateu);
    SZGame3D.hurt(nave, 1);
    SZGame3D.playEffect("hit");
`,
      `${recuar(ext.batidaNaNave, 4)}\n`,
    )
  const depoisDaBatida = [...(ext.eventos ?? []), ...(ext.encontros ?? [])]
  if (depoisDaBatida.length)
    f = trocar(
      f,
      'SZGame3D.animate(cena, () => {',
      `${depoisDaBatida.join('\n')}\nSZGame3D.animate(cena, () => {`,
    )
  if (ext.noQuadro?.length)
    f = trocar(
      f,
      '    SZGame3D.updateGroupNoGravity(asteroides);\n',
      `    SZGame3D.updateGroupNoGravity(asteroides);\n${recuar(ext.noQuadro, 4)}\n`,
    )
  if (ext.limpezas?.length)
    f = trocar(
      f,
      '    SZGame3D.pruneArea(asteroides, "z", -36, 6);\n',
      `    SZGame3D.pruneArea(asteroides, "z", -36, 6);\n${recuar(ext.limpezas, 4)}\n`,
    )
  if (ext.relogios?.length) f += `${ext.relogios.join('\n')}\n`
  return f
}

const modelos = JSON.parse(readFileSync(MODELOS_PODERES_JSON, 'utf8')) as Record<
  PoderesPeca,
  PoderesModelo
>

/** A referência compacta de um modelo dos Poderes (o que vai nas aulas). */
export function referenciaPoder(peca: PoderesPeca): ProjectAsset {
  const m = modelos[peca]
  if (!m) throw new Error(`Modelo ausente em modelos.json: ${peca}`)
  return {
    id: `construtor-poderes-${peca}`,
    name: peca,
    kind: 'model3d',
    source: 'library',
    libId: `${COURSE_MODEL_LIB_PREFIX}${m.sha}`,
    originalFileName: `${peca}.glb`,
    dataUrl: courseModelStub(m.sha, []),
  }
}

/** As peças da Patrulha (referências da biblioteca) e os modelos do Poder. */
export function assetsPatrulhaPoder(pecas: readonly PoderesPeca[]): ProjectAsset[] {
  return [
    ...(montarProjetoPatrulha('completo').assets as ProjectAsset[]),
    ...pecas.map(referenciaPoder),
  ]
}

/** Monta e guarda o projeto de uma etapa (os geradores pedem a mesma etapa muitas vezes). */
export function projetoDoPoder(input: {
  chave: string
  nome: string
  dimensao: PoderDimensaoConstrutor
  fonte: () => string
  assets: () => ProjectAsset[]
}): StudioAuthoringProject {
  const guardado = cache.get(input.chave)
  if (guardado) return structuredClone(guardado)
  const projeto = exportFromSource({
    projectId: input.chave,
    name: input.nome,
    extensionId: input.dimensao === '2d' ? 'game-2d' : 'game-3d',
    source: input.fonte(),
    assets: input.assets(),
  })
  cache.set(input.chave, projeto)
  return structuredClone(projeto)
}
const cache = new Map<string, StudioAuthoringProject>()
