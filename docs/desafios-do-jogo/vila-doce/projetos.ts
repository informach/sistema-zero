import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'

/**
 * A corrida do entregador (A15, revisão de 31/10/2026): o jogo do Corre, Dino! do Inventor com o
 * tema da Vila. O entregador do Bento é o dinossauro do Jogo 2D, as pedras são os obstáculos do
 * mesmo kit e o fundo é a rua da Vila; no quadro 6 a corrida é pelos telhados, pulando chaminés
 * (`jogo`). Cada quadro deixa uma parte do jogo para completar, na
 * ordem das aulas do curso: pulo com gravidade, pedras que entram, começar e recomeçar, a batida
 * com a área justa, o sorteio com limites e a dificuldade com teto. Os desafios do dia partem do
 * jogo inteiro.
 */
export const VARIACOES = [
  'pulo',
  'pedras',
  'partida',
  'batida',
  'sorteio',
  'corrida',
  'pulo-alto',
  'pombos',
  'descricao',
] as const
export type Variacao = (typeof VARIACOES)[number]

/** Palco do Corre, Dino!, chão do kit (a 16% da base) e os números da corrida. */
export const PISTA = {
  largura: 480,
  altura: 270,
  /** O pé do entregador parado no chão: 270 − 43 − 56. */
  chao: 171,
  x: 70,
  y: 150,
  tamanho: 56,
  pulo: 13,
  puloFraco: 9,
  pedra: 36,
  pedraGrande: 60,
  velocidade: -5,
  limite: -9,
  area: 80,
} as const

/** O que cada variação deixa para completar; o gabarito liga a parte, o inicial não. */
type Parte =
  | 'gravidade'
  | 'pedras'
  | 'entrada'
  | 'batida'
  | 'sorteio'
  | 'ritmo'
  | 'puloForte'
  | 'pombos'
  | 'descricao'
/** O extra opcional de cada variação, que o inicial também não tem. */
type Extra = 'somDoPulo' | 'efeitos' | 'telaComMetros' | 'boloDourado'

export const PARTE: Record<Variacao, Parte> = {
  pulo: 'gravidade',
  pedras: 'pedras',
  partida: 'entrada',
  batida: 'batida',
  sorteio: 'sorteio',
  corrida: 'ritmo',
  'pulo-alto': 'puloForte',
  pombos: 'pombos',
  descricao: 'descricao',
}
export const EXTRA: Record<Variacao, Extra> = {
  pulo: 'somDoPulo',
  pedras: 'efeitos',
  partida: 'telaComMetros',
  batida: 'efeitos',
  sorteio: 'somDoPulo',
  // A proposta: "★ Desafio extra: um bolo dourado que vale o dobro" (lacunas, 01/11/2026).
  corrida: 'boloDourado',
  'pulo-alto': 'somDoPulo',
  pombos: 'efeitos',
  descricao: 'telaComMetros',
}

const n = (value: number): JSExpr => ({ type: 'num', value })
const s = (value: string): JSExpr => ({ type: 'str', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const cena = (name: string): JSExpr => ({ type: 'g2d:sceneIs', name })
const irPara = (name: string): JSStatement => ({ type: 'g2d:setScene', name })
const sorteio = (min: number, max: number): JSExpr => ({
  type: 'g2d:randomBetween',
  min: n(min),
  max: n(max),
})
const somar = (name: string, delta: number): JSStatement => ({
  type: 'assign',
  name,
  // O bloco "somar" do Blockly escreve `x - 1` para um passo negativo.
  value: { type: 'binop', op: delta < 0 ? '-' : '+', left: v(name), right: n(Math.abs(delta)) },
})
const se = (
  cond: JSExpr,
  then: JSStatement[],
  elseif?: { cond: JSExpr; then: JSStatement[] }[],
): JSStatement => ({ type: 'if', cond, then, ...(elseif ? { elseif } : {}) }) as JSStatement
/** Um "senão se" do Se (o campo `then` é o da IR). */
const senaoSe = (cond: JSExpr, then: JSStatement[]) => ({ cond, then })
const tela = (title: JSExpr, subtitle: JSExpr, hint: string): JSStatement => ({
  type: 'g2d:showScreen',
  ctxVar: 'ctx',
  title,
  subtitle,
  hint: s(hint),
  bg: '#5b3a2e',
})

const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
const loja = (x: number, cor: string, nome: string) =>
  `<g transform="translate(${x} 96)"><rect x="8" y="22" width="112" height="110" rx="10" fill="#fff4d8" stroke="#805953" stroke-width="3"/><path d="M2 30 20 6h88l18 24z" fill="${cor}"/><path d="M5 40h118v16H5z" fill="${cor}"/><path d="M20 40v16m28-16v16m28-16v16m28-16v16" stroke="#fff2de" stroke-width="11"/><rect x="20" y="66" width="30" height="30" rx="6" fill="#9bd6df" stroke="#805953" stroke-width="2"/><rect x="74" y="66" width="32" height="66" rx="8" fill="#c99072"/><text x="64" y="26" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="12" fill="#493c56">${nome}</text></g>`
/** A rua da Vila Doce: o chão do kit fica em y 227, onde começa a calçada. */
const VILA = svg(
  480,
  270,
  `<rect width="480" height="270" fill="#bfe6f2"/><g fill="#fff" opacity=".8"><ellipse cx="80" cy="40" rx="34" ry="11"/><ellipse cx="330" cy="30" rx="42" ry="12"/></g>${loja(14, '#f2b56a', 'BENTO')}${loja(176, '#ca9acb', 'DOCES')}${loja(338, '#8fc7a4', 'SUCOS')}<rect y="227" width="480" height="43" fill="#d8c3a5"/><path d="M0 227h480" stroke="#9c7b5f" stroke-width="3"/><g fill="#c7ad8c"><rect x="20" y="240" width="38" height="10" rx="3"/><rect x="110" y="252" width="38" height="10" rx="3"/><rect x="200" y="240" width="38" height="10" rx="3"/><rect x="290" y="252" width="38" height="10" rx="3"/><rect x="380" y="240" width="38" height="10" rx="3"/></g>`,
)
/** Uma casa ao longe, com o telhado de duas águas e a chaminé soltando fumaça. */
const casaAoLonge = (
  x: number,
  base: number,
  l: number,
  a: number,
  parede: string,
  telhado: string,
) =>
  `<g transform="translate(${x} ${base})"><rect x="0" y="${-a}" width="${l}" height="${a}" fill="${parede}"/><rect x="${l * 0.62}" y="${-a - 22}" width="9" height="16" fill="${telhado}"/><path d="M-5 ${-a + 2} ${l / 2} ${-a - 20} ${l + 5} ${-a + 2}z" fill="${telhado}"/><g fill="#fff" opacity=".7"><circle cx="${l * 0.62 + 5}" cy="${-a - 28}" r="4"/><circle cx="${l * 0.62 + 9}" cy="${-a - 36}" r="5"/><circle cx="${l * 0.62 + 6}" cy="${-a - 45}" r="3.5"/></g><rect x="${l * 0.2}" y="${-a + 10}" width="10" height="12" rx="2" fill="#fff4d8" opacity=".85"/><rect x="${l * 0.58}" y="${-a + 10}" width="10" height="12" rx="2" fill="#fff4d8" opacity=".85"/></g>`
/** A torre de doces da sorveteria lá no fundo, a mesma que se vê da ponte no jogo (o marco da Vila). */
const TORRE_DE_DOCES = `<g transform="translate(300 0)"><rect x="-18" y="120" width="36" height="72" rx="3" fill="#bfe9db"/><rect x="-20" y="118" width="40" height="6" rx="2" fill="#ffd6e4"/><path d="M-13 118 0 84 13 118z" fill="#e9b86a"/><path d="M-9 108 9 108M-6 98 6 98" stroke="#c4883e" stroke-width="2"/><circle cx="0" cy="80" r="13" fill="#9ff0cf"/><circle cx="0" cy="66" r="11" fill="#ff8fb8"/><circle cx="0" cy="54" r="9" fill="#fff3cf"/><circle cx="0" cy="45" r="3.5" fill="#e8505b"/><path d="M0 42V12" stroke="#fff" stroke-width="3"/><path d="M-2 40 2 36M-2 32 2 28M-2 24 2 20" stroke="#e8505b" stroke-width="2"/><ellipse cx="0" cy="34" rx="6" ry="2.6" fill="#ff8fb8"/><ellipse cx="0" cy="26" rx="5" ry="2.4" fill="#c7a6ff"/><path d="M0 2 2.4 8.6 9 8.6 3.7 12.6 5.6 19 0 15.2-5.6 19-3.7 12.6-9 8.6-2.4 8.6z" fill="#ffe27a" stroke="#f2b23a" stroke-width="1"/></g>`
/**
 * Os telhados da Vila Doce, onde corre o entregador no quadro 6 (a ficha da proposta: "telhados,
 * chaminés e um bolo dourado"). O céu de tarde, a torre de doces e as casas ao longe com as chaminés
 * soltando fumaça, as casas mais perto e, na frente, a fileira de telhados de telha doce: o beiral de
 * glacê fica em y 227, onde o kit põe o chão, e é por ele que o entregador corre.
 */
const TELHADOS = svg(
  480,
  270,
  `<defs><linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd9ee"/><stop offset=".75" stop-color="#ffe9f1"/></linearGradient><pattern id="telha" width="16" height="9" patternUnits="userSpaceOnUse"><rect width="16" height="9" fill="#c9625a"/><path d="M0.6 0v1.5a7.4 7.4 0 0 0 14.8 0V0z" fill="#e98a7c"/><path d="M2 2.6a6 6 0 0 0 5 4.4" fill="none" stroke="#f6b0a2" stroke-width="1.2" stroke-linecap="round"/></pattern><pattern id="telha2" x="8" width="16" height="9" patternUnits="userSpaceOnUse"><rect width="16" height="9" fill="#c9625a"/><path d="M0.6 0v1.5a7.4 7.4 0 0 0 14.8 0V0z" fill="#e98a7c"/><path d="M2 2.6a6 6 0 0 0 5 4.4" fill="none" stroke="#f6b0a2" stroke-width="1.2" stroke-linecap="round"/></pattern></defs><rect width="480" height="270" fill="url(#ceu)"/><circle cx="412" cy="46" r="30" fill="#fff6c9" opacity=".45"/><circle cx="412" cy="46" r="19" fill="#fff1a8"/><g fill="#fff" opacity=".85"><ellipse cx="70" cy="44" rx="34" ry="11"/><ellipse cx="96" cy="38" rx="20" ry="10"/><ellipse cx="216" cy="28" rx="40" ry="11"/></g>${TORRE_DE_DOCES}<g opacity=".9">${casaAoLonge(10, 200, 46, 40, '#e2d4f2', '#c7b2e6')}${casaAoLonge(72, 200, 40, 52, '#f5dce8', '#d9a9c4')}${casaAoLonge(132, 200, 52, 36, '#d8ecdf', '#a9d4b8')}${casaAoLonge(206, 200, 40, 46, '#fbe3c9', '#e7b98a')}${casaAoLonge(340, 200, 50, 44, '#e2d4f2', '#c7b2e6')}${casaAoLonge(412, 200, 56, 34, '#f5dce8', '#d9a9c4')}</g>${casaAoLonge(30, 230, 58, 28, '#ffd9c7', '#c96f5f')}${casaAoLonge(160, 230, 50, 22, '#fff0c9', '#c96f5f')}${casaAoLonge(268, 230, 60, 30, '#e5f4ff', '#c96f5f')}${casaAoLonge(392, 230, 54, 24, '#ffe0ec', '#c96f5f')}<rect y="229" width="480" height="41" fill="url(#telha)"/><rect y="238" width="480" height="9" fill="url(#telha2)"/><rect y="256" width="480" height="9" fill="url(#telha2)"/><rect y="229" width="480" height="41" fill="#7a2f2a" opacity=".06"/><rect y="224" width="480" height="7" rx="2" fill="#fff2de"/><g fill="#fff2de">${Array.from({ length: 16 }, (_, i) => `<path d="M${14 + i * 30} 230q0 7 3.5 7t3.5-7z"/>`).join('')}</g><path d="M0 224.5h480" stroke="#e7cfae" stroke-width="1"/><g fill="#ff8fb8">${Array.from({ length: 12 }, (_, i) => `<circle cx="${8 + i * 40}" cy="227.5" r="1.6"/>`).join('')}</g><g fill="#9ff0cf">${Array.from({ length: 12 }, (_, i) => `<circle cx="${28 + i * 40}" cy="227" r="1.6"/>`).join('')}</g>`,
)
/** A chaminé de tijolo de morango com a borda de glacê: o que o entregador pula na corrida. */
export const CHAMINE = { w: 30, h: 40 } as const
const CHAMINE_SVG = svg(
  CHAMINE.w,
  CHAMINE.h,
  '<rect x="3" y="8" width="24" height="32" rx="2" fill="#e47b7b" stroke="#a9524f" stroke-width="1.5"/><g stroke="#ffe8e0" stroke-width="1.4"><path d="M3.8 16h22.4M3.8 24h22.4M3.8 32h22.4"/><path d="M15 9v7M9 16v8M21 16v8M15 24v8M9 32v7M21 32v7"/></g><rect x="0.8" y="2" width="28.4" height="8" rx="3" fill="#fff2de" stroke="#e7cfae" stroke-width="1"/><path d="M5 9.5q0 5 2.2 5t2.2-5zM13 9.5q0 7 2.2 7t2.2-7zM21 9.5q0 4 2.2 4t2.2-4z" fill="#fff2de"/><rect x="5" y="0.5" width="20" height="3" rx="1.5" fill="#6b3f25"/><g fill="#ff8fb8"><circle cx="7" cy="6" r="1"/><circle cx="19" cy="5.5" r="1"/></g><g fill="#7fc8f8"><circle cx="12.5" cy="6.5" r="1"/><circle cx="24" cy="6.2" r="1"/></g>',
)
/** O bolo dourado do extra da corrida: dois andares de massa dourada, glacê, a cereja e o brilho. */
const BOLO = svg(
  32,
  32,
  '<defs><linearGradient id="ouro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#e7a92b"/></linearGradient><radialGradient id="halo"><stop offset=".55" stop-color="#fff1a8" stop-opacity=".8"/><stop offset="1" stop-color="#fff1a8" stop-opacity="0"/></radialGradient></defs><circle cx="16" cy="17" r="16" fill="url(#halo)"/><ellipse cx="16" cy="28" rx="14" ry="3.6" fill="#e9e3f3"/><rect x="4" y="16" width="24" height="11" rx="3" fill="url(#ouro)" stroke="#b8871f" stroke-width="1.4"/><path d="M4.5 18.5q2.5 4 5 0t5 0 5 0 5 0 4 0V17H4.5z" fill="#fff6cf"/><rect x="9" y="8.5" width="14" height="8.5" rx="2.5" fill="url(#ouro)" stroke="#b8871f" stroke-width="1.4"/><path d="M9.5 10.5q2 3.4 4.2 0t4.2 0 4.2 0V9.5h-12.6z" fill="#fff6cf"/><circle cx="16" cy="6" r="2.8" fill="#e8505b"/><path d="M16 3.4q1-2.6 3.4-2.8" fill="none" stroke="#5c8f3a" stroke-width="1.1"/><rect x="6.5" y="19.5" width="2" height="6" rx="1" fill="#fff" opacity=".5"/><g fill="#fffbe6"><path d="M4 7l.9 2.1L7 10l-2.1.9L4 13l-.9-2.1L1 10l2.1-.9z"/><path d="M28 4l.7 1.6 1.6.7-1.6.7L28 8.6l-.7-1.6-1.6-.7 1.6-.7z"/></g>',
)
const imagem = (id: string, name: string, conteudo: string): ProjectAsset => ({
  id,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(conteudo).toString('base64')}`,
})
/** A rua nos quadros 1 a 5 e nos desafios do dia; os telhados, a chaminé e o bolo só na corrida. */
function assetsDa(variacao: Variacao): ProjectAsset[] {
  return variacao === 'corrida'
    ? [
        imagem('vila-telhados', 'telhados', TELHADOS),
        imagem('vila-chamine', 'chamine', CHAMINE_SVG),
        imagem('vila-bolo-dourado', 'bolo', BOLO),
      ]
    : [imagem('vila-rua', 'vila', VILA)]
}

/** O bolo dourado anda pela rua na altura do entregador e volta ao começo (blocos do Faísca). */
const BOLO_DOURADO = { x: 560, y: 175, tamanho: 28, passo: -4 } as const
const velocidadeDe = (sprite: string, vx: JSExpr, vy: JSExpr): JSStatement => ({
  type: 'g2d:setVelocity',
  spriteVar: sprite,
  vx,
  vy,
})
/**
 * Leva um desenho a (x, y) só com os blocos do Faísca: uma velocidade grande o leva ao canto de
 * cima, à esquerda, a borda da tela segura ali, e uma velocidade do tamanho de (x, y) o põe no lugar.
 */
function levarPara(sprite: string, x: JSExpr, y: number): JSStatement[] {
  return [
    velocidadeDe(sprite, n(-640), n(-480)),
    { type: 'g2d:applyVelocity', spriteVar: sprite },
    { type: 'g2d:clampToScreen', spriteVar: sprite, ctxVar: 'ctx' },
    velocidadeDe(sprite, x, n(y)),
    { type: 'g2d:applyVelocity', spriteVar: sprite },
  ]
}
/** Leva o bolo ao começo da rua e deixa ele andando de novo. */
function boloAoComeco(): JSStatement[] {
  return [
    ...levarPara('bolo', n(BOLO_DOURADO.x), BOLO_DOURADO.y),
    velocidadeDe('bolo', n(BOLO_DOURADO.passo), n(0)),
  ]
}

/**
 * A corrida do entregador (o quadro 6, o minijogo da ficha) é pelos telhados, pulando chaminés (a
 * ficha da proposta: "cada vez mais rápido" e "encostar numa chaminé encerra a corrida e mostra os
 * pontos"). As chaminés são duas imagens (o bloco de imagem do Faísca, a arte que dá para trocar no
 * Pinta) que se revezam: no relógio da corrida, a da vez entra pela direita com a velocidade de
 * agora, no mesmo relógio que deixa a próxima mais rápida. Os quadros 1 a 5 e os desafios do dia
 * montam a corrida na rua, com as pedras do kit do Corre, Dino!.
 */
const CHAMINES = ['chamine1', 'chamine2'] as const
/** Fora da tela, à direita: onde as chaminés esperam a primeira vez. */
const ESPERA_DA_CHAMINE = 600
/** Onde o kit põe o chão (16% acima da base do palco): o beiral dos telhados. */
const CHAO_DO_KIT = 227
const igual = (nome: string, valor: number): JSExpr => ({
  type: 'binop',
  op: '===',
  left: v(nome),
  right: n(valor),
})
const definir = (name: string, valor: number): JSStatement => ({
  type: 'assign',
  name,
  value: n(valor),
})

const DESCRICAO_COMPLETA =
  'Leve os doces do Bento pela rua: pule as pedras com Espaço, com a seta para cima ou com um toque na tela.'
const DESCRICAO_DOS_TELHADOS =
  'Leve os doces do Bento pelos telhados: pule as chaminés com Espaço, com a seta para cima ou com um toque na tela.'
const DESCRICAO_CURTA = 'A corrida do entregador da Vila Doce.'

/** O jogo inteiro, com as partes que faltam desligadas. */
function jogo(variacao: Variacao, liga: (p: Parte | Extra) => boolean): SZIRV2 {
  const nosTelhados = variacao === 'corrida'
  const largadaDoPulo = liga('puloForte') ? PISTA.pulo : PISTA.puloFraco
  // Uma expressão nova a cada uso (cada bloco tem o próprio identificador).
  const lugarDeEntrada = () => (liga('sorteio') ? sorteio(500, 560) : n(520))
  const pedra: JSStatement = {
    type: 'g2d:spawnObstacle',
    groupVar: 'pedras',
    ctxVar: 'ctx',
    // Os pombos só voam no desafio deles; nos outros, só pedras.
    shape: variacao === 'pombos' && liga('pombos') ? 'random' : 'rock',
    x: lugarDeEntrada(),
    // O sorteio com limites (aula 12): o lugar de entrada e o tamanho de cada pedra.
    size:
      variacao === 'pulo-alto'
        ? n(PISTA.pedraGrande)
        : liga('sorteio')
          ? sorteio(28, 44)
          : n(PISTA.pedra),
    vx: v('velocidade'),
  }
  /** A chaminé da vez entra pela direita, andando com a velocidade de agora. */
  const chamineEntra = (nome: string): JSStatement[] => [
    ...levarPara(nome, lugarDeEntrada(), CHAO_DO_KIT - CHAMINE.h),
    velocidadeDe(nome, v('velocidade'), n(0)),
  ]
  const entra: JSStatement[] = nosTelhados
    ? [
        se(
          igual('vez', 1),
          [...chamineEntra('chamine1'), definir('vez', 2)],
          [senaoSe(igual('vez', 2), [...chamineEntra('chamine2'), definir('vez', 1)])],
        ),
      ]
    : [pedra]
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: n(PISTA.largura), height: n(PISTA.altura), bg: '#bfe6f2' },
    {
      type: 'g2d:setStageDescription',
      description: liga('descricao')
        ? nosTelhados
          ? DESCRICAO_DOS_TELHADOS
          : DESCRICAO_COMPLETA
        : DESCRICAO_CURTA,
    },
    {
      type: 'g2d:createDino',
      varName: 'entregador',
      x: n(PISTA.x),
      y: n(PISTA.y),
      size: n(PISTA.tamanho),
      color: '#f2a65a',
    },
    ...(nosTelhados ? [] : [{ type: 'g2d:createGroup', varName: 'pedras' } as JSStatement]),
    irPara('inicio'),
    ...(liga('batida')
      ? [
          {
            type: 'g2d:setHitboxScale',
            spriteVar: 'entregador',
            percent: n(PISTA.area),
          } as JSStatement,
        ]
      : []),
    { type: 'var', name: 'metros', value: n(0) },
    { type: 'var', name: 'velocidade', value: n(PISTA.velocidade) },
    // Nos telhados: as duas chaminés esperando fora da tela, a vez da primeira e o bolo dourado.
    ...(nosTelhados
      ? [
          ...CHAMINES.map(
            (nome) =>
              ({
                type: 'g2d:createImageSprite',
                varName: nome,
                image: 'chamine',
                x: ESPERA_DA_CHAMINE,
                y: CHAO_DO_KIT - CHAMINE.h,
                w: CHAMINE.w,
                h: CHAMINE.h,
              }) as JSStatement,
          ),
          { type: 'var', name: 'vez', value: n(1) } as JSStatement,
          {
            type: 'g2d:createImageSprite',
            varName: 'bolo',
            image: 'bolo',
            x: BOLO_DOURADO.x,
            y: BOLO_DOURADO.y,
            w: BOLO_DOURADO.tamanho,
            h: BOLO_DOURADO.tamanho,
          } as JSStatement,
          velocidadeDe('bolo', n(BOLO_DOURADO.passo), n(0)),
        ]
      : []),
  ]
  /** A batida: o fim da corrida (com os efeitos, quando ligados, em quem bateu). */
  const batida = (quem: string): JSStatement[] =>
    liga('batida')
      ? [
          ...(liga('efeitos')
            ? [
                { type: 'g2d:explode', spriteVar: quem, color: '#f2b56a' } as JSStatement,
                { type: 'g2d:shake', ctxVar: 'ctx', intensity: n(6) } as JSStatement,
              ]
            : []),
          { type: 'g2d:playFx', fx: 'gameover' },
          irPara('fim'),
        ]
      : []
  const events: JSStatement[] = [
    ...(liga('somDoPulo')
      ? [
          {
            type: 'g2d:onJump',
            spriteVar: 'entregador',
            body: [{ type: 'g2d:playFx', fx: 'jump' }],
          } as JSStatement,
        ]
      : []),
    {
      type: 'g2d:onAnyInput',
      body: liga('entrada')
        ? [
            se(
              cena('inicio'),
              [irPara('jogando')],
              [senaoSe(cena('fim'), [{ type: 'g2d:restart' }])],
            ),
          ]
        : [],
    },
  ]
  if (nosTelhados) {
    // Encostar numa chaminé encerra a corrida (só durante a corrida: parada no fim, ela não conta).
    for (const nome of CHAMINES)
      events.push({
        type: 'g2d:onOverlap',
        aVar: 'entregador',
        bVar: nome,
        body: liga('batida') ? [se(cena('jogando'), batida(nome))] : [],
      })
    // O extra da corrida: pegar o bolo dourado vale 2 metros de uma vez, o dobro de um segundo.
    events.push({
      type: 'g2d:onOverlap',
      aVar: 'entregador',
      bVar: 'bolo',
      body: liga('boloDourado') ? [somar('metros', 2), ...boloAoComeco()] : [],
    })
  }
  const obstaculos: JSStatement[] = nosTelhados
    ? CHAMINES.flatMap((nome) => [
        { type: 'g2d:applyVelocity', spriteVar: nome } as JSStatement,
        { type: 'g2d:drawSprite', spriteVar: nome, ctxVar: 'ctx' } as JSStatement,
      ])
    : [
        { type: 'g2d:updateGroup', groupVar: 'pedras' },
        { type: 'g2d:drawGroup', groupVar: 'pedras', ctxVar: 'ctx' },
        {
          type: 'g2d:onSpriteGroupOverlap',
          spriteVar: 'entregador',
          groupVar: 'pedras',
          itemName: 'pedra',
          body: batida('pedra'),
        },
        {
          type: 'g2d:pruneOffscreen',
          groupVar: 'pedras',
          ctxVar: 'ctx',
          itemName: 'pedra',
          body: [],
        },
      ]
  const loops: JSStatement[] = [
    {
      type: 'g2d:updateEachFrame',
      body: [
        { type: 'g2d:clear' },
        { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: nosTelhados ? 'telhados' : 'vila' },
        se(
          cena('jogando'),
          [
            ...(liga('gravidade')
              ? [
                  { type: 'g2d:applyGravity', spriteVar: 'entregador' } as JSStatement,
                  {
                    type: 'g2d:controlDino',
                    spriteVar: 'entregador',
                    ctxVar: 'ctx',
                    jump: n(largadaDoPulo),
                  } as JSStatement,
                ]
              : []),
            { type: 'g2d:drawSprite', spriteVar: 'entregador', ctxVar: 'ctx' },
            ...(nosTelhados
              ? [
                  { type: 'g2d:applyVelocity', spriteVar: 'bolo' } as JSStatement,
                  se(
                    {
                      type: 'binop',
                      op: '<',
                      left: { type: 'g2d:spriteX', spriteVar: 'bolo' },
                      right: n(-40),
                    },
                    boloAoComeco(),
                  ),
                  { type: 'g2d:drawSprite', spriteVar: 'bolo', ctxVar: 'ctx' } as JSStatement,
                ]
              : []),
            ...obstaculos,
            {
              type: 'g2d:drawScore',
              ctxVar: 'ctx',
              label: 'Metros: ',
              value: v('metros'),
              x: n(12),
              y: n(30),
              color: '#493c56',
              size: n(22),
            },
          ],
          [
            senaoSe(cena('inicio'), [
              tela(
                s('A corrida do entregador'),
                s(
                  nosTelhados
                    ? 'Leve os doces do Bento pelos telhados.'
                    : 'Leve os doces do Bento pela rua.',
                ),
                'Aperte uma tecla ou toque na tela para começar',
              ),
            ]),
            senaoSe(cena('fim'), [
              tela(
                s('Fim da corrida'),
                s(
                  nosTelhados
                    ? 'Uma chaminé parou o entregador.'
                    : 'Uma pedra derrubou o entregador.',
                ),
                'Aperte uma tecla ou toque para correr de novo',
              ),
              ...(liga('telaComMetros')
                ? [
                    {
                      type: 'g2d:drawScore',
                      ctxVar: 'ctx',
                      label: 'Metros: ',
                      value: v('metros'),
                      x: n(190),
                      y: n(240),
                      color: '#fff4d8',
                      size: n(22),
                    } as JSStatement,
                  ]
                : []),
            ]),
          ],
        ),
      ],
    },
    {
      type: 'g2d:everySeconds',
      seconds: n(1.4),
      body: [
        se(cena('jogando'), [
          ...(liga('pedras') ? entra : []),
          // A dificuldade com teto (aula 13 do Corre, Dino!): cada pedra (ou chaminé) nova deixa a
          // próxima mais rápida, até o limite.
          ...(liga('ritmo')
            ? [
                se({ type: 'binop', op: '>', left: v('velocidade'), right: n(PISTA.limite) }, [
                  somar('velocidade', -1),
                ]),
              ]
            : []),
        ]),
      ],
    },
    {
      type: 'g2d:everySeconds',
      seconds: n(1),
      body: [se(cena('jogando'), [somar('metros', 1)])],
    },
  ]
  return {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d' }],
    behavior: { start, events, loops },
  }
}

/**
 * O quadro 6 segue a ficha da proposta (lacunas, 01/11/2026): "cada vez mais rápido" e "encostar
 * numa chaminé encerra a corrida e mostra os pontos". Por isso, na corrida do entregador, a tela
 * do fim com os metros também falta no inicial; o teto da velocidade fica pronto (é a missão).
 */
const FALTA_TAMBEM: Partial<Record<Variacao, Parte | Extra>> = { corrida: 'telaComMetros' }

export function montarProjeto(variacao: Variacao, pronto: boolean): Project {
  const falta = PARTE[variacao]
  const extra = EXTRA[variacao]
  const tambem = FALTA_TAMBEM[variacao]
  const ir = assignStableIdsToIR(
    jogo(variacao, (p) => pronto || (p !== falta && p !== extra && p !== tambem)),
    `vila_${variacao.replace('-', '_')}`,
  )
  const name = 'A corrida do entregador'
  return {
    ...createEmptyProject(`vila-doce-${variacao}`, name),
    programmingLanguage: 'javascript',
    mode: 'blocks',
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: name }),
    assets: assetsDa(variacao),
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}
