import { BICHOS_DO_BOSQUE } from '../../../packages/arquipelago-contracts/src/salvamento'
import { jardimSvg } from '../../../packages/studio/src/arte/jardim-assets'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import {
  createEmptyProject,
  type Project,
  type ProjectAsset,
} from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'

export const bichos = BICHOS_DO_BOSQUE
export type Variacao = 'corrida' | 'pedras' | 'noite' | 'placar'
export const selecaoDosBichos = [
  { tecla: 'ArrowUp', simbolo: '↑' },
  { tecla: 'ArrowLeft', simbolo: '←' },
  { tecla: 'ArrowRight', simbolo: '→' },
  { tecla: 'ArrowDown', simbolo: '↓' },
] as const
const n = (value: number): JSExpr => ({ type: 'num', value })
const s = (value: string): JSExpr => ({ type: 'str', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const bool = (value: boolean): JSExpr => ({ type: 'bool', value })
const set = (name: string, value: JSExpr): JSStatement => ({ type: 'assign', name, value })
const inc = (name: string): JSStatement =>
  set(name, { type: 'binop', op: '+', left: v(name), right: n(1) })
const cmp = (left: JSExpr, op: '===' | '<' | '>', right: JSExpr): JSExpr => ({
  type: 'binop',
  op,
  left,
  right,
})
const iff = (cond: JSExpr, then: JSStatement[], otherwise: JSStatement[] = []): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: otherwise,
})
const vel = (spriteVar: string, vx: JSExpr, vy: JSExpr = n(0)): JSStatement => ({
  type: 'g2d:setVelocity',
  spriteVar,
  vx,
  vy,
})
const apply = (spriteVar: string): JSStatement => ({ type: 'g2d:applyVelocity', spriteVar })
const draw = (spriteVar: string): JSStatement => ({
  type: 'g2d:drawSprite',
  spriteVar,
  ctxVar: 'ctx',
})
const x = (spriteVar: string): JSExpr => ({ type: 'g2d:spriteX', spriteVar })
const label = (
  text: string | JSExpr,
  x: number | JSExpr,
  y: number | JSExpr,
  size = 16,
): JSStatement => ({
  type: 'g2d:drawLabel',
  ctxVar: 'ctx',
  text,
  x,
  y,
  size,
  color: '#163d35',
  align: 'left',
})
const image = (
  varName: string,
  image: string,
  x: number,
  y: number,
  w: number,
  h: number,
): JSStatement => ({ type: 'g2d:createImageSprite', varName, image, x, y, w, h })
const svg = (body: string, w = 72, h = 87) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
const art: Record<string, string> = {
  gato: jardimSvg('gato'),
  coelho: jardimSvg('coelho'),
  pedras: jardimSvg('pedras'),
  cachorro: svg(
    '<ellipse cx="36" cy="79" rx="26" ry="5" fill="#344e4133"/><ellipse cx="36" cy="61" rx="23" ry="20" fill="#ba7b48"/><ellipse cx="21" cy="77" rx="11" ry="6" fill="#f5ce99"/><ellipse cx="51" cy="77" rx="11" ry="6" fill="#f5ce99"/><path d="M14 20Q0 16 8 52L21 45M58 20Q72 16 64 52L51 45" fill="#70452d"/><rect x="13" y="14" width="46" height="47" rx="21" fill="#dba363"/><ellipse cx="36" cy="46" rx="17" ry="12" fill="#ffe1b6"/><g fill="#332d2b"><circle cx="25" cy="34" r="4"/><circle cx="47" cy="34" r="4"/><ellipse cx="36" cy="43" rx="6" ry="4"/></g><path d="M36 47v5m-8-1q8 8 16 0" fill="none" stroke="#623c2b" stroke-width="2"/><path d="M23 62h26" stroke="#278cc9" stroke-width="6"/>',
  ),
  porquinho: svg(
    '<ellipse cx="36" cy="80" rx="26" ry="5" fill="#344e4133"/><ellipse cx="36" cy="62" rx="25" ry="20" fill="#ed9ba8"/><path d="M17 78v-8m38 8v-8" stroke="#b7637d" stroke-width="10" stroke-linecap="round"/><path d="M13 30L12 8l20 12M59 30l1-22-20 12" fill="#e78b9d" stroke="#bc647e" stroke-width="2"/><ellipse cx="36" cy="37" rx="26" ry="25" fill="#ffbdc7"/><g fill="#493336"><circle cx="25" cy="33" r="4"/><circle cx="47" cy="33" r="4"/></g><ellipse cx="36" cy="46" rx="15" ry="11" fill="#e68b9f"/><g fill="#a95371"><ellipse cx="31" cy="46" rx="2" ry="3"/><ellipse cx="41" cy="46" rx="2" ry="3"/></g><path d="M29 59q7 4 14 0" fill="none" stroke="#a95371" stroke-width="2"/>',
  ),
  pista: svg(
    '<rect width="640" height="430" fill="#c8e9ce"/><path d="M0 0H640V72H0" fill="#e9f6df"/><g fill="#f8ebca" stroke="#d8bd8e" stroke-width="2"><rect x="0" y="88" width="530" height="61" rx="12"/><rect x="0" y="158" width="530" height="61" rx="12"/><rect x="0" y="228" width="530" height="61" rx="12"/><rect x="0" y="298" width="530" height="61" rx="12"/></g><path d="M0 0v280" transform="translate(480 85)" stroke="#fff" stroke-width="14" stroke-dasharray="10 10"/><path d="M0 0v280" transform="translate(480 95)" stroke="#264d48" stroke-width="14" stroke-dasharray="10 10"/>',
    640,
    430,
  ),
}
export const assets: ProjectAsset[] = Object.entries(art).map(([name, source]) => ({
  id: `bosque-${name}`,
  name,
  kind: 'image',
  source: 'library',
  dataUrl: `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`,
}))

/** Volta à borda com os blocos de velocidade e limite já ensinados no Farol.
 * Cada deslocamento é aplicado uma vez, no mesmo evento, antes do próximo desenho. */
function largadaDoBicho(bicho: string, linha: number): JSStatement[] {
  return [
    vel(bicho, n(-640), n(-430)),
    apply(bicho),
    { type: 'g2d:clampToScreen', spriteVar: bicho, ctxVar: 'ctx' },
    vel(bicho, n(0), n(90 + linha * 70)),
    apply(bicho),
    vel(bicho, n(0)),
    set(`fala_${bicho}`, s('')),
    set(`pulo_${bicho}`, n(0)),
    set(`saltos_${bicho}`, n(0)),
  ]
}

export function montarProjeto(variacao: Variacao, pronto: boolean): Project {
  const corridaPronta = pronto || variacao !== 'corrida'
  const start: JSStatement[] = [
    { type: 'g2d:setupStage', width: 640, height: 430, bg: '#c8e9ce' },
    { type: 'g2d:enableClassicControls', mode: 'auto' },
    { type: 'var', name: 'correndo', value: bool(false) },
    { type: 'var', name: 'vencedor', value: s('') },
    { type: 'var', name: 'escolhido', value: s('') },
    { type: 'var', name: 'acesa', value: bool(false) },
    { type: 'var', name: 'passo', value: n(0) },
    { type: 'var', name: 'corridas', value: n(0) },
    {
      type: 'g2d:createSprite',
      varName: 'chegada',
      x: 480,
      y: 80,
      w: 14,
      h: 290,
      color: '#ffffff',
    },
  ]
  const events: JSStatement[] = [
    {
      type: 'g2d:onKey',
      key: 'Enter',
      body: corridaPronta
        ? [...bichos.flatMap(largadaDoBicho), set('vencedor', s('')), set('correndo', bool(true))]
        : [],
    },
  ]
  const moves: JSStatement[] = []
  const drawings: JSStatement[] = []
  for (const [i, bicho] of bichos.entries()) {
    const y = 90 + i * 70
    start.push(
      image(bicho, bicho, 0, y, 48, 58),
      { type: 'var', name: `fala_${bicho}`, value: s('') },
      { type: 'var', name: `pulo_${bicho}`, value: n(0) },
      { type: 'var', name: `saltos_${bicho}`, value: n(0) },
      { type: 'var', name: `vitorias_${bicho}`, value: n(0) },
    )
    const walk: JSStatement[] = [
      iff(cmp({ type: 'g2d:randomX' }, '<', n(320)), [set('passo', n(2))], [set('passo', n(3))]),
      vel(bicho, v('passo')),
    ]
    if (variacao === 'pedras') {
      start.push(image(`pedra_${bicho}`, 'pedras', 255, y + 38, 30, 22))
      drawings.push(draw(`pedra_${bicho}`))
      if (pronto)
        walk.push(
          iff(cmp(x(bicho), '>', n(205)), [
            iff(cmp(v(`pulo_${bicho}`), '<', n(40)), [
              iff(
                cmp(v(`pulo_${bicho}`), '<', n(20)),
                [vel(bicho, v('passo'), n(-2))],
                [vel(bicho, v('passo'), n(2))],
              ),
              inc(`pulo_${bicho}`),
              iff(cmp(v(`pulo_${bicho}`), '===', n(40)), [inc(`saltos_${bicho}`)]),
            ]),
          ]),
        )
    }
    walk.push(apply(bicho))
    const win: JSStatement[] = [
      set(`fala_${bicho}`, s('Ganhei')),
      set('vencedor', s(bicho)),
      set('correndo', bool(false)),
      ...bichos.map((b) => vel(b, n(0))),
    ]
    if (variacao === 'placar' && pronto) win.push(inc(`vitorias_${bicho}`), inc('corridas'))
    events.push({
      type: 'g2d:onOverlap',
      aVar: bicho,
      bVar: 'chegada',
      body: corridaPronta ? [iff(v('correndo'), win)] : [],
    })
    if (corridaPronta)
      moves.push(iff(v('correndo'), [iff(cmp(v('escolhido'), '===', s(bicho)), [], walk)]))
    if (variacao === 'corrida') {
      events.push({
        type: 'g2d:onKey',
        key: selecaoDosBichos[i]!.tecla,
        body: pronto
          ? [
              iff(cmp(v('correndo'), '===', bool(false)), [
                iff(
                  cmp(v('escolhido'), '===', s(bicho)),
                  [set('escolhido', s(''))],
                  [set('escolhido', s(bicho))],
                ),
              ]),
            ]
          : [],
      })
      events.push({
        type: 'g2d:onKey',
        key: 'Space',
        body: pronto
          ? [
              iff(v('correndo'), [
                iff(cmp(v('escolhido'), '===', s(bicho)), [
                  vel(bicho, n(12)),
                  apply(bicho),
                  vel(bicho, n(0)),
                ]),
              ]),
            ]
          : [],
      })
    }
    drawings.push(
      draw(bicho),
      label(v(`fala_${bicho}`), x(bicho), y - 2, 14),
      label(
        variacao === 'corrida' ? `${selecaoDosBichos[i]!.simbolo} ${bicho}` : bicho,
        535,
        y + 20,
        18,
      ),
    )
    if (variacao === 'pedras')
      drawings.push({
        type: 'g2d:drawScore',
        ctxVar: 'ctx',
        label: 'Pulos: ',
        value: v(`saltos_${bicho}`),
        x: 535,
        y: y + 40,
        color: '#163d35',
        size: 13,
      })
    if (variacao === 'placar')
      drawings.push({
        type: 'g2d:drawScore',
        ctxVar: 'ctx',
        label: 'Vitórias: ',
        value: v(`vitorias_${bicho}`),
        x: 535,
        y: y + 40,
        color: '#163d35',
        size: 13,
      })
  }
  if (variacao === 'noite') {
    start.push(
      { type: 'g2d:createSprite', varName: 'noite', x: 0, y: 76, w: 640, h: 294, color: '#10182b' },
      { type: 'g2d:setOpacity', spriteVar: 'noite', percent: n(94) },
    )
    drawings.push(draw('noite'))
    events.push({
      type: 'g2d:onKey',
      key: 'Space',
      body: pronto
        ? [
            iff(
              v('acesa'),
              [
                { type: 'g2d:setOpacity', spriteVar: 'noite', percent: n(94) },
                set('acesa', bool(false)),
              ],
              [
                { type: 'g2d:setOpacity', spriteVar: 'noite', percent: n(15) },
                set('acesa', bool(true)),
              ],
            ),
          ]
        : [],
    })
    drawings.push(label('Espaço ou A: acender / apagar', 255, 390, 20))
  }
  if (variacao === 'corrida')
    drawings.push(label('Espaço ou A move:', 255, 390, 20), label(v('escolhido'), 255, 417, 20))
  if (variacao === 'placar') {
    events.push({
      type: 'g2d:onKey',
      key: 'Space',
      body: pronto ? [...bichos.map((b) => set(`vitorias_${b}`, n(0))), set('corridas', n(0))] : [],
    })
    drawings.push(label('Espaço ou A: zerar placar', 255, 390, 20))
    drawings.push({
      type: 'g2d:drawScore',
      ctxVar: 'ctx',
      label: 'Corridas: ',
      value: v('corridas'),
      x: 255,
      y: 415,
      color: '#163d35',
      size: 16,
    })
  }
  if (variacao === 'pedras') {
    events.push({
      type: 'g2d:onKey',
      key: 'Space',
      body: pronto
        ? [...bichos.flatMap(largadaDoBicho), set('vencedor', s('')), set('correndo', bool(true))]
        : [],
    })
    drawings.push(label('Extra: Espaço ou A recomeça', 255, 390, 20))
  }
  const source: SZIRV2 = {
    version: 2,
    html: [],
    css: [],
    behavior: {
      start,
      events,
      loops: [
        { type: 'g2d:everyFrames', n: n(2), key: 'corrida', body: moves },
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'pista' },
            ...drawings,
            label('Largada: Enter ou +', 16, 390, 20),
            label('Corrida dos bichos', 16, 28, 23),
            label(
              variacao === 'corrida'
                ? 'Extra: escolha pela seta ao lado do nome.'
                : variacao === 'pedras'
                  ? 'Faça os bichos pularem as pedras e voltarem ao chão.'
                  : variacao === 'noite'
                    ? 'Ajude o Zappy a iluminar a pista.'
                    : 'Cada vitória vale um ponto para quem chegou primeiro.',
              16,
              55,
              20,
            ),
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  }
  const ir = assignStableIdsToIR(source, `bosque_${variacao}`)
  return {
    ...createEmptyProject(`bosque-${variacao}`, 'Corrida dos bichos'),
    programmingLanguage: 'javascript',
    mode: 'blocks',
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: 'Corrida dos bichos' }),
    assets,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}
