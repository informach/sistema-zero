/**
 * Os projetos do Poder "Troca de arma" (Construtor), em 2D (sobre a Nave Contra Asteroides) e em 3D
 * (sobre a Patrulha Espacial).
 *
 * O Poder acrescenta um estado de equipamento que muda o disparo: a nave começa com
 * `arma = "laser"`; um item de plasma libera a troca (`plasmaLiberado = true`); a tecla E alterna a
 * arma entre "laser" e "plasma"; o placar mostra a arma; e o Espaço pergunta qual é a arma: o laser
 * fino e rápido de sempre ou o plasma grande e lento. Uma nova partida volta ao laser (o `restart`
 * do 2D e o "Voltar ao início" do 3D recomeçam o jogo, e as variáveis nascem de novo em Ao iniciar).
 *
 * Vem pronto (todas as etapas): o grupo e o desenho do item, o movimento e a limpeza dele, as
 * variáveis `arma` e `plasmaLiberado`, e o grupo `tirosPlasma`, que anda mais devagar e acerta as
 * pedras como o grupo `tiros`. A criança monta, etapa por etapa:
 * - `item`: o relógio que solta o item a cada 4 s, só na partida, e o encontro que libera a troca;
 * - `troca`: a tecla E (o Jogo 3D não tem X), que só troca com o plasma liberado: laser vira plasma e plasma vira laser;
 * - `placar`: a arma na tela (2D: o rótulo; 3D: o texto, escrito de novo a cada troca);
 * - `disparo`: o Espaço pergunta a arma: plasma em `tirosPlasma`, senão o laser de sempre.
 *
 * Os números seguem os do Tiro triplo (o item a cada 4 s; no 3D pela esquerda, mais perto).
 */
import {
  assetsNavePoder,
  assetsPatrulhaPoder,
  fonteNavePoder,
  fontePatrulhaPoder,
  type PoderDimensaoConstrutor,
  projetoDoPoder,
  relogio2D,
  relogio3D,
} from './construtor-poderes-base'
import { PODERES_CATEGORIAS, PODERES_TAMANHO } from './publicar-poderes-modelos'

export const ARMA_CURSO = 'jornada-construtor-poder-5'
export const ARMA_ETAPAS = ['inicio', 'item', 'troca', 'placar', 'disparo'] as const
export type ArmaEtapa = (typeof ARMA_ETAPAS)[number]

export const ARMA_ITEM = 'item-plasma-redondo'
export const ARMA_PLASMA = 'plasma-roxo'
export const ARMA_OPCOES = [
  ...PODERES_CATEGORIAS['item-plasma'],
  ...PODERES_CATEGORIAS.plasma,
] as const

export const ARMA_REGRAS = {
  intervaloItem: 4,
  '2d': {
    item: 44,
    itemVy: 2,
    faixa: 378,
    plasma: { w: 24, h: 32, vy: -4 },
    placar: { x: 700, y: 82 },
  },
  '3d': {
    tamanhoItem: PODERES_TAMANHO['item-plasma'],
    tamanhoPlasma: PODERES_TAMANHO.plasma,
    faixa: -4,
    nasceZ: -20,
    velocidadePlasma: -11,
  },
} as const

const nivel = (etapa: ArmaEtapa) => {
  const n = ARMA_ETAPAS.indexOf(etapa)
  if (n < 0) throw new Error(`Etapa desconhecida da Troca de arma: ${etapa}`)
  return (ate: ArmaEtapa) => n >= ARMA_ETAPAS.indexOf(ate)
}

/** A tecla E: só troca com o plasma liberado. */
const trocaDeArma = (depois: string[]) => `if (plasmaLiberado === true) {
  if (arma === "laser") {
    arma = "plasma";
  } else {
    arma = "laser";
  }${depois.map((l) => `\n  ${l}`).join('')}
}`

/**
 * `soSenao`: o projeto intermediário do caderno, com o Se arma = plasma montado e o laser já no
 * senão, mas o então ainda vazio (o desenho da etapa do disparo não cabe numa folha só).
 */
export function fonteArma2D(etapa: ArmaEtapa, soSenao = false): string {
  const tem = nivel(etapa)
  const r = ARMA_REGRAS
  const d = r['2d']
  const p = d.plasma
  return fonteNavePoder({
    descricao: `Nave Contra Asteroides com troca de arma. Enter começa. Setas esquerda e direita movem a nave. Espaço dispara. A cada ${r.intervaloItem} segundos, um item de plasma cai pelo meio da tela: pegue o item e a tecla E troca a arma entre o laser, fino e rápido, e o plasma, grande e lento. Acerte 20 asteroides antes de perder as três vidas. Enter, depois do resultado, volta ao início.`,
    declaracoes: [
      'const itensPlasma = SZGame2D.createGroup();',
      'const tirosPlasma = SZGame2D.createGroup();',
      'let arma = "laser";',
      'let plasmaLiberado = false;',
    ],
    espaco: tem('disparo')
      ? [
          `if (arma === "plasma") {${
            soSenao
              ? ''
              : `
  SZGame2D.spawn(tirosPlasma, { x: SZGame2D.centerX(nave) - ${p.w / 2}, y: SZGame2D.spriteY(nave) - ${p.h}, w: ${p.w}, h: ${p.h}, image: "${ARMA_PLASMA}", vx: 0, vy: ${p.vy} });
  SZGame2D.playFx("laser");`
          }
} else {
  SZGame2D.spawn(tiros, { x: SZGame2D.centerX(nave) - 5, y: SZGame2D.spriteY(nave) - 24, w: 10, h: 28, image: "laser-ciano", vx: 0, vy: -7 });
  SZGame2D.playFx("shoot");
}`,
        ]
      : undefined,
    eventos: tem('troca')
      ? [
          `SZGame2D.onKey("e", () => {
  if (SZGame2D.sceneIs("jogando")) {
${trocaDeArma(['SZGame2D.playFx("select");']).replace(/^/gm, '    ')}
  }
});`,
        ]
      : undefined,
    movimentos: [
      'SZGame2D.updateGroup(itensPlasma);',
      `SZGame2D.pruneOffscreen(ctx, itensPlasma, 40, (foraDaTela) => {

});`,
      'SZGame2D.updateGroup(tirosPlasma);',
      `SZGame2D.pruneOffscreen(ctx, tirosPlasma, 40, (foraDaTela) => {

});`,
      `SZGame2D.overlapGroups(tirosPlasma, asteroides, (plasma, asteroide) => {
  SZGame2D.removeFromGroup(tirosPlasma, plasma);
  SZGame2D.removeFromGroup(asteroides, asteroide);
  SZGame2D.explodeSprite(asteroide, "#c084fc");
  SZGame2D.playFx("explosion");
  pontos = pontos + 1;
});`,
    ],
    regras: tem('item')
      ? [
          `SZGame2D.overlapSpriteGroup(() => nave, itensPlasma, (itemPego) => {
  SZGame2D.removeFromGroup(itensPlasma, itemPego);
  plasmaLiberado = true;
  SZGame2D.playFx("powerup");
});`,
        ]
      : undefined,
    desenhos: ['SZGame2D.drawGroup(ctx, itensPlasma);', 'SZGame2D.drawGroup(ctx, tirosPlasma);'],
    hud: tem('placar')
      ? [
          `SZGame2D.drawLabel(ctx, "Arma: " + arma, ${d.placar.x}, ${d.placar.y}, "#e9d5ff", 18, "center");`,
        ]
      : [],
    inicio: [
      '"Acerte " + meta + " asteroides para abrir a rota."',
      '"Pegue o plasma e troque de arma com a tecla E."',
    ],
    relogios: tem('item')
      ? [
          relogio2D('cada2', r.intervaloItem, [
            `if (SZGame2D.sceneIs("jogando")) {
  SZGame2D.spawn(itensPlasma, { x: ${d.faixa}, y: -${d.item}, w: ${d.item}, h: ${d.item}, image: "${ARMA_ITEM}", vx: 0, vy: ${d.itemVy} });
}`,
          ]),
        ]
      : [],
  })
}

export function fonteArma3D(etapa: ArmaEtapa): string {
  const tem = nivel(etapa)
  const r = ARMA_REGRAS
  const d = r['3d']
  const placar = 'SZGame3D.hudText("top-left", "Arma: " + arma);'
  return fontePatrulhaPoder({
    declaracoes: [
      `const moldePlasmaItem = SZGame3D.createModelFile(cena, "${ARMA_ITEM}", ${d.tamanhoItem});`,
      'SZGame3D.setVisible(moldePlasmaItem, "hide");',
      `const moldePlasma = SZGame3D.createModelFile(cena, "${ARMA_PLASMA}", ${d.tamanhoPlasma});`,
      'SZGame3D.setVisible(moldePlasma, "hide");',
      'const itensPlasma = SZGame3D.createGroup();',
      'const tirosPlasma = SZGame3D.createGroup();',
      'let arma = "laser";',
      'let plasmaLiberado = false;',
    ],
    hud: tem('placar') ? [placar] : undefined,
    espaco: tem('disparo')
      ? [
          `if (arma === "plasma") {
  SZGame3D.spawnCopy(tirosPlasma, moldePlasma, SZGame3D.getPos(nave, "x"), 1, -1.6);
  SZGame3D.playNote(330, 120);
} else {
  SZGame3D.spawnCopy(tiros, moldeTiro, SZGame3D.getPos(nave, "x"), 1, -1.6);
  SZGame3D.playNote(880, 60);
}`,
        ]
      : undefined,
    eventos: tem('troca')
      ? [
          `SZGame3D.onKey("KeyE", () => {
  if (estado === "jogando") {
${trocaDeArma(tem('placar') ? [placar] : []).replace(/^/gm, '    ')}
  }
});`,
        ]
      : undefined,
    encontros: tem('item')
      ? [
          `SZGame3D.onTouchGroup(nave, itensPlasma, (itemPego) => {
  if (estado === "jogando") {
    SZGame3D.removeFromGroup(itensPlasma, itemPego);
    plasmaLiberado = true;
    SZGame3D.playEffect("coin");
  }
});`,
        ]
      : undefined,
    noQuadro: [
      `SZGame3D.forEachInGroup(itensPlasma, (item) => {
  SZGame3D.setVelocity(item, 0, 0, velocidadeAsteroides);
});`,
      'SZGame3D.updateGroupNoGravity(itensPlasma);',
      `SZGame3D.forEachInGroup(tirosPlasma, (plasma) => {
  SZGame3D.setVelocity(plasma, 0, 0, ${d.velocidadePlasma});
});`,
      'SZGame3D.updateGroupNoGravity(tirosPlasma);',
      `SZGame3D.forEachInGroup(asteroides, (asteroide) => {
  alvoAtivo = true;
  SZGame3D.forEachInGroup(tirosPlasma, (plasma) => {
    if (alvoAtivo) {
      if (SZGame3D.collides(plasma, asteroide)) {
        SZGame3D.removeFromGroup(asteroides, asteroide);
        SZGame3D.removeFromGroup(tirosPlasma, plasma);
        pontos = pontos + 1;
        alvoAtivo = false;
        SZGame3D.playEffect("coin");
        SZGame3D.hudText("top-right", "Acertos: " + pontos + " / 20");
      }
    }
  });
});`,
    ],
    limpezas: [
      'SZGame3D.pruneArea(itensPlasma, "z", -36, 6);',
      'SZGame3D.pruneArea(tirosPlasma, "z", -36, 3);',
    ],
    relogios: tem('item')
      ? [
          relogio3D(r.intervaloItem, [
            `if (estado === "jogando") {
  SZGame3D.spawnCopy(itensPlasma, moldePlasmaItem, ${d.faixa}, 1, ${d.nasceZ});
}`,
          ]),
        ]
      : [],
  })
}

export function montarProjetoArma(
  dimensao: PoderDimensaoConstrutor,
  etapa: ArmaEtapa = 'inicio',
  soSenao = false,
) {
  return projetoDoPoder({
    chave: `construtor-arma-${dimensao}-${etapa}${soSenao ? '-senao' : ''}`,
    nome: `Troca de arma — ${dimensao.toUpperCase()}`,
    dimensao,
    fonte: () => (dimensao === '2d' ? fonteArma2D(etapa, soSenao) : fonteArma3D(etapa)),
    assets: () =>
      dimensao === '2d' ? assetsNavePoder(ARMA_OPCOES) : assetsPatrulhaPoder(ARMA_OPCOES),
  })
}
