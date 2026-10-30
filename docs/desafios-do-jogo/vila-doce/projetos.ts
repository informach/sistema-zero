import { farolSvg } from '../../../packages/studio/src/arte/farol-assets'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'

export type Variacao = 'corrida' | 'entregas' | 'tempo' | 'caixa'
export const VARIACOES = ['corrida', 'entregas', 'tempo', 'caixa'] as const
/** Palco em pontos, velocidade por quadro, prazo em segundos. Caminhos livres acima e abaixo. */
export const PISTA = {
  largura: 640,
  altura: 480,
  inicioX: 48,
  inicioY: 270,
  velocidade: 3,
  prazo: 12,
  prazoCurto: 8,
} as const
const n = (value: number): JSExpr => ({ type: 'num', value })
const s = (value: string): JSExpr => ({ type: 'str', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const b = (value: boolean): JSExpr => ({ type: 'bool', value })
const set = (name: string, value: JSExpr): JSStatement => ({ type: 'assign', name, value })
const inc = (name: string, delta: number): JSStatement =>
  set(name, { type: 'binop', op: delta < 0 ? '-' : '+', left: v(name), right: n(Math.abs(delta)) })
const eq = (name: string, value: JSExpr): JSExpr => ({
  type: 'binop',
  op: '===',
  left: v(name),
  right: value,
})
const iff = (cond: JSExpr, then: JSStatement[], otherwise: JSStatement[] = []): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: otherwise,
})
const vel = (vx: number, vy = 0): JSStatement => ({
  type: 'g2d:setVelocity',
  spriteVar: 'entregador',
  vx: n(vx),
  vy: n(vy),
})
// Cada ocorrência precisa de um nó próprio para receber um ID distinto no Blockly.
const apply = (): JSStatement => ({ type: 'g2d:applyVelocity', spriteVar: 'entregador' })
const draw = (spriteVar: string): JSStatement => ({
  type: 'g2d:drawSprite',
  spriteVar,
  ctxVar: 'ctx',
})
const image = (
  varName: string,
  image: string,
  x: number,
  y: number,
  w: number,
  h: number,
): JSStatement => ({ type: 'g2d:createImageSprite', varName, image, x, y, w, h })
const label = (
  text: string | JSExpr,
  x: number,
  y: number,
  size = 16,
  color = '#493c56',
): JSStatement => ({ type: 'g2d:drawLabel', ctxVar: 'ctx', text, x, y, size, color, align: 'left' })
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
const loja = (x: number, cor: string, nome: string) =>
  `<g transform="translate(${x} 80)"><ellipse cx="64" cy="98" rx="61" ry="7" fill="#73595322"/><rect x="10" y="18" width="108" height="78" rx="12" fill="#fff4d8" stroke="#805953" stroke-width="3"/><path d="M4 26 22 4h84l18 22z" fill="${cor}"/><path d="M7 37h114v17H7z" fill="${cor}"/><path d="M22 37v17m28-17v17m28-17v17m28-17v17" stroke="#fff2de" stroke-width="12"/><rect x="22" y="61" width="27" height="25" rx="6" fill="#9bd6df" stroke="#805953" stroke-width="2"/><rect x="76" y="60" width="27" height="36" rx="8" fill="#c99072"/><text x="64" y="23" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="12" fill="#493c56">${nome}</text></g>`
const arte: Record<string, string> = {
  entregador: farolSvg('menino-de-bone'),
  vila: svg(
    640,
    480,
    `<rect width="640" height="480" rx="18" fill="#fff6e5"/><rect y="80" width="640" height="336" fill="#b9dbb0"/><path d="M0 216h640v184H0zM130 100h416v124H130z" fill="#edd5b5"/><path d="M0 224h640M0 392h640M138 104h400" stroke="#fff5df" stroke-width="4" stroke-dasharray="12 9"/>${loja(10, '#f2b56a', 'BENTO')}${loja(500, '#ca9acb', 'DOCES')}<g fill="#82b58f" stroke="#54846d" stroke-width="2"><circle cx="48" cy="167" r="20"/><circle cx="602" cy="165" r="20"/><circle cx="146" cy="366" r="16"/><circle cx="474" cy="370" r="16"/></g><g fill="#fff2de"><circle cx="42" cy="162" r="4"/><circle cx="608" cy="160" r="4"/></g><path d="M95 297h54m-12-9 12 9-12 9" fill="none" stroke="#ac8669" stroke-width="5" stroke-linecap="round"/>`,
  ),
  caixa: svg(
    62,
    100,
    '<ellipse cx="31" cy="93" rx="30" ry="6" fill="#76523933"/><rect x="3" y="4" width="56" height="88" rx="8" fill="#ce9864" stroke="#825a42" stroke-width="4"/><path d="M5 14h52M5 80h52M10 17l42 59M52 17 10 76" stroke="#9d704e" stroke-width="5"/><path d="M12 8h38" stroke="#f2cca0" stroke-width="3"/>',
  ),
  entrega: svg(
    70,
    84,
    '<rect x="3" y="3" width="64" height="78" rx="13" fill="#fff8dc" stroke="#9972ae" stroke-width="5"/><ellipse cx="35" cy="62" rx="23" ry="5" fill="#6c516822"/><path d="M16 38h38l-5 25H21z" fill="#f0b06c"/><path d="M15 38c-6-15 11-19 15-14 4-14 25-9 23 5 12 1 10 13 0 13H17z" fill="#f7bfd0"/><circle cx="37" cy="23" r="5" fill="#b84e72"/>',
  ),
  primeira: svg(
    80,
    84,
    '<rect x="3" y="3" width="74" height="78" rx="13" fill="#fff8dc" stroke="#67a3a4" stroke-width="5"/><path d="M19 41h42l-5 25H25z" fill="#e6ac73"/><path d="M20 41c0-15 40-15 40 0" fill="#fff2ce" stroke="#ab795d" stroke-width="3"/><text x="40" y="25" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#426c6f">1</text>',
  ),
  botao: svg(
    170,
    46,
    '<rect x="2" y="5" width="166" height="39" rx="13" fill="#54478c"/><rect x="2" y="1" width="166" height="39" rx="13" fill="#7562b8"/>',
  ),
}
const assets: ProjectAsset[] = Object.entries(arte).map(([name, source]) => ({
  id: `vila-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`,
}))

/** Só blocos já ensinados no Farol: ir à borda e aplicar o deslocamento até a largada. */
function largada(variacao: Variacao): JSStatement[] {
  return [
    vel(-PISTA.largura, -PISTA.altura),
    apply(),
    { type: 'g2d:clampToScreen', spriteVar: 'entregador', ctxVar: 'ctx' },
    vel(PISTA.inicioX, PISTA.inicioY),
    apply(),
    vel(0),
    set('tempo', n(variacao === 'tempo' ? PISTA.prazoCurto : PISTA.prazo)),
    set('entregas', n(0)),
    set('primeiraEntregue', b(false)),
    set('recado', s('')),
    set('correndo', b(true)),
  ]
}
const terminar = (recado: string): JSStatement[] => [
  set('recado', s(recado)),
  set('correndo', b(false)),
  vel(0),
]

export function montarProjeto(variacao: Variacao, pronto: boolean): Project {
  const corridaPronta = variacao !== 'corrida' || pronto
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: PISTA.largura, height: PISTA.altura, bg: '#fff6e5' },
    { type: 'g2d:enableClassicControls', mode: 'directions' },
    { type: 'var', name: 'correndo', value: b(false) },
    { type: 'var', name: 'tempo', value: n(0) },
    { type: 'var', name: 'entregas', value: n(0) },
    { type: 'var', name: 'primeiraEntregue', value: b(false) },
    { type: 'var', name: 'recado', value: s('Toque em Largada para começar.') },
    image('entregador', 'entregador', PISTA.inicioX, PISTA.inicioY, 40, 48),
    image('caixa', 'caixa', 286, 238, 62, 100),
    image('destino', 'entrega', 550, 246, 70, 84),
    image('largada', 'botao', 16, 426, 170, 46),
    { type: 'g2d:createGroup', varName: 'botoesLargada' },
    { type: 'g2d:addToGroup', spriteVar: 'largada', groupVar: 'botoesLargada' },
  ]
  const events: JSStatement[] = [
    {
      type: 'g2d:onGroupClick',
      groupVar: 'botoesLargada',
      itemName: 'botao',
      body: corridaPronta ? largada(variacao === 'tempo' && !pronto ? 'corrida' : variacao) : [],
    },
    { type: 'g2d:onKey', key: 'Enter', body: pronto ? largada(variacao) : [] },
    {
      type: 'g2d:onOverlap',
      aVar: 'entregador',
      bVar: 'caixa',
      body: corridaPronta
        ? [iff(v('correndo'), terminar('A caixa ficou no caminho. Tente outra rota.'))]
        : [],
    },
  ]
  const win = [
    ...(variacao === 'entregas' && pronto ? [inc('entregas', 1)] : [set('entregas', n(1))]),
    ...terminar('Entrega feita. Os doces chegaram.'),
  ]
  events.push({
    type: 'g2d:onOverlap',
    aVar: 'entregador',
    bVar: 'destino',
    body: corridaPronta
      ? [
          iff(
            v('correndo'),
            variacao === 'entregas' && pronto
              ? [
                  iff(v('primeiraEntregue'), win, [
                    set('recado', s('Passe primeiro na entrega 1.')),
                  ]),
                ]
              : win,
          ),
        ]
      : [],
  })
  const drawings: JSStatement[] = [draw('caixa'), draw('destino'), label('Chegada', 546, 357, 15)]
  if (variacao === 'entregas') {
    start.push(image('primeira', 'primeira', 190, 124, 80, 84))
    drawings.push(draw('primeira'), label('Entrega 1', 192, 116, 15))
    events.push({
      type: 'g2d:onOverlap',
      aVar: 'entregador',
      bVar: 'primeira',
      body: pronto
        ? [
            iff(v('correndo'), [
              iff(eq('primeiraEntregue', b(false)), [
                inc('entregas', 1),
                set('primeiraEntregue', b(true)),
                set('recado', s('Agora leve os doces até a chegada.')),
              ]),
            ]),
          ]
        : [],
    })
  }
  if (variacao === 'caixa') {
    start.push(image('caixaNova', 'caixa', 430, 124, 62, 100))
    drawings.push(draw('caixaNova'), label('Caixa nova', 421, 116, 14))
    events.push({
      type: 'g2d:onOverlap',
      aVar: 'entregador',
      bVar: 'caixaNova',
      body: pronto
        ? [iff(v('correndo'), terminar('A caixa nova ficou no caminho. Tente outra rota.'))]
        : [],
    })
  }
  const source: SZIRV2 = {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d' }],
    behavior: {
      start,
      events,
      loops: [
        {
          type: 'g2d:everySeconds',
          seconds: 1,
          key: 'relogio',
          body: corridaPronta
            ? [
                iff(v('correndo'), [
                  inc('tempo', -1),
                  iff(eq('tempo', n(0)), terminar('O tempo acabou. Tente de novo.')),
                ]),
              ]
            : [],
        },
        {
          type: 'g2d:updateEachFrame',
          body: [
            ...(corridaPronta
              ? [
                  iff(v('correndo'), [
                    {
                      type: 'g2d:topDown',
                      spriteVar: 'entregador',
                      speed: PISTA.velocidade,
                    } as JSStatement,
                    {
                      type: 'g2d:clampToScreen',
                      spriteVar: 'entregador',
                      ctxVar: 'ctx',
                    } as JSStatement,
                  ]),
                ]
              : []),
            { type: 'g2d:clear' },
            { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'vila' },
            label('A corrida do entregador', 16, 30, 24),
            label('Leve os doces do Bento. Use as setas e contorne as caixas.', 16, 60, 15),
            ...drawings,
            draw('entregador'),
            label(v('recado'), 16, 413, 16),
            draw('largada'),
            label('Largada', 56, 454, 19, '#ffffff'),
            {
              type: 'g2d:drawScore',
              ctxVar: 'ctx',
              label: 'Tempo: ',
              value: v('tempo'),
              x: 218,
              y: 451,
              size: 17,
              color: '#493c56',
            },
            {
              type: 'g2d:drawScore',
              ctxVar: 'ctx',
              label: 'Entregas: ',
              value: v('entregas'),
              x: 405,
              y: 451,
              size: 17,
              color: '#493c56',
            },
          ],
        },
      ],
    },
  }
  const ir = assignStableIdsToIR(source, `vila_${variacao}`)
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
    assets,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}
