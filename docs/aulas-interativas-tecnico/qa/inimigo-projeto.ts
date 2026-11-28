/**
 * Os projetos do Poder "Inimigo que atira" (Construtor), em 2D (sobre a Nave Contra Asteroides) e em
 * 3D (sobre a Patrulha Espacial).
 *
 * O Poder acrescenta um inimigo com tiros próprios: uma nave inimiga patrulha o alto da tela, de um
 * lado para o outro, e atira para baixo; o tiro que encosta na nave sai e tira uma vida; quem sai da
 * tela sai do grupo; e o reinício limpa os tiros (o `restart` do 2D e o "Voltar ao início" do 3D
 * recomeçam o jogo inteiro).
 *
 * Vem pronto (todas as etapas): a inimiga e a patrulha dela, o grupo `tirosInimigos`, o desenho e o
 * movimento dos tiros para baixo. A criança monta, etapa por etapa:
 * - `tiro`: o relógio que cria um tiro a cada 1,5 s, só na partida, no meio do alto da tela;
 * - `origem`: o tiro nasce na posição da inimiga (2D: o centro x e a posição y dela; 3D: a posição x);
 * - `dano`: o encontro da nave com um tiro inimigo: o tiro sai e a nave perde uma vida;
 * - `limpeza`: quem sai da tela sai do grupo.
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

export const INIMIGO_CURSO = 'jornada-construtor-poder-3'
export const INIMIGO_ETAPAS = ['inicio', 'tiro', 'origem', 'dano', 'limpeza'] as const
export type InimigoEtapa = (typeof INIMIGO_ETAPAS)[number]

export const INIMIGO_NAVE = 'inimiga-garra-vermelha'
export const INIMIGO_LASER = 'laser-inimigo-vermelho'
export const INIMIGO_OPCOES = [
  ...PODERES_CATEGORIAS.inimiga,
  ...PODERES_CATEGORIAS['laser-inimigo'],
] as const

export const INIMIGO_REGRAS = {
  intervalo: 1.5,
  '2d': {
    inimiga: { x: 372, y: 24, w: 56, h: 52, vx: 3 },
    tiro: { w: 10, h: 26, vy: 5 },
    meio: 395,
  },
  '3d': {
    tamanhoNave: PODERES_TAMANHO.inimiga,
    tamanhoTiro: PODERES_TAMANHO['laser-inimigo'],
    z: -24,
    velocidade: 4,
    velocidadeTiro: 12,
  },
} as const

const nivel = (etapa: InimigoEtapa) => {
  const n = INIMIGO_ETAPAS.indexOf(etapa)
  if (n < 0) throw new Error(`Etapa desconhecida do Inimigo que atira: ${etapa}`)
  return (ate: InimigoEtapa) => n >= INIMIGO_ETAPAS.indexOf(ate)
}

export function fonteInimigo2D(etapa: InimigoEtapa): string {
  const tem = nivel(etapa)
  const r = INIMIGO_REGRAS
  const d = r['2d']
  const i = d.inimiga
  const x = tem('origem') ? `SZGame2D.centerX(inimiga) - ${d.tiro.w / 2}` : String(d.meio)
  const y = tem('origem') ? `SZGame2D.spriteY(inimiga) + ${i.h}` : String(i.y + i.h)
  return fonteNavePoder({
    descricao:
      'Nave Contra Asteroides com uma nave inimiga. Enter começa. Setas esquerda e direita movem a nave. Cada aperto de Espaço dispara um laser. Uma nave inimiga patrulha o alto da tela e atira para baixo: cada tiro dela que acerta tira uma vida. Acerte 20 asteroides antes de perder as três vidas. Enter, depois do resultado, volta ao início.',
    declaracoes: [
      `const inimiga = SZGame2D.createSprite({ x: ${i.x}, y: ${i.y}, w: ${i.w}, h: ${i.h}, image: "${INIMIGO_NAVE}" });`,
      `inimiga.vx = ${i.vx}; inimiga.vy = 0;`,
      'const tirosInimigos = SZGame2D.createGroup();',
    ],
    movimentos: [
      'SZGame2D.applyVelocity(inimiga);',
      'SZGame2D.bounceOnEdgePair(inimiga, ctx, "left-right");',
      'SZGame2D.updateGroup(tirosInimigos);',
      ...(tem('limpeza')
        ? [
            `SZGame2D.pruneOffscreen(ctx, tirosInimigos, 40, (foraDaTela) => {

});`,
          ]
        : []),
    ],
    regras: tem('dano')
      ? [
          `SZGame2D.overlapSpriteGroup(() => nave, tirosInimigos, (tiroQueAcertou) => {
  SZGame2D.removeFromGroup(tirosInimigos, tiroQueAcertou);
  SZGame2D.damageSprite(nave, 1, 60);
  SZGame2D.playFx("hit");
});`,
        ]
      : undefined,
    desenhos: ['SZGame2D.drawGroup(ctx, tirosInimigos);', 'SZGame2D.drawSprite(ctx, inimiga);'],
    inicio: [
      '"Acerte " + meta + " asteroides para abrir a rota."',
      '"Cuidado: a nave inimiga lá em cima atira!"',
    ],
    relogios: tem('tiro')
      ? [
          relogio2D('cada2', r.intervalo, [
            `if (SZGame2D.sceneIs("jogando")) {
  SZGame2D.spawn(tirosInimigos, { x: ${x}, y: ${y}, w: ${d.tiro.w}, h: ${d.tiro.h}, image: "${INIMIGO_LASER}", vx: 0, vy: ${d.tiro.vy} });
}`,
          ]),
        ]
      : [],
  })
}

export function fonteInimigo3D(etapa: InimigoEtapa): string {
  const tem = nivel(etapa)
  const r = INIMIGO_REGRAS
  const d = r['3d']
  const x = tem('origem') ? 'SZGame3D.getPos(inimiga, "x")' : '0'
  return fontePatrulhaPoder({
    declaracoes: [
      `const inimiga = SZGame3D.createModelFile(cena, "${INIMIGO_NAVE}", ${d.tamanhoNave});`,
      `SZGame3D.setPosition(inimiga, 0, 1, ${d.z});`,
      `const moldeTiroInimigo = SZGame3D.createModelFile(cena, "${INIMIGO_LASER}", ${d.tamanhoTiro});`,
      'SZGame3D.setVisible(moldeTiroInimigo, "hide");',
      'const tirosInimigos = SZGame3D.createGroup();',
      'let inimigaX = 0;',
      `let velocidadeInimiga = ${d.velocidade};`,
    ],
    encontros: tem('dano')
      ? [
          `SZGame3D.onTouchGroup(nave, tirosInimigos, (tiroQueAcertou) => {
  if (estado === "jogando") {
    SZGame3D.removeFromGroup(tirosInimigos, tiroQueAcertou);
    SZGame3D.hurt(nave, 1);
    SZGame3D.playEffect("hit");
  }
});`,
        ]
      : undefined,
    noQuadro: [
      // a patrulha da inimiga: anda para um lado e vira na borda
      'inimigaX = inimigaX + velocidadeInimiga * SZGame3D.dt(cena);',
      `if (inimigaX > 5.2) {
  velocidadeInimiga = -${d.velocidade};
}`,
      `if (inimigaX < -5.2) {
  velocidadeInimiga = ${d.velocidade};
}`,
      `SZGame3D.setPosition(inimiga, inimigaX, 1, ${d.z});`,
      `SZGame3D.forEachInGroup(tirosInimigos, (tiroInimigo) => {
  SZGame3D.setVelocity(tiroInimigo, 0, 0, ${d.velocidadeTiro});
});`,
      'SZGame3D.updateGroupNoGravity(tirosInimigos);',
    ],
    limpezas: tem('limpeza') ? ['SZGame3D.pruneArea(tirosInimigos, "z", -36, 6);'] : undefined,
    relogios: tem('tiro')
      ? [
          relogio3D(r.intervalo, [
            `if (estado === "jogando") {
  SZGame3D.spawnCopy(tirosInimigos, moldeTiroInimigo, ${x}, 1, ${d.z + 2});
}`,
          ]),
        ]
      : [],
  })
}

export function montarProjetoInimigo(
  dimensao: PoderDimensaoConstrutor,
  etapa: InimigoEtapa = 'inicio',
) {
  return projetoDoPoder({
    chave: `construtor-inimigo-${dimensao}-${etapa}`,
    nome: `Inimigo que atira — ${dimensao.toUpperCase()}`,
    dimensao,
    fonte: () => (dimensao === '2d' ? fonteInimigo2D(etapa) : fonteInimigo3D(etapa)),
    assets: () =>
      dimensao === '2d' ? assetsNavePoder(INIMIGO_OPCOES) : assetsPatrulhaPoder(INIMIGO_OPCOES),
  })
}
