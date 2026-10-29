import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'

export const VARIACOES = ['mira', 'rapida', 'pontos', 'alvo-novo'] as const
export type Variacao = (typeof VARIACOES)[number]
export const RECIFE = {
  largura: 640,
  altura: 480,
  inicioX: 72,
  inicioY: 360,
  bolhaY: 340,
  velocidade: 5,
  rapida: 8,
} as const
const n = (value: number): JSExpr => ({ type: 'num', value })
const s = (value: string): JSExpr => ({ type: 'str', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const b = (value: boolean): JSExpr => ({ type: 'bool', value })
const set = (name: string, value: JSExpr): JSStatement => ({ type: 'assign', name, value })
const bin = (op: '===' | '+' | '-' | '<', left: JSExpr, right: JSExpr): JSExpr => ({
  type: 'binop',
  op,
  left,
  right,
})
const iff = (cond: JSExpr, then: JSStatement[]): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: [],
})
const vel = (spriteVar: string, vx: JSExpr, vy: JSExpr): JSStatement => ({
  type: 'g2d:setVelocity',
  spriteVar,
  vx,
  vy,
})
const apply = (spriteVar: string): JSStatement => ({ type: 'g2d:applyVelocity', spriteVar })
const opacity = (spriteVar: string, percent: number): JSStatement => ({
  type: 'g2d:setOpacity',
  spriteVar,
  percent,
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
  color = '#123d55',
): JSStatement => ({ type: 'g2d:drawLabel', ctxVar: 'ctx', text, x, y, size, color, align: 'left' })
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
const arte: Record<string, string> = {
  recife: svg(
    640,
    480,
    '<defs><linearGradient id="agua" x2="0" y2="1"><stop stop-color="#d5f6f7"/><stop offset="1" stop-color="#66b6c5"/></linearGradient></defs><rect width="640" height="480" rx="18" fill="url(#agua)"/><path d="M0 388Q150 358 300 390T640 380V480H0Z" fill="#f4e2be"/><g fill="none" stroke="#ffffff" opacity=".5"><circle cx="70" cy="150" r="12"/><circle cx="100" cy="110" r="7"/><circle cx="560" cy="220" r="16"/><circle cx="600" cy="125" r="9"/></g><g fill="none" stroke="#dc818d" stroke-width="12" stroke-linecap="round"><path d="M40 390v-48m0 30-22-18m22 5 18-26M580 389v-65m0 35 24-18m-24 30-20-17"/></g><g fill="none" stroke="#53978e" stroke-width="8" stroke-linecap="round"><path d="M12 389q-12-38 2-67m600 69q20-35 6-66m-90 65q-18-22-4-42"/></g>',
  ),
  mira: svg(
    48,
    48,
    '<path d="M6 44 10 20Q24-2 38 20l4 24Z" fill="#a893d1" stroke="#514775" stroke-width="3"/><ellipse cx="24" cy="18" rx="13" ry="9" fill="#ecf7ff" stroke="#514775" stroke-width="3"/><ellipse cx="24" cy="18" rx="6" ry="4" fill="#79bacd"/><path d="M14 35h20" stroke="#d9d0ed" stroke-width="4" stroke-linecap="round"/>',
  ),
  bolha: svg(
    64,
    64,
    '<circle cx="32" cy="32" r="29" fill="#d9fbff" fill-opacity=".35" stroke="#f5ffff" stroke-width="4"/><circle cx="32" cy="32" r="25" fill="none" stroke="#5eaece" stroke-width="2"/><path d="M15 26q2-9 11-11" fill="none" stroke="white" stroke-width="5" stroke-linecap="round"/>',
  ),
  alvo: svg(
    56,
    56,
    '<path d="m28 3 7 16 18 2-14 12 5 19-16-10-16 10 5-19L3 21l18-2Z" fill="#f9cd71" stroke="#b27a43" stroke-width="3"/><circle cx="23" cy="28" r="2" fill="#695342"/><circle cx="33" cy="28" r="2" fill="#695342"/><path d="M23 35q5 4 10 0" fill="none" stroke="#695342" stroke-width="2" stroke-linecap="round"/>',
  ),
  novo: svg(
    56,
    56,
    '<path d="M28 51C5 40 3 19 14 9c8-6 15 0 14 4 2-6 12-9 18-1 10 14-2 29-18 39Z" fill="#eaa6bd" stroke="#a85b82" stroke-width="3"/><path d="M28 44 15 17m13 27 12-26m-12 26V16" stroke="#fbd9e5" stroke-width="3"/>',
  ),
  botao: svg(
    172,
    44,
    '<rect x="2" y="5" width="168" height="37" rx="13" fill="#365b7e"/><rect x="2" y="1" width="168" height="37" rx="13" fill="#527fa2"/>',
  ),
}
const assets: ProjectAsset[] = Object.entries(arte).map(([name, source]) => ({
  id: `recife-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`,
}))

/** Reposição com velocidade e borda, ambos ensinados, sem bloco de posição manual. */
function colocar(sprite: string, x: JSExpr, y: number): JSStatement[] {
  return [
    vel(sprite, n(-640), n(-480)),
    apply(sprite),
    { type: 'g2d:clampToScreen', spriteVar: sprite, ctxVar: 'ctx' },
    vel(sprite, x, n(y)),
    apply(sprite),
    vel(sprite, n(0), n(0)),
  ]
}
function recomecar(novo: boolean): JSStatement[] {
  return [
    ...colocar('mira', n(RECIFE.inicioX), RECIFE.inicioY),
    ...colocar('bolha', n(64), RECIFE.bolhaY),
    opacity('bolha', 0),
    opacity('alvo', 100),
    ...(novo ? [opacity('alvoNovo', 100)] : []),
    set('emVoo', b(false)),
    set('preso', b(false)),
    set('novoPreso', b(false)),
    set('pontos', n(0)),
    set('recado', s('Mire com as setas e toque em Soltar bolha.')),
  ]
}
function soltar(velocidade: number): JSStatement[] {
  return [
    iff(bin('===', v('emVoo'), b(false)), [
      ...colocar('bolha', { type: 'g2d:spriteX', spriteVar: 'mira' }, RECIFE.bolhaY),
      vel('bolha', n(-8), n(0)),
      apply('bolha'),
      opacity('bolha', 100),
      vel('bolha', n(0), n(-velocidade)),
      set('emVoo', b(true)),
      set('recado', s('A bolha está subindo.')),
    ]),
  ]
}
function prender(alvo: string, marca: string, pontos: number): JSStatement[] {
  return [
    iff(v('emVoo'), [
      iff(bin('===', v(marca), b(false)), [
        set(marca, b(true)),
        set('emVoo', b(false)),
        ...colocar('bolha', { type: 'g2d:spriteX', spriteVar: alvo }, 116),
        vel('bolha', n(-4), n(0)),
        apply('bolha'),
        vel('bolha', n(0), n(0)),
        opacity(alvo, 35),
        set('pontos', bin('+', v('pontos'), n(pontos))),
        set('recado', s('Alvo preso na bolha.')),
      ]),
    ]),
  ]
}

export function montarProjeto(variacao: Variacao, pronto: boolean): Project {
  const basePronta = variacao !== 'mira' || pronto
  const novo = variacao === 'alvo-novo'
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: 640, height: 480, bg: '#c6eff3' },
    { type: 'g2d:enableClassicControls', mode: 'directions' },
    ...['emVoo', 'preso', 'novoPreso'].map(
      (name): JSStatement => ({ type: 'var', name, value: b(false) }),
    ),
    { type: 'var', name: 'pontos', value: n(0) },
    { type: 'var', name: 'recado', value: s('Mire com as setas e toque em Soltar bolha.') },
    image('mira', 'mira', RECIFE.inicioX, RECIFE.inicioY, 48, 48),
    image('bolha', 'bolha', 64, RECIFE.bolhaY, 64, 64),
    opacity('bolha', 0),
    image('alvo', 'alvo', 430, 120, 56, 56),
    image('soltar', 'botao', 200, 424, 172, 44),
    image('recomecar', 'botao', 396, 424, 172, 44),
    { type: 'g2d:createGroup', varName: 'botoesSoltar' },
    { type: 'g2d:addToGroup', spriteVar: 'soltar', groupVar: 'botoesSoltar' },
    { type: 'g2d:createGroup', varName: 'botoesRecomecar' },
    { type: 'g2d:addToGroup', spriteVar: 'recomecar', groupVar: 'botoesRecomecar' },
    ...(novo ? [image('alvoNovo', 'novo', 190, 120, 56, 56)] : []),
  ]
  const events: JSStatement[] = [
    {
      type: 'g2d:onGroupClick',
      groupVar: 'botoesSoltar',
      itemName: 'botao',
      body: basePronta
        ? soltar(variacao === 'rapida' && pronto ? RECIFE.rapida : RECIFE.velocidade)
        : [],
    },
    {
      type: 'g2d:onGroupClick',
      groupVar: 'botoesRecomecar',
      itemName: 'botao',
      body: recomecar(novo),
    },
    { type: 'g2d:onKey', key: 'Enter', body: pronto ? recomecar(novo) : [] },
    {
      type: 'g2d:onOverlap',
      aVar: 'bolha',
      bVar: 'alvo',
      body: basePronta ? prender('alvo', 'preso', variacao === 'pontos' && pronto ? 2 : 1) : [],
    },
    ...(novo
      ? [
          {
            type: 'g2d:onOverlap',
            aVar: 'bolha',
            bVar: 'alvoNovo',
            body: pronto ? prender('alvoNovo', 'novoPreso', 1) : [],
          } as JSStatement,
        ]
      : []),
  ]
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
          type: 'g2d:updateEachFrame',
          body: [
            ...(basePronta
              ? [
                  { type: 'g2d:arrowsX', spriteVar: 'mira', speed: 3 } as JSStatement,
                  { type: 'g2d:clampToScreen', spriteVar: 'mira', ctxVar: 'ctx' } as JSStatement,
                  iff(v('emVoo'), [
                    apply('bolha'),
                    iff(bin('<', { type: 'g2d:spriteY', spriteVar: 'bolha' }, n(-64)), [
                      set('emVoo', b(false)),
                      opacity('bolha', 0),
                      vel('bolha', n(0), n(0)),
                      set('recado', s('Mire de novo e solte outra bolha.')),
                    ]),
                  ]),
                ]
              : []),
            { type: 'g2d:clear' },
            { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'recife' },
            label('Mira de bolhas', 18, 32, 25),
            label('Use esquerda e direita para alinhar a bolha com o alvo.', 18, 61, 16),
            draw('alvo'),
            ...(novo ? [draw('alvoNovo')] : []),
            draw('mira'),
            draw('bolha'),
            label(v('recado'), 180, 410, 15),
            draw('soltar'),
            draw('recomecar'),
            label('Soltar bolha', 224, 451, 18, '#ffffff'),
            label('Recomeçar', 429, 451, 18, '#ffffff'),
            {
              type: 'g2d:drawScore',
              ctxVar: 'ctx',
              label: 'Pontos: ',
              value: v('pontos'),
              x: 490,
              y: 32,
              size: 18,
              color: '#123d55',
            },
          ],
        },
      ],
    },
  }
  const ir = assignStableIdsToIR(source, `recife_${variacao}`)
  const name = 'Mira de bolhas'
  return {
    ...createEmptyProject(`recife-${variacao}`, name),
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
