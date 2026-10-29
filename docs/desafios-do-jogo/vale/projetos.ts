import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'

export const VARIACOES = ['ninhos', 'ondas', 'pontos', 'lista'] as const
export type Variacao = (typeof VARIACOES)[number]
/** Parâmetros propostos da brincadeira, sem relação com medidas do Vale 3D. */
export const VALE = { largura: 640, altura: 480, ondas: 3, velocidadeDaCinza: 5 } as const
const n = (value: number): JSExpr => ({ type: 'num', value })
const s = (value: string): JSExpr => ({ type: 'str', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const b = (value: boolean): JSExpr => ({ type: 'bool', value })
const set = (name: string, value: JSExpr): JSStatement => ({ type: 'assign', name, value })
const bin = (op: '+' | '<' | '>' | '===' | '&&', left: JSExpr, right: JSExpr): JSExpr =>
  op === '&&' ? { type: 'logical', op, left, right } : { type: 'binop', op, left, right }
const iff = (cond: JSExpr, then: JSStatement[], otherwise: JSStatement[] = []): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: otherwise,
})
const inc = (name: string, amount = 1) => set(name, bin('+', v(name), n(amount)))
const dado = (spriteVar: string, value: boolean): JSStatement => ({
  type: 'g2d:setSpriteData',
  spriteVar,
  key: 'protegido',
  value: b(value),
})
const imagem = (spriteVar: string, image: string): JSStatement => ({
  type: 'g2d:setImage',
  spriteVar,
  image,
})
const cada = (body: JSStatement[]): JSStatement => ({
  type: 'g2d:forEachInGroup',
  groupVar: 'ninhos',
  itemName: 'ninho',
  body,
})
const add = (spriteVar: string, groupVar = 'ninhos'): JSStatement => ({
  type: 'g2d:addToGroup',
  spriteVar,
  groupVar,
})
const image = (
  varName: string,
  image: string,
  x: number,
  y: number,
  w: number,
  h: number,
): JSStatement => ({ type: 'g2d:createImageSprite', varName, image, x, y, w, h })
const draw = (spriteVar: string): JSStatement => ({
  type: 'g2d:drawSprite',
  ctxVar: 'ctx',
  spriteVar,
})
const label = (
  text: string | JSExpr,
  x: number,
  y: number,
  size = 17,
  color = '#233e40',
): JSStatement => ({ type: 'g2d:drawLabel', ctxVar: 'ctx', text, x, y, size, color, align: 'left' })
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
const ovos =
  '<ellipse cx="48" cy="62" rx="43" ry="22" fill="#aa754b" stroke="#6e513a" stroke-width="3"/><path d="M10 65q38 25 76 0M14 74q33 14 68 0" fill="none" stroke="#ddb57d" stroke-width="3"/><ellipse cx="35" cy="52" rx="13" ry="19" fill="#fff0c4" stroke="#c7a778" stroke-width="2"/><ellipse cx="60" cy="51" rx="13" ry="20" fill="#e1e9ba" stroke="#a7b67e" stroke-width="2"/><g fill="#b89478"><circle cx="32" cy="49" r="3"/><circle cx="40" cy="57" r="3"/><circle cx="58" cy="44" r="3"/></g>'
const cobertura =
  '<path d="M6 35Q20 2 48 24Q73 2 91 35Q60 49 48 29Q30 48 6 35Z" fill="#5eab7c" stroke="#356e56" stroke-width="3"/><path d="M48 29 48 5m0 24L18 25m30 4 29-6" fill="none" stroke="#b6dc91" stroke-width="3"/>'
const arte: Record<string, string> = {
  vale: svg(
    640,
    480,
    '<defs><linearGradient id="ceu" x2="0" y2="1"><stop stop-color="#d5eee8"/><stop offset="1" stop-color="#f8edc9"/></linearGradient></defs><rect width="640" height="480" rx="18" fill="url(#ceu)"/><path d="M180 242 282 80 355 80 456 242" fill="#9d968d"/><path d="m282 80 17 23 20-12 18 13 18-24" fill="#c4b9a7"/><path d="M284 68q-30-35 5-42 15-31 42-9 38-2 32 25 29 27-4 35" fill="#b1b7b6" opacity=".8"/><path d="M0 224Q90 185 185 228T400 217T640 230V480H0Z" fill="#98ba81"/><path d="M0 300Q180 260 350 300T640 295V480H0Z" fill="#c3d59c"/><g fill="#669777"><path d="M0 250Q10 170 28 155q30 25 18 102M587 257q-13-55 16-76 23 19 37 84"/></g>',
  ),
  ninho: svg(96, 96, ovos),
  protegido: svg(96, 96, ovos + cobertura),
  cinzento: svg(
    96,
    96,
    ovos +
      '<path d="M8 67q30-14 80 0" fill="none" stroke="#8b9699" stroke-width="9" opacity=".65"/>',
  ),
  cinza: svg(
    600,
    44,
    '<g fill="#97a2a6" opacity=".75"><ellipse cx="80" cy="24" rx="80" ry="18"/><ellipse cx="240" cy="20" rx="90" ry="17"/><ellipse cx="420" cy="25" rx="94" ry="18"/><ellipse cx="560" cy="19" rx="40" ry="14"/></g>',
  ),
  botao: svg(
    180,
    46,
    '<rect x="2" y="5" width="176" height="39" rx="13" fill="#316459"/><rect x="2" y="1" width="176" height="39" rx="13" fill="#458b72"/>',
  ),
}
const assets: ProjectAsset[] = Object.entries(arte).map(([name, source]) => ({
  id: `vale-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`,
}))
function reset(quarto: boolean): JSStatement[] {
  return [
    ...['onda', 'pontos', 'protegidos', 'comCinza'].map((name) => set(name, n(0))),
    set('emOnda', b(false)),
    set('terminou', b(false)),
    cada([dado('ninho', false), imagem('ninho', 'ninho')]),
    ...(quarto ? [dado('ninho4', false), imagem('ninho4', 'ninho')] : []),
    { type: 'g2d:setOpacity', spriteVar: 'cinza', percent: 0 },
    set('recado', s('Toque nos ninhos para cobrir. Depois, Próxima onda.')),
  ]
}
export function montarProjeto(variacao: Variacao, pronto: boolean): Project {
  const base = pronto || variacao !== 'ninhos'
  const quarto = variacao === 'lista'
  const iniciar = [
    iff(bin('&&', bin('===', v('emOnda'), b(false)), bin('<', v('onda'), v('totalDeOndas'))), [
      inc('onda'),
      set('emOnda', b(true)),
      set('recado', s('A cinza está passando pela lista de ninhos.')),
      // Reposição pronta: usa as peças da extensão, sem código livre ou acesso a propriedades.
      { type: 'g2d:setVelocity', spriteVar: 'cinza', vx: n(-640), vy: n(-480) },
      { type: 'g2d:applyVelocity', spriteVar: 'cinza' },
      { type: 'g2d:clampToScreen', spriteVar: 'cinza', ctxVar: 'ctx' },
      { type: 'g2d:setVelocity', spriteVar: 'cinza', vx: n(20), vy: n(140) },
      { type: 'g2d:applyVelocity', spriteVar: 'cinza' },
      { type: 'g2d:setVelocity', spriteVar: 'cinza', vx: n(0), vy: n(VALE.velocidadeDaCinza) },
      { type: 'g2d:setOpacity', spriteVar: 'cinza', percent: 100 },
    ]),
  ] satisfies JSStatement[]
  const contar = [
    iff(
      { type: 'g2d:spriteData', spriteVar: 'ninho', key: 'protegido', fallback: b(false) },
      [
        imagem('ninho', 'ninho'),
        inc('protegidos'),
        inc('pontos', variacao === 'pontos' && pronto ? 2 : 1),
      ],
      [inc('comCinza'), imagem('ninho', 'cinzento')],
    ),
    dado('ninho', false),
  ]
  const start: JSStatement[] = [
    { type: 'var', name: 'totalDeOndas', value: n(variacao === 'ondas' && pronto ? 4 : 3) },
    { type: 'g2d:setupStage', width: 640, height: 480, bg: '#c3d59c' },
    ...['onda', 'pontos', 'protegidos', 'comCinza'].map(
      (name): JSStatement => ({ type: 'var', name, value: n(0) }),
    ),
    ...['emOnda', 'terminou'].map((name): JSStatement => ({ type: 'var', name, value: b(false) })),
    {
      type: 'var',
      name: 'recado',
      value: s('Toque nos ninhos para cobrir. Depois, Próxima onda.'),
    },
    { type: 'g2d:createGroup', varName: 'ninhos' },
    ...[1, 2, 3, ...(quarto ? [4] : [])].flatMap((i): JSStatement[] => [
      image(`ninho${i}`, 'ninho', quarto ? 48 + (i - 1) * 148 : 92 + (i - 1) * 180, 268, 96, 96),
      dado(`ninho${i}`, false),
      ...(i !== 4 || pronto ? [add(`ninho${i}`)] : []),
    ]),
    image('cinza', 'cinza', 20, 140, 600, 44),
    { type: 'g2d:setOpacity', spriteVar: 'cinza', percent: 0 },
    image('proxima', 'botao', 118, 422, 180, 46),
    image('reiniciar', 'botao', 342, 422, 180, 46),
    { type: 'g2d:createGroup', varName: 'botoesOnda' },
    add('proxima', 'botoesOnda'),
    { type: 'g2d:createGroup', varName: 'botoesReinicio' },
    add('reiniciar', 'botoesReinicio'),
  ]
  const ir = assignStableIdsToIR(
    {
      version: 2,
      html: [],
      css: [],
      extensions: [{ extensionId: 'game-2d' }],
      behavior: {
        start,
        events: [
          {
            type: 'g2d:onGroupClick',
            groupVar: 'ninhos',
            itemName: 'ninho',
            body: base
              ? [
                  iff(
                    bin(
                      '&&',
                      bin('===', v('emOnda'), b(false)),
                      bin('===', v('terminou'), b(false)),
                    ),
                    [dado('ninho', true), imagem('ninho', 'protegido')],
                  ),
                ]
              : [],
          },
          {
            type: 'g2d:onGroupClick',
            groupVar: 'botoesOnda',
            itemName: 'botao',
            body: base ? iniciar : [],
          },
          {
            type: 'g2d:onGroupClick',
            groupVar: 'botoesReinicio',
            itemName: 'botao',
            body: reset(quarto),
          },
          { type: 'g2d:onKey', key: 'Enter', body: pronto ? reset(quarto) : [] },
        ],
        loops: [
          {
            type: 'g2d:updateEachFrame',
            body: [
              iff(v('emOnda'), [
                { type: 'g2d:applyVelocity', spriteVar: 'cinza' },
                iff(bin('>', { type: 'g2d:spriteY', spriteVar: 'cinza' }, n(330)), [
                  cada(base ? contar : []),
                  set('emOnda', b(false)),
                  { type: 'g2d:setOpacity', spriteVar: 'cinza', percent: 0 },
                  set('recado', s('Prepare novas coberturas antes da próxima onda.')),
                  iff(bin('===', v('onda'), v('totalDeOndas')), [
                    set('terminou', b(true)),
                    set('recado', s('Ondas concluídas. Recomece para experimentar de novo.')),
                  ]),
                ]),
              ]),
              { type: 'g2d:clear' },
              { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'vale' },
              label('Proteja os ninhos', 18, 32, 26),
              label('Cubra cada ninho com folhas antes da cinza passar.', 18, 60, 17),
              cada([
                iff(
                  {
                    type: 'g2d:spriteData',
                    spriteVar: 'ninho',
                    key: 'protegido',
                    fallback: b(false),
                  },
                  [imagem('ninho', 'protegido')],
                ),
              ]),
              { type: 'g2d:drawGroup', ctxVar: 'ctx', groupVar: 'ninhos' },
              ...(quarto ? [draw('ninho4')] : []),
              draw('cinza'),
              label(
                {
                  type: 'concat',
                  parts: [
                    s('Onda: '),
                    v('onda'),
                    s('   Protegidos: '),
                    v('protegidos'),
                    s('   Com cinza: '),
                    v('comCinza'),
                  ],
                },
                18,
                390,
                18,
              ),
              label({ type: 'concat', parts: [s('Pontos: '), v('pontos')] }, 500, 32, 18),
              label(v('recado'), 18, 411, 14),
              iff(
                bin('&&', bin('===', v('emOnda'), b(false)), bin('===', v('terminou'), b(false))),
                [{ type: 'g2d:setOpacity', spriteVar: 'proxima', percent: 100 }],
                [{ type: 'g2d:setOpacity', spriteVar: 'proxima', percent: 45 }],
              ),
              draw('proxima'),
              draw('reiniciar'),
              label('Próxima onda', 139, 450, 18, '#ffffff'),
              label('Recomeçar', 375, 450, 18, '#ffffff'),
            ],
          },
        ],
      },
    } satisfies SZIRV2,
    `vale_${variacao}`,
  )
  const name = 'Proteja os ninhos'
  return {
    ...createEmptyProject(`vale-${variacao}`, name),
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
