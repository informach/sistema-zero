/**
 * Os projetos do Poder "Tiro triplo" (Construtor), em 2D (sobre a Nave Contra Asteroides) e em 3D
 * (sobre a Patrulha Espacial).
 *
 * O Poder acrescenta vários projéteis com trajetórias diferentes: um item de tiro triplo cai pelo
 * meio; pegar o item liga `tempoTriplo = 5`; enquanto o tempo é maior que zero, o Espaço cria três
 * lasers em vez de um, cada um numa direção; a cada segundo o tempo perde 1, e em zero volta o tiro
 * simples. Os lasers saem do grupo ao sair da tela (a limpeza que a nave já tem).
 *
 * Vem pronto (todas as etapas): o grupo e o desenho do item, o movimento e a limpeza dele, a
 * variável `tempoTriplo` e o placar "Triplo". No 3D também os grupos `tirosEsquerda` e
 * `tirosDireita`, que andam em diagonal e acertam as pedras como o grupo `tiros` (as cópias do Jogo
 * 3D não têm velocidade própria: a direção é a do grupo). A criança monta, etapa por etapa:
 * - `item`: o relógio que solta o item a cada 4 s, só na partida, e o encontro que liga o triplo;
 * - `tres`: no Espaço, Se `tempoTriplo > 0`, três lasers; senão, o laser de antes (no senão);
 * - `direcoes`: os três lasers em direções diferentes (2D: vx −2, 0 e 2; 3D: os três grupos);
 * - `volta`: o relógio de 1 s que tira 1 do tempo enquanto ele é maior que zero.
 *
 * Os números seguem os do Escudo pelo mesmo motivo (o relógio da criança começa quando a página
 * abre): o item cai pelo meio a cada 4 s e o triplo (5 s) dura mais que o intervalo.
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

export const TRIPLO_CURSO = 'jornada-construtor-poder-2'
export const TRIPLO_ETAPAS = ['inicio', 'item', 'tres', 'direcoes', 'volta'] as const
export type TriploEtapa = (typeof TRIPLO_ETAPAS)[number]

export const TRIPLO_ITEM = 'item-triplo-redondo'
export const TRIPLO_OPCOES = PODERES_CATEGORIAS['item-triplo']

export const TRIPLO_REGRAS = {
  duracao: 5,
  intervaloItem: 4,
  '2d': { item: 44, itemVy: 2, faixa: 378, vxLados: 2, placar: { x: 650, y: 60 } },
  // no 3D o item vem pela esquerda: parada no meio, sem escudo, a nave leva batidas demais
  '3d': { tamanho: PODERES_TAMANHO['item-triplo'], faixa: -4, nasceZ: -20, vxLados: 6 },
} as const

const nivel = (etapa: TriploEtapa) => {
  const n = TRIPLO_ETAPAS.indexOf(etapa)
  if (n < 0) throw new Error(`Etapa desconhecida do Tiro triplo: ${etapa}`)
  return (ate: TriploEtapa) => n >= TRIPLO_ETAPAS.indexOf(ate)
}

const laser2D = (vx: number) =>
  `SZGame2D.spawn(tiros, { x: SZGame2D.centerX(nave) - 5, y: SZGame2D.spriteY(nave) - 24, w: 10, h: 28, image: "laser-ciano", vx: ${vx}, vy: -7 });`

export function fonteTriplo2D(etapa: TriploEtapa, copiasNoEntao = 3): string {
  const tem = nivel(etapa)
  const r = TRIPLO_REGRAS
  const d = r['2d']
  const relogios: string[] = []
  if (tem('item'))
    relogios.push(
      relogio2D('cada2', r.intervaloItem, [
        `if (SZGame2D.sceneIs("jogando")) {
  SZGame2D.spawn(itensTriplo, { x: ${d.faixa}, y: -${d.item}, w: ${d.item}, h: ${d.item}, image: "${TRIPLO_ITEM}", vx: 0, vy: ${d.itemVy} });
}`,
      ]),
    )
  if (tem('volta'))
    relogios.push(
      relogio2D('cada3', 1, [
        `if (tempoTriplo > 0) {
  tempoTriplo = tempoTriplo - 1;
}`,
      ]),
    )
  // como no 3D: 4 = a etapa das direções com só o laser da esquerda virado
  const lados2D = tem('direcoes') ? (copiasNoEntao > 3 ? copiasNoEntao - 3 : 2) : 0
  const lados = [lados2D >= 1 ? -d.vxLados : 0, 0, lados2D >= 2 ? d.vxLados : 0]
  return fonteNavePoder({
    descricao: `Nave Contra Asteroides com tiro triplo. Enter começa. Setas esquerda e direita movem a nave. Cada aperto de Espaço dispara um laser. A cada ${r.intervaloItem} segundos, um item de tiro triplo cai pelo meio da tela: pegue o item e, por ${r.duracao} segundos, o Espaço dispara três lasers em leque. Acerte 20 asteroides antes de perder as três vidas. Enter, depois do resultado, volta ao início.`,
    declaracoes: ['const itensTriplo = SZGame2D.createGroup();', 'let tempoTriplo = 0;'],
    espaco: tem('tres')
      ? [
          `if (tempoTriplo > 0) {${lados
            .slice(0, Math.min(3, copiasNoEntao))
            .map((vx) => `\n  ${laser2D(vx)}`)
            .join('')}${copiasNoEntao >= 3 ? '\n  SZGame2D.playFx("laser");' : ''}
} else {
  ${laser2D(0)}
  SZGame2D.playFx("shoot");
}`,
        ]
      : undefined,
    movimentos: [
      'SZGame2D.updateGroup(itensTriplo);',
      `SZGame2D.pruneOffscreen(ctx, itensTriplo, 40, (foraDaTela) => {

});`,
    ],
    regras: tem('item')
      ? [
          `SZGame2D.overlapSpriteGroup(() => nave, itensTriplo, (itemPego) => {
  SZGame2D.removeFromGroup(itensTriplo, itemPego);
  tempoTriplo = ${r.duracao};
  SZGame2D.playFx("powerup");
});`,
        ]
      : undefined,
    desenhos: ['SZGame2D.drawGroup(ctx, itensTriplo);'],
    hud: [
      `SZGame2D.drawScore(ctx, "Triplo:", tempoTriplo, ${d.placar.x}, ${d.placar.y}, "#ffd166", 19);`,
    ],
    inicio: [
      '"Acerte " + meta + " asteroides para abrir a rota."',
      '"Pegue o item: por 5 segundos, três lasers de uma vez."',
    ],
    relogios,
  })
}

/** No 3D, cada direção é um grupo: as cópias não têm velocidade própria. */
const copia3D = (grupo: string) =>
  `SZGame3D.spawnCopy(${grupo}, moldeTiro, SZGame3D.getPos(nave, "x"), 1, -1.6);`

/**
 * `copiasNoEntao`: a etapa `tres` com menos cópias no então (0 = só o senão); 4 é a etapa
 * `direcoes` com só o lado esquerdo trocado. O caderno desenha esses encaixes em mais de uma folha:
 * no 3D o Espaço inteiro não cabe numa.
 */
export function fonteTriplo3D(etapa: TriploEtapa, copiasNoEntao = 3): string {
  const tem = nivel(etapa)
  const r = TRIPLO_REGRAS
  const lados = r['3d'].vxLados
  const placar = 'SZGame3D.hudText("top-left", "Triplo: " + tempoTriplo);'
  const relogios: string[] = []
  if (tem('item'))
    relogios.push(
      relogio3D(r.intervaloItem, [
        `if (estado === "jogando") {
  SZGame3D.spawnCopy(itensTriplo, moldeTriplo, ${r['3d'].faixa}, 1, ${r['3d'].nasceZ});
}`,
      ]),
    )
  if (tem('volta'))
    relogios.push(
      relogio3D(1, [
        `if (tempoTriplo > 0) {
  tempoTriplo = tempoTriplo - 1;
  ${placar}
}`,
      ]),
    )
  // na etapa das direções, o caderno também desenha a troca de um lado de cada vez
  const lados3D = tem('direcoes') ? (copiasNoEntao > 3 ? copiasNoEntao - 3 : 2) : 0
  const esq = lados3D >= 1 ? 'tirosEsquerda' : 'tiros'
  const dir = lados3D >= 2 ? 'tirosDireita' : 'tiros'
  /** O acerto de cada grupo de laser nas pedras (o mesmo do grupo `tiros`). */
  const acerto = (
    grupo: string,
    nome: string,
  ) => `SZGame3D.forEachInGroup(asteroides, (asteroide) => {
  alvoAtivo = true;
  SZGame3D.forEachInGroup(${grupo}, (${nome}) => {
    if (alvoAtivo) {
      if (SZGame3D.collides(${nome}, asteroide)) {
        SZGame3D.removeFromGroup(asteroides, asteroide);
        SZGame3D.removeFromGroup(${grupo}, ${nome});
        pontos = pontos + 1;
        alvoAtivo = false;
        SZGame3D.playEffect("coin");
        SZGame3D.hudText("top-right", "Acertos: " + pontos + " / 20");
      }
    }
  });
});`
  return fontePatrulhaPoder({
    declaracoes: [
      `const moldeTriplo = SZGame3D.createModelFile(cena, "${TRIPLO_ITEM}", ${r['3d'].tamanho});`,
      'SZGame3D.setVisible(moldeTriplo, "hide");',
      'const itensTriplo = SZGame3D.createGroup();',
      'const tirosEsquerda = SZGame3D.createGroup();',
      'const tirosDireita = SZGame3D.createGroup();',
      'let tempoTriplo = 0;',
    ],
    hud: [placar],
    espaco: tem('tres')
      ? [
          `if (tempoTriplo > 0) {${[copia3D(esq), copia3D('tiros'), copia3D(dir)]
            .slice(0, Math.min(3, copiasNoEntao))
            .map((c) => `\n  ${c}`)
            .join('')}${copiasNoEntao >= 3 ? '\n  SZGame3D.playNote(1320, 80);' : ''}
} else {
  ${copia3D('tiros')}
  SZGame3D.playNote(880, 60);
}`,
        ]
      : undefined,
    encontros: tem('item')
      ? [
          `SZGame3D.onTouchGroup(nave, itensTriplo, (itemPego) => {
  if (estado === "jogando") {
    SZGame3D.removeFromGroup(itensTriplo, itemPego);
    tempoTriplo = ${r.duracao};
    ${placar}
    SZGame3D.playEffect("coin");
  }
});`,
        ]
      : undefined,
    noQuadro: [
      `SZGame3D.forEachInGroup(itensTriplo, (item) => {
  SZGame3D.setVelocity(item, 0, 0, velocidadeAsteroides);
});`,
      'SZGame3D.updateGroupNoGravity(itensTriplo);',
      `SZGame3D.forEachInGroup(tirosEsquerda, (tiro) => {
  SZGame3D.setVelocity(tiro, -${lados}, 0, velocidadeTiros);
});`,
      'SZGame3D.updateGroupNoGravity(tirosEsquerda);',
      `SZGame3D.forEachInGroup(tirosDireita, (tiro) => {
  SZGame3D.setVelocity(tiro, ${lados}, 0, velocidadeTiros);
});`,
      'SZGame3D.updateGroupNoGravity(tirosDireita);',
      acerto('tirosEsquerda', 'tiroEsquerdo'),
      acerto('tirosDireita', 'tiroDireito'),
    ],
    limpezas: [
      'SZGame3D.pruneArea(itensTriplo, "z", -36, 6);',
      'SZGame3D.pruneArea(tirosEsquerda, "z", -36, 3);',
      'SZGame3D.pruneArea(tirosDireita, "z", -36, 3);',
    ],
    relogios,
  })
}

export function montarProjetoTriplo(
  dimensao: PoderDimensaoConstrutor,
  etapa: TriploEtapa = 'inicio',
  copiasNoEntao = 3,
) {
  return projetoDoPoder({
    chave: `construtor-triplo-${dimensao}-${etapa}-${copiasNoEntao}`,
    nome: `Tiro triplo — ${dimensao.toUpperCase()}`,
    dimensao,
    fonte: () =>
      dimensao === '2d' ? fonteTriplo2D(etapa, copiasNoEntao) : fonteTriplo3D(etapa, copiasNoEntao),
    assets: () =>
      dimensao === '2d' ? assetsNavePoder(TRIPLO_OPCOES) : assetsPatrulhaPoder(TRIPLO_OPCOES),
  })
}
