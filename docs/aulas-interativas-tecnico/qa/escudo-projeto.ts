/**
 * Os projetos do Poder "Escudo temporário" (Construtor), em 2D (sobre a Nave Contra Asteroides) e
 * em 3D (sobre a Patrulha Espacial).
 *
 * O Poder acrescenta um escudo com prazo ao jogo final do curso da trilha: um item de escudo cai na
 * direção da nave; pegar o item liga `tempoDoEscudo = 5`; enquanto o tempo é maior que zero, a
 * pedra que bate só sai (a vida fica); a cada segundo o tempo perde 1, e a nave pisca enquanto ele
 * dura; em zero, a batida volta a tirar vida.
 *
 * Vem pronto (preparação de todas as etapas): o grupo dos itens, o desenho do item, o movimento e a
 * limpeza do grupo, a variável `tempoDoEscudo` e o placar "Escudo". A criança monta, etapa por
 * etapa:
 * - `item`: o relógio que solta um item a cada 4 s, só na partida, pelo meio da tela;
 * - `liga`: o encontro da nave com o item: o item sai e o tempo vira 5;
 * - `protege`: a batida da pedra pergunta pelo escudo: com tempo, a pedra só sai; sem tempo, tira
 *   vida (o dano vai para o senão);
 * - `acaba`: o relógio de 1 s que tira 1 do tempo enquanto ele é maior que zero e faz a nave piscar.
 *
 * O item cai sempre pelo MEIO da tela, a cada 4 s, e o escudo dura 5 s: quem fica no meio emenda um
 * escudo no outro, mas quase nenhum asteroide passa por ali, e para acertar a meta a nave precisa
 * sair. Os números servem também ao Verificar: no 3D o relógio da criança começa quando a página
 * abre (o executor ainda espera os modelos antes do Enter), e com o escudo durando mais que o
 * intervalo e a faixa fixa, nenhum objetivo depende do instante da partida. Para ver o escudo
 * acabar, o Verificar tira a nave do meio.
 */
import {
  assetsNavePoder,
  assetsPatrulhaPoder,
  BASE_PODERES,
  fonteNavePoder,
  fontePatrulhaPoder,
  type PoderDimensaoConstrutor,
  projetoDoPoder,
  relogio2D,
  relogio3D,
} from './construtor-poderes-base'
import { PODERES_CATEGORIAS, PODERES_TAMANHO } from './publicar-poderes-modelos'

export const ESCUDO_CURSO = 'jornada-construtor-poder-1'
export const ESCUDO_ETAPAS = ['inicio', 'item', 'liga', 'protege', 'acaba'] as const
export type EscudoEtapa = (typeof ESCUDO_ETAPAS)[number]

/** O item de partida (a variação do vídeo e do caderno). As quatro molduras não mudam o jogo. */
export const ESCUDO_ITEM = 'item-escudo-redondo'
export const ESCUDO_OPCOES = PODERES_CATEGORIAS['item-escudo']

/** As regras do Poder, que o enunciado diz e os objetivos conferem. */
export const ESCUDO_REGRAS = {
  duracao: 5,
  intervaloItem: 4,
  '2d': { item: 44, itemVy: 2, faixa: 378, piscarQuadros: 30, placar: { x: 650, y: 60 } },
  '3d': { tamanho: PODERES_TAMANHO['item-escudo'], piscarSegundos: 0.5, faixa: 0 },
} as const

const nivel = (etapa: EscudoEtapa) => {
  const n = ESCUDO_ETAPAS.indexOf(etapa)
  if (n < 0) throw new Error(`Etapa desconhecida do Escudo: ${etapa}`)
  return (ate: EscudoEtapa) => n >= ESCUDO_ETAPAS.indexOf(ate)
}

export function fonteEscudo2D(etapa: EscudoEtapa): string {
  const tem = nivel(etapa)
  const r = ESCUDO_REGRAS
  const d = r['2d']
  const relogios: string[] = []
  if (tem('item'))
    relogios.push(
      relogio2D('cada2', r.intervaloItem, [
        `if (SZGame2D.sceneIs("jogando")) {
  SZGame2D.spawn(itensEscudo, { x: ${d.faixa}, y: -${d.item}, w: ${d.item}, h: ${d.item}, image: "${ESCUDO_ITEM}", vx: 0, vy: ${d.itemVy} });
}`,
      ]),
    )
  if (tem('acaba'))
    relogios.push(
      relogio2D('cada3', 1, [
        `if (tempoDoEscudo > 0) {
  tempoDoEscudo = tempoDoEscudo - 1;
  SZGame2D.blink(nave, ${d.piscarQuadros});
}`,
      ]),
    )
  return fonteNavePoder({
    descricao: `Nave Contra Asteroides com escudo. Enter começa. Setas esquerda e direita movem a nave. Cada aperto de Espaço dispara um laser. A cada ${r.intervaloItem} segundos, um item de escudo cai pelo meio da tela: pegue o item e, por ${r.duracao} segundos, as pedras que batem não tiram vida. Acerte 20 asteroides antes de perder as três vidas. Enter, depois do resultado, volta ao início.`,
    declaracoes: ['const itensEscudo = SZGame2D.createGroup();', 'let tempoDoEscudo = 0;'],
    movimentos: [
      'SZGame2D.updateGroup(itensEscudo);',
      `SZGame2D.pruneOffscreen(ctx, itensEscudo, 40, (foraDaTela) => {

});`,
    ],
    batidaNaNave: tem('protege')
      ? [
          'SZGame2D.removeFromGroup(asteroides, atingiuNave);',
          'SZGame2D.explodeSprite(atingiuNave, "#ff956c");',
          `if (tempoDoEscudo > 0) {
  SZGame2D.playFx("bounce");
} else {
  SZGame2D.damageSprite(nave, 1, 60);
  SZGame2D.playFx("hit");
}`,
        ]
      : undefined,
    regras: tem('liga')
      ? [
          `SZGame2D.overlapSpriteGroup(() => nave, itensEscudo, (itemPego) => {
  SZGame2D.removeFromGroup(itensEscudo, itemPego);
  tempoDoEscudo = ${r.duracao};
  SZGame2D.playFx("powerup");
});`,
        ]
      : undefined,
    desenhos: ['SZGame2D.drawGroup(ctx, itensEscudo);'],
    hud: [
      `SZGame2D.drawScore(ctx, "Escudo:", tempoDoEscudo, ${d.placar.x}, ${d.placar.y}, "#7df9ff", 19);`,
    ],
    inicio: [
      '"Acerte " + meta + " asteroides para abrir a rota."',
      '"Pegue o escudo: por 5 segundos, nada tira vida."',
    ],
    relogios,
  })
}

export function fonteEscudo3D(etapa: EscudoEtapa): string {
  const tem = nivel(etapa)
  const r = ESCUDO_REGRAS
  const b = BASE_PODERES['3d']
  const placar = 'SZGame3D.hudText("top-left", "Escudo: " + tempoDoEscudo);'
  const relogios: string[] = []
  if (tem('item'))
    relogios.push(
      relogio3D(r.intervaloItem, [
        `if (estado === "jogando") {
  SZGame3D.spawnCopy(itensEscudo, moldeEscudo, ${r['3d'].faixa}, 1, ${b.nasceZ});
}`,
      ]),
    )
  if (tem('acaba'))
    relogios.push(
      relogio3D(1, [
        `if (tempoDoEscudo > 0) {
  tempoDoEscudo = tempoDoEscudo - 1;
  ${placar}
  SZGame3D.blink(nave, ${r['3d'].piscarSegundos});
}`,
      ]),
    )
  return fontePatrulhaPoder({
    declaracoes: [
      `const moldeEscudo = SZGame3D.createModelFile(cena, "${ESCUDO_ITEM}", ${r['3d'].tamanho});`,
      'SZGame3D.setVisible(moldeEscudo, "hide");',
      'const itensEscudo = SZGame3D.createGroup();',
      'let tempoDoEscudo = 0;',
    ],
    hud: [placar],
    batidaNaNave: tem('protege')
      ? [
          'SZGame3D.removeFromGroup(asteroides, asteroideQueBateu);',
          `if (tempoDoEscudo > 0) {
  SZGame3D.playEffect("coin");
} else {
  SZGame3D.hurt(nave, 1);
  SZGame3D.playEffect("hit");
}`,
        ]
      : undefined,
    encontros: tem('liga')
      ? [
          `SZGame3D.onTouchGroup(nave, itensEscudo, (itemPego) => {
  if (estado === "jogando") {
    SZGame3D.removeFromGroup(itensEscudo, itemPego);
    tempoDoEscudo = ${r.duracao};
    ${placar}
    SZGame3D.playEffect("coin");
  }
});`,
        ]
      : undefined,
    noQuadro: [
      `SZGame3D.forEachInGroup(itensEscudo, (item) => {
  SZGame3D.setVelocity(item, 0, 0, velocidadeAsteroides);
});`,
      'SZGame3D.updateGroupNoGravity(itensEscudo);',
    ],
    limpezas: ['SZGame3D.pruneArea(itensEscudo, "z", -36, 6);'],
    relogios,
  })
}

export function montarProjetoEscudo(
  dimensao: PoderDimensaoConstrutor,
  etapa: EscudoEtapa = 'inicio',
) {
  return projetoDoPoder({
    chave: `construtor-escudo-${dimensao}-${etapa}`,
    nome: `Escudo temporário — ${dimensao.toUpperCase()}`,
    dimensao,
    fonte: () => (dimensao === '2d' ? fonteEscudo2D(etapa) : fonteEscudo3D(etapa)),
    assets: () =>
      dimensao === '2d' ? assetsNavePoder(ESCUDO_OPCOES) : assetsPatrulhaPoder(ESCUDO_OPCOES),
  })
}
