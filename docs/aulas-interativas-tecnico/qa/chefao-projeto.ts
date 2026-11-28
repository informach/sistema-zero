/**
 * Os projetos do Poder "Chefão com resistência" (Construtor), em 2D (sobre a Nave Contra Asteroides)
 * e em 3D (sobre a Patrulha Espacial).
 *
 * O Poder acrescenta a vida de um inimigo: um chefão fica no alto, no meio, durante a partida; ele
 * começa com `vidaDoChefao = 5`, cada laser que acerta sai e tira 1, e em zero o chefão sai da tela e
 * dá 10 pontos de prêmio, uma vez só (a guarda `chefaoDerrotado`). O prêmio ajuda a chegar à meta,
 * que continua dando a vitória.
 *
 * Vem pronto (todas as etapas): o chefão no alto e o desenho dele. A criança monta, etapa por etapa:
 * - `vida`: a variável `vidaDoChefao` com 5 e a barra (2D) ou o texto (3D) que mostra a vida;
 * - `acerto`: o encontro do laser com o chefão: o laser sai e a vida perde 1;
 * - `fim`: em zero, o chefão sai e dá 10 pontos. Sem guarda, isso roda a cada quadro e o placar
 *   dispara: a etapa mostra o problema que a próxima conserta;
 * - `uma-vez`: a guarda `chefaoDerrotado`, que faz o prêmio valer uma vez só.
 *
 * O chefão fica parado no meio, onde a nave começa: todo laser da nave parada acerta, e o Verificar
 * consegue contar os acertos sem depender da sorte. No 3D a vida é uma variável, não a vida do motor
 * (`setLife`): o primeiro objeto com vida vira o herói. No 3D o acerto é um encontro (o chefão
 * encostando num laser), como os itens dos outros Poderes: no quadro ele ficaria fundo demais para o
 * desenho do caderno, e o fim no zero continua no quadro, que é onde o prêmio sem guarda dispara.
 */
import {
  assetsNavePoder,
  assetsPatrulhaPoder,
  fonteNavePoder,
  fontePatrulhaPoder,
  type PoderDimensaoConstrutor,
  projetoDoPoder,
} from './construtor-poderes-base'
import { PODERES_CATEGORIAS, PODERES_TAMANHO } from './publicar-poderes-modelos'

export const CHEFAO_CURSO = 'jornada-construtor-poder-4'
export const CHEFAO_ETAPAS = ['inicio', 'vida', 'acerto', 'fim', 'uma-vez'] as const
export type ChefaoEtapa = (typeof CHEFAO_ETAPAS)[number]

export const CHEFAO_MODELO = 'chefao-cruzador'
export const CHEFAO_OPCOES = PODERES_CATEGORIAS.chefao

export const CHEFAO_REGRAS = {
  vida: 5,
  premio: 10,
  '2d': {
    chefao: { x: 300, y: 20, w: 200, h: 130 },
    barra: { x: 300, y: 158, w: 200, h: 10 },
    fora: -400,
  },
  '3d': { tamanho: PODERES_TAMANHO.chefao, z: -24, fora: -200 },
} as const

const nivel = (etapa: ChefaoEtapa) => {
  const n = CHEFAO_ETAPAS.indexOf(etapa)
  if (n < 0) throw new Error(`Etapa desconhecida do Chefão: ${etapa}`)
  return (ate: ChefaoEtapa) => n >= CHEFAO_ETAPAS.indexOf(ate)
}

/** O que acontece quando a vida zera (com a guarda, a partir da etapa `uma-vez`). */
function aoZerar(tem: (e: ChefaoEtapa) => boolean, corpo: string[]): string {
  const dentro = corpo.join('\n')
  if (!tem('uma-vez'))
    return `if (vidaDoChefao <= 0) {
${dentro.replace(/^/gm, '  ')}
}`
  return `if (vidaDoChefao <= 0) {
  if (chefaoDerrotado === false) {
    chefaoDerrotado = true;
${dentro.replace(/^/gm, '    ')}
  }
}`
}

export function fonteChefao2D(etapa: ChefaoEtapa): string {
  const tem = nivel(etapa)
  const r = CHEFAO_REGRAS
  const c = r['2d'].chefao
  const b = r['2d'].barra
  return fonteNavePoder({
    descricao: `Nave Contra Asteroides com um chefão. Enter começa. Setas esquerda e direita movem a nave. Cada aperto de Espaço dispara um laser. Um chefão fica no alto da tela: ele aguenta ${r.vida} lasers, e derrotar o chefão dá ${r.premio} pontos. Acerte 20 asteroides antes de perder as três vidas. Enter, depois do resultado, volta ao início.`,
    declaracoes: [
      `const chefao = SZGame2D.createSprite({ x: ${c.x}, y: ${c.y}, w: ${c.w}, h: ${c.h}, image: "${CHEFAO_MODELO}" });`,
      ...(tem('vida') ? [`let vidaDoChefao = ${r.vida};`] : []),
      ...(tem('uma-vez') ? ['let chefaoDerrotado = false;'] : []),
    ],
    regras: [
      ...(tem('acerto')
        ? [
            `SZGame2D.overlapSpriteGroup(() => chefao, tiros, (tiroNoChefao) => {
  SZGame2D.removeFromGroup(tiros, tiroNoChefao);
  vidaDoChefao = vidaDoChefao - 1;
  SZGame2D.playFx("hit");
});`,
          ]
        : []),
      ...(tem('fim')
        ? [
            aoZerar(tem, [
              'SZGame2D.explodeSprite(chefao, "#ffd166");',
              `SZGame2D.setPosition(chefao, ${c.x}, ${r['2d'].fora});`,
              `pontos = pontos + ${r.premio};`,
              'SZGame2D.playFx("explosion");',
            ]),
          ]
        : []),
    ],
    desenhos: ['SZGame2D.drawSprite(ctx, chefao);'],
    hud: tem('vida')
      ? [
          `SZGame2D.drawBar(ctx, vidaDoChefao, ${r.vida}, ${b.x}, ${b.y}, ${b.w}, ${b.h}, "#ff6b6b");`,
        ]
      : [],
    inicio: [
      '"Acerte " + meta + " asteroides para abrir a rota."',
      '"Derrote o chefão: ele aguenta 5 lasers."',
    ],
  })
}

export function fonteChefao3D(etapa: ChefaoEtapa): string {
  const tem = nivel(etapa)
  const r = CHEFAO_REGRAS
  const d = r['3d']
  const placar = 'SZGame3D.hudText("top-left", "Chefão: " + vidaDoChefao);'
  return fontePatrulhaPoder({
    declaracoes: [
      `const chefao = SZGame3D.createModelFile(cena, "${CHEFAO_MODELO}", ${d.tamanho});`,
      `SZGame3D.setPosition(chefao, 0, 1, ${d.z});`,
      ...(tem('vida') ? [`let vidaDoChefao = ${r.vida};`] : []),
      ...(tem('uma-vez') ? ['let chefaoDerrotado = false;'] : []),
    ],
    hud: tem('vida') ? [placar] : undefined,
    encontros: tem('acerto')
      ? [
          `SZGame3D.onTouchGroup(chefao, tiros, (tiroNoChefao) => {
  SZGame3D.removeFromGroup(tiros, tiroNoChefao);
  vidaDoChefao = vidaDoChefao - 1;
  ${placar}
  SZGame3D.playEffect("hit");
});`,
        ]
      : undefined,
    noQuadro: [
      ...(tem('fim')
        ? [
            aoZerar(tem, [
              `SZGame3D.setPosition(chefao, 0, 1, ${d.fora});`,
              `pontos = pontos + ${r.premio};`,
              'SZGame3D.hudText("top-right", "Acertos: " + pontos + " / 20");',
            ]),
          ]
        : []),
    ],
  })
}

export function montarProjetoChefao(
  dimensao: PoderDimensaoConstrutor,
  etapa: ChefaoEtapa = 'inicio',
) {
  return projetoDoPoder({
    chave: `construtor-chefao-${dimensao}-${etapa}`,
    nome: `Chefão com resistência — ${dimensao.toUpperCase()}`,
    dimensao,
    fonte: () => (dimensao === '2d' ? fonteChefao2D(etapa) : fonteChefao3D(etapa)),
    assets: () =>
      dimensao === '2d' ? assetsNavePoder(CHEFAO_OPCOES) : assetsPatrulhaPoder(CHEFAO_OPCOES),
  })
}
